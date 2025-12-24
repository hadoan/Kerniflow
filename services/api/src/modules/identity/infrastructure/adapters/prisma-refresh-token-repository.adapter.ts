import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { IRefreshTokenRepository } from "../../application/ports/refresh-token.repo.port";

/**
 * Prisma Refresh Token Repository Implementation
 */
@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.refreshToken.create({
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
    const token = await prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!token) {return null;}
    return token;
  }

  async revoke(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUserInTenant(userId: string, tenantId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
