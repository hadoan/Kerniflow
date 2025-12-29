import { ValidationError } from "../application/errors";
import { addDays as addDaysFn } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { type TimeZoneId, assertTimeZoneId } from "./time-zone";

export type LocalDate = string & { __brand: "LocalDate" };

const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string") {
    return false;
  }
  if (!LOCAL_DATE_REGEX.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  return true;
}

export function parseLocalDate(value: unknown): LocalDate {
  if (!isLocalDate(value)) {
    throw new ValidationError("Invalid LocalDate format, expected YYYY-MM-DD");
  }
  return value;
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a.localeCompare(b);
}

export function addDays(localDate: LocalDate, days: number, tenantTz: TimeZoneId): LocalDate {
  parseLocalDate(localDate);
  assertTimeZoneId(tenantTz);
  const startUtc = fromZonedTime(`${localDate}T00:00:00`, tenantTz);
  const shifted = addDaysFn(startUtc, days);
  return formatInTimeZone(shifted, tenantTz, "yyyy-MM-dd") as LocalDate;
}

export function toIsoDateString(date: Date, tenantTz: TimeZoneId): LocalDate {
  assertTimeZoneId(tenantTz);
  return formatInTimeZone(date, tenantTz, "yyyy-MM-dd") as LocalDate;
}
