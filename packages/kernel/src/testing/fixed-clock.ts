import { type ClockPort } from "../ports/clock.port";

export class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return new Date(this.fixedDate);
  }
}
