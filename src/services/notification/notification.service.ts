import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

export interface ServerNotificationItem {
  id: number;
  processOrderId?: number;
  orderId?: number;
  invNo?: string;
  title: string;
  message: string;
  isRead: number | boolean;
  createdAt: string;
  sheduleDate?: string;
  amount?: string | number;
  orderStatus?: string;
  delivaryMethod?: string;
}

export interface NotificationResponse {
  status: boolean;
  notifications: ServerNotificationItem[];
  unreadCount: number;
}

class NotificationService {
  async getNotifications(limit: number = 50, offset: number = 0) {
    return apiClient.get<NotificationResponse>(
      `${ENDPOINTS.NOTIFICATION.GET_ALL}?limit=${limit}&offset=${offset}`
    );
  }

  async markAsRead(id: number) {
    const url = ENDPOINTS.NOTIFICATION.MARK_READ.replace(":id", id.toString());
    return apiClient.patch(url);
  }

  async markAllAsRead() {
    return apiClient.put(ENDPOINTS.NOTIFICATION.MARK_ALL_READ);
  }

  async seedDummyNotifications(userId?: number) {
    return apiClient.post(ENDPOINTS.NOTIFICATION.SEED_DUMMY, { userId });
  }
}

export default new NotificationService();
