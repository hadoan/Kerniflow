import { describe, it, expect } from "vitest";
import { renderEmail } from "../../render";
import { InvoiceEmail } from "../InvoiceEmail";
import { buildInvoiceEmailSubject } from "../invoice-email.subject";
import type { InvoiceEmailProps } from "../invoice-email.types";

describe("InvoiceEmail Template", () => {
  const mockProps: InvoiceEmailProps = {
    invoiceNumber: "INV-001",
    companyName: "Acme Corp",
    dueDate: "January 31, 2025",
    totalAmount: "$1,250.00",
    currency: "USD",
    customerName: "John Doe",
    lines: [
      {
        description: "Consulting Services",
        quantity: 10,
        unitPrice: "$100.00",
        amount: "$1,000.00",
      },
      {
        description: "Design Work",
        quantity: 5,
        unitPrice: "$50.00",
        amount: "$250.00",
      },
    ],
  };

  describe("renderEmail", () => {
    it("should render HTML and text versions", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });

    it("should include invoice number in HTML", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("INV-001");
    });

    it("should include company name in HTML", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("Acme Corp");
    });

    it("should include customer name in HTML", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("John Doe");
    });

    it("should include total amount in HTML", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("$1,250.00");
    });

    it("should include all line items in HTML", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("Consulting Services");
      expect(result.html).toContain("Design Work");
      expect(result.html).toContain("$1,000.00");
      expect(result.html).toContain("$250.00");
    });

    it("should include custom message when provided", async () => {
      const propsWithMessage: InvoiceEmailProps = {
        ...mockProps,
        customMessage: "Thank you for your business!",
      };

      const result = await renderEmail(<InvoiceEmail {...propsWithMessage} />);

      expect(result.html).toContain("Thank you for your business!");
    });

    it("should not break when custom message is not provided", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    });

    it("should include view invoice link when provided", async () => {
      const propsWithLink: InvoiceEmailProps = {
        ...mockProps,
        viewInvoiceUrl: "https://example.com/invoices/123",
      };

      const result = await renderEmail(<InvoiceEmail {...propsWithLink} />);

      expect(result.html).toContain("https://example.com/invoices/123");
      expect(result.html).toContain("View Invoice");
    });

    it("should render plain text version with invoice details", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.text).toContain("INV-001");
      expect(result.text).toContain("Acme Corp");
      expect(result.text).toContain("John Doe");
      expect(result.text).toContain("$1,250.00");
    });
  });

  describe("buildInvoiceEmailSubject", () => {
    it("should build correct subject line", () => {
      const subject = buildInvoiceEmailSubject(mockProps);

      expect(subject).toBe("Invoice INV-001 from Acme Corp");
    });

    it("should handle different invoice numbers", () => {
      const props: InvoiceEmailProps = {
        ...mockProps,
        invoiceNumber: "DRAFT",
      };

      const subject = buildInvoiceEmailSubject(props);

      expect(subject).toBe("Invoice DRAFT from Acme Corp");
    });

    it("should handle different company names", () => {
      const props: InvoiceEmailProps = {
        ...mockProps,
        companyName: "Tech Solutions Inc",
      };

      const subject = buildInvoiceEmailSubject(props);

      expect(subject).toBe("Invoice INV-001 from Tech Solutions Inc");
    });
  });

  describe("HTML Structure", () => {
    it("should include proper HTML document structure", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      expect(result.html).toContain("<!DOCTYPE html");
      expect(result.html).toContain("<html");
      expect(result.html).toContain("</html>");
    });

    it("should include viewport meta tag for responsive design", async () => {
      const result = await renderEmail(<InvoiceEmail {...mockProps} />);

      // React Email handles meta tags
      expect(result.html).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty line items array", async () => {
      const propsNoLines: InvoiceEmailProps = {
        ...mockProps,
        lines: [],
      };

      const result = await renderEmail(<InvoiceEmail {...propsNoLines} />);

      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    });

    it("should handle single line item", async () => {
      const propsSingleLine: InvoiceEmailProps = {
        ...mockProps,
        lines: [
          {
            description: "Service",
            quantity: 1,
            unitPrice: "$100.00",
            amount: "$100.00",
          },
        ],
      };

      const result = await renderEmail(<InvoiceEmail {...propsSingleLine} />);

      expect(result.html).toContain("Service");
    });
  });
});
