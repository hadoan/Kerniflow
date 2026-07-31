import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

const { PrismaClient } = prismaPkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`Starting repair... Dry run: ${isDryRun}`);

  const registers = await prisma.cashRegister.findMany({
    include: {
      dayCloses: {
        orderBy: { dayKey: "asc" },
      },
      entries: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  for (const register of registers) {
    console.log(`Processing register: ${register.id}`);

    let previousEffectiveClosing = 0; // Configured opening balance logic could go here

    for (let i = 0; i < register.dayCloses.length; i++) {
      const dayClose = register.dayCloses[i];

      const openingBalanceCents = previousEffectiveClosing;

      // Filter entries for this day
      const dayEntries = register.entries.filter((e) => e.dayKey === dayClose.dayKey);

      let inflows = 0;
      let outflows = 0;

      for (const e of dayEntries) {
        if (e.direction === "IN") {
          inflows += e.amountCents;
        }
        if (e.direction === "OUT") {
          outflows += e.amountCents;
        }
      }

      const expectedClosing = openingBalanceCents + inflows - outflows;

      const counted = dayClose.countedBalanceCents;
      const effectiveClosing = counted ?? expectedClosing;

      if (dayClose.expectedBalanceCents !== expectedClosing) {
        console.log(
          `Updating expected balance for ${dayClose.dayKey}: ${dayClose.expectedBalanceCents} -> ${expectedClosing}`
        );
      }

      if (!isDryRun) {
        await prisma.cashDayClose.update({
          where: { id: dayClose.id },
          data: {
            expectedBalanceCents: expectedClosing,
            differenceCents: counted !== null ? counted - expectedClosing : null,
            verificationStatus:
              counted === null
                ? "NOT_COUNTED"
                : counted === expectedClosing
                  ? "COUNTED_MATCH"
                  : "COUNTED_DIFFERENCE",
          },
        });
      }

      previousEffectiveClosing = effectiveClosing;
    }
  }

  console.log("Repair finished.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
