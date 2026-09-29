import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import axios from "axios";
import socketService from "../socket/socket.service";
import { ServerNotificationItem } from "./notification.service";
import { navigationRef } from "../../../navigationRef";
import { store } from "@/store";
import { environment } from "@/environment/environment";

const CHANNEL_ID = "default";

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
  private registeredTokens = new Set<string>();
  private isRegisteringToken = false;
  private lastUserId: string | number | null = null;

  /**
   * Initialize System Notifications, Android Channels, and tap response listener.
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Setup Android Notification Channel
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
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

      // 3. Register push token if user is already logged in
      this.registerPushToken().catch((e) =>
        console.warn("[PushNotificationService] Initial token registration deferred:", e?.message)
      );

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
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.warn("[PushNotificationService] requestPermissions error:", error);
      return false;
    }
  }

  /**
   * Registers push token(s) (native FCM and/or Expo) with the backend database
   * Same structure as Codi Net
   */
  async registerPushToken(): Promise<void> {
    if (this.isRegisteringToken) return;
    this.isRegisteringToken = true;

    try {
      const authToken = store.getState()?.auth?.token;
      if (!authToken) {
        console.log("ℹ️ [PushNotificationService] User not logged in, skipping push token registration.");
        return;
      }

      const currentUserId = store.getState()?.auth?.userProfile?.id;
      if (currentUserId && this.lastUserId !== currentUserId) {
        this.registeredTokens.clear();
        this.lastUserId = currentUserId;
      }

      if (!Device.isDevice) {
        console.log("ℹ️ [PushNotificationService] Push notifications require a physical device.");
        return;
      }

      // Check / request permission
      const hasPerm = await this.requestPermissions();
      if (!hasPerm) {
        console.warn("⚠️ [PushNotificationService] Notification permission not granted.");
        return;
      }

      // 1. Native Device Push Token (FCM on Android, APNs on iOS)
      try {
        const devTokenObj = await Notifications.getDevicePushTokenAsync();
        if (devTokenObj?.data) {
          console.log(
            `📱 [PushNotificationService] Obtained native device token (${devTokenObj.type}):`,
            devTokenObj.data.slice(0, 20) + "..."
          );
          await this.sendTokenToBackend(
            authToken,
            devTokenObj.data,
            devTokenObj.type || (Platform.OS === "android" ? "fcm" : "apns")
          );
        }
      } catch (devErr: any) {
        console.warn("⚠️ [PushNotificationService] Native device token not available:", devErr?.message);
      }

      // 2. Expo Push Token (secondary fallback)
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          "1c8baa2b-5982-43e9-9f80-a01886235093";
        const expoTokenObj = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (expoTokenObj?.data) {
          console.log(
            "📱 [PushNotificationService] Obtained Expo push token:",
            expoTokenObj.data.slice(0, 25) + "..."
          );
          await this.sendTokenToBackend(authToken, expoTokenObj.data, "expo");
        }
      } catch (expoErr: any) {
        console.log("ℹ️ [PushNotificationService] Expo push token not obtained:", expoErr?.message);
      }
    } catch (err: any) {
      console.warn("❌ [PushNotificationService] registerPushToken error:", err?.message);
    } finally {
      this.isRegisteringToken = false;
    }
  }

  private async sendTokenToBackend(authToken: string, pushToken: string, tokenType: string): Promise<void> {
    const cacheKey = `${pushToken}_${tokenType}`;
    if (this.registeredTokens.has(cacheKey)) return;

    try {
      const baseUrl = environment.API_BASE_URL.replace(/\/+$/, "");
      const url = `${baseUrl}/api/notification/save-push-token`;
      const response = await axios.post(
        url,
        {
          pushToken,
          tokenType: tokenType.toLowerCase() === "expo" ? "expo" : "fcm",
          deviceType: Platform.OS,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data?.status || response.data?.success) {
        console.log(`✅ [PushNotificationService] Push token registered on backend (${tokenType})`);
        this.registeredTokens.add(cacheKey);
      }
    } catch (apiErr: any) {
      console.error(
        "❌ [PushNotificationService] Failed to send push token to backend:",
        apiErr?.response?.data || apiErr?.message
      );
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
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
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
          trigger: (Platform.OS === "android" ? { channelId: CHANNEL_ID } : null) as any,
        });
      } catch (_) {
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

    const buyerType = store.getState()?.auth?.userProfile?.buyerType || "Retail";
    const isRetail = buyerType.toLowerCase() === "retail";
    const isCancelled = (data.orderStatus || "").toLowerCase() === "cancelled";

    if (
      isRetail &&
      !isCancelled &&
      (titleLower.includes("package finalization review") ||
       titleLower.includes("review package") ||
       titleLower.includes("package review"))
    ) {
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
