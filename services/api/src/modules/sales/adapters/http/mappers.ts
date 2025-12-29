import { Result, UseCaseContext, UseCaseError, isErr, LoggerPort } from "@kerniflow/kernel";
import { Request } from "express";
import { toHttpException } from "../../../shared/http/usecase-error.mapper";
import { NestLoggerAdapter } from "../../../shared/adapters/logger/nest-logger.adapter";

const logger: LoggerPort = new NestLoggerAdapter();

type RequestWithAuth = Request & {
  tenantId?: string;
  user?: { userId?: string; id?: string };
  body?: { tenantId?: string };
  query?: { tenantId?: string };
};

export const buildUseCaseContext = (req: RequestWithAuth): UseCaseContext => {
  const ctx: UseCaseContext = {
    tenantId:
      req.tenantId ||
      (req.headers["x-tenant-id"] as string | undefined) ||
      req.body?.tenantId ||
      req.query?.tenantId,
    userId: req.user?.userId || req.user?.id,
    correlationId:
      (req.headers["x-correlation-id"] as string | undefined) ||
      (req.headers["x-request-id"] as string | undefined),
    requestId: (req.headers["x-request-id"] as string | undefined) ?? undefined,
  };

  if (!ctx.tenantId) {
    logger.warn("Missing tenantId on request", {
      hasAuthHeader: Boolean(req.headers["authorization"]),
      hasTenantHeader: Boolean(req.headers["x-tenant-id"]),
      hasBodyTenant: Boolean(req.body?.tenantId),
      path: req.path,
      method: req.method,
    });
  }

  return ctx;
};

export const mapResultToHttp = <T>(result: Result<T, UseCaseError>): T => {
  if (isErr(result)) {
    throw toHttpException(result.error);
  }
  return result.value;
};
