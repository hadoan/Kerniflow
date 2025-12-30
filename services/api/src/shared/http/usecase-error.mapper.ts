import { HttpException, HttpStatus } from "@nestjs/common";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  type UseCaseError,
  ValidationError,
} from "@corely/kernel";

export const toHttpException = (error: UseCaseError): HttpException => {
  let status = HttpStatus.INTERNAL_SERVER_ERROR;

  if (error instanceof ValidationError) {
    status = HttpStatus.BAD_REQUEST;
  } else if (error instanceof UnauthorizedError) {
    status = HttpStatus.UNAUTHORIZED;
  } else if (error instanceof ForbiddenError) {
    status = HttpStatus.FORBIDDEN;
  } else if (error instanceof NotFoundError) {
    status = HttpStatus.NOT_FOUND;
  } else if (error instanceof ConflictError) {
    status = HttpStatus.CONFLICT;
  }

  return new HttpException(
    { error: error.code, message: error.message, details: error.details },
    status
  );
};
