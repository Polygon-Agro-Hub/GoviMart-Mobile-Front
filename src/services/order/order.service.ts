import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

class OrderService {
    async getOrderHistory() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_HISTORY, { headers });
    }

    async getOrderById(orderId: string) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_BY_ID.replace(":orderId", orderId), { headers });
    }

    async getOrderPackages(orderId: string) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_PACKAGES.replace(":orderId", orderId), { headers });
    }

    async getOrderAdditionalItems(orderId: string) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_ADDITIONAL_ITEMS.replace(":orderId", orderId), { headers });
    }
}

export default new OrderService();