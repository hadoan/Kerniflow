import React, { useMemo, useState } from "react";
import { z } from "zod";
import {
  type CollectInputsToolInput,
  type CollectInputField,
  type CollectInputsToolOutput,
} from "@corely/contracts";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Card, CardContent } from "@/shared/ui/card";

type Props = {
  request: CollectInputsToolInput;
  onSubmit: (output: CollectInputsToolOutput) => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  disabled?: boolean;
};

type FieldErrors = Record<string, string | undefined>;

const buildSchema = (field: CollectInputField): z.ZodTypeAny => {
  if (field.type === "number") {
    let schema = z.number();
    if (field.min !== undefined) {
      schema = schema.min(field.min);
    }
    if (field.max !== undefined) {
      schema = schema.max(field.max);
    }
    return field.required ? schema : schema.optional();
  } else {
    let schema = z.string();
    if (field.minLength !== undefined) {
      schema = schema.min(field.minLength);
    }
    if (field.maxLength !== undefined) {
      schema = schema.max(field.maxLength);
    }
    if (field.pattern) {
      schema = schema.regex(new RegExp(field.pattern));
    }
    return field.required ? schema : schema.optional();
  }
};

export const QuestionForm: React.FC<Props> = ({ request, onSubmit, onCancel, disabled }) => {
  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(request.fields.map((f) => [f.key, f.defaultValue ?? ""]))
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validators = useMemo(
    () =>
      z.object(
        Object.fromEntries(request.fields.map((field) => [field.key, buildSchema(field)]))
      ) as z.ZodSchema<Record<string, unknown>>,
    [request.fields]
  );

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const parsed = validators.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return { ok: true as const, data: parsed.data };
    }
    const fieldErrors: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const pathKey = issue.path[0] as string;
      fieldErrors[pathKey] = issue.message;
    });
    setErrors(fieldErrors);
    return { ok: false as const };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate();
    if (!result.ok) {
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      values,
      meta: { filledAt: new Date().toISOString(), editedKeys: Object.keys(values) },
    });
    setIsSubmitting(false);
  };

  const renderField = (field: CollectInputField) => {
    const error = errors[field.key];
    const commonProps = {
      id: field.key,
      disabled: disabled || isSubmitting,
      placeholder: field.placeholder,
      "aria-invalid": Boolean(error),
    };
    if (field.type === "textarea") {
      return (
        <Textarea
          {...commonProps}
          value={(values[field.key] as string) ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
        />
      );
    }
    if (field.type === "number") {
      return (
        <Input
          type="number"
          {...commonProps}
          value={(values[field.key] as number | string | undefined) ?? ""}
          onChange={(e) =>
            handleChange(field.key, e.target.value === "" ? "" : Number(e.target.value))
          }
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    }
    if (field.type === "select") {
      const options = field.options || [];
      return (
        <Select
          disabled={disabled || isSubmitting}
          value={(values[field.key] as string | undefined) ?? ""}
          onValueChange={(value) => handleChange(field.key, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type="text"
        {...commonProps}
        value={(values[field.key] as string) ?? ""}
        onChange={(e) => handleChange(field.key, e.target.value)}
      />
    );
  };

  return (
    <Card className="border-border bg-muted/40">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{request.title}</div>
          {request.description ? (
            <div className="text-xs text-muted-foreground">{request.description}</div>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {request.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={field.key} className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.helpText || field.patternLabel ? (
                  <span className="text-[11px] text-muted-foreground">
                    {field.helpText || field.patternLabel}
                  </span>
                ) : null}
              </div>
              {renderField(field)}
              {errors[field.key] ? (
                <div className="text-xs text-destructive">{errors[field.key]}</div>
              ) : null}
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="submit" disabled={disabled || isSubmitting} size="sm">
              {request.submitLabel || "Submit"}
            </Button>
            {request.allowCancel !== false && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled || isSubmitting}
                onClick={async () => {
                  if (onCancel) {
                    await onCancel();
                  }
                  await onSubmit({
                    values: {},
                    meta: { cancelled: true, filledAt: new Date().toISOString() },
                  });
                }}
              >
                {request.cancelLabel || "Cancel"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
