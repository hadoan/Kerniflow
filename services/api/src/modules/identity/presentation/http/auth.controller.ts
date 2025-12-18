import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
  Headers,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";

// Use cases
import { SignUpUseCase } from "../../application/use-cases/sign-up.usecase";
import { SignInUseCase } from "../../application/use-cases/sign-in.usecase";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.usecase";
import { SignOutUseCase } from "../../application/use-cases/sign-out.usecase";
import { SwitchTenantUseCase } from "../../application/use-cases/switch-tenant.usecase";

// DTOs
import {
  SignUpDto,
  SignInDto,
  RefreshTokenDto,
  SwitchTenantDto,
  SignOutDto,
  SignUpResponseDto,
  SignInResponseDto,
  CurrentUserResponseDto,
  SwitchTenantResponseDto,
  MessageResponseDto,
} from "./auth.dto";

// Guards and decorators
import { AuthGuard } from "./auth.guard";
import { CurrentUser, CurrentUserId, CurrentTenantId } from "./current-user.decorator";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { Request } from "express";

/**
 * Auth Controller
 * Public and authenticated endpoints for authentication
 */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly signOutUseCase: SignOutUseCase,
    private readonly switchTenantUseCase: SwitchTenantUseCase
  ) {}

  /**
   * POST /auth/signup
   * Create new user and tenant
   */
  @Post("signup")
  async signup(
    @Body() input: SignUpDto,
    @Headers("x-idempotency-key") idempotencyKey?: string,
    @Req() req?: Request
  ): Promise<SignUpResponseDto> {
    if (!input.email || !input.password || !input.tenantName) {
      throw new BadRequestException("Missing required fields");
    }

    const result = await this.signUpUseCase.execute({
      ...input,
      idempotencyKey: idempotencyKey ?? input.idempotencyKey ?? "default",
      context: buildRequestContext({
        requestId: req?.headers["x-request-id"] as string | undefined,
        tenantId: undefined,
        actorUserId: undefined,
      }),
    });

    return {
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      tenantName: result.tenantName,
      membershipId: result.membershipId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * POST /auth/login
   */
  @Post("login")
  async login(@Body() input: SignInDto): Promise<SignInResponseDto> {
    if (!input.email || !input.password) {
      throw new BadRequestException("Missing required fields");
    }

    const result = await this.signInUseCase.execute({
      ...input,
      idempotencyKey: input.idempotencyKey,
      context: buildRequestContext({
        tenantId: input.tenantId ?? undefined,
        actorUserId: undefined,
      }),
    });

    return {
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      memberships: result.memberships,
    };
  }

  /**
   * POST /auth/refresh
   */
  @Post("refresh")
  async refresh(
    @Body() input: RefreshTokenDto
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!input.refreshToken) {
      throw new BadRequestException("Refresh token is required");
    }

    return this.refreshTokenUseCase.execute(input);
  }

  /**
   * POST /auth/logout
   */
  @Post("logout")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async logout(
    @CurrentUserId() userId: string,
    @CurrentTenantId() tenantId: string,
    @Body() input: SignOutDto
  ): Promise<MessageResponseDto> {
    if (!userId || !tenantId) {
      throw new BadRequestException("User or tenant not found");
    }

    await this.signOutUseCase.execute({
      userId,
      tenantId,
      refreshTokenHash: input.refreshToken,
    });

    return { message: "Successfully logged out" };
  }

  /**
   * GET /auth/me
   * Get current user info
   */
  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getMe(
    @CurrentUserId() userId: string,
    @CurrentTenantId() tenantId: string
  ): Promise<CurrentUserResponseDto> {
    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Get all memberships
    const memberships = await this.membershipRepo.findByUserId(userId);

    const membershipDtos = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await this.tenantRepo.findById(m.getTenantId());
        return {
          tenantId: m.getTenantId(),
          tenantName: tenant?.getName() || "Unknown",
          roleId: m.getRoleId(),
        };
      })
    );

    return {
      userId: user.getId(),
      email: user.getEmail().getValue(),
      name: user.getName(),
      activeTenantId: tenantId,
      memberships: membershipDtos,
    };
  }

  /**
   * POST /auth/switch-tenant
   */
  @Post("switch-tenant")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async switchTenant(
    @CurrentUserId() userId: string,
    @CurrentTenantId() fromTenantId: string,
    @Body() input: SwitchTenantDto
  ): Promise<SwitchTenantResponseDto> {
    if (!userId || !fromTenantId || !input.tenantId) {
      throw new BadRequestException("Missing required fields");
    }

    const result = await this.switchTenantUseCase.execute({
      userId,
      fromTenantId,
      toTenantId: input.tenantId,
    });

    return result;
  }
}
