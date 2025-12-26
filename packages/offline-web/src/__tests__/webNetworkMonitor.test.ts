/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { WebNetworkMonitor } from "../network/webNetworkMonitor";

describe("WebNetworkMonitor", () => {
  it("returns current navigator status", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    const monitor = new WebNetworkMonitor();
    await expect(monitor.getCurrent()).resolves.toBe("ONLINE");

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    await expect(monitor.getCurrent()).resolves.toBe("OFFLINE");
  });

  it("emits updates on online/offline events", async () => {
    const monitor = new WebNetworkMonitor();
    const events: string[] = [];
    const unsubscribe = monitor.subscribe((status) => events.push(status));

    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    unsubscribe();

    expect(events).toEqual(["OFFLINE", "ONLINE"]);
  });
});
