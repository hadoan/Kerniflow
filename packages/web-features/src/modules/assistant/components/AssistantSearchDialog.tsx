import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@corely/ui";
import { type CopilotThreadSearchResult } from "@corely/web-shared/lib/copilot-api";

export interface AssistantSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  debouncedSearchText: string;
  isLoading: boolean;
  results: CopilotThreadSearchResult[];
  onSelectResult: (result: CopilotThreadSearchResult) => void;
}

export function AssistantSearchDialog({
  open,
  onOpenChange,
  searchText,
  onSearchTextChange,
  debouncedSearchText,
  isLoading,
  results,
  onSelectResult,
}: AssistantSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search chats</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Search messages..."
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {isLoading ? <div className="text-sm text-muted-foreground">Searching…</div> : null}

            {!isLoading && debouncedSearchText.length <= 1 ? (
              <div className="text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </div>
            ) : null}

            {!isLoading && debouncedSearchText.length > 1 && !results.length ? (
              <div className="text-sm text-muted-foreground">No matching messages found.</div>
            ) : null}

            {results.map((item) => (
              <button
                key={`${item.threadId}:${item.messageId}`}
                type="button"
                onClick={() => onSelectResult(item)}
                className="w-full rounded-lg border border-border/60 bg-background p-3 text-left hover:border-border"
              >
                <div className="truncate text-sm font-semibold text-foreground">
                  {item.threadTitle}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.snippet || "(No preview)"}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {format(new Date(item.createdAt), "PP p")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
