import { Module } from "@nestjs/common";
import { Controller, Get, Post } from "@nestjs/common";

@Controller("workflows")
class WorkflowController {
  @Get()
  hello() {
    return { message: "Workflow context - hello" };
  }

  @Post("instances")
  createInstance() {
    return { id: "wf-instance-1", status: "created" };
  }
}

@Module({
  controllers: [WorkflowController],
})
export class WorkflowModule {}
