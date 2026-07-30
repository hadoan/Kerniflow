import { z } from "zod";

export const CashClarificationType = {
  MONEY_DESTINATION: "MONEY_DESTINATION",
  MONEY_SOURCE: "MONEY_SOURCE",
  CASH_FUND_SCOPE: "CASH_FUND_SCOPE",
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

  // MONEY_SOURCE
  STILL_IN_CURRENT_FUND: "STILL_IN_CURRENT_FUND",
  ALREADY_RECORDED_OUT: "ALREADY_RECORDED_OUT",
  OTHER_REGISTER: "OTHER_REGISTER",
  PRIVATE_FUNDS: "PRIVATE_FUNDS",
  OTHER_BANK_ACCOUNT: "OTHER_BANK_ACCOUNT",
  NOT_SURE: "NOT_SURE",

  // CASH_FUND_SCOPE
  SAME_BUSINESS_CASH_FUND: "SAME_BUSINESS_CASH_FUND",
  SEPARATE_CASH_FUND: "SEPARATE_CASH_FUND",

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
  MONEY_SOURCE: {
    question: {
      en: "Where did this money come from?",
      de: "Woher stammt dieses Geld?",
      vi: "Số tiền này được lấy từ đâu?",
    },
    choices: [
      {
        id: "STILL_IN_CURRENT_FUND",
        label: {
          en: "Still belongs to current register balance",
          de: "Gehört noch zum aktuellen Kassenbestand",
          vi: "Vẫn thuộc số dư quỹ hiện tại",
        },
      },
      {
        id: "ALREADY_RECORDED_OUT",
        label: {
          en: "Already recorded as taken out",
          de: "Wurde bereits als Entnahme gebucht",
          vi: "Đã ghi lấy ra khỏi Kasse",
        },
      },
      {
        id: "OTHER_REGISTER",
        label: {
          en: "Belongs to another register/safe",
          de: "Gehört zu einer anderen Kasse/Tresor",
          vi: "Thuộc một Kasse hoặc két tiền khác",
        },
      },
      {
        id: "PRIVATE_FUNDS",
        label: {
          en: "Private money",
          de: "Privates Geld",
          vi: "Tiền cá nhân",
        },
      },
      {
        id: "OTHER_BANK_ACCOUNT",
        label: {
          en: "Transfer from another bank account",
          de: "Überweisung von einem anderen Bankkonto",
          vi: "Chuyển từ một tài khoản ngân hàng khác",
        },
      },
      {
        id: "NOT_SURE",
        label: { en: "Not sure", de: "Nicht sicher", vi: "Không chắc" },
      },
    ],
  },
  CASH_FUND_SCOPE: {
    question: {
      en: "Does this cash still belong to the same business cash fund, just stored outside the drawer?",
      de: "Gehört dieses Bargeld weiterhin zur gleichen Geschäftskasse und wird nur außerhalb der Kassenschublade aufbewahrt?",
      vi: "Số tiền này vẫn thuộc cùng quỹ tiền mặt của tiệm, chỉ được cất trong két hoặc hộp khác đúng không?",
    },
    choices: [
      {
        id: "SAME_BUSINESS_CASH_FUND",
        label: {
          en: "Yes, it is still the same business cash fund",
          de: "Ja, es bleibt dieselbe Geschäftskasse",
          vi: "Đúng, vẫn thuộc cùng quỹ của tiệm",
        },
      },
      {
        id: "SEPARATE_CASH_FUND",
        label: {
          en: "No, it moved to a separate cash fund",
          de: "Nein, es wurde in eine separate Kasse übertragen",
          vi: "Không, đã chuyển sang một quỹ riêng",
        },
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
      en: "How much cash does the business have in total at closing, including cash in the drawer and cash stored in a safe or box?",
      de: "Wie viel Bargeld gehört der Geschäftskasse bei Geschäftsschluss insgesamt, einschließlich Bargeld in der Schublade und im Tresor oder einer Geldbox?",
      vi: "Cuối ngày, tổng cộng tiệm còn bao nhiêu tiền mặt thuộc quỹ, bao gồm tiền trong ngăn kéo và tiền đã cất trong két hoặc hộp?",
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
  resolutionId: z.string().uuid().optional(), // allow optional for legacy compat if needed, or strictly uuid
  answer: z.string().optional(),
});

export type RequestCashClarificationInput = z.infer<typeof RequestCashClarificationInputSchema>;

export const RequestCashClarificationOutputSchema = z.object({
  clarificationId: z.string(),
  choiceId: z.nativeEnum(CashClarificationChoiceId),
  label: z.string(),
});

export type RequestCashClarificationOutput = z.infer<typeof RequestCashClarificationOutputSchema>;

export const AnswerCashMovementResolutionInputSchema = z.object({
  resolutionId: z.string(),
  choiceId: z.nativeEnum(CashClarificationChoiceId).optional(),
  answerText: z.string().optional(),
});

export type AnswerCashMovementResolutionInput = z.infer<typeof AnswerCashMovementResolutionInputSchema>;
