import {
  CashEntryDirection,
  type CashPaymentMethod as CashPaymentMethodType,
  CashEntryType,
  type CreateCashEntryInput,
  type CashEntrySource,
} from "@corely/contracts";

export type NormalizedCashEntryCommand = {
  description: string;
  amountCents: number;
  dayKey: string;
  occurredAt: Date;
  type: CashEntryType;
  direction: CashEntryDirection;
  source: CashEntrySource;
  paymentMethod: CashPaymentMethodType;
  currency: string;
  referenceId: string | null;
  reversalOfEntryId: string | null;
};

const toDayKey = (input: string | Date): string => {
  if (typeof input === "string") {
    return input.slice(0, 10);
  }
  return input.toISOString().slice(0, 10);
};

const isLegacyDirectionType = (
  value: CashEntryType | CashEntryDirection
): value is CashEntryDirection =>
  value === CashEntryDirection.IN || value === CashEntryDirection.OUT;

const inferDirectionFromType = (type: CashEntryType): CashEntryDirection => {
  switch (type) {
    case CashEntryType.REFUND_CASH:
    case CashEntryType.EXPENSE_CASH:
    case CashEntryType.OWNER_WITHDRAWAL:
    case CashEntryType.BANK_DEPOSIT:
    case CashEntryType.OUT:
      return CashEntryDirection.OUT;
    default:
      return CashEntryDirection.IN;
  }
};

const inferTypeFromDirection = (direction: CashEntryDirection): CashEntryType => {
  return direction === CashEntryDirection.OUT ? CashEntryType.OUT : CashEntryType.IN;
};

const inferSource = (input: CreateCashEntryInput): CashEntrySource => {
  return input.source ?? input.sourceType ?? "MANUAL";
};

export const normalizeCashEntryInput = (
  input: CreateCashEntryInput
): NormalizedCashEntryCommand => {
  const amountCents = input.grossAmountCents ?? input.amount ?? input.amountCents;
  if (!amountCents || amountCents <= 0) {
    throw new Error("CashManagement:InvalidAmount");
  }

  if (input.paymentMethod && input.paymentMethod !== "CASH") {
    throw new Error("CashManagement:NonCashPaymentMethodNotAllowed");
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const dayKey = input.dayKey ?? input.businessDate ?? toDayKey(occurredAt);

  const rawType = input.type;
  let direction = input.direction;
  let type: CashEntryType;

  if (rawType && isLegacyDirectionType(rawType)) {
    direction = rawType;
    type = inferTypeFromDirection(rawType);
  } else if (rawType) {
    type = rawType;
    const inferredDirection = inferDirectionFromType(rawType);
    if (direction && direction !== inferredDirection) {
      throw new Error("CashManagement:DirectionTypeMismatch");
    }
    direction = direction ?? inferredDirection;
  } else {
    direction = direction ?? CashEntryDirection.IN;
    type = inferTypeFromDirection(direction);
  }

  if (!Object.values(CashEntryType).includes(type)) {
    throw new Error(`CashManagement:InvalidEntryType:${type}`);
  }

  return {
    description: input.description,
    amountCents,
    dayKey,
    occurredAt,
    type,
    direction,
    source: inferSource(input),
    paymentMethod: "CASH",
    currency: input.currency ?? "EUR",
    referenceId: input.referenceId ?? null,
    reversalOfEntryId: input.reversalOfEntryId ?? null,
  };
};

export const canPostIntoClosedDay = (entryType: CashEntryType): boolean => {
  return entryType === CashEntryType.CORRECTION || entryType === CashEntryType.CLOSING_ADJUSTMENT;
};
