import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import {
  UseCaseError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from "@corely/kernel";

/**
 * Global exception filter that maps domain errors to proper HTTP responses
 */
@Catch(UseCaseError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: UseCaseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Map domain errors to HTTP status codes
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
    } else if (exception instanceof NotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ConflictError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof UnauthorizedError) {
      status = HttpStatus.UNAUTHORIZED;
    } else if (exception instanceof ForbiddenError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof RateLimitError) {
      status = HttpStatus.TOO_MANY_REQUESTS;
    }

    // Log the error
    this.logger.error(`Domain error: ${exception.code} - ${exception.message}`, exception.stack);

    // Send error response
    response.status(status).json({
      statusCode: status,
      error: exception.code,
      message: exception.message,
      details: exception.details,
    });
  }
}
