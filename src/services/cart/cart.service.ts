import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

class CartService {
  async getUserCart() {
    return apiClient.get(ENDPOINTS.CART.GET_USER_CART);
  }

  async syncCartProduct(productId: number, quantity: number, unit: "g" | "kg" = "g") {
    return apiClient.post(ENDPOINTS.CART.ADD_UPDATE_PRODUCT, {
      productId,
      quantity,
      unit,
    });
  }

  async syncCartPackage(packageId: number, quantity: number = 1) {
    return apiClient.post(ENDPOINTS.CART.ADD_UPDATE_PACKAGE, {
      packageId,
      quantity,
    });
  }

  async removeCartProduct(productId: number) {
    const url = ENDPOINTS.CART.REMOVE_PRODUCT.replace(":productId", String(productId));
    return apiClient.delete(url);
  }

  async removeCartPackage(packageId: number) {
    const url = ENDPOINTS.CART.REMOVE_PACKAGE.replace(":packageId", String(packageId));
    return apiClient.delete(url);
  }

  async clearCart() {
    return apiClient.delete(ENDPOINTS.CART.CLEAR_CART);
  }
}

export default new CartService();
