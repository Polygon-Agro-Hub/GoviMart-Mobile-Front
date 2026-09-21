import { io, Socket } from "socket.io-client";
import { environment } from "@/environment/environment";
import { store } from "@/store";
import { tokenStorage } from "@/utils/tokenStorage";
import { ServerNotificationItem } from "../notification/notification.service";

type NotificationCallback = (notification: ServerNotificationItem) => void;
type CityAvailabilityCallback = (cities: any[]) => void;
type UnreadCountCallback = (unreadCount: number) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private cityListeners: Set<CityAvailabilityCallback> = new Set();
  private unreadCountListeners: Set<UnreadCountCallback> = new Set();
  private isConnecting: boolean = false;
  private currentUserId: number | null = null;
  private currentToken: string | null = null;

  /**
   * Connect to backend Socket.IO server with JWT authentication.
   */
  async connect() {
    if (this.socket?.connected || this.isConnecting) {
      // If already connected, make sure user room is registered
      this.syncUserRegistration();
      return;
    }

    this.isConnecting = true;

    try {
      const token =
        this.currentToken ||
        store.getState().auth.token ||
        (await tokenStorage.getToken()) ||
        "";

      this.currentToken = token;

      const baseUrl = environment.API_BASE_URL || "https://dev-mob-api.govimart.com/polygon/";
      const urlMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/);
      const socketUrl = urlMatch ? urlMatch[1] : baseUrl;
      const socketPath = "/socket.io";

      console.log(`🔌 [SocketService] Connecting to: ${socketUrl} (path: ${socketPath})`);

      this.socket = io(socketUrl, {
        path: socketPath,
        transports: ["websocket", "polling"],
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        auth: {
          token: token || undefined,
        },
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.socket.on("connect", () => {
        this.isConnecting = false;
        console.log(`✅ [SocketService] Connected! Socket ID: ${this.socket?.id}`);
        this.syncUserRegistration();
      });

      this.socket.on("new_notification", (data: ServerNotificationItem) => {
        console.log("📢 [SocketService] Received new_notification:", data?.title || data?.id);
        this.notificationListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("[SocketService] Listener error:", e);
          }
        });
      });

      this.socket.on("notification_unread_count", (data: { unreadCount: number } | number) => {
        const count = typeof data === "number" ? data : (data?.unreadCount ?? 0);
        console.log("🔢 [SocketService] Received notification_unread_count:", count);
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

      this.socket.on("connect_error", (err) => {
        this.isConnecting = false;
        console.warn("[SocketService] Connection error:", err.message);
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
        console.log(`🔌 [SocketService] Disconnected: ${reason}`);
      });
    } catch (e) {
      this.isConnecting = false;
      console.error("[SocketService] Failed to initialize socket:", e);
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

  requestCitiesAvailability() {
    if (this.socket?.connected) {
      this.socket.emit("get_cities_availability");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.currentUserId = null;
    this.currentToken = null;
  }
}

export default new SocketService();
