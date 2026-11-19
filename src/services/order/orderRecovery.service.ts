import AsyncStorage from "@react-native-async-storage/async-storage";
import orderService from "./order.service";

const PENDING_ORDER_STORAGE_KEY = "@govimart_pending_order_recovery_v1";

export interface PendingOrderRecoveryData {
  correlationId: string;
  flowType: "checkout" | "package_review";
  orderId?: string | number;
  processOrderId?: string | number;
  cartId?: string | number;
  amount: number;
  paymentMethod: string;
  paymentGatewayRef?: string;
  isPaid: boolean;
  timestamp: number;
  checkoutStartedAt?: number;
  lastKnownOrderId?: number | string;
  scheduleDate?: string;
  payload: any;
  userMessage?: string;
}

export interface ReconcileCheckoutOptions {
  expectedTotal?: number;
  checkoutStartedAt?: number;
  lastKnownOrderId?: number | string;
  scheduleDate?: string;
  maxAgeMinutes?: number;
}

export interface ReconciliationResult {
  reconciled: boolean;
  orderData?: any;
  message?: string;
  isPaid?: boolean;
}

class OrderRecoveryService {
  /**
   * Generates a unique correlation / idempotency ID for this order attempt.
   */
  public generateCorrelationId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Persists pending order state in AsyncStorage before launching payment or server submission.
   */
  public async savePendingOrder(data: PendingOrderRecoveryData): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("[OrderRecoveryService] Failed to persist pending order:", err);
    }
  }

  /**
   * Updates partial fields in the stored pending order (e.g. marking payment as completed).
   */
  public async updatePendingOrder(partial: Partial<PendingOrderRecoveryData>): Promise<void> {
    try {
      const current = await this.getPendingOrder();
      if (!current) return;
      const updated = { ...current, ...partial };
      await AsyncStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("[OrderRecoveryService] Failed to update pending order:", err);
    }
  }

  /**
   * Retrieves the currently pending order if any.
   */
  public async getPendingOrder(): Promise<PendingOrderRecoveryData | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_ORDER_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[OrderRecoveryService] Failed to retrieve pending order:", err);
      return null;
    }
  }

  /**
   * Clears the pending order from storage once an order is confirmed or safely dismissed.
   */
  public async clearPendingOrder(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    } catch (err) {
      console.warn("[OrderRecoveryService] Failed to clear pending order:", err);
    }
  }

  /**
   * Reconciles a Checkout order when a network timeout or cart-cleared error occurs.
   * Uses Multi-Factor Matching:
   * 1. Timestamp Barrier: Only orders created AFTER checkoutStartedAt (with 15s clock skew buffer)
   * 2. Order Grouping: Groups processorders rows by parentOrderId (supporting 8-order recurring deliveries)
   * 3. Total Matching: Matches either full recurring sum or single delivery amount
   * 4. Primary Delivery Resolution: Extracts primary invoice & delivery for OrderConfirmed navigation
  /**
   * Safely parse datetime strings (including MySQL 'YYYY-MM-DD HH:MM:SS')
   * into millisecond timestamp across all JavaScript engines (Hermes / JSC).
   */
  public parseDateToMillis(dateStr: any): number {
    if (!dateStr || dateStr === "N/A") return 0;
    if (typeof dateStr === "number") return dateStr;
    if (dateStr instanceof Date) return dateStr.getTime();
    if (typeof dateStr === "string") {
      // Replace space with 'T' so ISO-8601 parsing works in Hermes (Android/iOS)
      const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
      const parsed = Date.parse(normalized);
      if (!isNaN(parsed)) return parsed;
      const fallback = new Date(dateStr).getTime();
      if (!isNaN(fallback)) return fallback;
    }
    return 0;
  }

  /**
   * Reconciles a Checkout order when a network timeout or cart-cleared error occurs.
   * Uses Multi-Factor Matching:
   * 1. Timestamp Barrier: Only orders created AFTER checkoutStartedAt (with timezone & clock skew tolerance)
   * 2. Order Grouping: Groups processorders rows by parentOrderId (supporting 8-order recurring deliveries)
   * 3. Total Matching: Matches either full recurring sum or single delivery amount
   * 4. Primary Delivery Resolution: Extracts primary invoice & delivery for OrderConfirmed navigation
   */
  public async reconcileCheckoutOrder(
    optionsOrTotal?: number | ReconcileCheckoutOptions,
    fallbackMaxAgeMinutes = 15
  ): Promise<ReconciliationResult> {
    try {
      let expectedTotal: number | undefined;
      let checkoutStartedAt: number | undefined;
      let lastKnownOrderId: number | string | undefined;
      let scheduleDate: string | undefined;
      let maxAgeMinutes = fallbackMaxAgeMinutes;

      if (typeof optionsOrTotal === "number") {
        expectedTotal = optionsOrTotal;
      } else if (optionsOrTotal && typeof optionsOrTotal === "object") {
        expectedTotal = optionsOrTotal.expectedTotal;
        checkoutStartedAt = optionsOrTotal.checkoutStartedAt;
        lastKnownOrderId = optionsOrTotal.lastKnownOrderId;
        scheduleDate = optionsOrTotal.scheduleDate;
        maxAgeMinutes = optionsOrTotal.maxAgeMinutes || fallbackMaxAgeMinutes;
      }

      // Check stored pending recovery for timestamps and metadata if not explicitly passed
      const storedPending = await this.getPendingOrder();
      if (storedPending) {
        if (!checkoutStartedAt && storedPending.checkoutStartedAt) {
          checkoutStartedAt = storedPending.checkoutStartedAt;
        } else if (!checkoutStartedAt && storedPending.timestamp) {
          checkoutStartedAt = storedPending.timestamp;
        }
        if (expectedTotal == null && storedPending.amount) {
          expectedTotal = storedPending.amount;
        }
        if (!lastKnownOrderId && storedPending.lastKnownOrderId) {
          lastKnownOrderId = storedPending.lastKnownOrderId;
        }
        if (!scheduleDate && storedPending.scheduleDate) {
          scheduleDate = storedPending.scheduleDate;
        }
      }

      const response = await orderService.getOrderHistory();
      if (!response.data || !response.data.status || !Array.isArray(response.data.orderHistory)) {
        return { reconciled: false, message: "Could not fetch order history from server." };
      }

      const rawOrders: any[] = response.data.orderHistory;
      if (rawOrders.length === 0) {
        return { reconciled: false, message: "No recent orders found on server." };
      }

      const now = Date.now();
      // Cutoff: 60s buffer before checkoutStartedAt, or maxAgeMinutes from now
      const cutoffTime = checkoutStartedAt
        ? checkoutStartedAt - 60000
        : now - maxAgeMinutes * 60 * 1000;

      // Group the most recent rows by parentOrderId (or id)
      // This correctly handles recurring orders where 8 rows share the same parent order
      const parentGroups = new Map<string, any[]>();
      for (const row of rawOrders.slice(0, 25)) {
        const parentKey = String(row.parentOrderId || row.id || "");
        if (!parentKey) continue;
        if (!parentGroups.has(parentKey)) {
          parentGroups.set(parentKey, []);
        }
        parentGroups.get(parentKey)!.push(row);
      }

      // Evaluate each parent order group
      let groupIndex = 0;
      for (const [parentKey, groupRows] of parentGroups.entries()) {
        const isLatestOrderGroup = groupIndex === 0;
        groupIndex++;

        const firstRow = groupRows[0];
        const orderCreatedAt = this.parseDateToMillis(firstRow.createdAt);

        // 1. Timestamp Barrier: Check with timezone skew allowance (UTC vs Local ~5.5h)
        const timeDiff = Math.abs(now - orderCreatedAt);
        const isRecent =
          isLatestOrderGroup ||
          orderCreatedAt === 0 ||
          orderCreatedAt >= cutoffTime ||
          timeDiff <= maxAgeMinutes * 60 * 1000 ||
          Math.abs(timeDiff - 5.5 * 3600 * 1000) <= maxAgeMinutes * 60 * 1000;

        if (!isRecent) {
          continue; // Order is older than current checkout attempt, skip it
        }

        // 2. Order ID Barrier: If lastKnownOrderId was provided, parent must be greater
        if (lastKnownOrderId != null) {
          const numParent = parseInt(parentKey.replace(/[^0-9]/g, ""), 10);
          const numLastKnown = parseInt(String(lastKnownOrderId).replace(/[^0-9]/g, ""), 10);
          if (!isNaN(numParent) && !isNaN(numLastKnown) && numParent <= numLastKnown) {
            continue; // Not a newer order, skip
          }
        }

        // 3. Amount & Recurring Sum Check
        let groupSum = 0;
        let singleRowAmount = 0;
        for (const r of groupRows) {
          const val =
            r.fullTotal != null
              ? r.fullTotal
              : r.total != null
              ? r.total
              : 0;
          const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
          groupSum += num;
          if (singleRowAmount === 0) singleRowAmount = num;
        }

        // Match if expectedTotal matches:
        // A) The full group sum (e.g. 8 deliveries x Rs. 2,500 = Rs. 20,000)
        // B) The single delivery amount (e.g. Rs. 2,500 if paying per delivery)
        // C) Within Rs. 15 or 5% tolerance for fee/coupon rounding
        // D) Or if this is the user's latest order placed within the session window
        const matchesAmount =
          expectedTotal == null ||
          Math.abs(groupSum - expectedTotal) <= 15 ||
          Math.abs(singleRowAmount - expectedTotal) <= 15 ||
          (expectedTotal > 0 && Math.abs(groupSum - expectedTotal) / expectedTotal <= 0.05) ||
          (expectedTotal > 0 && Math.abs(singleRowAmount - expectedTotal) / expectedTotal <= 0.05) ||
          (isLatestOrderGroup && (timeDiff <= 5 * 60 * 1000 || Math.abs(timeDiff - 5.5 * 3600 * 1000) <= 5 * 60 * 1000));

        // If candidate matches timestamp and amount
        if (matchesAmount) {
          // Identify primary delivery (earliest delivery date or first invoice)
          const sortedGroup = [...groupRows].sort((a, b) => {
            const dateA = a.scheduleDate ? this.parseDateToMillis(a.scheduleDate) : 0;
            const dateB = b.scheduleDate ? this.parseDateToMillis(b.scheduleDate) : 0;
            return dateA - dateB;
          });

          const primaryDelivery = sortedGroup[0] || firstRow;

          console.log("[OrderRecoveryService] Successfully reconciled order group:", {
            parentOrderId: parentKey,
            deliveriesCount: groupRows.length,
            groupSum,
            primaryInvoice: primaryDelivery.invoiceNo || primaryDelivery.invoiceNumber,
          });

          return {
            reconciled: true,
            orderData: {
              orderId: parentKey, // Parent orders.id
              processOrderId: primaryDelivery.orderId || primaryDelivery.processOrderId,
              invoiceNumber: primaryDelivery.invoiceNo || primaryDelivery.invoiceNumber,
              total: expectedTotal || groupSum || singleRowAmount,
              deliveriesCount: groupRows.length,
            },
            message: "Your order was successfully confirmed on the server.",
          };
        }
      }

      return {
        reconciled: false,
        message: "No matching order found in recent history. It may not have been placed yet.",
      };
    } catch (err: any) {
      console.error("[OrderRecoveryService] Error during checkout reconciliation:", err);
      return {
        reconciled: false,
        message: err?.message || "Network error while checking order status.",
      };
    }
  }

  /**
   * Reconciles a Package Review order when a network timeout occurs during confirmPackageReview.
   * Checks the package review details to see if the order status is already finalized / locked.
   */
  public async reconcilePackageReviewOrder(
    orderId: string | number
  ): Promise<ReconciliationResult> {
    try {
      const res = await orderService.getPackageReview(orderId);
      if (res.data?.status && res.data?.data) {
        const { orderInfo } = res.data.data;
        const isFinalized =
          Number(orderInfo?.isFinalized) === 1 || orderInfo?.isFinalized === true;
        const isLocked =
          Number(orderInfo?.isLock) === 1 ||
          orderInfo?.status?.toLowerCase() === "confirmed" ||
          orderInfo?.status?.toLowerCase() === "locked";

        if (isFinalized || isLocked) {
          console.log("[OrderRecoveryService] Package review verified as finalized:", orderInfo);
          return {
            reconciled: true,
            orderData: orderInfo,
            isPaid: Number(orderInfo?.isPaid) === 1 || orderInfo?.isPaid === true,
            message: "Package review has already been finalized and confirmed.",
          };
        }
      }

      return {
        reconciled: false,
        message: "Order has not yet been finalized on server.",
      };
    } catch (err: any) {
      console.error("[OrderRecoveryService] Error during package review reconciliation:", err);
      return {
        reconciled: false,
        message: err?.message || "Failed to verify package review status.",
      };
    }
  }
}

export const orderRecoveryService = new OrderRecoveryService();
export default orderRecoveryService;
