import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Guard that only allows test harness endpoints in NODE_ENV=test
 * and requires X-Test-Secret header matching TEST_HARNESS_SECRET env var
 */
@Injectable()
export class TestHarnessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Only allow in test environment
    if (process.env.NODE_ENV !== "test") {
      throw new ForbiddenException("Test harness endpoints only available in NODE_ENV=test");
    }

    const request = context.switchToHttp().getRequest();
    const testSecret = request.headers["x-test-secret"];
    const expectedSecret = process.env.TEST_HARNESS_SECRET || "test-secret-key";

    // Require X-Test-Secret header
    if (!testSecret || testSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid or missing X-Test-Secret header");
    }

    return true;
  }
}
