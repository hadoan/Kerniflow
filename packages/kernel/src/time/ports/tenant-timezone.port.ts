export interface TenantTimeZonePort {
  getTenantTimeZone(tenantId: string): Promise<string | undefined | null>;
}
