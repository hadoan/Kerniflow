import { AlertCircle, FileText, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { Chat, type Suggestion } from "@/shared/components/Chat";

const suggestions: Suggestion[] = [
  {
    icon: Receipt,
    label: "Extract a receipt and create an expense",
    value: "I uploaded a receipt. Extract it and draft an expense.",
  },
  {
    icon: FileText,
    label: "Generate an invoice draft",
    value: "Generate an invoice draft for ACME GmbH for this month.",
  },
  {
    icon: TrendingUp,
    label: "Summarize my expenses",
    value: "Summarize my expenses for the last 30 days.",
  },
  {
    icon: AlertCircle,
    label: "Tax guidance",
    value: "What can I deduct as a freelancer in Germany?",
  },
];

export default function AssistantPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Ask anything, extract receipts, generate invoices, or request quick summaries.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6" data-testid="assistant-messages">
          <Chat
            activeModule="assistant"
            locale="en"
            placeholder="Ask anything..."
            suggestions={suggestions}
            emptyStateTitle="How can I help you?"
            emptyStateDescription="Ask anything, extract receipts, generate invoices, or request quick summaries."
          />
        </div>
      </main>
    </div>
  );
}
