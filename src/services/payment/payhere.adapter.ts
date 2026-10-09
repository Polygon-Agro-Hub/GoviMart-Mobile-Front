import {
  IPaymentGatewayAdapter,
  PaymentRequestData,
  PaymentResponseData,
  UnifiedCheckoutSession,
} from "./payment.types";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

export interface PayHereConfig {
  sandbox: boolean;
  checkout_url: string;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
  custom_1: string;
  custom_2: string;
  domain?: string;
  post_body?: string;
}

export class PayHereAdapter implements IPaymentGatewayAdapter {
  readonly gatewayName = "payhere";

  /**
   * Request server-signed PayHere parameters with pre-calculated MD5 hash.
   * Keeps the merchant secret secure on the backend.
   */
  async initiatePayment(
    request: PaymentRequestData
  ): Promise<UnifiedCheckoutSession> {
    const headers = await getAuthHeader();
    const response = await apiClient.post(
      ENDPOINTS.PAYMENT.PAYHERE_INITIATE,
      {
        orderId: request.orderId,
        amount: request.amount,
        itemsDescription: request.itemsDescription,
        paymentType: request.paymentType,
        customFields: request.customFields,
      },
      { headers }
    );

    if (response.data && response.data.status && response.data.data) {
      const config = response.data.data as PayHereConfig;
      return {
        gateway: this.gatewayName,
        checkoutUrl: config.checkout_url,
        sessionId: config.order_id,
        orderId: config.order_id,
        amount: Number(config.amount),
        currency: config.currency,
        paymentType: request.paymentType,
        postBody: config.post_body,
        rawConfig: config,
      };
    }

    throw new Error(
      response.data?.message || "Failed to initiate PayHere payment"
    );
  }

  /**
   * Build self-submitting HTML form to render in React Native WebView
   */
  generateHtmlForm(config: PayHereConfig): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #F8FAFC;
              color: #334155;
            }
            .spinner {
              border: 3px solid #E2E8F0;
              border-top: 3px solid #3E206D;
              border-radius: 50%;
              width: 38px;
              height: 38px;
              animation: spin 0.8s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body onload="document.getElementById('payhere_form').submit();">
          <div class="spinner"></div>
          <div style="font-size: 15px; font-weight: 600;">Connecting to PayHere...</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Please do not close this window</div>

          <form id="payhere_form" method="POST" action="${config.checkout_url}">
            <input type="hidden" name="merchant_id" value="${config.merchant_id}" />
            <input type="hidden" name="return_url" value="${config.return_url}" />
            <input type="hidden" name="cancel_url" value="${config.cancel_url}" />
            <input type="hidden" name="notify_url" value="${config.notify_url}" />
            <input type="hidden" name="order_id" value="${config.order_id}" />
            <input type="hidden" name="items" value="${config.items}" />
            <input type="hidden" name="currency" value="${config.currency}" />
            <input type="hidden" name="amount" value="${config.amount}" />
            <input type="hidden" name="first_name" value="${config.first_name}" />
            <input type="hidden" name="last_name" value="${config.last_name}" />
            <input type="hidden" name="email" value="${config.email}" />
            <input type="hidden" name="phone" value="${config.phone}" />
            <input type="hidden" name="address" value="${config.address}" />
            <input type="hidden" name="city" value="${config.city}" />
            <input type="hidden" name="country" value="${config.country}" />
            <input type="hidden" name="hash" value="${config.hash}" />
            <input type="hidden" name="custom_1" value="${config.custom_1}" />
            <input type="hidden" name="custom_2" value="${config.custom_2}" />
          </form>
        </body>
      </html>
    `;
  }

  /**
   * Translates raw navigation url / callback events into a standard PaymentResponseData
   */
  handlePaymentResult(rawResult: { url: string; orderId: string }): PaymentResponseData {
    const { url, orderId } = rawResult;

    if (url.includes("/payment/return") || url.includes("return_url") || url.includes("status=success")) {
      return {
        success: true,
        orderId,
        status: "success",
        message: "Payment successfully completed through PayHere.",
        rawData: rawResult,
      };
    }

    if (url.includes("/payment/cancel") || url.includes("cancel_url") || url.includes("status=cancel")) {
      return {
        success: false,
        orderId,
        status: "cancelled",
        message: "Payment was cancelled by user.",
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
