import { Injectable, Inject } from "@nestjs/common";
import { PrismaClient } from "@kerniflow/data";
import * as bcrypt from "bcrypt";

interface SeedResult {
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  email: string;
}

interface DrainResult {
  processedCount: number;
  failedCount: number;
}

@Injectable()
export class TestHarnessService {
  constructor(@Inject("PRISMA_CLIENT") private prisma: PrismaClient) {}

  /**
   * Create a test tenant with user, roles, and permissions
   */
  async seedTestData(params: {
    email: string;
    password: string;
    tenantName: string;
  }): Promise<SeedResult> {
    // Use bcrypt to hash password (should match API's password hasher)
    const passwordHash = await bcrypt.hash(params.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: params.tenantName,
          slug: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: "ACTIVE",
        },
      });

      // 2. Create user
      const user = await tx.user.create({
        data: {
          email: params.email,
          name: "Test User",
          passwordHash,
          status: "ACTIVE",
        },
      });

      // 3. Create default roles (OWNER, ADMIN, MEMBER)
      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Owner",
          systemKey: "OWNER",
        },
      });

      const _adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Admin",
          systemKey: "ADMIN",
        },
      });

      const _memberRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Member",
          systemKey: "MEMBER",
        },
      });

      // 4. Create default permissions
      const permissionKeys = [
        "tenant.manage",
        "user.invite",
        "user.remove",
        "expense.write",
        "expense.read",
        "invoice.write",
        "invoice.read",
        "workflow.write",
        "workflow.read",
      ];

      const permissions = await Promise.all(
        permissionKeys.map((key) =>
          tx.permission.upsert({
            where: { key },
            update: {},
            create: { key, description: `Permission: ${key}` },
          })
        )
      );

      // 5. Assign all permissions to OWNER role
      for (const permission of permissions) {
        await tx.rolePermission.create({
          data: {
            roleId: ownerRole.id,
            permissionId: permission.id,
          },
        });
      }

      // 6. Create membership: user = OWNER of tenant
      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: user.id,
        userName: user.name || "Test User",
        email: user.email,
      };
    });
  }

  /**
   * Reset tenant-scoped data: clear all business entities, keep tenant/user/roles
   */
  async resetTenantData(tenantId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete in reverse order of foreign key dependencies
      await tx.outboxEvent.deleteMany({ where: { tenantId } });
      await tx.domainEvent.deleteMany({ where: { tenantId } });
      await tx.auditLog.deleteMany({ where: { tenantId } });
      await tx.idempotencyKey.deleteMany({ where: { tenantId } });
      await tx.expense.deleteMany({ where: { tenantId } });
      await tx.workflowInstance.deleteMany({
        where: { definition: { tenantId } },
      });
      await tx.workflowDefinition.deleteMany({ where: { tenantId } });
    });
  }

  /**
   * Process all pending outbox events once (deterministically)
   */
  async drainOutbox(): Promise<DrainResult> {
    let processedCount = 0;
    let failedCount = 0;

    // Fetch all pending outbox events
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const event of pendingEvents) {
      try {
        // In a real scenario, this would publish to a message bus or call handlers
        // For now, we just mark as SENT to simulate processing
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "SENT",
            attempts: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        processedCount++;
      } catch (_error) {
        // Mark as failed if processing errors
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        failedCount++;
      }
    }

    return { processedCount, failedCount };
  }
}
