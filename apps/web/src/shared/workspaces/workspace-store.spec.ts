import { describe, expect, it, vi } from "vitest";
import {
  getActiveWorkspaceId,
  loadActiveWorkspaceId,
  setActiveWorkspaceId,
  subscribeWorkspace,
} from "./workspace-store";

describe("workspace-store", () => {
  it("stores and returns the active workspace id", () => {
    setActiveWorkspaceId(null);
    expect(getActiveWorkspaceId()).toBeNull();

    setActiveWorkspaceId("ws-1");
    expect(getActiveWorkspaceId()).toBe("ws-1");
  });

  it("invokes subscribers when workspace changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeWorkspace(listener);

    setActiveWorkspaceId("ws-2");
    expect(listener).toHaveBeenCalledWith("ws-2");

    listener.mockClear();
    unsubscribe();
    setActiveWorkspaceId("ws-3");
    expect(listener).not.toHaveBeenCalled();
  });

  it("loads from localStorage when available", () => {
    const storage: Record<string, string> = { "corely-active-workspace": "stored-ws" };
    const storageApi: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    };

    (globalThis as any).window = { localStorage: storageApi };
    (globalThis as any).localStorage = storageApi;

    setActiveWorkspaceId(null);
    storage["corely-active-workspace"] = "stored-ws";
    expect(loadActiveWorkspaceId()).toBe("stored-ws");
  });
});
