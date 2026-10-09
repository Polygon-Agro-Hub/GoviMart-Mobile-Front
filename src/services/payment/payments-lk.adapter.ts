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
        saveCard: Boolean(request.saveCard),
        cardId: request.cardId,
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
        customerAddress: data.customerAddress,
        rawData: data,
      };
    }

    throw new Error(
      response.data?.message || "Failed to initiate Payments.lk payment session"
    );
  }

  /**
   * Directly charges a saved card on file (1-click payment).
   */
  async chargeSavedCard(params: {
    cardId: string;
    amount: number;
    paymentType: "order" | "clear_balance";
    orderId?: string;
    itemsDescription?: string;
  }): Promise<PaymentResponseData> {
    const headers = await getAuthHeader();
    const response = await apiClient.post(
      ENDPOINTS.PAYMENT.CHARGE_SAVED_CARD,
      {
        cardId: params.cardId,
        amount: params.amount,
        paymentType: params.paymentType,
        orderId: params.orderId,
        itemsDescription: params.itemsDescription,
        gatewayName: "payments_lk",
      },
      { headers }
    );

    if (response.data && response.data.status) {
      return {
        success: true,
        orderId: params.orderId || response.data?.data?.orderId || "",
        paymentId: response.data?.data?.paymentId,
        status: "success",
        message: response.data?.message || "Payment processed successfully",
        rawData: response.data?.data,
      };
    }

    throw new Error(
      response.data?.message || "Failed to charge saved card"
    );
  }

  /**
   * Initiates a Payments.lk hosted session specifically to link/save a card securely.
   */
  async initiateCardSaveSession(): Promise<UnifiedCheckoutSession> {
    const headers = await getAuthHeader();
    const response = await apiClient.post(
      ENDPOINTS.PAYMENT.INITIATE,
      {
        amount: 10,
        paymentType: "save_card",
        saveCard: true,
        gatewayName: "payments_lk",
        itemsDescription: "Save Card Security Setup - Payments.lk",
      },
      { headers }
    );

    if (response.data && response.data.status && response.data.data) {
      const data = response.data.data;
      return {
        gateway: this.gatewayName,
        checkoutUrl: data.checkoutUrl,
        sessionId: data.sessionId,
        orderId: data.orderId || "",
        amount: data.amount || 10,
        currency: "LKR",
        paymentType: "save_card",
        customerAddress: data.customerAddress,
        rawData: data,
      };
    }

    throw new Error(
      response.data?.message || "Failed to initiate Payments.lk card setup session"
    );
  }

  /**
   * Directly syncs a checkout session with backend/Payments.lk
   */
  async syncCheckout(checkoutId: string): Promise<any> {
    const headers = await getAuthHeader();
    const response = await apiClient.post(
      ENDPOINTS.PAYMENT.SYNC_CHECKOUT,
      { checkoutId },
      { headers }
    );
    return response.data?.data;
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
