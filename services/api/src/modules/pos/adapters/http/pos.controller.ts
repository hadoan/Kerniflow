import { Controller, Post, Get, Body, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type {
  CreateRegisterInput,
  CreateRegisterOutput,
  ListRegistersInput,
  ListRegistersOutput,
  OpenShiftInput,
  OpenShiftOutput,
  CloseShiftInput,
  CloseShiftOutput,
  GetCurrentShiftInput,
  GetCurrentShiftOutput,
  SyncPosSaleInput,
  SyncPosSaleOutput,
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity";
import { CreateRegisterUseCase } from "../../application/use-cases/create-register.usecase";
import { ListRegistersUseCase } from "../../application/use-cases/list-registers.usecase";
import { OpenShiftUseCase } from "../../application/use-cases/open-shift.usecase";
import { CloseShiftUseCase } from "../../application/use-cases/close-shift.usecase";
import { GetCurrentShiftUseCase } from "../../application/use-cases/get-current-shift.usecase";
import { SyncPosSaleUseCase } from "../../application/use-cases/sync-pos-sale.usecase";
import { GetCatalogSnapshotUseCase } from "../../application/use-cases/get-catalog-snapshot.usecase";

@ApiTags("POS")
@ApiBearerAuth()
@Controller("pos")
@UseGuards(AuthGuard)
export class PosController {
  constructor(
    private createRegister: CreateRegisterUseCase,
    private listRegisters: ListRegistersUseCase,
    private openShift: OpenShiftUseCase,
    private closeShift: CloseShiftUseCase,
    private getCurrentShift: GetCurrentShiftUseCase,
    private syncPosSale: SyncPosSaleUseCase,
    private getCatalogSnapshot: GetCatalogSnapshotUseCase
  ) {}

  @Post("registers")
  @ApiOperation({ summary: "Create a new POS register" })
  async createRegisterEndpoint(
    @Body() input: CreateRegisterInput,
    @Req() req: any
  ): Promise<CreateRegisterOutput> {
    const result = await this.createRegister.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("registers")
  @ApiOperation({ summary: "List POS registers" })
  async listRegistersEndpoint(
    @Query() input: ListRegistersInput,
    @Req() req: any
  ): Promise<ListRegistersOutput> {
    const result = await this.listRegisters.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("shifts/open")
  @ApiOperation({ summary: "Open a shift session" })
  async openShiftEndpoint(
    @Body() input: OpenShiftInput,
    @Req() req: any
  ): Promise<OpenShiftOutput> {
    const result = await this.openShift.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("shifts/close")
  @ApiOperation({ summary: "Close a shift session" })
  async closeShiftEndpoint(
    @Body() input: CloseShiftInput,
    @Req() req: any
  ): Promise<CloseShiftOutput> {
    const result = await this.closeShift.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("shifts/current")
  @ApiOperation({ summary: "Get current open shift for a register" })
  async getCurrentShiftEndpoint(
    @Query() input: GetCurrentShiftInput,
    @Req() req: any
  ): Promise<GetCurrentShiftOutput> {
    const result = await this.getCurrentShift.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("sales/sync")
  @ApiOperation({ summary: "Sync POS sale to create invoice and payment" })
  async syncPosSaleEndpoint(
    @Body() input: SyncPosSaleInput,
    @Req() req: any
  ): Promise<SyncPosSaleOutput> {
    const result = await this.syncPosSale.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("catalog/snapshot")
  @ApiOperation({ summary: "Get product catalog snapshot for offline caching" })
  async getCatalogSnapshotEndpoint(
    @Query() input: GetCatalogSnapshotInput,
    @Req() req: any
  ): Promise<GetCatalogSnapshotOutput> {
    const result = await this.getCatalogSnapshot.execute(input, {
      tenantId: req.user.workspaceId,
      userId: req.user.userId,
      requestId: req.id,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }
}
