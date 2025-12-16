import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';

@Controller('parties')
class PartiesController {
  @Get()
  hello() {
    return { message: 'Parties context - hello' };
  }
}

@Module({
  controllers: [PartiesController],
})
export class PartiesModule {}