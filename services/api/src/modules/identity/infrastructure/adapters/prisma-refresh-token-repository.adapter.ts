import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { RefreshTokenRepositoryPort } from "../../application/ports/refresh-token-repository.port";

/**
 * Prisma Refresh Token Repository Implementation
 */
@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data,
    });
  }

  async findValidByHash(hash: string): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!token) {
      return null;
    }
    return token;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUserInTenant(userId: string, tenantId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
