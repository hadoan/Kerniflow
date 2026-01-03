export interface ClockPort {
  now(): Date;
}

// Re-export canonical token to avoid identity mismatches
export { CLOCK_PORT_TOKEN } from "../tokens";
