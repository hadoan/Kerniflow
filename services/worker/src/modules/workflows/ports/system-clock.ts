import type { ClockPort } from "@kerniflow/kernel";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
