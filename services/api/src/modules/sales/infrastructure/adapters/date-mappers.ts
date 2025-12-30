import type { LocalDate } from "@corely/kernel";

export const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

export const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;
