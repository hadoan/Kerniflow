import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { ResendEmailSenderAdapter } from "./resend-email-sender.adapter";

const captured: { body?: any; headers?: Record<string, string> } = {};

const server = setupServer(
  http.post("https://api.resend.com/emails", async ({ request }) => {
    captured.body = await request.json();
    captured.headers = Object.fromEntries(request.headers.entries());
    return HttpResponse.json({ id: "msg_test_123" });
  })
);

describe("Resend adapter (HTTP mock)", () => {
  beforeAll(() => {
    process.env.RESEND_API_KEY = "test-resend-key";
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("sends expected request shape including idempotency header", async () => {
    const adapter = new ResendEmailSenderAdapter("test-resend-key", "from@example.com");

    const result = await adapter.sendEmail({
      tenantId: "tenant-1",
      to: ["to@example.com"],
      cc: ["cc@example.com"],
      subject: "Hello",
      html: "<p>Body</p>",
      idempotencyKey: "idem-1",
      headers: { "X-Correlation-Id": "corr-123" },
    });

    expect(result).toEqual({ provider: "resend", providerMessageId: "msg_test_123" });
    expect(captured.body).toMatchObject({
      from: "from@example.com",
      to: ["to@example.com"],
      cc: ["cc@example.com"],
      subject: "Hello",
      html: "<p>Body</p>",
      headers: { "X-Correlation-Id": "corr-123" },
    });
    expect(captured.headers?.authorization?.toLowerCase()).toContain("test-resend-key");
    expect(
      captured.headers?.["idempotency-key"] || captured.headers?.["Idempotency-Key"]
    ).toBeDefined();
  });

  it("maps provider errors to thrown exceptions", async () => {
    server.use(
      http.post("https://api.resend.com/emails", () =>
        HttpResponse.json({ message: "bad request" }, { status: 500 })
      )
    );
    const adapter = new ResendEmailSenderAdapter("test-resend-key", "from@example.com");

    await expect(
      adapter.sendEmail({ tenantId: "tenant-1", to: ["to@example.com"], subject: "Hi" })
    ).rejects.toThrow(/Resend API error/i);
  });
});
