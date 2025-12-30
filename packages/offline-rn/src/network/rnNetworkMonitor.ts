import { type NetworkMonitor, type NetworkStatus } from "@corely/offline-core";

type NetInfoLike = {
  addEventListener: (callback: (state: { isConnected: boolean | null }) => void) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null }>;
};

export class ReactNativeNetworkMonitor implements NetworkMonitor {
  private readonly netInfo: NetInfoLike;

  constructor(netInfo: NetInfoLike) {
    this.netInfo = netInfo;
  }

  async getCurrent(): Promise<NetworkStatus> {
    const state = await this.netInfo.fetch();
    return state.isConnected ? "ONLINE" : "OFFLINE";
  }

  subscribe(cb: (status: NetworkStatus) => void): () => void {
    return this.netInfo.addEventListener((state) => cb(state.isConnected ? "ONLINE" : "OFFLINE"));
  }
}
