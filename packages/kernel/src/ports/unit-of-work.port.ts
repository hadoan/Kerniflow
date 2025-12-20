export interface UnitOfWorkPort {
  withinTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
