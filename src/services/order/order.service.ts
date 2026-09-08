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

    async getPackageReview(orderId: string | number) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_PACKAGE_REVIEW.replace(":orderId", String(orderId)), { headers });
    }

    async getPackingLimit(date?: string, processOrderId?: string | number) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_PACKING_LIMIT, {
            params: { date, processOrderId },
            headers,
        });
    }

    async replacePackageItem(payload: {
        orderPackageId: number;
        replceId?: number;
        newProductId: number;
        productType?: string;
        newQty: number;
        newPrice: number;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.REPLACE_PACKAGE_ITEM, payload, { headers });
    }

    async resetPackageItem(payload: {
        orderPackageId: number;
        replceId?: number;
        originalBaselineId?: number;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.RESET_PACKAGE_ITEM, payload, { headers });
    }

    async confirmPackageReview(payload: {
        orderId?: number | string;
        processOrderId?: number | string;
        lockNow?: boolean;
        additionalAmount?: number;
        newScheduleDate?: string;
        replacements?: Array<{
            orderPackageId: number;
            replceId?: number;
            newProductId: number;
            productType?: string | number;
            newQty: number;
            newPrice: number;
        }>;
        additionalItems?: Array<{
            productId: number;
            qty: number;
            unit?: string;
            normalPrice?: number;
            price: number;
        }>;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CONFIRM_PACKAGE_REVIEW, payload, { headers });
    }

    async cancelOrder(payload: {
        orderId?: number | string;
        processOrderId?: number | string;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CANCEL_ORDER, payload, { headers });
    }

    async getDeliveredOrdersTotal(userId: string | number) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_DELIVERED_ORDERS_TOTAL.replace(":userId", String(userId)), { headers });
    }
}

export default new OrderService();