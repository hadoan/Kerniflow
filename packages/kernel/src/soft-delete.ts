export interface SoftDeletable {
  archivedAt: Date | null;
  archivedByUserId?: string | null;
}

export function isArchived(x: SoftDeletable) {
  return x.archivedAt !== null;
}
