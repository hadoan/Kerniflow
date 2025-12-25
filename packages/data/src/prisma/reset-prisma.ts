/**
 * Backward-compatible helper for older tests. PrismaService instances are scoped
 * per test, so there is nothing global to reset here.
 */
export async function resetPrisma(): Promise<void> {
  return;
}
