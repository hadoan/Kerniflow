import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@corely/ui";
import type { CashEntry } from "@corely/contracts";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

export type ClosedDayConflict = {
  dayKey: string;
  closedAt: string | null;
  currentBalanceCents: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ClosedDayConflict | null;
  reason: string;
  setReason: (reason: string) => void;
  correctionType: "MISSING_ENTRY" | "REVERSE_ENTRY" | "REPLACE_ENTRY" | "BALANCE_EXPLANATION";
  setCorrectionType: (type: Props["correctionType"]) => void;
  correctionTypeLocked: boolean;
  originalEntries: CashEntry[];
  originalEntriesLoading: boolean;
  originalEntriesError: boolean;
  originalEntryId: string;
  setOriginalEntryId: (entryId: string) => void;
  registerCurrency: string;
  cashIsInRegister: boolean;
  setCashIsInRegister: (value: boolean) => void;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
};

export function ClosedDayCorrectionDialog(props: Props) {
  const {
    open,
    onOpenChange,
    conflict,
    reason,
    setReason,
    correctionType,
    setCorrectionType,
    correctionTypeLocked,
    originalEntries,
    originalEntriesLoading,
    originalEntriesError,
    originalEntryId,
    setOriginalEntryId,
    registerCurrency,
    cashIsInRegister,
    setCashIsInRegister,
    isPending,
    isError,
    onConfirm,
  } = props;
  const day = conflict?.dayKey
    ? new Date(`${conflict.dayKey}T00:00:00`).toLocaleDateString("vi-VN")
    : "";
  const closedAt = conflict?.closedAt ? new Date(conflict.closedAt).toLocaleString("vi-VN") : "";
  const needsOriginalEntry =
    correctionType === "REVERSE_ENTRY" || correctionType === "REPLACE_ENTRY";
  const needsCashConfirmation = correctionType === "MISSING_ENTRY";
  const canConfirm =
    reason.trim().length >= 3 &&
    (!needsOriginalEntry || originalEntryId.length > 0) &&
    (!needsCashConfirmation || cashIsInRegister);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Điều chỉnh ngày đã chốt</DialogTitle>
          <DialogDescription>
            Ngày {day} đã được chốt{closedAt ? ` lúc ${closedAt}` : ""}. Bút toán gốc không bị sửa
            hoặc xóa.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Không có giao dịch nào được tạo</AlertTitle>
          <AlertDescription>
            Số dư hiện tại vẫn là{" "}
            {formatMoney(conflict?.currentBalanceCents ?? 0, undefined, registerCurrency)}. Bút toán
            điều chỉnh sẽ được lưu kèm lịch sử và tạo revision mới của Kassenbericht.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="closed-day-correction-type">Loại điều chỉnh</Label>
            <select
              id="closed-day-correction-type"
              className="h-11 w-full rounded-md border bg-background px-3 text-base sm:h-10 sm:text-sm"
              value={correctionType}
              onChange={(event) => setCorrectionType(event.target.value as Props["correctionType"])}
              disabled={correctionTypeLocked}
            >
              <option value="MISSING_ENTRY">Thiếu doanh thu / giao dịch</option>
              <option value="REVERSE_ENTRY">Giao dịch trùng hoặc cần đảo</option>
              <option value="REPLACE_ENTRY">Sai số tiền hoặc thông tin</option>
              <option value="BALANCE_EXPLANATION">Giải thích chênh lệch quỹ</option>
            </select>
          </div>
          {needsOriginalEntry ? (
            <div className="space-y-1">
              <Label htmlFor="closed-day-original-entry">Bút toán gốc bắt buộc</Label>
              <select
                id="closed-day-original-entry"
                className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base sm:min-h-10 sm:text-sm"
                value={originalEntryId}
                onChange={(event) => setOriginalEntryId(event.target.value)}
                disabled={originalEntriesLoading}
              >
                <option value="">
                  {originalEntriesLoading ? "Đang tải bút toán…" : "Chọn bút toán cần sửa"}
                </option>
                {originalEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    #{entry.entryNo} · {entry.description} · {entry.direction === "OUT" ? "−" : "+"}
                    {formatMoney(entry.grossAmountCents, undefined, entry.currency)}
                  </option>
                ))}
              </select>
              {originalEntriesError ? (
                <p className="text-xs text-destructive">Không thể tải các bút toán của ngày này.</p>
              ) : null}
              {!originalEntriesLoading && !originalEntriesError && originalEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Không còn bút toán hợp lệ để đảo trong ngày này.
                </p>
              ) : null}
            </div>
          ) : null}
          {correctionType === "REVERSE_ENTRY" ? (
            <Alert>
              <AlertTitle>Hệ thống tự tạo bút toán ngược</AlertTitle>
              <AlertDescription>
                Số tiền, VAT và ngày nghiệp vụ được sao chép từ bút toán gốc; chiều thu/chi được đảo
                tự động. Dữ liệu đang nhập trong form sẽ không được dùng.
              </AlertDescription>
            </Alert>
          ) : null}
          {correctionType === "REPLACE_ENTRY" ? (
            <Alert>
              <AlertTitle>Đảo bút toán cũ và tạo bút toán đúng</AlertTitle>
              <AlertDescription>
                Hai bút toán được tạo cùng một transaction. Bút toán mới dùng số tiền, loại giao
                dịch và VAT bạn vừa nhập.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="closed-day-correction-reason">Lý do bắt buộc</Label>
            <Textarea
              id="closed-day-correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: Thiếu doanh thu tiền mặt 120 € trong Z-Bon ngày 31/07"
            />
          </div>
          {needsCashConfirmation ? (
            <p className="text-xs text-muted-foreground">
              Nếu tiền không còn trong quỹ, cần ghi rõ tiền đã được gửi ngân hàng, rút ra hay bị
              thiếu trước khi xác nhận.
            </p>
          ) : null}
          {needsCashConfirmation ? (
            <label className="flex gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={cashIsInRegister}
                onChange={(event) => setCashIsInRegister(event.target.checked)}
              />
              <span>
                Tôi xác nhận số tiền bị thiếu trong sổ hiện vẫn có trong quỹ. Nếu tiền đã rời quỹ,
                cần ghi thêm giao dịch tiền mặt thực tế tương ứng.
              </span>
            </label>
          ) : null}
          {isError ? (
            <p className="text-sm text-destructive">Không thể tạo bút toán điều chỉnh.</p>
          ) : null}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !canConfirm}>
            {isPending ? "Đang lưu…" : "Tạo bút toán điều chỉnh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
