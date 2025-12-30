import { Logger, type LoggerService } from "@nestjs/common";
import { type LoggerPort } from "@corely/kernel/ports/logger.port";

export class NestLoggerAdapter implements LoggerPort {
  constructor(private readonly logger: LoggerService = new Logger("UseCase")) {}

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.logger.debug?.(this.format(msg, meta));
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this.logger.log(this.format(msg, meta));
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.logger.warn(this.format(msg, meta));
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.logger.error(this.format(msg, meta));
  }

  private format(msg: string, meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) {
      return msg;
    }
    return `${msg} ${JSON.stringify(meta)}`;
  }
}
