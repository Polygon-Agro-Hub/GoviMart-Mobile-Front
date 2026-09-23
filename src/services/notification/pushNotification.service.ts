import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import socketService from "../socket/socket.service";
import { ServerNotificationItem } from "./notification.service";
import { navigationRef } from "../../../navigationRef";

// Configure how notifications appear when app is in foreground / background / locked
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Silent fallback
}

class PushNotificationService {
  private isInitialized = false;
  private responseListenerSubscription: Notifications.Subscription | null = null;
  private socketUnsubscribe: (() => void) | null = null;

  /**
   * Initialize System Notifications, Android Channels, and tap response listener.
   * Socket listener is wired in App.tsx at root level (Sales Dash pattern).
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Setup Android Notification Channel
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Polygon Notifications",
            description: "Live notifications for orders, packages, and deliveries.",
            importance: Notifications.AndroidImportance.MAX,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF8A00",
            sound: "default",
            enableVibrate: true,
            showBadge: true,
          });
        } catch (channelErr) {
          // Fallback if not supported
        }
      }

      // 2. Add listener for when user taps on an OS system notification
      this.responseListenerSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          try {
            const data = response?.notification?.request?.content?.data;
            this.handleNotificationNavigation(data);
          } catch (e) {
            console.warn("[PushNotificationService] Error handling response tap:", e);
          }
        });

      console.log("[PushNotificationService] Initialized successfully");
    } catch (error) {
      console.warn("[PushNotificationService] Init error:", error);
    }
  }

  /**
   * Check if OS Notification Permission is currently granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.warn("[PushNotificationService] hasPermission check error:", error);
      return false;
    }
  }

  /**
   * Request OS System Notification Permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.warn("[PushNotificationService] requestPermissions error:", error);
      return false;
    }
  }

  /**
   * Display a native OS System Notification (shows in status bar, lock screen, and heads-up banner)
   */
  async displayLocalNotification(item: ServerNotificationItem | any) {
    if (!item || !item.title) return;

    try {
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Polygon Notifications",
            importance: Notifications.AndroidImportance.MAX,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
            enableVibrate: true,
            showBadge: true,
          });
        } catch (_) {}
      }

      const title = item.title || "Polygon Notification";
      const body =
        item.message ||
        (item.invNo
          ? `Order #${item.invNo}`
          : item.title);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              orderId: item.orderId || item.processOrderId || item.orderid,
              invNo: item.invNo || item.invoiceNo,
              ...item,
            },
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            color: "#FF8A00",
          },
          trigger: (Platform.OS === "android" ? { channelId: "default" } : null) as any,
        });
      } catch (_) {
        // Fallback without channelId trigger
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              orderId: item.orderId || item.processOrderId || item.orderid,
              invNo: item.invNo || item.invoiceNo,
              ...item,
            },
            sound: "default",
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });
      }

      console.log("[PushNotificationService] OS System Notification posted:", title);
    } catch (error) {
      console.warn("[PushNotificationService] displayLocalNotification error:", error);
    }
  }

  /**
   * Route user to the appropriate screen based on notification content when clicked
   */
  handleNotificationNavigation(data: any) {
    if (!data) return;

    const titleLower = (data.title || "").toLowerCase();
    const orderId = data.orderId || data.processOrderId;
    const invoiceNo = data.invNo || data.invoiceNo;

    if (titleLower.includes("package finalization review")) {
      (navigationRef.current as any)?.navigate("ReviewPackage", {
        orderId,
        invoiceNo,
      });
    } else if (orderId) {
      (navigationRef.current as any)?.navigate("OrderDetails", {
        orderId: String(orderId),
      });
    } else {
      (navigationRef.current as any)?.navigate("Notification");
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.responseListenerSubscription) {
      this.responseListenerSubscription.remove();
      this.responseListenerSubscription = null;
    }
    if (this.socketUnsubscribe) {
      this.socketUnsubscribe();
      this.socketUnsubscribe = null;
    }
    this.isInitialized = false;
  }
}

export default new PushNotificationService();
