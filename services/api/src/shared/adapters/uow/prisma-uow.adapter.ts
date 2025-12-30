// import { type PrismaService } from "@corely/data";
// import { type UnitOfWorkPort } from "@corely/kernel";

// /**
//  * Wraps a PrismaClient $transaction. Nested calls reuse the outer scope.
//  * Note: repositories must use the same Prisma client instance passed here.
//  */
// export class PrismaUnitOfWorkAdapter implements UnitOfWorkPort {
//   constructor(private readonly prisma: PrismaService) {}

//   private depth = 0;

//   async withinTransaction<T>(fn: () => Promise<T>): Promise<T> {
//     if (this.depth > 0) {
//       return fn();
//     }

//     this.depth += 1;
//     try {
//       return await prisma.$transaction(async () => fn());
//     } finally {
//       this.depth -= 1;
//     }
//   }
// }
