import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
  Headers,
  Req,
  Inject,
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
import { CurrentUserId, CurrentTenantId } from "./current-user.decorator";
import { buildRequestContext } from "../../../../shared/context/request-context";
import type { Request } from "express";
import {
  USER_REPOSITORY_TOKEN,
  type UserRepositoryPort,
} from "../../application/ports/user-repository.port";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../../application/ports/membership-repository.port";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../../application/ports/tenant-repository.port";

/**
 * Auth Controller
 * Public and authenticated endpoints for authentication
 */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SignUpUseCase) private readonly signUpUseCase: SignUpUseCase,
    @Inject(SignInUseCase) private readonly signInUseCase: SignInUseCase,
    @Inject(RefreshTokenUseCase) private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(SignOutUseCase) private readonly signOutUseCase: SignOutUseCase,
    @Inject(SwitchTenantUseCase) private readonly switchTenantUseCase: SwitchTenantUseCase,
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort
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
   * TODO: Implement with proper repository injection
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

    const memberships = await this.membershipRepo.findByUserId(userId);
    const membershipDtos = await Promise.all(
      memberships.map(async (membership) => {
        const tenant = await this.tenantRepo.findById(membership.getTenantId());
        return {
          tenantId: membership.getTenantId(),
          tenantName: tenant?.getName() ?? membership.getTenantId(),
          roleId: membership.getRoleId(),
        };
      })
    );

    return {
      userId,
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
