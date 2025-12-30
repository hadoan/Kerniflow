import type { ClockPort } from "@corely/kernel";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
