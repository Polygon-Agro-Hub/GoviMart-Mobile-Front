import {
  IPaymentGatewayAdapter,
  PaymentRequestData,
  PaymentResponseData,
  UnifiedCheckoutSession,
} from "./payment.types";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

/**
 * Payments.lk Adapter (Implementation of IPaymentGatewayAdapter)
 * Handles communication with backend to initiate Payments.lk hosted checkouts
 * and parses redirect results.
 */
export class PaymentsLkAdapter implements IPaymentGatewayAdapter {
  readonly gatewayName = "payments_lk";

  /**
   * Requests Payments.lk checkout session from backend.
   * Merchant secret remains secure on the backend.
   */
  async initiatePayment(
    request: PaymentRequestData
  ): Promise<UnifiedCheckoutSession> {
    const headers = await getAuthHeader();
    const response = await apiClient.post(
      ENDPOINTS.PAYMENT.INITIATE,
      {
        orderId: request.orderId,
        amount: request.amount,
        itemsDescription: request.itemsDescription,
        paymentType: request.paymentType,
        gatewayName: "payments_lk",
        customFields: request.customFields,
      },
      { headers }
    );

    if (response.data && response.data.status && response.data.data) {
      const data = response.data.data;
      return {
        gateway: this.gatewayName,
        checkoutUrl: data.checkoutUrl,
        sessionId: data.sessionId,
        orderId: data.orderId || request.orderId || "",
        amount: data.amount || request.amount,
        currency: "LKR",
        paymentType: request.paymentType,
        rawData: data,
      };
    }

    throw new Error(
      response.data?.message || "Failed to initiate Payments.lk payment session"
    );
  }

  /**
   * Translates deep link / navigation URL into unified PaymentResponseData
   */
  handlePaymentResult(rawResult: {
    url: string;
    orderId: string;
  }): PaymentResponseData {
    const { url, orderId } = rawResult;
    const lowerUrl = (url || "").toLowerCase();

    if (
      lowerUrl.includes("/payment/return") ||
      lowerUrl.includes("polygon://payment/return") ||
      lowerUrl.includes("status=success") ||
      lowerUrl.includes("status=succeeded")
    ) {
      return {
        success: true,
        orderId,
        status: "success",
        message: "Payment successfully completed through Payments.lk.",
        rawData: rawResult,
      };
    }

    if (
      lowerUrl.includes("/payment/cancel") ||
      lowerUrl.includes("polygon://payment/cancel") ||
      lowerUrl.includes("status=cancel") ||
      lowerUrl.includes("status=cancelled")
    ) {
      return {
        success: false,
        orderId,
        status: "cancelled",
        message: "Payment was cancelled.",
        rawData: rawResult,
      };
    }

    return {
      success: false,
      orderId,
      status: "failed",
      message: "Payment could not be completed.",
      rawData: rawResult,
    };
  }
}
