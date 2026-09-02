import { IPaymentGatewayAdapter } from "./payment.types";
import { PayHereAdapter } from "./payhere.adapter";

export type SupportedPaymentGateway = "payhere" | "default";

/**
 * Payment Gateway Factory (Adapter Pattern)
 * Instantiates and provides the appropriate payment gateway adapter.
 */
export class PaymentGatewayFactory {
  private static adapters: Map<string, IPaymentGatewayAdapter> = new Map();

  public static getAdapter(gateway: SupportedPaymentGateway = "payhere"): IPaymentGatewayAdapter {
    const key = gateway.toLowerCase();

    if (!this.adapters.has(key)) {
      switch (key) {
        case "payhere":
        default:
          this.adapters.set(key, new PayHereAdapter());
          break;
      }
    }

    return this.adapters.get(key)!;
  }
}
