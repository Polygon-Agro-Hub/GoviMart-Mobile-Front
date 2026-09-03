import { Platform } from "react-native";
import socketService from "../socket/socket.service";
import { ServerNotificationItem } from "./notification.service";

let NotificationsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotificationsModule = require("expo-notifications");
} catch (e) {
  console.warn("[PushNotificationService] expo-notifications module could not be loaded statically:", e);
}

// Configure how notifications are displayed when app is in foreground / background
if (NotificationsModule?.setNotificationHandler) {
  NotificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class PushNotificationService {
  private isInitialized = false;

  private getNotifications() {
    if (!NotificationsModule) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        NotificationsModule = require("expo-notifications");
      } catch (e) {
        // silent fallback
      }
    }
    return NotificationsModule;
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const Notifications = this.getNotifications();
      if (!Notifications) {
        console.warn("[PushNotificationService] expo-notifications not yet resolved by bundler");
        return;
      }

      // Configure Android channel
      if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync("polygon-orders", {
          name: "Polygon Order Notifications",
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3E206D",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Request notification permissions
      if (Notifications.getPermissionsAsync) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted" && Notifications.requestPermissionsAsync) {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.warn("[PushNotificationService] Notification permission not granted");
        }
      }

      // Listen to real-time socket events to trigger local OS notification
      socketService.connect();
      socketService.onNewNotification((item: ServerNotificationItem) => {
        this.displayLocalNotification(item);
      });
    } catch (error) {
      console.error("[PushNotificationService] Init error:", error);
    }
  }

  /**
   * Triggers an OS-level notification banner (in background / foreground tray)
   */
  async displayLocalNotification(item: ServerNotificationItem) {
    try {
      const Notifications = this.getNotifications();
      if (!Notifications?.scheduleNotificationAsync) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Polygon",
          subtitle: item.title,
          body: `${item.title}\n${item.message}`,
          sound: "default",
          data: {
            notificationId: item.id,
            orderId: item.orderId || item.processOrderId,
            title: item.title,
          },
        },
        trigger: null, // deliver immediately
      });
    } catch (e) {
      console.warn("[PushNotificationService] Could not schedule local notification:", e);
    }
  }
}

export default new PushNotificationService();

