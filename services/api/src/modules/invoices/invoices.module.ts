import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';

@Controller('invoices')
class InvoicesController {
  @Get()
  hello() {
    return { message: 'Invoices context - hello' };
  }
}

@Module({
  controllers: [InvoicesController],
})
export class InvoicesModule {}