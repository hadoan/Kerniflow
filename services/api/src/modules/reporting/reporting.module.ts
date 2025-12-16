import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { prisma } from '@kerniflow/data';

@Controller('reports')
class ReportingController {
  @Get('dashboard')
  async dashboard() {
    // CQRS-lite: read from Prisma
    const expenseCount = await prisma.expense.count();
    return { totalExpenses: expenseCount, message: 'Reporting context - dashboard' };
  }
}

@Module({
  controllers: [ReportingController],
})
export class ReportingModule {}