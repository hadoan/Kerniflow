export interface GlossaryLocalizedContent {
  title: string;
  meaning: string;
  whenToUse: string;
}

export interface GlossaryEntry {
  aliases: string[];
  en: GlossaryLocalizedContent;
  de: GlossaryLocalizedContent;
  vi: GlossaryLocalizedContent;
}

export type Glossary = Record<string, GlossaryEntry>;

export const glossary: Glossary = {
  opening_balance: {
    aliases: [
      "opening balance",
      "start balance",
      "opening cash",
      "anfangsbestand",
      "số dư đầu ngày",
      "so du dau ngay",
      "số dư ban đầu",
      "tiền mặt đầu ngày",
    ],
    en: {
      title: "Opening balance",
      meaning:
        "The cash amount in the drawer at the start of the day before new entries are recorded.",
      whenToUse: "Use it as the baseline for today's expected closing balance.",
    },
    de: {
      title: "Anfangsbestand",
      meaning: "Der Bargeldbestand zu Beginn des Tages, bevor neue Eintraege gebucht werden.",
      whenToUse: "Er ist die Grundlage fuer den erwarteten Tagesendbestand.",
    },
    vi: {
      title: "Số dư đầu ngày",
      meaning: "Số tiền mặt có trong ngăn kéo lúc bắt đầu ngày, trước khi ghi giao dịch mới.",
      whenToUse: "Dùng làm mốc để tính số dư cuối ngày dự kiến.",
    },
  },
  privateinlage: {
    aliases: [
      "privateinlage",
      "private deposit",
      "owner deposit",
      "nộp tiền cá nhân",
      "nop tien ca nhan",
      "nộp tiền riêng",
    ],
    en: {
      title: "Private deposit",
      meaning: "Cash the owner adds personally to the register, for example to prepare change.",
      whenToUse:
        "Record it when personal money is placed into the drawer so the balance stays explainable.",
    },
    de: {
      title: "Privateinlage",
      meaning: "Bargeld, das der Inhaber privat in die Kasse legt, zum Beispiel fuer Wechselgeld.",
      whenToUse: "Buche es, wenn privates Geld in die Kasse eingelegt wird.",
    },
    vi: {
      title: "Nộp tiền cá nhân",
      meaning: "Tiền mặt chủ salon bỏ thêm vào quỹ, ví dụ để có tiền lẻ.",
      whenToUse: "Ghi lại khi tiền cá nhân được thêm vào ngăn kéo tiền mặt.",
    },
  },
  privatentnahme: {
    aliases: [
      "privatentnahme",
      "private withdrawal",
      "owner withdrawal",
      "rút tiền cá nhân",
      "rut tien ca nhan",
      "rút tiền riêng",
    ],
    en: {
      title: "Private withdrawal",
      meaning: "Cash the owner removes personally from the register.",
      whenToUse:
        "Record it whenever money is taken out for private use so the register stays reconciled.",
    },
    de: {
      title: "Privatentnahme",
      meaning: "Bargeld, das der Inhaber privat aus der Kasse entnimmt.",
      whenToUse: "Buche es immer, wenn Geld privat aus der Kasse genommen wird.",
    },
    vi: {
      title: "Rút tiền cá nhân",
      meaning: "Tiền mặt chủ salon lấy ra khỏi quỹ để dùng cho việc riêng.",
      whenToUse: "Ghi lại mỗi lần tiền được lấy ra cho mục đích cá nhân.",
    },
  },
  counted_cash: {
    aliases: [
      "counted cash",
      "gezaehltes bargeld",
      "tiền đếm thực tế",
      "tien dem thuc te",
      "tiền kiểm kê",
    ],
    en: {
      title: "Counted cash",
      meaning: "The physical cash amount actually counted in the drawer at close time.",
      whenToUse: "Enter it before closing the day to compare real cash with the expected balance.",
    },
    de: {
      title: "Gezaehltes Bargeld",
      meaning: "Der tatsaechlich gezaehlte Bargeldbestand in der Kasse beim Abschluss.",
      whenToUse: "Erfasse ihn vor dem Tagesabschluss zum Abgleich mit dem Sollbestand.",
    },
    vi: {
      title: "Tiền đếm thực tế",
      meaning: "Số tiền mặt đếm được thực tế trong ngăn kéo lúc kết ngày.",
      whenToUse: "Nhập trước khi đóng ngày để so sánh với số dư dự kiến.",
    },
  },
  difference: {
    aliases: [
      "difference",
      "differenz",
      "chênh lệch",
      "chenh lech",
      "balance short",
      "balance over",
    ],
    en: {
      title: "Difference",
      meaning: "The gap between expected cash and counted cash.",
      whenToUse:
        "Review it immediately. A non-zero difference should be explained before or during closing.",
    },
    de: {
      title: "Differenz",
      meaning: "Die Abweichung zwischen Sollbestand und gezaehltem Bargeld.",
      whenToUse:
        "Pruefe sie sofort. Eine Abweichung sollte vor oder beim Abschluss erklaert werden.",
    },
    vi: {
      title: "Chênh lệch",
      meaning: "Khoảng cách giữa số dư dự kiến và tiền đếm thực tế.",
      whenToUse: "Cần kiểm tra ngay. Nếu khác 0 thì phải giải thích trước hoặc khi đóng ngày.",
    },
  },
};

export const normalizeTerm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
};

export const resolveGlossaryEntry = (term: string): GlossaryEntry | undefined => {
  const normalized = term.trim().toLowerCase();
  return Object.values(glossary).find((entry) =>
    entry.aliases.some((alias) => alias.toLowerCase() === normalized)
  );
};

export const fuzzyResolveGlossaryEntry = (term: string): GlossaryEntry | undefined => {
  const norm = normalizeTerm(term);
  if (!norm) {
    return undefined;
  }

  // 1. Substring containment
  const substringHit = Object.values(glossary).find((entry) =>
    entry.aliases.some((alias) => {
      const normAlias = normalizeTerm(alias);
      return normAlias.includes(norm) || norm.includes(normAlias);
    })
  );
  if (substringHit) {
    return substringHit;
  }

  // 2. Levenshtein distance <= 2
  return Object.values(glossary).find((entry) =>
    entry.aliases.some((alias) => levenshtein(normalizeTerm(alias), norm) <= 2)
  );
};
