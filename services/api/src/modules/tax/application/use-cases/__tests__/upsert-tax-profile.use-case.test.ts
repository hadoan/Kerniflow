import { beforeEach, describe, expect, it } from "vitest";
import { UpsertTaxProfileUseCase } from "../upsert-tax-profile.use-case";
import { GetTaxProfileUseCase } from "../get-tax-profile.use-case";
import { InMemoryTaxProfileRepo } from "../../../testkit/fakes/in-memory-tax-profile-repo";
import { InMemoryTaxCodeRepo } from "../../../testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../testkit/fakes/in-memory-tax-rate-repo";
import type { UpsertTaxProfileInput } from "@corely/contracts";
import type { UseCaseContext } from "../use-case-context";
import { isErr, type Result } from "@corely/kernel";

const unwrap = <T>(result: Result<T, any>): T => {
  if (isErr(result)) throw result.error;
  return result.value;
};

describe("UpsertTaxProfileUseCase", () => {
  let upsertUseCase: UpsertTaxProfileUseCase;
  let getUseCase: GetTaxProfileUseCase;
  let profileRepo: InMemoryTaxProfileRepo;
  let taxCodeRepo: InMemoryTaxCodeRepo;
  let taxRateRepo: InMemoryTaxRateRepo;

  const ctx: UseCaseContext = {
    tenantId: "tenant-1",
    userId: "user-1",
    workspaceId: "tenant-1",
    correlationId: "test-correlation-id",
  };

  beforeEach(() => {
    profileRepo = new InMemoryTaxProfileRepo();
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();
    upsertUseCase = new UpsertTaxProfileUseCase(profileRepo, taxCodeRepo, taxRateRepo);
    getUseCase = new GetTaxProfileUseCase(profileRepo);
  });

  describe("create new profile", () => {
    it("creates profile with all required fields", async () => {
      const input: UpsertTaxProfileInput = {
        country: "DE",
        regime: "STANDARD_VAT",
        vatId: "DE123456789",
        currency: "EUR",
        filingFrequency: "QUARTERLY",
        effectiveFrom: "2025-01-01T00:00:00Z",
      };

      const profile = unwrap(await upsertUseCase.execute(input, ctx));

      expect(profile.id).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.tenantId).toBe(ctx.workspaceId);
      expect(profile.country).toBe("DE");
      expect(profile.country).toBe("DE");
      expect(profile.regime).toBe("STANDARD_VAT");
      expect(profile.vatId).toBe("DE123456789");
      expect(profile.currency).toBe("EUR");
      expect(profile.filingFrequency).toBe("QUARTERLY");
      expect(profile.effectiveTo).toBeNull();
      expect(await taxCodeRepo.findByCode("DE_STD_19", ctx.workspaceId!)).not.toBeNull();
    });

    it("creates profile without optional VAT ID", async () => {
      const input: UpsertTaxProfileInput = {
        country: "DE",
        regime: "SMALL_BUSINESS",
        currency: "EUR",
        filingFrequency: "YEARLY",
        effectiveFrom: "2025-01-01T00:00:00Z",
      };

      const profile = unwrap(await upsertUseCase.execute(input, ctx));

      expect(profile.vatId).toBeNull();
      expect(profile.regime).toBe("SMALL_BUSINESS");
    });

    it("converts ISO date strings to Date objects", async () => {
      const input: UpsertTaxProfileInput = {
        country: "DE",
        regime: "STANDARD_VAT",
        currency: "EUR",
        filingFrequency: "MONTHLY",
        effectiveFrom: "2025-01-01T00:00:00Z",
        effectiveTo: "2025-12-31T23:59:59Z",
      };

      const profile = unwrap(await upsertUseCase.execute(input, ctx));

      expect(profile.effectiveFrom).toBeInstanceOf(Date);
      expect(profile.effectiveTo).toBeInstanceOf(Date);
      expect(profile.effectiveFrom.toISOString()).toBe("2025-01-01T00:00:00.000Z");
      expect(profile.effectiveTo?.toISOString()).toBe("2025-12-31T23:59:59.000Z");
    });
  });

  describe("update existing profile", () => {
    it("updates profile if same tenant + effectiveFrom", async () => {
      const input: UpsertTaxProfileInput = {
        country: "DE",
        regime: "SMALL_BUSINESS",
        currency: "EUR",
        filingFrequency: "YEARLY",
        effectiveFrom: "2025-01-01T00:00:00Z",
      };

      // Create
      const created = unwrap(await upsertUseCase.execute(input, ctx));

      // Update with same effectiveFrom
      const updateInput: UpsertTaxProfileInput = {
        ...input,
        regime: "STANDARD_VAT", // Changed
        vatId: "DE123456789", // Added
        filingFrequency: "QUARTERLY", // Changed
      };

      const updated = unwrap(await upsertUseCase.execute(updateInput, ctx));

      // Should update existing profile
      expect(updated.id).toBe(created.id);
      expect(updated.regime).toBe("STANDARD_VAT");
      expect(updated.vatId).toBe("DE123456789");
      expect(updated.filingFrequency).toBe("QUARTERLY");
    });

    it("creates new profile if different effectiveFrom", async () => {
      const input1: UpsertTaxProfileInput = {
        country: "DE",
        regime: "SMALL_BUSINESS",
        currency: "EUR",
        filingFrequency: "YEARLY",
        effectiveFrom: "2025-01-01T00:00:00Z",
      };

      const input2: UpsertTaxProfileInput = {
        ...input1,
        effectiveFrom: "2026-01-01T00:00:00Z", // Different date
        regime: "STANDARD_VAT",
      };

      const profile1 = unwrap(await upsertUseCase.execute(input1, ctx));
      const profile2 = unwrap(await upsertUseCase.execute(input2, ctx));

      // Should create two separate profiles
      expect(profile2.id).not.toBe(profile1.id);
      expect(profile1.regime).toBe("SMALL_BUSINESS");
      expect(profile2.regime).toBe("STANDARD_VAT");
    });
  });

  describe("get active profile", () => {
    it("returns active profile for current date", async () => {
      const input: UpsertTaxProfileInput = {
        country: "DE",
        regime: "STANDARD_VAT",
        currency: "EUR",
        filingFrequency: "QUARTERLY",
        effectiveFrom: "2024-01-01T00:00:00Z",
      };

      await upsertUseCase.execute(input, ctx);

      const active = unwrap(await getUseCase.execute(undefined, ctx));

      expect(active).not.toBeNull();
      expect(active?.regime).toBe("STANDARD_VAT");
    });

    it("returns null if no active profile", async () => {
      const active = unwrap(await getUseCase.execute(undefined, ctx));

      expect(active).toBeNull();
    });

    it("returns most recent profile if multiple exist", async () => {
      // Create old profile
      await upsertUseCase.execute(
        {
          country: "DE",
          regime: "SMALL_BUSINESS",
          currency: "EUR",
          filingFrequency: "YEARLY",
          effectiveFrom: "2020-01-01T00:00:00Z",
          effectiveTo: "2024-12-31T23:59:59Z",
        },
        ctx
      );

      // Create current profile
      await upsertUseCase.execute(
        {
          country: "DE",
          regime: "STANDARD_VAT",
          currency: "EUR",
          filingFrequency: "QUARTERLY",
          effectiveFrom: "2025-01-01T00:00:00Z",
        },
        ctx
      );

      const active = unwrap(await getUseCase.execute(undefined, ctx));

      expect(active?.regime).toBe("STANDARD_VAT");
    });

    it("respects effectiveTo date", async () => {
      // Create profile that expires
      await upsertUseCase.execute(
        {
          country: "DE",
          regime: "STANDARD_VAT",
          currency: "EUR",
          filingFrequency: "QUARTERLY",
          effectiveFrom: "2020-01-01T00:00:00Z",
          effectiveTo: "2020-12-31T23:59:59Z", // Expired
        },
        ctx
      );

      const active = unwrap(await getUseCase.execute(undefined, ctx));

      // Should return null as profile is expired
      expect(active).toBeNull();
    });
  });

  describe("tenant isolation", () => {
    it("profiles are scoped to tenant", async () => {
      const tenant1Ctx: UseCaseContext = {
        tenantId: "tenant-1",
        workspaceId: "tenant-1",
        userId: "user-1",
      };

      const tenant2Ctx: UseCaseContext = {
        tenantId: "tenant-2",
        workspaceId: "tenant-2",
        userId: "user-2",
      };

      // Create profile for tenant 1
      await upsertUseCase.execute(
        {
          country: "DE",
          regime: "STANDARD_VAT",
          currency: "EUR",
          filingFrequency: "QUARTERLY",
          effectiveFrom: "2025-01-01T00:00:00Z",
        },
        tenant1Ctx
      );

      // Tenant 2 should not see tenant 1's profile
      const tenant2Profile = unwrap(await getUseCase.execute(undefined, tenant2Ctx));

      expect(tenant2Profile).toBeNull();
    });
  });
});
