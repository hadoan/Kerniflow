import { z } from "zod";

export const CashClarificationType = {
  MONEY_DESTINATION: "MONEY_DESTINATION",
  ACCOUNT_OWNERSHIP: "ACCOUNT_OWNERSHIP",
  PURCHASE_PURPOSE: "PURCHASE_PURPOSE",
  ACTUAL_CLOSING_CASH: "ACTUAL_CLOSING_CASH",
  PAYMENT_METHOD: "PAYMENT_METHOD",
  REAL_OR_HYPOTHETICAL: "REAL_OR_HYPOTHETICAL",
  BUSINESS_DATE: "BUSINESS_DATE",
} as const;

export type CashClarificationType =
  (typeof CashClarificationType)[keyof typeof CashClarificationType];

export const CashClarificationChoiceId = {
  // MONEY_DESTINATION
  PRIVATE_WITHDRAWAL: "PRIVATE_WITHDRAWAL",
  BUSINESS_BANK_DEPOSIT: "BUSINESS_BANK_DEPOSIT",
  GOODS_PURCHASE: "GOODS_PURCHASE",
  STILL_IN_DRAWER: "STILL_IN_DRAWER",
  OTHER: "OTHER",

  // ACCOUNT_OWNERSHIP
  PERSONAL_ACCOUNT: "PERSONAL_ACCOUNT",
  BUSINESS_ACCOUNT: "BUSINESS_ACCOUNT",

  // PURCHASE_PURPOSE
  SUPPLIES: "SUPPLIES",
  BUSINESS_EXPENSE: "BUSINESS_EXPENSE",

  // PAYMENT_METHOD
  CASH: "CASH",
  CARD: "CARD",
  MIXED: "MIXED",

  // REAL_OR_HYPOTHETICAL
  REAL_TRANSACTION: "REAL_TRANSACTION",
  HYPOTHETICAL: "HYPOTHETICAL",

  // BUSINESS_DATE
  TODAY: "TODAY",
  YESTERDAY: "YESTERDAY",
  OTHER_DATE: "OTHER_DATE",

  // ACTUAL_CLOSING_CASH
  COUNTED_ENTERED: "COUNTED_ENTERED",
} as const;

export type CashClarificationChoiceId =
  (typeof CashClarificationChoiceId)[keyof typeof CashClarificationChoiceId];

export type LocalizedString = Record<"en" | "de" | "vi", string>;

export const CASH_CLARIFICATION_CONTENT: Record<
  CashClarificationType,
  {
    question: LocalizedString;
    choices: Array<{
      id: CashClarificationChoiceId;
      label: LocalizedString;
    }>;
  }
> = {
  MONEY_DESTINATION: {
    question: {
      en: "What will you use this money for?",
      de: "Wofür wird das Geld verwendet?",
      vi: "Em lấy tiền ra để làm gì?",
    },
    choices: [
      {
        id: "PRIVATE_WITHDRAWAL",
        label: {
          en: "Personal use (Privatentnahme)",
          de: "Privatentnahme",
          vi: "Dùng cá nhân",
        },
      },
      {
        id: "BUSINESS_BANK_DEPOSIT",
        label: {
          en: "Deposit into the business bank account",
          de: "Bankeinzahlung (Geschäftskonto)",
          vi: "Nộp vào tài khoản ngân hàng của tiệm",
        },
      },
      {
        id: "GOODS_PURCHASE",
        label: {
          en: "Purchase goods or pay a business expense",
          de: "Wareneinkauf oder Geschäftsausgabe",
          vi: "Mua hàng hoặc trả chi phí cho tiệm",
        },
      },
      {
        id: "STILL_IN_DRAWER",
        label: {
          en: "Money is still in the drawer",
          de: "Geld verbleibt in der Kasse",
          vi: "Tiền vẫn còn trong ngăn kéo",
        },
      },
      {
        id: "OTHER",
        label: { en: "Other", de: "Sonstiges", vi: "Khác" },
      },
    ],
  },
  ACCOUNT_OWNERSHIP: {
    question: {
      en: "Which account are you depositing into?",
      de: "Auf welches Konto wird eingezahlt?",
      vi: "Anh/chị nộp vào tài khoản nào?",
    },
    choices: [
      {
        id: "BUSINESS_ACCOUNT",
        label: {
          en: "Business bank account",
          de: "Geschäftskonto",
          vi: "Tài khoản ngân hàng của tiệm",
        },
      },
      {
        id: "PERSONAL_ACCOUNT",
        label: {
          en: "Personal bank account",
          de: "Privatkonto",
          vi: "Tài khoản cá nhân",
        },
      },
    ],
  },
  PURCHASE_PURPOSE: {
    question: {
      en: "What kind of purchase or expense was this?",
      de: "Welcher Art war der Einkauf oder die Ausgabe?",
      vi: "Khoản mua/chi phí này thuộc loại nào?",
    },
    choices: [
      {
        id: "SUPPLIES",
        label: {
          en: "Goods/supplies for the business",
          de: "Wareneinkauf / Materialien",
          vi: "Mua hàng hóa / nguyên liệu cho tiệm",
        },
      },
      {
        id: "BUSINESS_EXPENSE",
        label: {
          en: "Other business expense",
          de: "Sonstige Geschäftsausgabe",
          vi: "Chi phí kinh doanh khác",
        },
      },
      {
        id: "PRIVATE_WITHDRAWAL",
        label: {
          en: "Personal purchase",
          de: "Private Ausgabe (Privatentnahme)",
          vi: "Chi tiêu cá nhân",
        },
      },
    ],
  },
  ACTUAL_CLOSING_CASH: {
    question: {
      en: "How much cash is physically left in the drawer at closing?",
      de: "Wie viel Bargeld ist bei Geschäftsschluss tatsächlich in der Kasse?",
      vi: "Sau khi kiểm tra, trong ngăn kéo thực tế còn bao nhiêu tiền mặt?",
    },
    choices: [
      {
        id: "COUNTED_ENTERED",
        label: {
          en: "I will enter the counted cash",
          de: "Ich gebe den gezählten Bestand ein",
          vi: "Em sẽ nhập số tiền đếm được",
        },
      },
    ],
  },
  PAYMENT_METHOD: {
    question: {
      en: "How did the customer pay?",
      de: "Wie hat der Kunde bezahlt?",
      vi: "Khách hàng đã thanh toán bằng hình thức nào?",
    },
    choices: [
      {
        id: "CASH",
        label: { en: "Cash", de: "Bar", vi: "Tiền mặt" },
      },
      {
        id: "CARD",
        label: { en: "Card / EC-Karte", de: "Karte / EC-Karte", vi: "Thẻ ngân hàng" },
      },
      {
        id: "MIXED",
        label: {
          en: "Mixed (Cash + Card)",
          de: "Gemischt (Bar + Karte)",
          vi: "Kết hợp (Tiền mặt + Thẻ)",
        },
      },
    ],
  },
  REAL_OR_HYPOTHETICAL: {
    question: {
      en: "Is this a real transaction or a hypothetical question?",
      de: "Ist das eine echte Buchung oder eine Beispielfrage?",
      vi: "Đây là giao dịch thực hay câu hỏi giả định?",
    },
    choices: [
      {
        id: "REAL_TRANSACTION",
        label: {
          en: "Real transaction — please record it",
          de: "Echte Buchung — bitte erfassen",
          vi: "Giao dịch thực — lưu lại",
        },
      },
      {
        id: "HYPOTHETICAL",
        label: {
          en: "Hypothetical — just an example",
          de: "Beispiel — nur zur Erklärung",
          vi: "Giả định — chỉ để hiểu thôi",
        },
      },
    ],
  },
  BUSINESS_DATE: {
    question: {
      en: "Which date does this cash transaction belong to?",
      de: "Für welches Datum gilt diese Kassenbuchung?",
      vi: "Giao dịch tiền mặt này thuộc ngày nào?",
    },
    choices: [
      {
        id: "TODAY",
        label: { en: "Today", de: "Heute", vi: "Hôm nay" },
      },
      {
        id: "YESTERDAY",
        label: { en: "Yesterday", de: "Gestern", vi: "Hôm qua" },
      },
      {
        id: "OTHER_DATE",
        label: { en: "Another date", de: "Anderes Datum", vi: "Ngày khác" },
      },
    ],
  },
};

export const RequestCashClarificationInputSchema = z.object({
  clarificationType: z.nativeEnum(CashClarificationType),
  amountCents: z.number().int().positive().optional(),
  locale: z.enum(["en", "de", "vi"]).default("en"),
  context: z.record(z.string(), z.any()).optional(),
});

export type RequestCashClarificationInput = z.infer<typeof RequestCashClarificationInputSchema>;

export const RequestCashClarificationOutputSchema = z.object({
  clarificationId: z.string(),
  choiceId: z.nativeEnum(CashClarificationChoiceId),
  label: z.string(),
});

export type RequestCashClarificationOutput = z.infer<typeof RequestCashClarificationOutputSchema>;
