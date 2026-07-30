import type { CashReportPreviewDto } from "@corely/contracts/cash-management";

export async function createKassenberichtPdf(preview: CashReportPreviewDto): Promise<Buffer> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // German number format — same as formatNumber() in KassenberichtScreen
  const format = (cents: number) => {
    if (cents === 0) {return "0,00";}
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Use noon UTC to avoid date-shift across timezones
  const displayDate = new Date(preview.businessDate + "T12:00:00Z").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Mirror the exact same calculations as KassenberichtPaper on the web page
  const otherOutflows = preview.bankDepositsCents + preview.otherCashOutflowsCents;
  const totalOutflows =
    preview.goodsPurchasesCents +
    preview.businessExpensesCents +
    preview.privateWithdrawalsCents +
    otherOutflows;

  const closingCash = preview.effectiveClosingCashCents; // ← was wrongly actualClosingCashCents ?? 0
  const cashReceived = closingCash + totalOutflows - preview.previousClosingCashCents;
  const otherIncome =
    preview.privateDepositsCents +
    preview.bankWithdrawalsToCashCents +
    preview.otherNonSalesCashInflowsCents;

  // --- Header ---
  page.drawText("Kassenbericht", { x: 40, y: 790, size: 22, font: bold });

  page.drawText("Datum", { x: 210, y: 790, size: 10, font });
  page.drawText(displayDate, { x: 250, y: 792, size: 12, font });
  page.drawLine({ start: { x: 245, y: 788 }, end: { x: 320, y: 788 }, thickness: 1 });

  page.drawText("Nr.", { x: 330, y: 790, size: 10, font });
  if (preview.reportNumber) {
    page.drawText(preview.reportNumber, { x: 348, y: 792, size: 12, font });
  }
  page.drawLine({ start: { x: 345, y: 788 }, end: { x: 385, y: 788 }, thickness: 1 });

  page.drawText("Währung", { x: 505, y: 800, size: 10, font });
  page.drawText("EUR", { x: 505, y: 786, size: 12, font: bold });

  // --- Table geometry ---
  const startX = 40;
  const endX = 550;
  const c1 = 300; // description | % separator
  const c2 = 330; // % | tax col
  const c3 = 400; // tax | amount col
  const c4 = 480; // amount | booknote
  const rowHeight = 22;
  let y = 750;

  const drawHLine = (yPos: number) =>
    page.drawLine({ start: { x: startX, y: yPos }, end: { x: endX, y: yPos }, thickness: 1 });
  const drawVLine = (xPos: number, yTop: number, yBottom: number) =>
    page.drawLine({ start: { x: xPos, y: yTop }, end: { x: xPos, y: yBottom }, thickness: 1 });

  const drawBox = (
    text: string,
    xPos: number,
    w: number,
    align: "left" | "center" | "right",
    isBold: boolean,
    yPos: number,
    size = 10
  ) => {
    const f = isBold ? bold : font;
    const textW = f.widthOfTextAtSize(text, size);
    let tx = xPos + 5;
    if (align === "center") {tx = xPos + (w - textW) / 2;}
    if (align === "right") {tx = xPos + w - textW - 5;}
    page.drawText(text, { x: tx, y: yPos - 15, size, font: f });
  };

  drawHLine(y);

  type Row = {
    text?: string;
    val?: number;
    span3?: boolean;
    boldText?: boolean;
    boldVal?: boolean;
    hideZero?: boolean;
    isHeader?: boolean;
    extraLabel?: boolean;
    alignTextRight?: boolean;
    empty?: boolean;
  };

  const rows: Row[] = [
    {
      text: "Kassenbestand bei Geschäftsschluss",
      val: closingCash,
      span3: true,
      boldText: true,
      extraLabel: true,
    },
    { text: "Ausgaben im Laufe des Tages", boldText: true, isHeader: true },
    {
      text: "1. Wareneinkäufe und Warennebenkosten",
      val: preview.goodsPurchasesCents,
      hideZero: true,
    },
    ...Array<Row>(6).fill({ empty: true }),
    { text: "2. Geschäftsausgaben", val: preview.businessExpensesCents, hideZero: true },
    ...Array<Row>(3).fill({ empty: true }),
    { text: "3. Privatentnahmen", val: preview.privateWithdrawalsCents, hideZero: true },
    { text: "4. Sonstige Ausgaben (z.B. Bankeinzahlungen)", val: otherOutflows, hideZero: true },
    ...Array<Row>(3).fill({ empty: true }),
    { text: "Summe", val: totalOutflows, span3: true, alignTextRight: true },
    {
      text: "abzüglich Kassenendbestand des Vortages",
      val: preview.previousClosingCashCents,
      span3: true,
    },
    { text: "= Kasseneingang", val: cashReceived, span3: true, boldText: true, boldVal: true },
    { text: "abzüglich sonstige Einnahmen", val: otherIncome },
    {
      text: "= Bareinnahmen (Tageslosung)",
      val: preview.calculatedCashSalesCents,
      span3: true,
      boldText: true,
      boldVal: true,
    },
  ];

  for (const r of rows) {
    const nextY = y - rowHeight;
    drawVLine(startX, y, nextY);
    drawVLine(endX, y, nextY);
    drawVLine(c4, y, nextY);

    if (r.span3) {
      drawVLine(c3, y, nextY);
      if (r.text) {
        drawBox(
          r.text,
          startX,
          c3 - startX,
          r.alignTextRight ? "right" : "left",
          r.boldText ?? false,
          y
        );
      }
    } else {
      drawVLine(c1, y, nextY);
      drawVLine(c2, y, nextY);
      drawVLine(c3, y, nextY);
      if (r.text) {
        drawBox(r.text, startX, c1 - startX, "left", r.boldText ?? false, y);
      }
    }

    if (r.isHeader) {
      drawBox("%", c1, c2 - c1, "center", false, y);
      drawBox("Vorsteuer", c2, c3 - c2, "center", false, y + 5, 8);
      drawBox("Betrag", c2, c3 - c2, "center", false, y - 5, 8);
      drawBox("Netto-/Brutto-", c3, c4 - c3, "center", false, y + 5, 8);
      drawBox("Betrag", c3, c4 - c3, "center", false, y - 5, 8);
    } else if (r.extraLabel) {
      drawBox("Buch-", c4, endX - c4, "center", false, y + 5, 8);
      drawBox("vermerk", c4, endX - c4, "center", false, y - 5, 8);
    }

    if (r.val !== undefined && !(r.hideZero && r.val === 0)) {
      drawBox(format(r.val), c3, c4 - c3, "right", r.boldVal ?? false, y, 12);
    }

    y = nextY;
    drawHLine(y);
  }

  // --- Footer ---
  y -= 40;
  page.drawText("Kundenzahl", { x: 40, y, size: 10, font });
  const countStr = preview.customerCount ? String(preview.customerCount) : "";
  if (countStr) {page.drawText(countStr, { x: 125, y: y + 2, size: 14, font });}
  page.drawLine({ start: { x: 105, y: y - 2 }, end: { x: 185, y: y - 2 }, thickness: 1 });

  page.drawText("Unterschrift", { x: 300, y, size: 10, font });
  page.drawLine({ start: { x: 360, y: y - 2 }, end: { x: 550, y: y - 2 }, thickness: 1 });

  return Buffer.from(await pdf.save());
}
