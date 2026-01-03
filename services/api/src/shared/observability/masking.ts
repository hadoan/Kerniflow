import { type JsonValue } from "@corely/kernel";

type MaskingMode = "off" | "standard" | "strict";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\+?[0-9][0-9\s().-]{6,}[0-9]/g;
const TOKEN_REGEX = /(sk-[a-zA-Z0-9]{10,}|pk-[a-zA-Z0-9]{10,}|eyJ[a-zA-Z0-9_-]{20,})/g;

const STRICT_PLACEHOLDER = "[redacted]";

export function maskString(input: string, mode: MaskingMode): string {
  if (mode === "off") {
    return input;
  }
  const placeholder = mode === "strict" ? STRICT_PLACEHOLDER : "[masked]";
  return input
    .replace(TOKEN_REGEX, placeholder)
    .replace(EMAIL_REGEX, placeholder)
    .replace(PHONE_REGEX, placeholder);
}

export function maskJsonValue(value: JsonValue, mode: MaskingMode): JsonValue {
  if (mode === "off") {
    return value;
  }
  if (value === null) {
    return value;
  }
  if (typeof value === "string") {
    return maskString(value, mode);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => maskJsonValue(item, mode));
  }
  const result: { [key: string]: JsonValue } = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = maskJsonValue(val, mode);
  }
  return result;
}

export function maskJsonString(value: string, mode: MaskingMode): string {
  if (mode === "off") {
    return value;
  }
  try {
    const parsed = JSON.parse(value) as JsonValue;
    const masked = maskJsonValue(parsed, mode);
    return JSON.stringify(masked);
  } catch {
    return maskString(value, mode);
  }
}
