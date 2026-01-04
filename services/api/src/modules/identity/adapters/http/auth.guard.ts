import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import type { TokenServicePort } from "../../application/ports/token-service.port";
import { TOKEN_SERVICE_TOKEN } from "../../application/ports/token-service.port";

/**
 * Auth Guard
 * Validates JWT access token and sets user on request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Missing authorization header");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      throw new UnauthorizedException("Invalid authorization header format");
    }

    const token = parts[1];

    // Verify and decode token
    const decoded = await this.tokenService.verifyAccessToken(token);

    if (!decoded) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Prefer tenant from header (workspace switch) and fall back to token claim
    const headerTenantId = request.headers["x-tenant-id"] as string | undefined;

    // Set user, tenant, and roles on request
    request.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    request.tenantId = headerTenantId ?? decoded.tenantId;
    request.roleIds = Array.isArray(decoded.roleIds) ? decoded.roleIds : [];

    return true;
  }
}
