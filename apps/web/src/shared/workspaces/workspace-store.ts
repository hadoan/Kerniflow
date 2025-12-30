const STORAGE_KEY = "corely-active-workspace";

let activeWorkspaceId: string | null = null;
const subscribers = new Set<(workspaceId: string | null) => void>();

export function loadActiveWorkspaceId(): string | null {
  if (activeWorkspaceId) {
    return activeWorkspaceId;
  }
  if (typeof window === "undefined") {
    return null;
  }
  activeWorkspaceId = localStorage.getItem(STORAGE_KEY);
  return activeWorkspaceId;
}

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId ?? loadActiveWorkspaceId();
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
  activeWorkspaceId = workspaceId;
  if (typeof window !== "undefined") {
    if (workspaceId) {
      localStorage.setItem(STORAGE_KEY, workspaceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  subscribers.forEach((fn) => fn(workspaceId));
}

export function subscribeWorkspace(listener: (workspaceId: string | null) => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
