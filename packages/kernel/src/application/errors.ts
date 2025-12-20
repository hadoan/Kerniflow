export class UseCaseError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { code: string; message: string; details?: unknown } {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export class ValidationError extends UseCaseError {
  constructor(message = "Validation failed", details?: unknown, code = "VALIDATION_ERROR") {
    super(code, message, details);
  }
}

export class NotFoundError extends UseCaseError {
  constructor(message = "Resource not found", details?: unknown, code = "NOT_FOUND") {
    super(code, message, details);
  }
}

export class ForbiddenError extends UseCaseError {
  constructor(message = "Forbidden", details?: unknown, code = "FORBIDDEN") {
    super(code, message, details);
  }
}

export class UnauthorizedError extends UseCaseError {
  constructor(message = "Unauthorized", details?: unknown, code = "UNAUTHORIZED") {
    super(code, message, details);
  }
}

export class ConflictError extends UseCaseError {
  constructor(message = "Conflict", details?: unknown, code = "CONFLICT") {
    super(code, message, details);
  }
}

export class RateLimitError extends UseCaseError {
  constructor(message = "Rate limit exceeded", details?: unknown, code = "RATE_LIMITED") {
    super(code, message, details);
  }
}

export class ExternalServiceError extends UseCaseError {
  constructor(
    message = "External service error",
    details?: unknown,
    code = "EXTERNAL_SERVICE_ERROR"
  ) {
    super(code, message, details);
  }
}
