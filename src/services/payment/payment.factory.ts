import { IPaymentGatewayAdapter } from "./payment.types";
import { PaymentsLkAdapter } from "./payments-lk.adapter";
import { PayHereAdapter } from "./payhere.adapter";

export type SupportedPaymentGateway =
  | "payments_lk"
  | "paymentslk"
  | "payhere"
  | "default";

/**
 * Payment Gateway Factory (Strategy & Factory Pattern)
 * Instantiates and provides the appropriate payment gateway adapter.
 */
export class PaymentGatewayFactory {
  private static adapters: Map<string, IPaymentGatewayAdapter> = new Map();

  public static getAdapter(
    gateway: SupportedPaymentGateway = "payments_lk"
  ): IPaymentGatewayAdapter {
    const key = gateway.toLowerCase();

    if (!this.adapters.has(key)) {
      switch (key) {
        case "payhere":
          this.adapters.set(key, new PayHereAdapter());
          break;
        case "payments_lk":
        case "paymentslk":
        default:
          this.adapters.set(key, new PaymentsLkAdapter());
          break;
      }
    }

    return this.adapters.get(key)!;
  }
}
