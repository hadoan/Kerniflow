import { Injectable, Inject } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import { TransactionContext } from "@corely/kernel";
import { User } from "../../domain/entities/user.entity";
import { UserRepositoryPort } from "../../application/ports/user-repository.port";

/**
 * Prisma User Repository Implementation
 * Infrastructure adapter - implements UserRepositoryPort port
 */
@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(user: User, tx?: TransactionContext): Promise<User> {
    const client = getPrismaClient(this.prisma, tx as any);

    const data = await client.user.create({
      data: {
        id: user.getId(),
        email: user.getEmail().getValue(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        status: user.getStatus(),
        createdAt: user.getCreatedAt(),
      },
    });

    return User.restore(data);
  }

  async findById(id: string, tx?: TransactionContext): Promise<User | null> {
    const client = getPrismaClient(this.prisma, tx as any);

    const data = await client.user.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }
    return User.restore(data);
  }

  async findByEmail(email: string, tx?: TransactionContext): Promise<User | null> {
    const client = getPrismaClient(this.prisma, tx as any);

    const data = await client.user.findUnique({
      where: { email },
    });

    if (!data) {
      return null;
    }
    return User.restore(data);
  }

  async emailExists(email: string, tx?: TransactionContext): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx as any);

    const count = await client.user.count({
      where: { email },
    });

    return count > 0;
  }

  async update(user: User, tx?: TransactionContext): Promise<User> {
    const client = getPrismaClient(this.prisma, tx as any);

    const data = await client.user.update({
      where: { id: user.getId() },
      data: {
        email: user.getEmail().getValue(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        status: user.getStatus(),
        updatedAt: new Date(),
      },
    });

    return User.restore(data);
  }
}
