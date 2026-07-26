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
      "so du dau ngay",
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
      title: "So du dau ngay",
      meaning: "So tien mat co trong ngan keo luc bat dau ngay truoc khi ghi giao dich moi.",
      whenToUse: "Dung lam moc de tinh so du cuoi ngay du kien.",
    },
  },
  privateinlage: {
    aliases: ["privateinlage", "private deposit", "owner deposit", "nop tien ca nhan"],
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
      title: "Nop tien ca nhan",
      meaning: "Tien mat chu salon bo them vao quy, vi du de co tien le.",
      whenToUse: "Ghi lai khi tien ca nhan duoc them vao ngan keo tien mat.",
    },
  },
  privatentnahme: {
    aliases: ["privatentnahme", "private withdrawal", "owner withdrawal", "rut tien ca nhan"],
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
      title: "Rut tien ca nhan",
      meaning: "Tien mat chu salon lay ra khoi quy de dung cho viec rieng.",
      whenToUse: "Ghi lai moi lan tien duoc lay ra cho muc dich ca nhan.",
    },
  },
  counted_cash: {
    aliases: ["counted cash", "gezaehltes bargeld", "tien dem thuc te"],
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
      title: "Tien dem thuc te",
      meaning: "So tien mat dem duoc thuc te trong ngan keo luc ket ngay.",
      whenToUse: "Nhap truoc khi dong ngay de so sanh voi so du du kien.",
    },
  },
  difference: {
    aliases: ["difference", "differenz", "chenh lech", "balance short", "balance over"],
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
      title: "Chenh lech",
      meaning: "Khoang cach giua so du du kien va tien dem thuc te.",
      whenToUse: "Can kiem tra ngay. Neu khac 0 thi phai giai thich truoc hoac khi dong ngay.",
    },
  },
};

export const resolveGlossaryEntry = (term: string): GlossaryEntry | undefined => {
  const normalized = term.trim().toLowerCase();
  return Object.values(glossary).find((entry) =>
    entry.aliases.some((alias) => alias.toLowerCase() === normalized)
  );
};
