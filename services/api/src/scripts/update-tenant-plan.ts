import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { PrismaService } from "@corely/data";

async function main() {
  const prisma = new PrismaService();
  try {
    const email = "test@corely.local";
    const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });

    if (!user) {
      console.error("User not found");
      return;
    }

    const tenantId = user.memberships.find((m) => m.tenantId !== null)?.tenantId;
    if (!tenantId) {
      console.error("User has no regular tenant membership");
      return;
    }

    let account = await prisma.billingAccount.findUnique({ where: { tenantId } });
    if (!account) {
      account = await prisma.billingAccount.create({
        data: {
          id: "ba-" + Date.now(),
          tenantId,
        },
      });
    }

    const sub = await prisma.billingSubscription.upsert({
      where: {
        tenantId_productKey: {
          tenantId,
          productKey: "cash-management",
        },
      },
      update: {
        planCode: "pro-monthly",
        status: "ACTIVE",
      },
      create: {
        tenantId,
        accountId: account.id,
        productKey: "cash-management",
        planCode: "pro-monthly",
        status: "ACTIVE",
      },
    });

    console.log("Successfully updated billing subscription for", email);
    console.log("New subscription:", sub.planCode, sub.status);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
