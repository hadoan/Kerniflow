import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppError } from "@corely/domain";
import { ExceptionToProblemDetailsMapper } from "./exception-to-problem-details.mapper.js";

/**
 * Global exception filter that converts ALL exceptions to ProblemDetails format
 *
 * This filter catches everything and ensures a consistent error response format
 * across the entire API, including proper trace IDs and logging.
 */
@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract trace ID from request (set by TraceIdMiddleware)
    const traceId = (request as any).traceId || "unknown";
    const instance = request.url || "unknown";

    // Extract tenant ID from request context for logging
    const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

    // Map exception to ProblemDetails
    const isProduction = process.env.NODE_ENV === "production";
    const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, isProduction);
    const problemDetails = mapper.map(exception);

    // Log the error with appropriate level
    this.logError(exception, problemDetails, tenantId, request);

    // Send ProblemDetails response
    response.status(problemDetails.status).json(problemDetails);
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(
    exception: unknown,
    problemDetails: any,
    tenantId: string | undefined,
    request: Request
  ) {
    if (process.env.NODE_ENV === "test" || process.env.CORELY_TEST === "true") {
      return;
    }

    const logContext = {
      traceId: problemDetails.traceId,
      tenantId,
      code: problemDetails.code,
      status: problemDetails.status,
      method: request.method,
      url: request.url,
      userAgent: request.headers["user-agent"],
    };

    // Determine log level
    let logLevel: "error" | "warn" | "log" = "error";
    let logMessage = problemDetails.detail;

    if (exception instanceof AppError) {
      logLevel = exception.logLevel === "info" ? "log" : exception.logLevel;
      // For user-friendly errors, use the original message (not public message) for logs
      if (exception.internalDetails) {
        logMessage = exception.internalDetails;
      } else {
        logMessage = exception.message;
      }
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // Client errors (4xx) are less severe than server errors (5xx)
      logLevel = status >= 500 ? "error" : status === 404 ? "log" : "warn";
    }

    // Include stack trace for errors (but not for expected business errors)
    const stack = logLevel === "error" && exception instanceof Error ? exception.stack : undefined;

    // Log with context
    if (stack) {
      this.logger[logLevel](logMessage, stack, JSON.stringify(logContext, null, 2));
    } else {
      this.logger[logLevel](`${logMessage} ${JSON.stringify(logContext)}`);
    }
  }
}
