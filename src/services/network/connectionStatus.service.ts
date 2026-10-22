import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { networkSimulator } from "./networkSimulator.service";
import { useState, useEffect } from "react";

type ConnectionStatusListener = (isUnstable: boolean) => void;

class ConnectionStatusService {
  private listeners: Set<ConnectionStatusListener> = new Set();
  private _isUnstable: boolean = false;
  private forcedUnstable: boolean | null = null;
  private highLatencyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Listen to real network changes via NetInfo
    try {
      NetInfo.addEventListener((state: NetInfoState) => {
        this.evaluateStatus(state);
      });
    } catch (err) {
      console.warn("[ConnectionStatusService] NetInfo init error:", err);
    }

    // 2. Listen to Developer Network Simulator profile changes
    try {
      networkSimulator.subscribe(() => {
        this.evaluateStatus();
      });
    } catch (err) {
      console.warn("[ConnectionStatusService] Simulator subscription error:", err);
    }
  }

  /**
   * Evaluate whether connection should be considered unstable:
   * - Manual override active
   * - Real network offline or unreachable
   * - Real cellular is slow (2G)
   * - Developer network simulator active with slow/offline profile
   */
  public evaluateStatus(netState?: NetInfoState) {
    if (this.forcedUnstable !== null) {
      this.setUnstable(this.forcedUnstable);
      return;
    }

    // Check Developer Network Simulator profile
    if (networkSimulator.isEnabled()) {
      const profile = networkSimulator.getCurrentProfile();
      if (profile.id === "slow3g" || profile.id === "2g" || profile.id === "offline") {
        this.setUnstable(true);
        return;
      }
    }

    // Check real NetInfo state if available
    if (netState) {
      const isDisconnected = netState.isConnected === false || netState.isInternetReachable === false;
      const isSlowCellular =
        netState.type === "cellular" &&
        (netState.details as any)?.cellularGeneration === "2g";

      if (isDisconnected || isSlowCellular) {
        this.setUnstable(true);
        return;
      }
    }

    // If no condition triggered unstable, set to false (unless a high latency trigger is active)
    if (!this.highLatencyTimeout) {
      this.setUnstable(false);
    }
  }

  /**
   * Called by Axios interceptor when request takes abnormally long (> 3500ms) or fails with network timeout.
   */
  public reportHighLatencyOrTimeout() {
    this.setUnstable(true);

    if (this.highLatencyTimeout) {
      clearTimeout(this.highLatencyTimeout);
    }

    // Auto-clear after 8 seconds if no further slow requests occur
    this.highLatencyTimeout = setTimeout(() => {
      this.highLatencyTimeout = null;
      this.evaluateStatus();
    }, 8000);
  }

  /**
   * Called by Axios interceptor when a request completes quickly and normally.
   */
  public reportFastSuccess() {
    if (this.highLatencyTimeout) {
      clearTimeout(this.highLatencyTimeout);
      this.highLatencyTimeout = null;
    }
    this.evaluateStatus();
  }

  /**
   * Manual override for testing (null clears override).
   */
  public setForcedUnstable(forced: boolean | null) {
    this.forcedUnstable = forced;
    this.evaluateStatus();
  }

  public getForcedUnstable(): boolean | null {
    return this.forcedUnstable;
  }

  public isUnstable(): boolean {
    return this._isUnstable;
  }

  private setUnstable(val: boolean) {
    if (this._isUnstable !== val) {
      this._isUnstable = val;
      this.notifyListeners();
    }
  }

  public subscribe(listener: ConnectionStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current state
    listener(this._isUnstable);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this._isUnstable);
      } catch {
        // ignore subscriber errors
      }
    });
  }
}

export const connectionStatusService = new ConnectionStatusService();

/**
 * React hook to reactively subscribe to unstable connection state in components.
 */
export const useIsConnectionUnstable = (): boolean => {
  const [unstable, setUnstable] = useState(connectionStatusService.isUnstable());

  useEffect(() => {
    return connectionStatusService.subscribe((isUnstable) => {
      setUnstable(isUnstable);
    });
  }, []);

  return unstable;
};

export default connectionStatusService;
