import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';

@Controller('identity')
class IdentityController {
  @Get()
  hello() {
    return { message: 'Identity context - hello' };
  }
}

@Module({
  controllers: [IdentityController],
})
export class IdentityModule {}