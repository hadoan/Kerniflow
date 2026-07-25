import { CashEntryType } from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  attachBelegToEntry,
  createCashEntry,
  createCashRegister,
  downloadCashExport,
  exportCashBook,
  monthKeyFromDayKey,
  submitCashDayClose,
  uploadBase64Document,
} from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

const dayAt = (dayKey: string, hh: number, mm = 0): string =>
  `${dayKey}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00.000Z`;

test.describe("Cash Management - exports", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test("exports cashbook CSV idempotently and returns downloadable CSV", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-26";
    const month = monthKeyFromDayKey(dayKey);

    const register = await createCashRegister(
      client,
      { name: "CSV Export Register", currency: "EUR" },
      idempotencyKey(testInfo, "csv-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "CSV cash sale row",
        type: CashEntryType.SALE_CASH,
        amount: 150,
        occurredAt: dayAt(dayKey, 9),
      },
      idempotencyKey(testInfo, "csv-entry-sale")
    );

    await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 150,
        denominationCounts: [{ denomination: 50, count: 3, subtotal: 150 }],
      },
      idempotencyKey(testInfo, "csv-close")
    );

    const exportKey = idempotencyKey(testInfo, "csv-export");
    const first = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "CSV",
      },
      exportKey
    );
    const second = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "CSV",
      },
      exportKey
    );

    expect(first.response.status()).toBe(201);
    expect(second.response.status()).toBe(201);
    expect(first.artifact.fileToken).toBe(second.artifact.fileToken);

    const downloaded = await downloadCashExport(client, first.artifact.fileToken);
    expect(downloaded.response.status()).toBe(200);
    expect(downloaded.response.headers()["content-type"] ?? "").toContain("text/csv");

    const csv = downloaded.body.toString("utf-8");
    expect(csv).toContain(
      "dayKey,occurredAt,entryNo,direction,type,source,paymentMethod,description,amountCents,currency,balanceAfterCents,referenceId,reversalOfEntryId,reversedByEntryId"
    );
    expect(csv).toContain("CSV cash sale row");

    if (prisma) {
      const artifacts = await prisma.cashExportArtifact.count({
        where: {
          tenantId: testData.tenant.id,
          workspaceId: testData.workspace.id,
          registerId: register.register.id,
          month,
          format: "CSV",
        },
      });
      expect(artifacts).toBe(1);

      const auditCount = await prisma.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.export.generated",
          entity: "CashExportArtifact",
          entityId: first.artifact.fileToken,
        },
      });
      expect(auditCount).toBe(1);

      const outboxCount = await prisma.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "cash.export.generated",
          payloadJson: {
            contains: first.artifact.fileToken,
          },
        },
      });
      expect(outboxCount).toBe(1);
    }
  });

  test("exports cashbook PDF and returns a valid PDF payload", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-27";
    const month = monthKeyFromDayKey(dayKey);

    const register = await createCashRegister(
      client,
      { name: "PDF Export Register" },
      idempotencyKey(testInfo, "pdf-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "PDF row",
        type: CashEntryType.OPENING_FLOAT,
        amount: 200,
        occurredAt: dayAt(dayKey, 8),
      },
      idempotencyKey(testInfo, "pdf-entry")
    );

    const exported = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "PDF",
      },
      idempotencyKey(testInfo, "pdf-export")
    );
    expect(exported.response.status()).toBe(201);

    const downloaded = await downloadCashExport(client, exported.artifact.fileToken);
    expect(downloaded.response.headers()["content-type"] ?? "").toContain("application/pdf");
    expect(downloaded.body.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(downloaded.body.byteLength).toBeGreaterThan(500);
  });

  test("exports DATEV format with expected EXTF header columns", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-28";
    const month = monthKeyFromDayKey(dayKey);

    const register = await createCashRegister(
      client,
      { name: "DATEV Export Register", currency: "EUR" },
      idempotencyKey(testInfo, "datev-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "DATEV sale",
        type: CashEntryType.SALE_CASH,
        amount: 80,
        occurredAt: dayAt(dayKey, 10),
      },
      idempotencyKey(testInfo, "datev-entry")
    );

    const exported = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "DATEV",
      },
      idempotencyKey(testInfo, "datev-export")
    );
    expect(exported.response.status()).toBe(201);

    const downloaded = await downloadCashExport(client, exported.artifact.fileToken);
    expect(downloaded.response.headers()["content-type"] ?? "").toContain("text/csv");

    const csv = downloaded.body.toString("utf-8");
    expect(csv).toContain("Umsatz (ohne Soll/Haben-Kz)");
    expect(csv).toContain("Soll/Haben-Kennzeichen");
    expect(csv).toContain("DATEV sale");
  });

  test("exports audit pack ZIP idempotently and contains expected manifest/files", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-29";
    const month = monthKeyFromDayKey(dayKey);

    const register = await createCashRegister(
      client,
      { name: "Audit Pack Register", currency: "EUR" },
      idempotencyKey(testInfo, "auditpack-register")
    );

    const entry = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Audit pack entry",
        type: CashEntryType.SALE_CASH,
        amount: 90,
        occurredAt: dayAt(dayKey, 9),
      },
      idempotencyKey(testInfo, "auditpack-entry")
    );

    const uploaded = await uploadBase64Document(
      client,
      {
        filename: "audit-pack-beleg.txt",
        contentType: "text/plain",
        base64: Buffer.from("audit-pack-beleg", "utf-8").toString("base64"),
      },
      idempotencyKey(testInfo, "auditpack-upload")
    );
    expect(uploaded.response.status()).toBe(201);

    await attachBelegToEntry(
      client,
      entry.entry.id,
      uploaded.upload.document.id,
      idempotencyKey(testInfo, "auditpack-attach")
    );

    await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 90,
        denominationCounts: [{ denomination: 50, count: 1, subtotal: 50 }],
        note: "packed for audit export",
      },
      idempotencyKey(testInfo, "auditpack-close")
    );

    const exportKey = idempotencyKey(testInfo, "auditpack-export");
    const first = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "AUDIT_PACK",
      },
      exportKey
    );
    const second = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "AUDIT_PACK",
      },
      exportKey
    );

    expect(first.response.status()).toBe(201);
    expect(second.response.status()).toBe(201);
    expect(first.artifact.fileToken).toBe(second.artifact.fileToken);

    const downloaded = await downloadCashExport(client, first.artifact.fileToken);
    expect(downloaded.response.headers()["content-type"] ?? "").toContain("application/zip");
    expect(downloaded.body.subarray(0, 2).toString("utf-8")).toBe("PK");

    const zipView = downloaded.body.toString("latin1");
    expect(zipView).toContain("manifest.json");
    expect(zipView).toContain("cashbook.csv");
    expect(zipView).toContain("day-closes.csv");
    expect(zipView).toContain("attachments.csv");
    expect(zipView).toContain("audit-log.csv");
  });
});
