import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { PrismaService } from "@corely/data";
import { randomUUID } from "crypto";

async function main() {
  const prisma = new PrismaService();
  try {
    const email = "test@corely.local";
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("User not found");
      return;
    }

    const tenantId = "test-tenant-" + randomUUID().substring(0, 8);

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "Test Tenant",
        slug: "test-tenant-" + randomUUID().substring(0, 8),
        status: "ACTIVE",
      },
    });

    // Get an admin role or create one
    let role = await prisma.role.findFirst({
      where: { systemKey: "ADMIN", tenantId },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          id: "role-admin-" + randomUUID().substring(0, 8),
          tenantId,
          name: "Admin",
          scope: "TENANT",
          systemKey: "ADMIN",
        },
      });
    }

    // Add user membership
    await prisma.membership.create({
      data: {
        id: "mem-" + randomUUID().substring(0, 8),
        tenantId,
        userId: user.id,
        roleId: role.id,
      },
    });

    // Create a legal entity
    const legalEntityId = "le-" + randomUUID().substring(0, 8);
    await prisma.legalEntity.create({
      data: {
        id: legalEntityId,
        tenant: { connect: { id: tenantId } },
        kind: "COMPANY",
        legalName: "Test Company",
        countryCode: "US",
        currency: "USD",
      },
    });

    // Create a workspace
    const workspaceId = "ws-" + randomUUID().substring(0, 8);
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        tenant: { connect: { id: tenantId } },
        legalEntity: { connect: { id: legalEntityId } },
        name: "Test Workspace",
      },
    });

    // Add workspace membership
    await prisma.workspaceMembership.create({
      data: {
        id: "wsmem-" + randomUUID().substring(0, 8),
        workspace: { connect: { id: workspaceId } },
        user: { connect: { id: user.id } },
        role: "ADMIN",
      },
    });

    console.log("Successfully created tenant and workspace for user:", email);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
