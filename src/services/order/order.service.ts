import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

class OrderService {
    async getOrderHistory() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_HISTORY, { headers });
    }

    async getScheduleOrders(sheduleDate?: string) {
        const headers = await getAuthHeader();
        const url = sheduleDate
            ? `${ENDPOINTS.ORDER.GET_SCHEDULE_ORDERS}?sheduleDate=${sheduleDate}`
            : ENDPOINTS.ORDER.GET_SCHEDULE_ORDERS;
        return apiClient.get(url, { headers });
    }

    async getOrderById(orderId: string) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_BY_ID.replace(":orderId", orderId), { headers });
    }

    async getOrderPackages(orderId: string) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_PACKAGES.replace(":orderId", orderId), { headers });
    }

    async getOrderAdditionalItems(orderId: string, processOrderId?: string | number) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_ORDER_ADDITIONAL_ITEMS.replace(":orderId", String(orderId)), {
            headers,
            params: processOrderId ? { processOrderId } : undefined,
        });
    }

    async createOrder(payload: any) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CREATE_ORDER, payload, {
            headers,
            timeout: 120000, // 2 minutes (120,000 ms) waiting timeout
        });
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

    async getInvoice(orderId: string | number, params?: { processOrderId?: string | number; invNo?: string }) {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.ORDER.GET_INVOICE.replace(":orderId", String(orderId)), {
            headers,
            params,
        });
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
        paymentMethod?: string;
        isPaid?: number | boolean;
        newTotal?: number;
        creditToAdd?: number;
        replacements?: Array<{
            orderPackageId: number;
            replceId?: number;
            newProductId: number;
            productType?: string | number;
            newQty: number;
            newPrice: number;
        }>;
        // Ala carte items newly ADDED in this review (insert / merge by productId)
        additionalItems?: Array<{
            productId: number;
            qty: number;
            unit?: string;
            normalPrice?: number;
            price: number;
        }>;
        // NEW: Ala carte rows ALREADY in the order whose qty/unit changed.
        // `id` = orderadditionalitems.id. The backend recalculates
        // qty, unit, normalPrice, price and discount for that row.
        updatedAdditionalItems?: Array<{
            id: number;
            productId: number;
            qty: number;
            unit?: string;
            price?: number; // fallback only
        }>;
        deletedAdditionalItemIds?: number[];
        packages?: Array<{
            orderPackageId: number;
            packageId?: string | number;
            items: Array<{
                productType?: string | number | null;
                productId: number;
                qty: number;
                price: number;
            }>;
        }>;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CONFIRM_PACKAGE_REVIEW, payload, {
            headers,
            timeout: 120000, // 2 minutes (120,000 ms) waiting timeout
        });
    }

    async confirmOrderWithLivePrices(payload: {
        orderId?: number | string;
        processOrderId?: number | string;
        newTotal?: number;
    }) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.ORDER.CONFIRM_ORDER, payload, { headers });
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

    async cancelOrderBeforeConfirm(payload: {
    orderId?: number | string;
    processOrderId?: number | string;
}) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.ORDER.CANCEL_ORDER_BEFORE_CONFIRM, payload, { headers });
}
}

export default new OrderService();