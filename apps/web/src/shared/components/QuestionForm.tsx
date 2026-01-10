import React, { useMemo, useState } from "react";
import { z } from "zod";
import {
  type CollectInputsToolInput,
  type CollectInputField,
  type CollectInputsToolOutput,
} from "@corely/contracts";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
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

const EMPTY_SELECT_VALUE = "__empty__";

const toRegExp = (pattern: string) => {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    const body = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1);
    try {
      return new RegExp(body, flags);
    } catch {
      return undefined;
    }
  }

  try {
    return new RegExp(trimmed);
  } catch {
    return undefined;
  }
};

const buildSchema = (field: CollectInputField): z.ZodTypeAny => {
  if (field.type === "boolean") {
    const schema = z.boolean();
    return field.required ? schema : schema.optional();
  }
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
      const patternRegex = toRegExp(field.pattern);
      if (patternRegex) {
        schema = schema.regex(patternRegex);
      }
    }
    return field.required ? schema : schema.optional();
  }
};

export const QuestionForm: React.FC<Props> = ({ request, onSubmit, onCancel, disabled }) => {
  const fields = Array.isArray(request.fields) ? request.fields : [];

  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.defaultValue ?? (field.type === "boolean" ? false : ""),
      ])
    )
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validators = useMemo(
    () =>
      z.object(
        Object.fromEntries(fields.map((field) => [field.key, buildSchema(field)]))
      ) as z.ZodSchema<Record<string, unknown>>,
    [fields]
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
      "aria-invalid": Boolean(error),
    };
    if (field.type === "textarea") {
      return (
        <Textarea
          {...commonProps}
          placeholder={field.placeholder}
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
          placeholder={field.placeholder}
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
    if (field.type === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            {...commonProps}
            checked={Boolean(values[field.key])}
            onCheckedChange={(checked) => handleChange(field.key, checked === true)}
          />
          {field.placeholder ? (
            <span className="text-xs text-muted-foreground">{field.placeholder}</span>
          ) : null}
        </div>
      );
    }
    if (field.type === "date" || field.type === "datetime") {
      return (
        <Input
          type={field.type === "date" ? "date" : "datetime-local"}
          {...commonProps}
          placeholder={field.placeholder}
          value={(values[field.key] as string) ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
        />
      );
    }
    if (field.type === "select") {
      const options = field.options || [];
      const hasEmptyOption = options.some(
        (opt) => opt.value === "" || opt.value === null || opt.value === undefined
      );
      const normalizedOptions = options.map((opt) => {
        const rawValue = opt.value ?? "";
        const stringValue = String(rawValue);
        return {
          ...opt,
          value: stringValue === "" ? EMPTY_SELECT_VALUE : stringValue,
        };
      });
      const currentValue = values[field.key];
      const selectValue =
        currentValue === "" && hasEmptyOption
          ? EMPTY_SELECT_VALUE
          : currentValue === null || currentValue === undefined
            ? ""
            : String(currentValue);
      return (
        <Select
          disabled={disabled || isSubmitting}
          value={selectValue}
          onValueChange={(value) =>
            handleChange(field.key, value === EMPTY_SELECT_VALUE ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((opt, index) => (
              <SelectItem
                key={`${opt.value}-${index}`}
                value={String(opt.value)}
                disabled={opt.disabled}
              >
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
        placeholder={field.placeholder}
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
          {fields.map((field) => (
            <div
              key={field.key ?? field.label ?? field.placeholder ?? Math.random()}
              className="space-y-2"
            >
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
