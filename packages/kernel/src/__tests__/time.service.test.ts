import { describe, expect, it } from "vitest";
import { FixedClock } from "../testing/fixed-clock";
import { TimeService } from "../time/time.service";
import { TenantTimeZonePort } from "../time/ports/tenant-timezone.port";
import { LocalDate, addDays, parseLocalDate } from "../time/local-date";

class StaticTenantTimeZonePort implements TenantTimeZonePort {
  constructor(private readonly tz: string) {}

  async getTenantTimeZone(): Promise<string> {
    return this.tz;
  }
}

describe("TimeService", () => {
  it("returns today in tenant timezone across DST start (Europe/Berlin)", async () => {
    const clock = new FixedClock(new Date("2025-03-29T23:30:00Z")); // 00:30 local, DST starts later that night
    const service = new TimeService(clock, new StaticTenantTimeZonePort("Europe/Berlin"));

    const today = await service.todayInTenant("tenant-1");

    expect(today).toBe("2025-03-30");
  });

  it("converts local start of day to UTC at DST start", async () => {
    const clock = new FixedClock(new Date("2025-03-29T12:00:00Z"));
    const service = new TimeService(clock, new StaticTenantTimeZonePort("Europe/Berlin"));
    const localDate = parseLocalDate("2025-03-30");

    const startUtc = await service.localDateToTenantStartOfDayUtc("tenant-1", localDate);

    expect(startUtc.toISOString()).toBe("2025-03-29T23:00:00.000Z");
  });

  it("converts local start of day to UTC at DST end", async () => {
    const clock = new FixedClock(new Date("2025-10-25T12:00:00Z"));
    const service = new TimeService(clock, new StaticTenantTimeZonePort("Europe/Berlin"));
    const localDate = parseLocalDate("2025-10-26");

    const startUtc = await service.localDateToTenantStartOfDayUtc("tenant-1", localDate);

    expect(startUtc.toISOString()).toBe("2025-10-25T22:00:00.000Z");
  });

  it("maps instants near midnight into tenant local date", async () => {
    const clock = new FixedClock(new Date("2025-01-01T12:00:00Z"));
    const service = new TimeService(clock, new StaticTenantTimeZonePort("Asia/Tokyo"));

    const localDate = await service.instantToTenantLocalDate(
      "tenant-1",
      new Date("2025-01-01T15:30:00Z")
    );

    expect(localDate).toBe("2025-01-02");
  });

  it("adds days in tenant timezone safely across DST boundaries", () => {
    const localDate: LocalDate = parseLocalDate("2025-03-30");
    const result = addDays(localDate, 1, "Europe/Berlin");

    expect(result).toBe("2025-03-31");
  });
});
