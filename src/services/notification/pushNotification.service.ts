import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import socketService from "../socket/socket.service";
import { ServerNotificationItem } from "./notification.service";
import { navigationRef } from "../../../navigationRef";

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private isInitialized = false;
  private responseListenerSubscription: Notifications.Subscription | null = null;
  private socketUnsubscribe: (() => void) | null = null;

  /**
   * Initialize System Notifications, Android Channels, and real-time Socket listeners.
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Setup Android Notification Channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Polygon Notifications",
          description: "Live notifications for orders, packages, and deliveries.",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF8A00",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
      }

      // 2. Add listener for when user taps on an OS system notification
      this.responseListenerSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          try {
            const data = response.notification.request.content.data;
            this.handleNotificationNavigation(data);
          } catch (e) {
            console.warn("[PushNotificationService] Error handling response tap:", e);
          }
        });

      // 3. Connect to Socket.IO and listen for new notifications to trigger OS alerts
      socketService.connect();
      this.socketUnsubscribe = socketService.onNewNotification((item: ServerNotificationItem) => {
        this.displayLocalNotification(item);
      });

      console.log("[PushNotificationService] Initialized successfully");
    } catch (error) {
      console.warn("[PushNotificationService] Init error:", error);
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
   * Display a native OS System Notification (shows in status bar, lock screen, and tray)
   */
  async displayLocalNotification(item: ServerNotificationItem | any) {
    if (!item) return;

    try {
      const title = item.title || "Polygon Notification";
      const body = item.message || "";

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: item,
          sound: "default",
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: "#FF8A00",
        },
        trigger: null, // trigger immediately
      });

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
