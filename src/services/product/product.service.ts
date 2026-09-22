import { getAuthHeader } from "../config-service/auth-header";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

class ProductService {
    async getAllPackages(buyerType: string = "Retail") {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_ALL_PRODUCTS, {
            params: {
                buyerType,
            },
        });
    }
    async getPackageDetails(packageId: number) {
        const url = ENDPOINTS.PRODUCT.GET_PACKAGE_DETAILS.replace(":packageId", String(packageId));
        return apiClient.get(url);
    }
    async getProductsByCategory(categoryNameId: string, buyerType: string = "Retail", search?: string) {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_PRODUCTS_BY_CATEGORY, {
            params: {
                category: categoryNameId,
                buyerType,
                search,
            },
        });
    }
    async getProductsByProductType(productTypeId: number | string, buyerType: string = "Retail") {
        const url = ENDPOINTS.PRODUCT.GET_PRODUCTS_BY_PRODUCT_TYPE.replace(":productTypeId", String(productTypeId));
        return apiClient.get(url, {
            params: {
                buyerType,
            },
        });
    }
    async getBanners() {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_BANNERS);
    }
    async checkAvailability(productIds: number[], packageIds: number[]) {
        return apiClient.post(ENDPOINTS.PRODUCT.CHECK_AVAILABILITY, {
            productIds,
            packageIds,
        });
    }
}
export default new ProductService();