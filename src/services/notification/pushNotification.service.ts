import socketService from "../socket/socket.service";
import { ServerNotificationItem } from "./notification.service";

class PushNotificationService {
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Connect to Socket.IO for real-time notification delivery
      socketService.connect();
    } catch (error) {
      console.warn("[PushNotificationService] Init error:", error);
    }
  }

  /**
   * Safe no-op / local notification dispatcher
   */
  async displayLocalNotification(item: ServerNotificationItem) {
    // In-app notifications are handled natively by InAppNotificationBanner component via Socket.IO
    console.log("[PushNotificationService] Notification received:", item?.title);
  }
}

export default new PushNotificationService();

