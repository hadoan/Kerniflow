import { type LoggerPort } from "../ports/logger.port";

export class NoopLogger implements LoggerPort {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
