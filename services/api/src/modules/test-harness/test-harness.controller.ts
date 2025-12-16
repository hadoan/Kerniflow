import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { TestHarnessGuard } from "./guards/test-harness.guard";
import { TestHarnessService } from "./test-harness.service";

@Controller("test")
@UseGuards(TestHarnessGuard)
export class TestHarnessController {
  constructor(@Inject("TEST_HARNESS_SERVICE") private testHarnessService: TestHarnessService) {}

  /**
   * Seed test data: creates a new tenant with user and roles
   */
  @Post("seed")
  @HttpCode(HttpStatus.OK)
  async seedData(@Body() payload: { email: string; password: string; tenantName: string }) {
    if (!payload.email || !payload.password || !payload.tenantName) {
      throw new BadRequestException("Missing required fields: email, password, tenantName");
    }

    return this.testHarnessService.seedTestData({
      email: payload.email,
      password: payload.password,
      tenantName: payload.tenantName,
    });
  }

  /**
   * Reset tenant-scoped data: clears all test data for a tenant
   */
  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetData(@Body() payload: { tenantId: string }) {
    if (!payload.tenantId) {
      throw new BadRequestException("Missing required field: tenantId");
    }

    await this.testHarnessService.resetTenantData(payload.tenantId);
    return { success: true, message: "Tenant data reset successfully" };
  }

  /**
   * Drain outbox: process all pending outbox events deterministically
   */
  @Post("drain-outbox")
  @HttpCode(HttpStatus.OK)
  async drainOutbox() {
    const result = await this.testHarnessService.drainOutbox();
    return {
      success: true,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
    };
  }

  /**
   * Health check endpoint
   */
  @Post("health")
  @HttpCode(HttpStatus.OK)
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
