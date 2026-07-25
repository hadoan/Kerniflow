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
import {
  TestHarnessService,
  type BillingInspectionResult,
  type SeedTaxFilingScenarioInput,
  type SeedTaxFilingScenarioType,
  type SeedTaxFilingScenarioStatus,
} from "./test-harness.service";
import { CrmTestHooksService } from "./crm-test-hooks.service";
import type { BillingProviderTestOperation } from "../billing";
import type { DeterministicScenario } from "../ai-copilot/infrastructure/model/deterministic-model-registry";

@Controller("test")
@UseGuards(TestHarnessGuard)
export class TestHarnessController {
  constructor(
    @Inject("TEST_HARNESS_SERVICE") private testHarnessService: TestHarnessService,
    private readonly crmTestHooksService: CrmTestHooksService
  ) {}

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
   * Seed host admin user
   */
  @Post("seed-host-admin")
  @HttpCode(HttpStatus.OK)
  async seedHostAdmin(@Body() payload: { email: string; password: string }) {
    if (!payload.email || !payload.password) {
      throw new BadRequestException("Missing required fields: email, password");
    }

    return this.testHarnessService.seedHostAdmin({
      email: payload.email,
      password: payload.password,
    });
  }

  /**
   * Seed platform tenants
   */
  @Post("seed-platform-tenants")
  @HttpCode(HttpStatus.OK)
  async seedPlatformTenants(@Body() payload: { count?: number }) {
    const tenants = await this.testHarnessService.seedTenantsForPlatform(payload.count);
    return { tenants };
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

  @Post("billing/provider/reset")
  @HttpCode(HttpStatus.OK)
  async resetBillingProviderState() {
    this.testHarnessService.resetBillingProviderState();
    return { success: true };
  }

  @Post("billing/provider/fail-next")
  @HttpCode(HttpStatus.OK)
  async failNextBillingProviderOperation(
    @Body() payload: { operation: BillingProviderTestOperation }
  ) {
    if (!payload.operation) {
      throw new BadRequestException("Missing required field: operation");
    }

    this.testHarnessService.failNextBillingProviderOperation(payload.operation);
    return { success: true, operation: payload.operation };
  }

  @Post("billing/inspect")
  @HttpCode(HttpStatus.OK)
  async inspectBillingState(
    @Body() payload: { tenantId: string; productKey?: string }
  ): Promise<BillingInspectionResult> {
    if (!payload.tenantId) {
      throw new BadRequestException("Missing required field: tenantId");
    }

    return this.testHarnessService.inspectBillingState(payload);
  }

  @Post("billing/trial/set-ends-at")
  @HttpCode(HttpStatus.OK)
  async setBillingTrialEndsAt(
    @Body() payload: { tenantId: string; productKey?: string; endsAt: string }
  ) {
    if (!payload.tenantId || !payload.endsAt) {
      throw new BadRequestException("Missing required fields: tenantId, endsAt");
    }

    await this.testHarnessService.setBillingTrialEndsAt(payload);
    return { success: true };
  }

  /**
   * Login as portal user (returns tokens)
   */
  @Post("portal/login")
  @HttpCode(HttpStatus.OK)
  async portalLogin(@Body() payload: { email: string; tenantId: string; workspaceId: string }) {
    if (!payload.email || !payload.tenantId || !payload.workspaceId) {
      throw new BadRequestException("Missing required fields: email, tenantId, workspaceId");
    }

    return this.testHarnessService.loginAsPortalUser({
      email: payload.email,
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
    });
  }

  /**
   * Seed portal test data: creates tenant, workspace, student, class, enrollment, document
   */
  @Post("portal/seed")
  @HttpCode(HttpStatus.OK)
  async seedPortalData() {
    return this.testHarnessService.seedPortalTestData();
  }

  /**
   * Seed one copilot thread and one user message (for deterministic search E2E)
   */
  @Post("copilot/seed-thread-message")
  @HttpCode(HttpStatus.OK)
  async seedCopilotThreadMessage(
    @Body() payload: { tenantId: string; userId: string; title: string; messageText: string }
  ) {
    if (!payload.tenantId || !payload.userId || !payload.title || !payload.messageText) {
      throw new BadRequestException(
        "Missing required fields: tenantId, userId, title, messageText"
      );
    }

    return this.testHarnessService.seedCopilotThreadMessage(payload);
  }

  @Post("copilot/deterministic-scenario")
  @HttpCode(HttpStatus.OK)
  async setDeterministicScenario(
    @Body() payload: { tenantId: string; scenario: DeterministicScenario | null }
  ) {
    if (!payload.tenantId) {
      throw new BadRequestException("Missing required fields: tenantId");
    }

    // Require dynamic import to avoid bundling test-only registry in production builds if it's not needed,
    // or just import it at top.
    const { activateScenario, deactivateScenario } = await import("../ai-copilot/infrastructure/model/deterministic-model-registry");
    
    if (payload.scenario) {
      activateScenario(payload.tenantId, payload.scenario);
    } else {
      deactivateScenario(payload.tenantId);
    }
    return { success: true };
  }


  /**
   * Seed classes billing send scenario with 2 customers/invoices.
   */
  @Post("classes-billing/seed-send-invoices")
  @HttpCode(HttpStatus.OK)
  async seedClassesBillingSendInvoices(
    @Body()
    payload: {
      tenantId: string;
      workspaceId: string;
      actorUserId: string;
      month?: string;
      label?: string;
    }
  ) {
    if (!payload.tenantId || !payload.workspaceId || !payload.actorUserId) {
      throw new BadRequestException("Missing required fields: tenantId, workspaceId, actorUserId");
    }
    return this.testHarnessService.seedClassesBillingSendScenario(payload);
  }

  /**
   * List email delivery records for invoices (for E2E verification).
   */
  @Post("invoices/email-deliveries")
  @HttpCode(HttpStatus.OK)
  async listInvoiceEmailDeliveries(@Body() payload: { tenantId: string; invoiceIds: string[] }) {
    if (!payload.tenantId || !Array.isArray(payload.invoiceIds)) {
      throw new BadRequestException("Missing required fields: tenantId, invoiceIds");
    }
    return {
      deliveries: await this.testHarnessService.listInvoiceEmailDeliveries(payload),
    };
  }

  @Post("invoices/by-source")
  @HttpCode(HttpStatus.OK)
  async listInvoicesBySource(
    @Body() payload: { tenantId: string; sourceType: string; sourceId: string }
  ) {
    if (!payload.tenantId || !payload.sourceType || !payload.sourceId) {
      throw new BadRequestException("Missing required fields: tenantId, sourceType, sourceId");
    }
    return {
      invoices: await this.testHarnessService.listInvoicesBySource(payload),
    };
  }

  @Post("coaching/contract-requests")
  @HttpCode(HttpStatus.OK)
  async listCoachingContractRequests(@Body() payload: { tenantId: string; engagementId: string }) {
    if (!payload.tenantId || !payload.engagementId) {
      throw new BadRequestException("Missing required fields: tenantId, engagementId");
    }
    return {
      contractRequests: await this.testHarnessService.listCoachingContractRequests(payload),
    };
  }

  @Post("coaching/prep-access")
  @HttpCode(HttpStatus.OK)
  async getCoachingPrepAccess(@Body() payload: { tenantId: string; sessionId: string }) {
    if (!payload.tenantId || !payload.sessionId) {
      throw new BadRequestException("Missing required fields: tenantId, sessionId");
    }
    return {
      prepAccess: await this.testHarnessService.getCoachingPrepAccess(payload),
    };
  }

  @Post("coaching/session-schedule")
  @HttpCode(HttpStatus.OK)
  async updateCoachingSessionSchedule(
    @Body() payload: { tenantId: string; sessionId: string; startAt: string; endAt: string }
  ) {
    if (!payload.tenantId || !payload.sessionId || !payload.startAt || !payload.endAt) {
      throw new BadRequestException("Missing required fields: tenantId, sessionId, startAt, endAt");
    }
    await this.testHarnessService.updateCoachingSessionSchedule(payload);
    return { success: true };
  }

  /**
   * Seed deterministic tax filing data for UI E2E scenarios.
   */
  @Post("tax/seed-filing-scenario")
  @HttpCode(HttpStatus.OK)
  async seedTaxFilingScenario(
    @Body()
    payload: {
      tenantId: string;
      workspaceId: string;
      actorUserId: string;
      filingType: SeedTaxFilingScenarioType;
      year: number;
      periodKey?: string;
      withBlockers?: boolean;
      includeSnapshots?: boolean;
      invoiceCount?: number;
      expenseCount?: number;
      status?: SeedTaxFilingScenarioStatus;
    }
  ) {
    if (!payload.tenantId || !payload.workspaceId || !payload.actorUserId) {
      throw new BadRequestException("Missing required fields: tenantId, workspaceId, actorUserId");
    }
    if (!payload.filingType) {
      throw new BadRequestException("Missing required field: filingType");
    }
    if (!Number.isInteger(payload.year) || payload.year < 2000 || payload.year > 2100) {
      throw new BadRequestException("Invalid year");
    }
    if (payload.filingType !== "VAT_PERIODIC" && payload.filingType !== "VAT_ANNUAL") {
      throw new BadRequestException("Invalid filingType");
    }

    const input: SeedTaxFilingScenarioInput = {
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
      actorUserId: payload.actorUserId,
      filingType: payload.filingType,
      year: payload.year,
      periodKey: payload.periodKey,
      withBlockers: payload.withBlockers,
      includeSnapshots: payload.includeSnapshots,
      invoiceCount: payload.invoiceCount,
      expenseCount: payload.expenseCount,
      status: payload.status,
    };

    return this.testHarnessService.seedTaxFilingScenario(input);
  }

  /**
   * Seed a deterministic CRM activity produced by an automation trigger.
   * Used by E2E to verify workflow effects in timeline without waiting on async workers.
   */
  @Post("crm/seed-workflow-activity")
  @HttpCode(HttpStatus.OK)
  async seedCrmWorkflowActivity(
    @Body()
    payload: {
      tenantId: string;
      dealId: string;
      actorUserId: string;
      subject?: string;
    }
  ) {
    if (!payload.tenantId || !payload.dealId || !payload.actorUserId) {
      throw new BadRequestException("Missing required fields: tenantId, dealId, actorUserId");
    }
    return this.crmTestHooksService.seedWorkflowActivity(payload);
  }

  /**
   * Health check endpoint
   */
  @Post("health")
  @HttpCode(HttpStatus.OK)
  health() {
    const dbUrl = process.env.DATABASE_URL || "";
    const dbNameMatch = dbUrl.match(/\/([^/?]+)(\?|$)/);
    const database = dbNameMatch ? dbNameMatch[1] : "unknown";

    return { 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database,
      aiProvider: process.env.E2E_AI_PROVIDER || process.env.AI_MODEL_PROVIDER
    };
  }
}
