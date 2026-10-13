/**
 * Payment Gateway Adapter Types & Abstraction
 * Follows the Strategy & Factory (Adapter) Pattern to decouple
 * third-party payment gateways (Payments.lk, PayHere, etc.)
 * from the app checkout / balance clearing UI.
 */

export interface PaymentCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface PaymentRequestData {
  orderId?: string;
  amount: number;
  currency?: string;
  itemsDescription?: string;
  paymentType: "order" | "clear_balance" | "save_card";
  gatewayName?: string;
  saveCard?: boolean;
  cardId?: string;
  customer?: PaymentCustomer;
  customFields?: Record<string, any>;
}

export interface PaymentResponseData {
  success: boolean;
  orderId: string;
  paymentId?: string;
  status: "success" | "cancelled" | "failed";
  message?: string;
  rawData?: any;
}

export interface UnifiedCheckoutSession {
  gateway: string;
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentType: "order" | "clear_balance" | "save_card";
  customerAddress?: {
    street?: string;
    city?: string;
    postcode?: string;
  };
  postBody?: string;
  rawConfig?: any;
  rawData?: any;
}

export interface IPaymentGatewayAdapter {
  /**
   * Unique identifier for the payment gateway ('payments_lk', 'payhere', etc.)
   */
  readonly gatewayName: string;

  /**
   * Prepares and initiates a payment session on the backend.
   */
  initiatePayment(request: PaymentRequestData): Promise<UnifiedCheckoutSession>;

  /**
   * Charges a saved card directly without hosted checkout redirect.
   */
  chargeSavedCard?(params: {
    cardId: string;
    amount: number;
    paymentType: "order" | "clear_balance";
    orderId?: string;
    itemsDescription?: string;
  }): Promise<PaymentResponseData>;

  /**
   * Converts a gateway-specific redirect or callback payload
   * into standard PaymentResponseData.
   */
  handlePaymentResult(rawResult: any): PaymentResponseData;
}

