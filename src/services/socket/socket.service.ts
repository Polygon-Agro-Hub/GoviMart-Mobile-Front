import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { store } from "@/store";
import { tokenStorage } from "@/utils/tokenStorage";
import notificationService, { ServerNotificationItem } from "../notification/notification.service";
import { updateGlobalUnreadCount, getGlobalUnreadCount } from "@/store/notificationStore";

const LAST_NOTIFIED_ID_KEY = "@govimart_last_notified_notification_id";

type NotificationCallback = (notification: ServerNotificationItem) => void;
type CityAvailabilityCallback = (cities: any[]) => void;
type UnreadCountCallback = (unreadCount: number) => void;
type CatalogUpdateCallback = (data?: any) => void;
type BannerUpdateCallback = (data?: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private cityListeners: Set<CityAvailabilityCallback> = new Set();
  private unreadCountListeners: Set<UnreadCountCallback> = new Set();
  private catalogListeners: Set<CatalogUpdateCallback> = new Set();
  private bannerListeners: Set<BannerUpdateCallback> = new Set();

  private isConnecting: boolean = false;
  private currentUserId: number | null = null;
  private currentToken: string | null = null;

  // Session-only tracking (Sales Dash pattern: resets every app launch)
  private shownBannerUpToId: number = 0;
  private lastKnownUnreadCount: number = -1; // -1 means first check this session

  private fallbackPollingTimer: any = null;
  private hasLoggedConnectionNotice: boolean = false;
  private appStateSubscription: any = null;
  private isPollingActive: boolean = false;

  constructor() {
    this.setupAppStateListener();
  }

  /**
   * Listen for app coming to foreground to immediately check for notifications (Sales Dash pattern)
   */
  private setupAppStateListener() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          this.checkNewNotifications();
        }
      }
    );
  }

  /**
   * Connect to backend Socket.IO server with JWT authentication + automatic fallback polling.
   */
  async connect() {
    if (this.socket?.connected || this.isConnecting) {
      this.syncUserRegistration();
      return;
    }

    this.isConnecting = true;

    try {
      const token =
        this.currentToken ||
        store.getState().auth.token ||
        (await tokenStorage.getToken()) ||
        (await AsyncStorage.getItem("userToken")) ||
        "";

      this.currentToken = token;

      const userProfile = store.getState().auth.userProfile;
      if (userProfile?.id) {
        this.currentUserId = userProfile.id;
      }

      const baseUrl = environment.API_BASE_URL || "https://dev-mob-api.polygon.lk/polygon/";
      const urlMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/);
      const socketUrl = urlMatch ? urlMatch[1] : baseUrl;
      const socketPath = "/socket.io";

      console.log(`🔌 [SocketService] Connecting to: ${socketUrl} (path: ${socketPath})`);

      // Use "polling" first for Vercel/serverless/mobile carrier reliability, upgrade to websocket
      this.socket = io(socketUrl, {
        path: socketPath,
        transports: ["polling", "websocket"],
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        auth: {
          token: token || undefined,
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
        timeout: 8000,
      });

      this.socket.on("connect", () => {
        this.isConnecting = false;
        this.hasLoggedConnectionNotice = false;
        console.log(`✅ [SocketService] Connected! Socket ID: ${this.socket?.id}`);
        this.syncUserRegistration();
      });

      const handleSocketNotification = (data: ServerNotificationItem) => {
        console.log("📢 [SocketService] Real-time socket event received:", data?.title || data?.id);

        if (data?.id && data.id > this.shownBannerUpToId) {
          this.shownBannerUpToId = data.id;
          AsyncStorage.setItem(LAST_NOTIFIED_ID_KEY, String(this.shownBannerUpToId)).catch(() => {});
        }

        // Update global unread badge immediately for ALL tabs (Sales Dash pattern)
        if (typeof (data as any)?.unreadCount === "number") {
          this.lastKnownUnreadCount = (data as any).unreadCount;
          updateGlobalUnreadCount((data as any).unreadCount);
        } else if (this.lastKnownUnreadCount >= 0) {
          this.lastKnownUnreadCount += 1;
          updateGlobalUnreadCount(this.lastKnownUnreadCount);
        } else {
          updateGlobalUnreadCount(getGlobalUnreadCount() + 1);
        }

        this.dispatchNotification(data);
      };

      this.socket.on("new_notification", handleSocketNotification);
      this.socket.on("newNotification", handleSocketNotification);

      this.socket.on("notification_unread_count", (data: { unreadCount: number } | number) => {
        const count = typeof data === "number" ? data : (data?.unreadCount ?? 0);
        console.log("🔢 [SocketService] Received notification_unread_count:", count);

        this.lastKnownUnreadCount = count;
        updateGlobalUnreadCount(count);

        this.unreadCountListeners.forEach((listener) => {
          try {
            listener(count);
          } catch (e) {
            console.error("[SocketService] Unread count listener error:", e);
          }
        });
      });

      this.socket.on("city_availability_updated", (cities: any[]) => {
        console.log("🌍 [SocketService] Received city_availability_updated:", cities?.length);
        this.cityListeners.forEach((listener) => {
          try {
            listener(cities);
          } catch (e) {
            console.error("[SocketService] City listener error:", e);
          }
        });
      });

      const handleCatalogUpdate = (data: any) => {
        console.log("📦 [SocketService] Received catalog/product/package update via socket:", data);
        this.catalogListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("[SocketService] Catalog listener error:", e);
          }
        });
      };

      this.socket.on("catalog_updated", handleCatalogUpdate);
      this.socket.on("products_updated", handleCatalogUpdate);
      this.socket.on("packages_updated", handleCatalogUpdate);
      this.socket.on("products_changed", handleCatalogUpdate);
      this.socket.on("packages_changed", handleCatalogUpdate);
      this.socket.on("item_status_changed", handleCatalogUpdate);
      this.socket.on("product_status_changed", handleCatalogUpdate);
      this.socket.on("package_status_changed", handleCatalogUpdate);

      const handleBannerUpdate = (data: any) => {
        console.log("🎨 [SocketService] Received banner update via socket:", data);
        this.bannerListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("[SocketService] Banner listener error:", e);
          }
        });
      };

      this.socket.on("banners_updated", handleBannerUpdate);
      this.socket.on("banner_updated", handleBannerUpdate);
      this.socket.on("slides_updated", handleBannerUpdate);
      this.socket.on("banner_position_updated", handleBannerUpdate);

      this.socket.on("connect_error", (err) => {
        this.isConnecting = false;
        if (!this.hasLoggedConnectionNotice) {
          this.hasLoggedConnectionNotice = true;
          console.log("ℹ️ [SocketService] Socket connecting or fallback active:", err.message);
        }
        this.startFallbackPolling();
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
        console.log(`🔌 [SocketService] Disconnected: ${reason}`);
        if (reason !== "io client disconnect") {
          this.startFallbackPolling();
        }
      });

      // Always activate background polling as a reliable safety net (Sales Dash pattern)
      this.startFallbackPolling();

    } catch (e) {
      this.isConnecting = false;
      console.error("[SocketService] Failed to initialize socket:", e);
      this.startFallbackPolling();
    }
  }

  /**
   * Dispatch notification to all registered listeners (Push banner, Notification screen)
   */
  private dispatchNotification(item: ServerNotificationItem) {
    this.notificationListeners.forEach((listener) => {
      try {
        listener(item);
      } catch (e) {
        console.error("[SocketService] Listener error:", e);
      }
    });
  }

  /**
   * Check for new notifications immediately (e.g. on foreground or manual refresh)
   */
  public async checkNewNotifications() {
    await this.pollNotifications();
  }

  /**
   * Background REST polling function to guarantee real-time updates on APK and mobile networks
   */
  private async pollNotifications() {
    if (this.isPollingActive) return;
    this.isPollingActive = true;

    try {
      const response = await notificationService.getNotifications(50, 0);
      const data = response.data;
      if (!data || !data.status) return;

      const notifications: ServerNotificationItem[] = data.notifications || [];
      const unreadCount: number = Number(data.unreadCount) || 0;

      if (!notifications || notifications.length === 0) {
        this.lastKnownUnreadCount = 0;
        updateGlobalUnreadCount(0);
        return;
      }

      // Filter unread notifications
      const unreadItems = notifications.filter(
        (n) => Number(n.isRead) === 0 || n.isRead === false
      );

      const latestUnreadId =
        unreadItems.length > 0
          ? Math.max(...unreadItems.map((n) => Number(n.id) || 0))
          : 0;

      // ── 1. STATE-DRIVEN INBOX SYNC (Silent) ──────────────────────────────
      // Always update global unread count badge silently for the inbox across all tabs
      updateGlobalUnreadCount(unreadCount);

      // Load persistent high-water mark from storage if not in memory
      if (this.shownBannerUpToId === 0) {
        try {
          const stored = await AsyncStorage.getItem(LAST_NOTIFIED_ID_KEY);
          if (stored) {
            this.shownBannerUpToId = parseInt(stored, 10) || 0;
          }
        } catch (_) {}
      }

      // ── 2. BASELINE INITIALIZATION (First check of session) ───────────────
      // When app opens, establish baseline high-water mark silently without spamming popups
      if (this.lastKnownUnreadCount === -1) {
        this.shownBannerUpToId = Math.max(this.shownBannerUpToId, latestUnreadId);
        this.lastKnownUnreadCount = unreadCount;
        AsyncStorage.setItem(LAST_NOTIFIED_ID_KEY, String(this.shownBannerUpToId)).catch(() => {});
        console.log(
          "ℹ️ [SocketService] Baseline inbox state synced silently. Unread count:",
          unreadCount,
          "High-water mark ID:",
          this.shownBannerUpToId
        );
        return;
      }

      // ── 3. EVENT-DRIVEN ALERTS (Only genuinely new real-time arrivals) ────
      // Only alert if new items arrived whose ID is strictly higher than the high-water mark
      if (latestUnreadId > this.shownBannerUpToId) {
        const newItems = unreadItems.filter(
          (n) => (Number(n.id) || 0) > this.shownBannerUpToId
        );

        newItems.forEach((item) => {
          const formatted = {
            ...item,
            unreadCount,
          };
          console.log("🔔 [SocketService] Genuinely new notification detected via poll:", item.title);
          this.dispatchNotification(formatted);
        });

        this.shownBannerUpToId = latestUnreadId;
        AsyncStorage.setItem(LAST_NOTIFIED_ID_KEY, String(this.shownBannerUpToId)).catch(() => {});
      }

      this.lastKnownUnreadCount = unreadCount;

    } catch (_) {
      // Silently ignore network failures during background polling
    } finally {
      this.isPollingActive = false;
    }
  }

  private startFallbackPolling() {
    if (this.fallbackPollingTimer) return;
    // Initial poll
    this.pollNotifications();
    // Then every 6 seconds for fast, responsive in-app alerts
    this.fallbackPollingTimer = setInterval(() => {
      this.pollNotifications();
    }, 6000);
  }

  private stopFallbackPolling() {
    if (this.fallbackPollingTimer) {
      clearInterval(this.fallbackPollingTimer);
      this.fallbackPollingTimer = null;
    }
  }

  /**
   * Register or re-register user with the socket room upon login
   */
  async registerUser(userId: number, token?: string) {
    this.currentUserId = userId;
    if (token) this.currentToken = token;

    if (!this.socket?.connected) {
      await this.connect();
    } else {
      this.syncUserRegistration();
    }
  }

  /**
   * Sync user registration payload to backend
   */
  private async syncUserRegistration() {
    if (!this.socket?.connected) return;

    const userProfile = store.getState().auth.userProfile;
    const userId = this.currentUserId || userProfile?.id;
    const token =
      this.currentToken ||
      store.getState().auth.token ||
      (await tokenStorage.getToken()) ||
      "";

    if (userId) {
      console.log(`👤 [SocketService] Registering user ID ${userId} in socket room...`);
      this.socket.emit("register_user", {
        userId: Number(userId),
        token: token || undefined,
      });
    }
  }

  onNewNotification(callback: NotificationCallback): () => void {
    this.notificationListeners.add(callback);
    return () => {
      this.notificationListeners.delete(callback);
    };
  }

  onUnreadCountUpdate(callback: UnreadCountCallback): () => void {
    this.unreadCountListeners.add(callback);
    return () => {
      this.unreadCountListeners.delete(callback);
    };
  }

  emitLocalUnreadCount(count: number) {
    this.lastKnownUnreadCount = count;
    updateGlobalUnreadCount(count);
    this.unreadCountListeners.forEach((listener) => {
      try {
        listener(count);
      } catch (e) {
        console.error("[SocketService] Local count emit error:", e);
      }
    });
  }

  onCityAvailabilityUpdated(callback: CityAvailabilityCallback): () => void {
    this.cityListeners.add(callback);
    return () => {
      this.cityListeners.delete(callback);
    };
  }

  onCatalogUpdate(callback: CatalogUpdateCallback): () => void {
    this.catalogListeners.add(callback);
    return () => {
      this.catalogListeners.delete(callback);
    };
  }

  onBannerUpdate(callback: BannerUpdateCallback): () => void {
    this.bannerListeners.add(callback);
    return () => {
      this.bannerListeners.delete(callback);
    };
  }

  requestCitiesAvailability() {
    if (this.socket?.connected) {
      this.socket.emit("get_cities_availability");
    }
  }

  disconnect() {
    this.stopFallbackPolling();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.currentUserId = null;
    this.currentToken = null;
    this.lastKnownUnreadCount = -1;
    this.shownBannerUpToId = 0;
    this.isPollingActive = false;
    AsyncStorage.removeItem(LAST_NOTIFIED_ID_KEY).catch(() => {});
  }
}

export default new SocketService();
