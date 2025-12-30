import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import * as bcrypt from "bcrypt";
import { CreateWorkspaceUseCase } from "../workspaces/application/use-cases/create-workspace.usecase";
import type { WorkspaceRepositoryPort } from "../workspaces/application/ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../workspaces/application/ports/workspace-repository.port";
import { buildPermissionCatalog } from "../identity/permissions/permission-catalog";

export interface SeedResult {
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  email: string;
}

export interface DrainResult {
  processedCount: number;
  failedCount: number;
}

@Injectable()
export class TestHarnessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  /**
   * Create a test tenant with user, roles, permissions, and workspace
   *
   * Note: We use workspace use cases for workspace creation, then directly
   * update onboardingStatus to "DONE" via repository for test data setup.
   */
  async seedTestData(params: {
    email: string;
    password: string;
    tenantName: string;
  }): Promise<SeedResult> {
    // Use bcrypt to hash password (should match API's password hasher)
    const passwordHash = await bcrypt.hash(params.password, 10);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: params.tenantName,
            slug: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: "ACTIVE",
          },
        });

        // 2. Create user
        // Allow repeated seeds with the same email by upserting the user
        const user = await tx.user.upsert({
          where: { email: params.email },
          update: {
            name: "Test User",
            passwordHash,
            status: "ACTIVE",
          },
          create: {
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
            isSystem: true,
          },
        });

        const _adminRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Admin",
            systemKey: "ADMIN",
            isSystem: true,
          },
        });

        const _memberRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Member",
            systemKey: "MEMBER",
            isSystem: true,
          },
        });

        // 4. Assign all catalog permissions to OWNER role
        const permissionKeys = buildPermissionCatalog().flatMap((group) =>
          group.permissions.map((permission) => permission.key)
        );

        if (permissionKeys.length > 0) {
          await tx.rolePermissionGrant.createMany({
            data: permissionKeys.map((permissionKey) => ({
              tenantId: tenant.id,
              roleId: ownerRole.id,
              permissionKey,
              effect: "ALLOW",
              createdBy: user.id,
            })),
          });
        }

        // 5. Create membership: user = OWNER of tenant
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

      // 7. Create workspace with completed onboarding using use case
      const workspaceResult = await this.createWorkspaceUseCase.execute({
        tenantId: result.tenantId,
        userId: result.userId,
        name: "Default Workspace",
        kind: "PERSONAL",
        legalName: params.tenantName,
        countryCode: "DE",
        currency: "EUR",
        taxId: `TEST-${Date.now()}`,
        address: {
          line1: "123 Test Street",
          line2: undefined,
          city: "Test City",
          postalCode: "12345",
          countryCode: "DE",
        },
      });

      // 8. Update workspace to completed onboarding status using repository
      await this.workspaceRepo.updateWorkspace(result.tenantId, workspaceResult.workspace.id, {
        onboardingStatus: "DONE",
        onboardingCompletedAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error("Error seeding test data:", error);
      throw error;
    }
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
      await tx.invoicePayment.deleteMany({ where: { invoice: { tenantId } } });
      await tx.invoiceLine.deleteMany({ where: { invoice: { tenantId } } });
      await tx.invoice.deleteMany({ where: { tenantId } });
      await tx.expense.deleteMany({ where: { tenantId } });
      await tx.workflowInstance.deleteMany({
        where: { definition: { tenantId } },
      });
      await tx.workflowDefinition.deleteMany({ where: { tenantId } });
      // Delete party-related data (customers/suppliers)
      await tx.partyRole.deleteMany({ where: { tenantId } });
      await tx.contactPoint.deleteMany({ where: { party: { tenantId } } });
      await tx.address.deleteMany({ where: { party: { tenantId } } });
      await tx.party.deleteMany({ where: { tenantId } });
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
