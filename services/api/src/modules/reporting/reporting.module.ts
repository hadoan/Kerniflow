import { Module } from "@nestjs/common";
import { Controller, Get } from "@nestjs/common";
import { PrismaService, DataModule } from "@kerniflow/data";

@Controller("reports")
class ReportingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("dashboard")
  async dashboard() {
    // CQRS-lite: read from Prisma
    const expenseCount = await this.prisma.expense.count();
    return { totalExpenses: expenseCount, message: "Reporting context - dashboard" };
  }
}

@Module({
  imports: [DataModule],
  controllers: [ReportingController],
})
export class ReportingModule {}
