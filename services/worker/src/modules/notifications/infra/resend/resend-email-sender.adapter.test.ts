import { describe, expect, it, vi, beforeEach } from "vitest";
import { ResendEmailSenderAdapter } from "./resend-email-sender.adapter";
import type { Resend } from "resend";

vi.mock("resend", () => {
  return {
    Resend: vi.fn(),
  };
});

describe("ResendEmailSenderAdapter", () => {
  let mockResendInstance: any;

  beforeEach(async () => {
    mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    };
    const ResendMock = vi.mocked((await import("resend")).Resend as unknown as typeof Resend);
    ResendMock.mockImplementation(() => mockResendInstance);
  });

  it("sends email with headers and attachments", async () => {
    mockResendInstance.emails.send.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    const adapter = new ResendEmailSenderAdapter(
      "test-key",
      "from@example.com",
      "reply@example.com"
    );

    const result = await adapter.sendEmail({
      tenantId: "tenant-1",
      to: ["to@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
      headers: { "X-Test": "1" },
      idempotencyKey: "key-1",
      attachments: [{ filename: "file.txt", path: "/tmp/file.txt", mimeType: "text/plain" }],
    });

    expect(mockResendInstance.emails.send).toHaveBeenCalled();
    const callArgs = mockResendInstance.emails.send.mock.calls[0];
    expect(callArgs[0]).toMatchObject({
      from: "from@example.com",
      to: ["to@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Hello",
      replyTo: "reply@example.com",
      headers: { "X-Test": "1" },
    });
    expect(callArgs[1]).toEqual({ idempotencyKey: "key-1" });
    expect(result).toEqual({ provider: "resend", providerMessageId: "msg_123" });
  });

  it("throws on provider error", async () => {
    mockResendInstance.emails.send.mockResolvedValue({ data: null, error: { message: "boom" } });
    const adapter = new ResendEmailSenderAdapter("test-key", "from@example.com");

    await expect(
      adapter.sendEmail({
        tenantId: "tenant-1",
        to: ["to@example.com"],
        subject: "Hi",
      })
    ).rejects.toThrow("Resend API error: boom");
  });
});
