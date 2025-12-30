import { Inject, Injectable } from "@nestjs/common";
import type { OpenShiftInput, OpenShiftOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ConflictError,
  NoopLogger,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { ShiftSession } from "../../domain/shift-session.aggregate";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";

@Injectable()
export class OpenShiftUseCase extends BaseUseCase<OpenShiftInput, OpenShiftOutput> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort,
    @Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: OpenShiftInput,
    ctx: UseCaseContext
  ): Promise<Result<OpenShiftOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    // Validate register exists
    const register = await this.registerRepo.findById(ctx.tenantId, input.registerId);
    if (!register) {
      return err(new NotFoundError("REGISTER_NOT_FOUND", "Register not found"));
    }

    if (register.status !== "ACTIVE") {
      return err(new ConflictError("REGISTER_INACTIVE", "Cannot open shift on inactive register"));
    }

    // Check if there's already an open session for this register
    const existingSession = await this.shiftRepo.findOpenByRegister(ctx.tenantId, input.registerId);
    if (existingSession) {
      return err(
        new ConflictError(
          "SHIFT_ALREADY_OPEN",
          `Shift session ${existingSession.id} is already open for this register`
        )
      );
    }

    // Create new shift session
    const now = new Date();
    const session = new ShiftSession(
      input.sessionId, // Client-generated ID for offline support
      input.registerId,
      ctx.tenantId,
      input.openedByEmployeePartyId,
      now,
      input.startingCashCents ?? null,
      "OPEN",
      null, // closedAt
      null, // closedByEmployeePartyId
      null, // closingCashCents
      0, // totalSalesCents
      0, // totalCashReceivedCents
      null, // varianceCents
      input.notes || null,
      now,
      now
    );

    // Save to database
    await this.shiftRepo.save(session);

    return ok({
      sessionId: session.id,
      status: "OPEN",
      openedAt: session.openedAt,
    });
  }
}
