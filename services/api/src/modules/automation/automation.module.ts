import { Module } from "@nestjs/common";
import { Controller, Get } from "@nestjs/common";

@Controller("automation")
class AutomationController {
  @Get()
  hello() {
    return { message: "Automation context - hello" };
  }
}

@Module({
  controllers: [AutomationController],
})
export class AutomationModule {}
