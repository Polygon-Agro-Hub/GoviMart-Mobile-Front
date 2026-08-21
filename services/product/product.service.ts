import { getAuthHeader } from "../config-service/auth-header";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

class ProductService {
    async getAllPackages() {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_ALL_PRODUCTS)
    }
    async getPackageDetails() {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_PACKAGE_DETAILS)
    }
    async getProductsByCategory(categoryNameId: string) {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_PRODUCTS_BY_CATEGORY, {
            params: {
                category: categoryNameId,
            },
        })
    }
    async getBanners() {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_BANNERS)
    }
}
export default new ProductService;