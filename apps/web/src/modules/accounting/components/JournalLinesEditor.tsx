import React, { type FC } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { AccountSelect } from "./AccountSelect";
import { Money } from "./Money";
import type { LineDirection } from "@corely/contracts";

interface JournalLine {
  ledgerAccountId: string;
  direction: LineDirection;
  amountCents: number;
  currency: string;
  lineMemo?: string | null;
}

interface JournalLinesEditorProps {
  control: Control<Record<string, unknown>>;
  fieldName: string;
  currency: string;
  disabled?: boolean;
}

/**
 * Editor for journal entry lines with debit/credit columns and automatic balance calculation
 */
export const JournalLinesEditor: FC<JournalLinesEditorProps> = ({
  control,
  fieldName,
  currency,
  disabled = false,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const lines = fields as Array<JournalLine & { id: string }>;

  // Calculate totals
  const totalDebits = lines
    .filter((line) => line.direction === "Debit")
    .reduce((sum, line) => sum + (line.amountCents || 0), 0);

  const totalCredits = lines
    .filter((line) => line.direction === "Credit")
    .reduce((sum, line) => sum + (line.amountCents || 0), 0);

  const imbalance = totalDebits - totalCredits;
  const isBalanced = imbalance === 0 && totalDebits > 0;

  const addLine = () => {
    append({
      ledgerAccountId: "",
      direction: "Debit" as LineDirection,
      amountCents: 0,
      currency,
      lineMemo: undefined,
      tags: [],
    } as JournalLine & { id: string });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Journal Lines</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          Add Line
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
          <p>No lines yet. Click "Add Line" to start.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 text-sm font-medium">Account</th>
                <th className="text-left p-2 text-sm font-medium w-32">Type</th>
                <th className="text-right p-2 text-sm font-medium w-40">Debit</th>
                <th className="text-right p-2 text-sm font-medium w-40">Credit</th>
                <th className="text-left p-2 text-sm font-medium">Memo</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className="border-t">
                  <td className="p-2">
                    <AccountSelect
                      value={line.ledgerAccountId}
                      onValueChange={(value) => {
                        control._formValues[fieldName][index].ledgerAccountId = value;
                      }}
                      disabled={disabled}
                      placeholder="Select account..."
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={line.direction}
                      onValueChange={(value: LineDirection) => {
                        control._formValues[fieldName][index].direction = value;
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debit">Debit</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right">
                    {line.direction === "Debit" ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(line.amountCents || 0) / 100}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                          control._formValues[fieldName][index].amountCents = cents;
                        }}
                        disabled={disabled}
                        className="text-right font-mono"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {line.direction === "Credit" ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(line.amountCents || 0) / 100}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                          control._formValues[fieldName][index].amountCents = cents;
                        }}
                        disabled={disabled}
                        className="text-right font-mono"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      value={line.lineMemo || ""}
                      onChange={(e) => {
                        control._formValues[fieldName][index].lineMemo = e.target.value;
                      }}
                      disabled={disabled}
                      placeholder="Optional memo"
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={disabled || lines.length <= 2}
                      title={lines.length <= 2 ? "Minimum 2 lines required" : "Remove line"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted border-t-2">
              <tr>
                <td colSpan={2} className="p-2 font-semibold">
                  Totals
                </td>
                <td className="p-2 text-right">
                  <Money amountCents={totalDebits} currency={currency} />
                </td>
                <td className="p-2 text-right">
                  <Money amountCents={totalCredits} currency={currency} />
                </td>
                <td colSpan={2} className="p-2">
                  {!isBalanced && lines.length > 0 && (
                    <span className="text-sm text-destructive">
                      Imbalance:{" "}
                      <Money amountCents={Math.abs(imbalance)} currency={currency} showSign />
                    </span>
                  )}
                  {isBalanced && (
                    <span className="text-sm text-green-600 font-medium">✓ Balanced</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
