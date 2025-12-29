import { type CheckInStatus, type CheckInByType } from "../../domain/engagement.types";

export type CheckInEventRecord = {
  checkInEventId: string;
  tenantId: string;
  customerPartyId: string;
  registerId: string;
  kioskDeviceId?: string | null;
  checkedInAt: Date;
  checkedInByType: CheckInByType;
  checkedInByEmployeePartyId?: string | null;
  status: CheckInStatus;
  visitReason?: string | null;
  assignedEmployeePartyId?: string | null;
  tags: string[];
  posSaleId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckInListFilters = {
  customerPartyId?: string;
  registerId?: string;
  status?: CheckInStatus;
  from?: Date;
  to?: Date;
};

export type Pagination = {
  cursor?: string;
  pageSize: number;
};

export type ListResult<T> = {
  items: T[];
  nextCursor?: string | null;
};

export const CHECKIN_REPOSITORY_PORT = Symbol("CHECKIN_REPOSITORY_PORT");

export interface CheckInRepositoryPort {
  create(record: CheckInEventRecord): Promise<void>;
  update(record: CheckInEventRecord): Promise<void>;
  findById(tenantId: string, checkInEventId: string): Promise<CheckInEventRecord | null>;
  list(
    tenantId: string,
    filters: CheckInListFilters,
    pagination: Pagination
  ): Promise<ListResult<CheckInEventRecord>>;
  findRecentForCustomer(
    tenantId: string,
    customerPartyId: string,
    since: Date
  ): Promise<CheckInEventRecord[]>;
}
