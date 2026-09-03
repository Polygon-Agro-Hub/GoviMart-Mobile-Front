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

    async createOrder(payload: any) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CREATE_ORDER, payload, { headers });
    }

    async getPickupCenters() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_PICKUP_CENTERS, { headers });
    }

    async getDeliveryCities() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_DELIVERY_CITIES, { headers });
    }

    async getAvailableCoupons() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_COUPONS, { headers });
    }

    async checkCoupon(payload: {
        coupon: string;
        deliveryMethod: string;
        cartTotal?: number;
        cartId?: number;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CHECK_COUPON, payload, { headers });
    }

    async getInvoice(orderId: string | number) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_INVOICE.replace(":orderId", String(orderId)), { headers });
    }
}

export default new OrderService();