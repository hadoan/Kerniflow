import type { CSSProperties } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import type { InvoiceEmailProps } from "./invoice-email.types.js";

export function InvoiceEmail({
  invoiceNumber,
  companyName,
  dueDate,
  totalAmount,
  currency,
  customerName,
  customMessage,
  lines,
  viewInvoiceUrl,
}: InvoiceEmailProps) {
  const previewText = `Invoice ${invoiceNumber} from ${companyName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invoice {invoiceNumber}</Heading>

          <Text style={text}>Hi {customerName},</Text>

          {customMessage && <Text style={text}>{customMessage}</Text>}

          <Text style={text}>Here's your invoice from {companyName}.</Text>

          <Section style={invoiceSection}>
            <Row>
              <Column>
                <Text style={label}>Invoice Number</Text>
                <Text style={value}>{invoiceNumber}</Text>
              </Column>
              <Column>
                <Text style={label}>Due Date</Text>
                <Text style={value}>{dueDate}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={lineItemsSection}>
            <Row style={tableHeader}>
              <Column style={descriptionColumn}>
                <Text style={tableHeaderText}>Description</Text>
              </Column>
              <Column style={qtyColumn}>
                <Text style={tableHeaderText}>Qty</Text>
              </Column>
              <Column style={priceColumn}>
                <Text style={tableHeaderText}>Price</Text>
              </Column>
              <Column style={amountColumn}>
                <Text style={tableHeaderText}>Amount</Text>
              </Column>
            </Row>

            {lines.map((line: InvoiceEmailProps["lines"][0], index: number) => (
              <Row key={index} style={tableRow}>
                <Column style={descriptionColumn}>
                  <Text style={tableCell}>{line.description}</Text>
                </Column>
                <Column style={qtyColumn}>
                  <Text style={tableCell}>{line.quantity}</Text>
                </Column>
                <Column style={priceColumn}>
                  <Text style={tableCell}>{line.unitPrice}</Text>
                </Column>
                <Column style={amountColumn}>
                  <Text style={tableCell}>{line.amount}</Text>
                </Column>
              </Row>
            ))}

            <Row style={totalRow}>
              <Column style={descriptionColumn} colSpan={3}>
                <Text style={totalLabel}>Total</Text>
              </Column>
              <Column style={amountColumn}>
                <Text style={totalAmountStyle}>
                  {currency} {totalAmount}
                </Text>
              </Column>
            </Row>
          </Section>

          {viewInvoiceUrl && (
            <Section style={buttonSection}>
              <Link href={viewInvoiceUrl} style={button}>
                View Invoice
              </Link>
            </Section>
          )}

          <Text style={footer}>
            Thanks,
            <br />
            {companyName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const label: CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "500",
  textTransform: "uppercase",
  margin: "0",
};

const value = {
  color: "#333",
  fontSize: "16px",
  fontWeight: "600",
  margin: "4px 0 0 0",
};

const invoiceSection = {
  padding: "24px 40px",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
};

const lineItemsSection = {
  padding: "24px 40px",
};

const tableHeader = {
  borderBottom: "2px solid #e5e7eb",
  paddingBottom: "8px",
  marginBottom: "8px",
};

const tableHeaderText: CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  margin: "0",
};

const tableRow = {
  borderBottom: "1px solid #f3f4f6",
  padding: "12px 0",
};

const tableCell = {
  color: "#333",
  fontSize: "14px",
  margin: "0",
};

const descriptionColumn = {
  width: "40%",
};

const qtyColumn: CSSProperties = {
  width: "15%",
  textAlign: "center",
};

const priceColumn: CSSProperties = {
  width: "20%",
  textAlign: "right",
};

const amountColumn: CSSProperties = {
  width: "25%",
  textAlign: "right",
};

const totalRow = {
  borderTop: "2px solid #e5e7eb",
  paddingTop: "16px",
  marginTop: "8px",
};

const totalLabel: CSSProperties = {
  color: "#333",
  fontSize: "16px",
  fontWeight: "600",
  textAlign: "right",
  margin: "0",
};

const totalAmountStyle: CSSProperties = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "700",
  textAlign: "right",
  margin: "0",
};

const buttonSection: CSSProperties = {
  padding: "24px 40px",
  textAlign: "center",
};

const button: CSSProperties = {
  backgroundColor: "#5469d4",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 32px",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "32px 0 0 0",
  padding: "0 40px",
};
