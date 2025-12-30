import { type NetworkMonitor, type NetworkStatus } from "@corely/offline-core";

export class WebNetworkMonitor implements NetworkMonitor {
  async getCurrent(): Promise<NetworkStatus> {
    if (typeof navigator === "undefined") {
      return "OFFLINE";
    }
    return navigator.onLine ? "ONLINE" : "OFFLINE";
  }

  subscribe(cb: (status: NetworkStatus) => void): () => void {
    const online = () => cb("ONLINE");
    const offline = () => cb("OFFLINE");
    if (typeof window !== "undefined") {
      window.addEventListener("online", online);
      window.addEventListener("offline", offline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", online);
        window.removeEventListener("offline", offline);
      }
    };
  }
}
