export interface CreatedAudit {
  createdAt: Date;
  createdByUserId: string;
}

export interface UpdatedAudit {
  updatedAt: Date;
  updatedByUserId?: string | null;
}
