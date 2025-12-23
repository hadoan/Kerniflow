import { IRefreshTokenRepository } from "../../application/ports/refresh-token.repo.port";

export class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  tokens: Array<{
    id: string;
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }> = [];

  async create(data: {
    id: string;
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.tokens.push({ ...data, revokedAt: null });
  }

  async findValidByHash(hash: string): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null> {
    const token = this.tokens.find((t) => t.tokenHash === hash && !t.revokedAt);
    if (!token) return null;
    return token;
  }

  async revoke(id: string): Promise<void> {
    this.tokens = this.tokens.map((t) => (t.id === id ? { ...t, revokedAt: new Date() } : t));
  }

  async revokeAllForUserInTenant(userId: string, tenantId: string): Promise<void> {
    this.tokens = this.tokens.map((t) =>
      t.userId === userId && t.tenantId === tenantId ? { ...t, revokedAt: new Date() } : t
    );
  }

  async deleteExpired(): Promise<number> {
    const before = this.tokens.length;
    this.tokens = this.tokens.filter((t) => t.expiresAt > new Date());
    return before - this.tokens.length;
  }
}
