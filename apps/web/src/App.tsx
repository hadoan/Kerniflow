import React from "react";
import { useTranslation } from "react-i18next";
import { mockReceipts } from "@kerniflow/contracts";

export default function App() {
  const { t, i18n } = useTranslation();

  const toggleLang = () => i18n.changeLanguage(i18n.language === "en" ? "de" : "en");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-300">{t("subtitle")}</p>
          </div>
          <button
            onClick={toggleLang}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            {t("switchLang")} ({i18n.language})
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-12 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-semibold">{t("chat")}</h2>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
            <p className="font-medium">👋 “Add this receipt as an expense and categorize it.”</p>
            <p className="mt-2 text-zinc-400">
              (Mock) Next step: connect to your tool-driven agent, streaming responses.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl bg-teal-400/15 px-4 py-2 text-sm text-teal-200 hover:bg-teal-400/20">
              {t("uploadReceipt")}
            </button>
            <button className="rounded-xl bg-indigo-400/15 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-400/20">
              {t("generateInvoice")}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-semibold">{t("receipts")}</h2>
          <ul className="mt-4 space-y-3">
            {mockReceipts.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.merchant}</div>
                  <div className="text-sm text-zinc-300">{(r.totalCents / 100).toFixed(2)} {r.currency}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  VAT {Math.round(r.vatRate * 100)}% · {r.category ?? "Uncategorized"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
