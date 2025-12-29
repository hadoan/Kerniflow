import { ValidationError } from "../application/errors";

export type TimeZoneId = string & { __brand?: "TimeZoneId" };

export function isValidTimeZoneId(tz: string | undefined | null): tz is TimeZoneId {
  if (!tz) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function assertTimeZoneId(tz: string | undefined | null): TimeZoneId {
  if (!isValidTimeZoneId(tz)) {
    throw new ValidationError("Invalid or missing timezone", { timeZone: tz });
  }
  return tz;
}
