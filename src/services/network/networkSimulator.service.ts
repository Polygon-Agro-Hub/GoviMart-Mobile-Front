import axios, { InternalAxiosRequestConfig } from "axios";
import { environment } from "@/environment/environment";

/**
 * Global Network Simulator is active ONLY when environment.isDeveloper is true.
 * When isDeveloper is false (default), all requests run at 100% normal high speed.
 */
export const getIsNetworkSimulatorEnabled = () => Boolean(environment.isDeveloper);
export const ENABLE_NETWORK_SIMULATOR = Boolean(environment.isDeveloper);

export type NetworkProfileId = "normal" | "fast3g" | "slow3g" | "2g" | "offline";

export interface NetworkProfile {
  id: NetworkProfileId;
  label: string;
  shortLabel: string;
  delayMs: number;
  errorRate: number; // 0.0 to 1.0 (probability of simulated network timeout)
  description: string;
}

export const NETWORK_PROFILES: Record<NetworkProfileId, NetworkProfile> = {
  normal: {
    id: "normal",
    label: "Normal Speed",
    shortLabel: "⚡ Normal",
    delayMs: 0,
    errorRate: 0,
    description: "No artificial delay (Real Network)",
  },
  fast3g: {
    id: "fast3g",
    label: "Fast 3G",
    shortLabel: "📶 3G (1.5s)",
    delayMs: 1500,
    errorRate: 0,
    description: "1.5s delay on all requests",
  },
  slow3g: {
    id: "slow3g",
    label: "Slow 3G",
    shortLabel: "🐢 Slow (3.5s)",
    delayMs: 3500,
    errorRate: 0.1,
    description: "3.5s delay + 10% packet drop",
  },
  "2g": {
    id: "2g",
    label: "Very Slow 2G",
    shortLabel: "🐌 2G (6s)",
    delayMs: 6000,
    errorRate: 0.25,
    description: "6.0s delay + 25% packet drop",
  },
  offline: {
    id: "offline",
    label: "Offline",
    shortLabel: "❌ Offline",
    delayMs: 200,
    errorRate: 1.0,
    description: "100% failure (Simulate no internet)",
  },
};

type Listener = () => void;

class NetworkSimulatorService {
  private currentProfileId: NetworkProfileId = "normal";
  private activeRequests = 0;
  private listeners: Set<Listener> = new Set();

  public getCurrentProfile(): NetworkProfile {
    return NETWORK_PROFILES[this.currentProfileId] || NETWORK_PROFILES.normal;
  }

  public setProfile(id: NetworkProfileId) {
    if (NETWORK_PROFILES[id]) {
      this.currentProfileId = id;
      this.notifyListeners();
    }
  }

  public getActiveRequestsCount(): number {
    return this.activeRequests;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore errors in listeners
      }
    });
  }

  public isEnabled(): boolean {
    return getIsNetworkSimulatorEnabled();
  }

  /**
   * Called by Axios request interceptor.
   * Increments active request counter and injects configured artificial latency.
   */
  public async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    if (!this.isEnabled()) return config;

    this.activeRequests++;
    this.notifyListeners();

    const profile = this.getCurrentProfile();

    if (profile.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, profile.delayMs));
    }

    if (profile.errorRate > 0 && Math.random() < profile.errorRate) {
      this.handleResponseComplete();
      throw new axios.AxiosError(
        `[Simulated Network] Request timed out (${profile.label})`,
        "ECONNABORTED",
        config
      );
    }

    return config;
  }

  /**
   * Called by Axios response and error interceptor when request completes.
   */
  public handleResponseComplete() {
    if (!this.isEnabled()) return;
    if (this.activeRequests > 0) {
      this.activeRequests--;
      this.notifyListeners();
    }
  }
}

export const networkSimulator = new NetworkSimulatorService();
export default networkSimulator;
