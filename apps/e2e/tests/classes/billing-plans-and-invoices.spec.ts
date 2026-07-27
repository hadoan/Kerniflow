import { expect, test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import {
  createCohortFromProgramViaApi,
  createPartyViaApi,
  createProgramViaApi,
  createUniqueName,
  generateInvoices,
  loginAndGetAuthContext,
  requestAsAuth,
  requestAsAuthFailure,
  setBillingPlan,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Billing Plans and Invoices", () => {
  test("scenario D: installments + upfront + idempotency + billing validation", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("Bootcamp Program"),
      levelTag: "B1",
      expectedSessionsCount: 30,
    });
    const cohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: createUniqueName("Bootcamp Cohort"),
      subject: "Programming",
      level: "B1",
      defaultPricePerSession: 5_000,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });

    const learner = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Learner Billing"),
      role: "STUDENT",
      email: `${createUniqueName("learner-billing")}@example.test`,
    });
    const payer = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Payer Billing"),
      role: "CUSTOMER",
      email: `${createUniqueName("payer-billing")}@example.test`,
    });

    const application = await requestAsAuth<{ enrollment: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/applications`,
      {
        studentClientId: learner.id,
        payerClientId: payer.id,
        placementLevel: "B1",
        placementGoal: "Career upskilling",
      }
    );
    const enrollmentId = application.enrollment.id;

    await requestAsAuth(page, auth, "POST", `/classes/enrollments/${enrollmentId}/approve`, {
      priceCents: 120_000,
      currency: "EUR",
    });

    await setBillingPlan(page, auth, {
      enrollmentId,
      plan: {
        type: "INSTALLMENTS",
        currency: "EUR",
        installments: [
          { dueDate: "2026-03-10", amountCents: 60_000, label: "Part 1" },
          { dueDate: "2026-04-10", amountCents: 60_000, label: "Part 2" },
        ],
      },
    });

    const savedInstallmentsPlan = await requestAsAuth<{
      billingPlan: { type: string; scheduleJson?: { data?: { installments?: unknown[] } } } | null;
    }>(page, auth, "GET", `/classes/enrollments/${enrollmentId}/billing-plan`);
    expect(savedInstallmentsPlan.billingPlan?.type).toBe("INSTALLMENTS");
    expect(savedInstallmentsPlan.billingPlan?.scheduleJson?.data?.installments?.length).toBe(2);

    const idempotencyKey = `e2e-billing-generate:${Date.now()}`;
    const firstGenerate = await generateInvoices(page, auth, {
      enrollmentId,
      idempotencyKey,
      sendInvoices: false,
    });
    const secondGenerate = await generateInvoices(page, auth, {
      enrollmentId,
      idempotencyKey,
      sendInvoices: false,
    });

    expect(firstGenerate.invoiceIds.length).toBeGreaterThan(0);
    expect(secondGenerate.invoiceIds).toEqual(firstGenerate.invoiceIds);
    expect(new Set(secondGenerate.invoiceIds).size).toBe(secondGenerate.invoiceIds.length);

    await setBillingPlan(page, auth, {
      enrollmentId,
      plan: {
        type: "UPFRONT",
        amountCents: 120_000,
        currency: "EUR",
        dueDate: "2026-03-15",
      },
    });

    const upfrontGenerate = await generateInvoices(page, auth, {
      enrollmentId,
      idempotencyKey: `e2e-billing-upfront:${Date.now()}`,
      sendInvoices: false,
    });
    expect(upfrontGenerate.invoiceIds.length).toBe(1);

    const invalidPlan = await requestAsAuthFailure(
      page,
      auth,
      "PUT",
      `/classes/enrollments/${enrollmentId}/billing-plan`,
      {
        type: "INSTALLMENTS",
        scheduleJson: {
          type: "INSTALLMENTS",
          data: {
            currency: "EUR",
            installments: [{ amountCents: 10_000 }],
          },
        },
      }
    );
    expect(invalidPlan.status).toBeGreaterThanOrEqual(400);
    expect(invalidPlan.status).toBeLessThan(500);
  });
});
