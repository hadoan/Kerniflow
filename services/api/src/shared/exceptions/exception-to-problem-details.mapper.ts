import { HttpException, HttpStatus } from "@nestjs/common";
import { type ProblemDetails, type ValidationErrorItem } from "@corely/contracts";
import {
  AppError,
  UserFriendlyError,
  ValidationFailedError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ExternalServiceError,
} from "@corely/domain";
import {
  UseCaseError,
  ValidationError as KernelValidationError,
  NotFoundError as KernelNotFoundError,
  ConflictError as KernelConflictError,
  UnauthorizedError as KernelUnauthorizedError,
  ForbiddenError as KernelForbiddenError,
} from "@corely/kernel";
import { type Prisma } from "@prisma/client";

/**
 * Maps any error to a ProblemDetails response
 *
 * Priority order:
 * 1. AppError (from @corely/domain) - new error system
 * 2. UseCaseError (from @corely/kernel) - legacy compatibility
 * 3. Prisma errors - mapped to appropriate business errors
 * 4. NestJS HttpException - converted with stable codes
 * 5. Unknown errors - sanitized 500 response
 */
export class ExceptionToProblemDetailsMapper {
  constructor(
    private readonly traceId: string,
    private readonly instance: string,
    private readonly isProduction: boolean
  ) {}

  /**
   * Map any error to ProblemDetails
   */
  map(error: unknown): ProblemDetails {
    // 1. Handle AppError (new domain error system)
    if (error instanceof AppError) {
      return this.mapAppError(error);
    }

    // 2. Handle UseCaseError (legacy kernel error system)
    if (error instanceof UseCaseError) {
      return this.mapUseCaseError(error);
    }

    // 3. Handle Prisma errors
    if (this.isPrismaError(error)) {
      return this.mapPrismaError(error);
    }

    // 4. Handle NestJS HttpException
    if (error instanceof HttpException) {
      return this.mapHttpException(error);
    }

    // 5. Handle unknown errors
    return this.mapUnknownError(error);
  }

  /**
   * Map AppError to ProblemDetails
   */
  private mapAppError(error: AppError): ProblemDetails {
    const isPublic = error.isPublic();

    return {
      type: `https://errors.corely.com/${error.code}`,
      title: this.getTitle(error.status),
      status: error.status,
      detail: isPublic ? error.publicMessage! : this.getSafeDetail(error.status),
      instance: this.instance,
      code: error.code,
      validationErrors: error.validationErrors,
      traceId: this.traceId,
      data: error.data,
    };
  }

  /**
   * Map legacy UseCaseError to ProblemDetails
   */
  private mapUseCaseError(error: UseCaseError): ProblemDetails {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let isPublic = false;

    // Map specific kernel error types to status codes
    if (error instanceof KernelValidationError) {
      status = HttpStatus.BAD_REQUEST;
      isPublic = true; // Validation errors are safe to show
    } else if (error instanceof KernelUnauthorizedError) {
      status = HttpStatus.UNAUTHORIZED;
      isPublic = true;
    } else if (error instanceof KernelForbiddenError) {
      status = HttpStatus.FORBIDDEN;
      isPublic = true;
    } else if (error instanceof KernelNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (error instanceof KernelConflictError) {
      status = HttpStatus.CONFLICT;
    }

    // Extract validation errors if present in details
    let validationErrors: ValidationErrorItem[] | undefined;
    if (error instanceof KernelValidationError && Array.isArray(error.details)) {
      validationErrors = error.details as ValidationErrorItem[];
    }

    return {
      type: `https://errors.corely.com/${error.code}`,
      title: this.getTitle(status),
      status,
      detail: isPublic ? error.message : this.getSafeDetail(status),
      instance: this.instance,
      code: error.code,
      validationErrors,
      traceId: this.traceId,
    };
  }

  /**
   * Map Prisma errors to ProblemDetails
   */
  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): ProblemDetails {
    // Map Prisma error codes to business errors
    switch (error.code) {
      case "P2002": // Unique constraint violation
        return {
          type: "https://errors.corely.com/Common:Conflict",
          title: "Conflict",
          status: HttpStatus.CONFLICT,
          detail: "A record with this value already exists",
          instance: this.instance,
          code: "Common:Conflict",
          traceId: this.traceId,
          data: this.isProduction ? undefined : { prismaCode: error.code },
        };

      case "P2025": // Record not found
        return {
          type: "https://errors.corely.com/Common:NotFound",
          title: "Not Found",
          status: HttpStatus.NOT_FOUND,
          detail: "Resource not found",
          instance: this.instance,
          code: "Common:NotFound",
          traceId: this.traceId,
        };

      case "P2003": // Foreign key constraint violation
        return {
          type: "https://errors.corely.com/Common:Conflict",
          title: "Conflict",
          status: HttpStatus.CONFLICT,
          detail: "Referenced resource does not exist",
          instance: this.instance,
          code: "Common:ForeignKeyViolation",
          traceId: this.traceId,
        };

      default:
        // Unknown Prisma error - treat as internal error
        return {
          type: "https://errors.corely.com/Common:DatabaseError",
          title: "Internal Server Error",
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          detail: "A database error occurred",
          instance: this.instance,
          code: "Common:DatabaseError",
          traceId: this.traceId,
          data: this.isProduction ? undefined : { prismaCode: error.code },
        };
    }
  }

  /**
   * Map NestJS HttpException to ProblemDetails
   */
  private mapHttpException(error: HttpException): ProblemDetails {
    const status = error.getStatus();
    const response = error.getResponse();

    // Try to extract existing error info
    let detail: string;
    let code: string;

    if (typeof response === "string") {
      detail = response;
      code = `Common:Http${status}`;
    } else if (typeof response === "object" && response !== null) {
      const respObj = response as any;
      detail = respObj.message || respObj.error || this.getSafeDetail(status);
      code = respObj.code || `Common:Http${status}`;
    } else {
      detail = this.getSafeDetail(status);
      code = `Common:Http${status}`;
    }

    return {
      type: `https://errors.corely.com/${code}`,
      title: this.getTitle(status),
      status,
      detail,
      instance: this.instance,
      code,
      traceId: this.traceId,
    };
  }

  /**
   * Map unknown errors to sanitized ProblemDetails
   */
  private mapUnknownError(error: unknown): ProblemDetails {
    const detail = this.isProduction
      ? "An unexpected error occurred"
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";

    return {
      type: "https://errors.corely.com/Common:UnexpectedError",
      title: "Internal Server Error",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail,
      instance: this.instance,
      code: "Common:UnexpectedError",
      traceId: this.traceId,
    };
  }

  /**
   * Check if error is a Prisma error
   */
  private isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Error &&
      error.constructor.name === "PrismaClientKnownRequestError" &&
      "code" in error
    );
  }

  /**
   * Get safe detail message for a status code
   */
  private getSafeDetail(status: number): string {
    switch (status) {
      case 400:
        return "Bad request";
      case 401:
        return "Authentication required";
      case 403:
        return "You don't have permission to perform this action";
      case 404:
        return "Resource not found";
      case 409:
        return "Conflict";
      case 422:
        return "Unprocessable entity";
      case 500:
        return "An unexpected error occurred";
      case 502:
        return "External service error";
      case 503:
        return "Service temporarily unavailable";
      default:
        return "An error occurred";
    }
  }

  /**
   * Get title for a status code
   */
  private getTitle(status: number): string {
    switch (status) {
      case 400:
        return "Bad Request";
      case 401:
        return "Unauthorized";
      case 403:
        return "Forbidden";
      case 404:
        return "Not Found";
      case 409:
        return "Conflict";
      case 422:
        return "Unprocessable Entity";
      case 500:
        return "Internal Server Error";
      case 502:
        return "Bad Gateway";
      case 503:
        return "Service Unavailable";
      default:
        return "Error";
    }
  }
}
