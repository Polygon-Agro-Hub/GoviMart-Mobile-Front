import { io, Socket } from "socket.io-client";
import { environment } from "@/environment/environment";
import { store } from "@/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ServerNotificationItem } from "../notification/notification.service";

type NotificationCallback = (notification: ServerNotificationItem) => void;
type CityAvailabilityCallback = (cities: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private cityListeners: Set<CityAvailabilityCallback> = new Set();
  private isConnecting: boolean = false;

  private getSocketUrl(): string {
    const baseUrl = environment.API_BASE_URL || "http://localhost:3000";
    // Strip trailing /polygon or /polygon/ to connect to root socket namespace
    return baseUrl.replace(/\/polygon\/?$/i, "").replace(/\/+$/, "");
  }

  async connect() {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token =
        store.getState().auth.token ||
        (await AsyncStorage.getItem("userToken")) ||
        "";

      const socketUrl = this.getSocketUrl();
      console.log(`🔌 [SocketService] Connecting to: ${socketUrl}`);

      this.socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.socket.on("connect", () => {
        this.isConnecting = false;
        console.log(`✅ [SocketService] Connected! Socket ID: ${this.socket?.id}`);

        // Also emit register_user with profile ID if available
        const userProfileStr = store.getState().auth.userProfile;
        const userId = userProfileStr?.id;
        if (userId) {
          this.socket?.emit("register_user", userId);
        }
      });

      this.socket.on("new_notification", (data: ServerNotificationItem) => {
        console.log("📢 [SocketService] Received new_notification:", data);
        this.notificationListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("[SocketService] Listener error:", e);
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

  onNewNotification(callback: NotificationCallback): () => void {
    this.notificationListeners.add(callback);
    // Return cleanup unsubscribe function
    return () => {
      this.notificationListeners.delete(callback);
    };
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
  }
}

export default new SocketService();
