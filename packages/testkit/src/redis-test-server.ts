import type { StartedTestContainer } from "testcontainers";
import { GenericContainer } from "testcontainers";

let sharedContainer: StartedTestContainer | null = null;
let activeCount = 0;

export class RedisTestServer {
  private started = false;
  private connectionUrl: string | null = null;

  async up(): Promise<void> {
    if (this.started) {
      return;
    }

    if (!sharedContainer) {
      sharedContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
    }

    const host = sharedContainer.getHost();
    const port = sharedContainer.getMappedPort(6379);
    this.connectionUrl = `redis://${host}:${port}`;
    this.started = true;
    activeCount += 1;
  }

  get url(): string {
    if (!this.connectionUrl) {
      throw new Error("Redis test server not started");
    }
    return this.connectionUrl;
  }

  async down(force = false): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.connectionUrl = null;
    if (activeCount > 0) {
      activeCount -= 1;
    }

    if (force && sharedContainer && activeCount === 0) {
      await sharedContainer.stop();
      sharedContainer = null;
    }
  }
}
