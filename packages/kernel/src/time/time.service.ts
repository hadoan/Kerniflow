import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ValidationError } from "../application/errors";
import { type ClockPort } from "../ports/clock.port";
import { addDays, parseLocalDate, toIsoDateString, type LocalDate } from "./local-date";
import { type TimeZoneId, assertTimeZoneId } from "./time-zone";
import { type TenantTimeZonePort } from "./ports/tenant-timezone.port";

export class TimeService {
  constructor(
    private readonly clock: ClockPort,
    private readonly tenantTimeZone: TenantTimeZonePort,
    private readonly defaultTenantTimeZone: TimeZoneId = "UTC" as TimeZoneId
  ) {}

  nowUtc(): Date {
    const now = this.clock.now();
    return new Date(now);
  }

  async todayInTenant(tenantId: string): Promise<LocalDate> {
    const tz = await this.resolveTenantTimeZone(tenantId);
    return toIsoDateString(this.nowUtc(), tz);
  }

  async instantToTenantLocalDate(tenantId: string, instant: Date): Promise<LocalDate> {
    const tz = await this.resolveTenantTimeZone(tenantId);
    return toIsoDateString(instant, tz);
  }

  async localDateToTenantStartOfDayUtc(tenantId: string, localDate: LocalDate): Promise<Date> {
    const tz = await this.resolveTenantTimeZone(tenantId);
    parseLocalDate(localDate);
    return fromZonedTime(`${localDate}T00:00:00`, tz);
  }

  async localDateToTenantEndOfDayUtc(tenantId: string, localDate: LocalDate): Promise<Date> {
    const tz = await this.resolveTenantTimeZone(tenantId);
    const nextLocalDate = addDays(localDate, 1, tz);
    const startNextDayUtc = fromZonedTime(`${nextLocalDate}T00:00:00`, tz);
    return new Date(startNextDayUtc.getTime() - 1);
  }

  formatForUser(instant: Date, userTz?: TimeZoneId): string {
    if (!userTz) {
      return instant.toISOString();
    }
    const tz = assertTimeZoneId(userTz);
    return formatInTimeZone(instant, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  private async resolveTenantTimeZone(tenantId: string): Promise<TimeZoneId> {
    const tz =
      (await this.tenantTimeZone.getTenantTimeZone(tenantId)) ||
      (this.defaultTenantTimeZone as string);
    if (!tz) {
      return this.defaultTenantTimeZone;
    }
    try {
      return assertTimeZoneId(tz);
    } catch (error) {
      throw new ValidationError("Invalid tenant timezone", { tenantId, timeZone: tz });
    }
  }
}
