/**
 * Opaque transaction context handle.
 * Infrastructure layer will provide actual implementation (e.g., Prisma TransactionClient).
 */
export interface TransactionContext {
  readonly __brand: unique symbol;
}

export interface UnitOfWorkPort {
  /**
   * Executes the given function within a transaction boundary.
   * The transaction context is passed to the function for use by repositories.
   */
  withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = "kernel/unit-of-work";
