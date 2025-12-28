import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Sparkles,
  Receipt,
  FileText,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import {
  extractReceiptData,
  createExpense,
  generateInvoiceDraftFromPrompt,
  issueInvoice,
} from "@/shared/mock/mockApi";
import { getDb } from "@/shared/mock/mockDb";
import type { ExtractReceiptResult, CreateExpenseInput, Invoice } from "@/shared/types";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
  toolCall?: {
    name: string;
    status: "pending" | "running" | "completed" | "error";
    data?: unknown;
  };
  expenseForm?: ExtractReceiptResult;
  invoicePreview?: Invoice;
  createdExpenseId?: string;
  createdInvoiceId?: string;
}

const suggestions = [
  { key: "addReceipt", icon: Receipt },
  { key: "generateInvoice", icon: FileText },
  { key: "showExpenses", icon: Receipt },
  { key: "taxHelp", icon: AlertCircle },
];

export default function AssistantPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const db = getDb();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<Message, "id">) => {
    const newMessage = { ...message, id: Date.now().toString() };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const simulateTyping = async (text: string, messageId: string) => {
    let currentText = "";
    const words = text.split(" ");
    for (const word of words) {
      currentText += (currentText ? " " : "") + word;
      updateMessage(messageId, { content: currentText });
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) {
      return;
    }

    const userMessage = input.trim();
    const hasFile = !!selectedFile;

    addMessage({
      role: "user",
      content: userMessage || "Process this receipt",
      attachments: hasFile ? [{ name: selectedFile!.name, type: "receipt" }] : undefined,
    });

    setInput("");
    setSelectedFile(null);
    setIsProcessing(true);

    try {
      // Check for receipt flow
      if (
        hasFile ||
        userMessage.toLowerCase().includes("receipt") ||
        userMessage.toLowerCase().includes("expense") ||
        userMessage.toLowerCase().includes("beleg") ||
        userMessage.toLowerCase().includes("ausgabe")
      ) {
        await handleReceiptFlow(userMessage);
      }
      // Check for invoice flow
      else if (
        userMessage.toLowerCase().includes("invoice") ||
        userMessage.toLowerCase().includes("rechnung")
      ) {
        await handleInvoiceFlow(userMessage);
      }
      // Check for tax question
      else if (
        userMessage.toLowerCase().includes("deduct") ||
        userMessage.toLowerCase().includes("tax") ||
        userMessage.toLowerCase().includes("absetzen") ||
        userMessage.toLowerCase().includes("steuer")
      ) {
        await handleTaxQuestion();
      }
      // Default response
      else {
        const assistantId = addMessage({ role: "assistant", content: "" });
        await simulateTyping(
          i18n.language === "de"
            ? "Ich kann Ihnen helfen mit: Belege als Ausgaben erfassen, Rechnungen erstellen, oder Ihre Ausgaben anzeigen. Was möchten Sie tun?"
            : "I can help you with: adding receipts as expenses, creating invoices, or showing your expenses. What would you like to do?",
          assistantId
        );
      }
    } catch (_error) {
      addMessage({
        role: "assistant",
        content: t("common.error"),
      });
    }

    setIsProcessing(false);
  };

  const handleReceiptFlow = async (_userMessage: string) => {
    // Step 1: Show extracting tool card
    const toolMessageId = addMessage({
      role: "assistant",
      content: "",
      toolCall: { name: "extract_receipt_data", status: "running" },
    });

    // Simulate extraction
    const extractedData = await extractReceiptData("mock-file-id");

    updateMessage(toolMessageId, {
      toolCall: { name: "extract_receipt_data", status: "completed", data: extractedData },
      expenseForm: extractedData,
      content:
        i18n.language === "de"
          ? "Ich habe die Belegdaten extrahiert. Bitte bestätigen Sie die Details:"
          : "I've extracted the receipt data. Please confirm the details:",
    });
  };

  const handleConfirmExpense = async (messageId: string, data: ExtractReceiptResult) => {
    setIsProcessing(true);

    // Update to show creating
    updateMessage(messageId, {
      toolCall: { name: "create_expense", status: "running" },
    });

    const expenseInput: CreateExpenseInput = {
      merchant: data.merchant,
      date: data.date,
      amountCents: data.totalCents,
      vatRate: data.vatRate,
      category: data.suggestedCategory,
    };

    const expense = await createExpense(expenseInput, `expense-${Date.now()}`);

    updateMessage(messageId, {
      expenseForm: undefined,
      toolCall: { name: "create_expense", status: "completed" },
      createdExpenseId: expense.id,
      content:
        i18n.language === "de"
          ? `✓ Ausgabe erfolgreich erstellt: ${expense.merchant} - ${formatMoney(expense.amountCents, locale)}`
          : `✓ Expense created successfully: ${expense.merchant} - ${formatMoney(expense.amountCents, locale)}`,
    });

    setIsProcessing(false);
  };

  const handleInvoiceFlow = async (userMessage: string) => {
    // Try to find customer name in message
    const customers = db.customers;
    let matchedCustomer = customers.find(
      (c) =>
        userMessage.toLowerCase().includes(c.company?.toLowerCase() || "") ||
        userMessage.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!matchedCustomer) {
      // Default to first customer for demo
      matchedCustomer = customers[0];
    }

    const toolMessageId = addMessage({
      role: "assistant",
      content:
        i18n.language === "de"
          ? `Erstelle Rechnungsentwurf für ${matchedCustomer.company || matchedCustomer.name}...`
          : `Generating invoice draft for ${matchedCustomer.company || matchedCustomer.name}...`,
      toolCall: { name: "generate_invoice_draft", status: "running" },
    });

    const invoice = await generateInvoiceDraftFromPrompt(matchedCustomer.id, "November");

    updateMessage(toolMessageId, {
      toolCall: { name: "generate_invoice_draft", status: "completed" },
      invoicePreview: invoice,
      content:
        i18n.language === "de"
          ? "Rechnungsentwurf erstellt. Bitte überprüfen Sie die Details:"
          : "Invoice draft generated. Please review the details:",
    });
  };

  const handleIssueInvoice = async (messageId: string, invoice: Invoice) => {
    setIsProcessing(true);

    updateMessage(messageId, {
      toolCall: { name: "issue_invoice", status: "running" },
    });

    const issuedInvoice = await issueInvoice(invoice.id, `issue-${Date.now()}`);

    updateMessage(messageId, {
      invoicePreview: undefined,
      toolCall: { name: "issue_invoice", status: "completed" },
      createdInvoiceId: issuedInvoice?.id,
      content:
        i18n.language === "de"
          ? `✓ Rechnung ${issuedInvoice?.invoiceNumber} ausgestellt - ${formatMoney(issuedInvoice?.totalCents || 0, locale)}`
          : `✓ Invoice ${issuedInvoice?.invoiceNumber} issued - ${formatMoney(issuedInvoice?.totalCents || 0, locale)}`,
    });

    setIsProcessing(false);
  };

  const handleTaxQuestion = async () => {
    const assistantId = addMessage({ role: "assistant", content: "" });

    const response =
      i18n.language === "de"
        ? `Als Freiberufler in Deutschland können Sie in der Regel folgende Ausgaben absetzen:

• **Arbeitsmittel**: Computer, Software, Büromaterial
• **Homeoffice**: Anteilige Miete, Internet, Strom
• **Reisekosten**: Fahrtkosten, Übernachtungen, Verpflegungsmehraufwand
• **Fortbildung**: Kurse, Fachliteratur, Konferenzen
• **Versicherungen**: Berufshaftpflicht, Krankenversicherung
• **Telefon/Internet**: Geschäftlicher Anteil

⚠️ ${t("assistant.disclaimer")}`
        : `As a freelancer in Germany, you can typically deduct:

• **Work equipment**: Computer, software, office supplies
• **Home office**: Proportional rent, internet, electricity
• **Travel costs**: Transportation, accommodation, meal allowances
• **Education**: Courses, professional literature, conferences
• **Insurance**: Professional liability, health insurance
• **Phone/Internet**: Business portion

⚠️ ${t("assistant.disclaimer")}`;

    await simulateTyping(response, assistantId);
  };

  const handleSuggestionClick = (key: string) => {
    const suggestionTexts: Record<string, { de: string; en: string }> = {
      addReceipt: {
        de: "Diesen Beleg als Ausgabe hinzufügen",
        en: "Add this receipt as an expense",
      },
      generateInvoice: {
        de: "Rechnung für Müller GmbH erstellen",
        en: "Generate invoice for Müller GmbH",
      },
      showExpenses: { de: "Zeige meine Ausgaben diesen Monat", en: "Show my expenses this month" },
      taxHelp: { de: "Was kann ich in Deutschland absetzen?", en: "What can I deduct in Germany?" },
    };
    setInput(suggestionTexts[key][i18n.language === "de" ? "de" : "en"]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t("assistant.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("common.tagline")}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" data-testid="assistant-messages">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10 mb-4">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {i18n.language === "de" ? "Wie kann ich Ihnen helfen?" : "How can I help you?"}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {i18n.language === "de"
                  ? "Laden Sie einen Beleg hoch, erstellen Sie eine Rechnung, oder fragen Sie mich etwas."
                  : "Upload a receipt, create an invoice, or ask me anything."}
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.key}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleSuggestionClick(suggestion.key)}
                  >
                    <suggestion.icon className="h-4 w-4" />
                    {t(`assistant.suggestions.${suggestion.key}`)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                )}

                <div
                  className={cn("max-w-[80%] space-y-3", message.role === "user" && "text-right")}
                >
                  {/* Attachments */}
                  {message.attachments?.map((att, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm"
                    >
                      <Paperclip className="h-4 w-4" />
                      {att.name}
                    </div>
                  ))}

                  {/* Tool call card */}
                  {message.toolCall && (
                    <Card
                      className={cn(
                        "overflow-hidden",
                        message.toolCall.status === "running" && "animate-pulse-glow"
                      )}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        {message.toolCall.status === "running" ? (
                          <Loader2 className="h-5 w-5 text-accent animate-spin" />
                        ) : message.toolCall.status === "completed" ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : (
                          <X className="h-5 w-5 text-danger" />
                        )}
                        <span className="text-sm font-medium">
                          {t(
                            `assistant.toolCards.${
                              message.toolCall.name === "extract_receipt_data"
                                ? "extractingReceipt"
                                : message.toolCall.name === "create_expense"
                                  ? "creatingExpense"
                                  : message.toolCall.name === "generate_invoice_draft"
                                    ? "generatingInvoice"
                                    : "issuingInvoice"
                            }`
                          )}
                        </span>
                      </CardContent>
                    </Card>
                  )}

                  {/* Message content */}
                  {message.content && (
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    </div>
                  )}

                  {/* Expense confirmation form */}
                  {message.expenseForm && (
                    <Card className="overflow-hidden">
                      <CardContent className="p-4 space-y-4">
                        <div className="text-sm font-medium">{t("assistant.confirmExpense")}</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">{t("expenses.merchant")}</div>
                            <div className="font-medium">{message.expenseForm.merchant}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t("expenses.amount")}</div>
                            <div className="font-medium">
                              {formatMoney(message.expenseForm.totalCents, locale)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t("expenses.date")}</div>
                            <div className="font-medium">
                              {formatDate(message.expenseForm.date, locale)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t("expenses.category")}</div>
                            <div className="font-medium">
                              {t(`expenses.categories.${message.expenseForm.suggestedCategory}`)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t("expenses.vat")}</div>
                            <div className="font-medium">{message.expenseForm.vatRate}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Confidence</div>
                            <div className="font-medium">
                              {Math.round(message.expenseForm.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="accent"
                            size="sm"
                            data-testid="assistant-confirm"
                            onClick={() => handleConfirmExpense(message.id, message.expenseForm!)}
                            disabled={isProcessing}
                          >
                            <Check className="h-4 w-4" />
                            {t("common.confirm")}
                          </Button>
                          <Button variant="outline" size="sm">
                            {t("common.edit")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Invoice preview */}
                  {message.invoicePreview && (
                    <Card className="overflow-hidden">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{t("assistant.invoicePreview")}</div>
                          <Badge variant="draft">{t("invoices.statuses.draft")}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t("invoices.invoiceNumber")}
                            </span>
                            <span className="font-medium">
                              {message.invoicePreview.invoiceNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("invoices.client")}</span>
                            <span className="font-medium">
                              {
                                db.customers.find(
                                  (c) => c.id === message.invoicePreview?.customerId
                                )?.company
                              }
                            </span>
                          </div>
                          <div className="border-t border-border pt-2 mt-2">
                            {message.invoicePreview.items.map((item) => (
                              <div key={item.id} className="flex justify-between py-1">
                                <span className="text-muted-foreground">
                                  {item.description} ({item.quantity}x)
                                </span>
                                <span>{formatMoney(item.totalCents, locale)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-border pt-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {t("invoices.subtotal")}
                              </span>
                              <span>
                                {formatMoney(message.invoicePreview.subtotalCents, locale)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {t("invoices.vatAmount")}
                              </span>
                              <span>
                                {formatMoney(message.invoicePreview.vatAmountCents, locale)}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>{t("invoices.total")}</span>
                              <span>{formatMoney(message.invoicePreview.totalCents, locale)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => handleIssueInvoice(message.id, message.invoicePreview!)}
                            disabled={isProcessing}
                          >
                            {t("assistant.issueInvoice")}
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to="/invoices">
                              {t("invoices.actions.preview")}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Created links */}
                  {message.createdExpenseId && (
                    <Button variant="accent-outline" size="sm" asChild>
                      <Link to="/expenses">
                        {t("assistant.openExpense")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                  {message.createdInvoiceId && (
                    <Button variant="accent-outline" size="sm" asChild>
                      <Link to="/invoices">
                        {t("assistant.openInvoice")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary-foreground">
                      {db.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isProcessing && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-muted">
                <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {selectedFile && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-muted text-sm">
              <Paperclip className="h-4 w-4" />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
              disabled={isProcessing}
              data-testid="assistant-input"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="accent"
              size="icon"
              data-testid="assistant-submit"
              disabled={isProcessing || (!input.trim() && !selectedFile)}
              className="shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
