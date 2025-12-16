import React from "react";
import ReactDOM from "react-dom/client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import App from "./App";
import "./style.css";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        title: "Kerniflow",
        subtitle: "Freelancer (Germany) demo — mock data",
        chat: "Assistant",
        receipts: "Receipts",
        switchLang: "Switch language",
        uploadReceipt: "Upload receipt (mock)",
        generateInvoice: "Generate invoice (mock)"
      }
    },
    de: {
      translation: {
        title: "Kerniflow",
        subtitle: "Freelancer (Deutschland) Demo — Mock-Daten",
        chat: "Assistent",
        receipts: "Belege",
        switchLang: "Sprache wechseln",
        uploadReceipt: "Beleg hochladen (Mock)",
        generateInvoice: "Rechnung erstellen (Mock)"
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
