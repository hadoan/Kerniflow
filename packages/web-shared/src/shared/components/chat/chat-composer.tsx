import type { ChangeEvent, FormEvent, RefObject } from "react";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { Button, Textarea } from "@corely/ui";

interface ChatComposerProps {
  input: string;
  placeholder: string;
  isLoading: boolean;
  pendingFiles: File[];
  attachmentError: string | null;
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  removePendingFile: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  composerRef?: RefObject<HTMLFormElement>;
  inputRef?: RefObject<HTMLTextAreaElement>;
  sendLabel: string;
  sendingLabel: string;
  canSubmit: boolean;
  addAttachmentLabel: string;
  removeAttachmentLabel: string;
}

export function ChatComposer({
  input,
  placeholder,
  isLoading,
  pendingFiles,
  attachmentError,
  onInputChange,
  onSubmit,
  onFileSelection,
  removePendingFile,
  fileInputRef,
  composerRef,
  inputRef,
  sendLabel,
  sendingLabel,
  canSubmit,
  addAttachmentLabel,
  removeAttachmentLabel,
}: ChatComposerProps) {
  return (
    <form
      ref={composerRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={onFileSelection}
      />
      {pendingFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            return (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs"
              >
                {isImage ? (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="max-w-[240px] truncate">{file.name}</span>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => removePendingFile(index)}
                  aria-label={removeAttachmentLabel}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      {attachmentError ? <div className="text-xs text-destructive">{attachmentError}</div> : null}
      <div className="glass flex items-end gap-2 rounded-2xl p-2 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.6)]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-xl"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          aria-label={addAttachmentLabel}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={inputRef}
          value={input}
          onChange={onInputChange}
          placeholder={placeholder}
          rows={1}
          className="min-h-11 max-h-32 flex-1 resize-none border-transparent bg-transparent text-base shadow-none focus:border-transparent focus:ring-0"
          disabled={isLoading}
          data-testid="cash-assistant-message-input"
        />
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="h-11 shrink-0 px-4 sm:px-6"
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? sendingLabel : sendLabel}
        </Button>
      </div>
    </form>
  );
}
