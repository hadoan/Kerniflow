export interface ClockPort {
  now(): Date;
}

export const CLOCK_PORT_TOKEN = "kernel/clock-port";
