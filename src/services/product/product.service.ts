import { getAuthHeader } from "../config-service/auth-header";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

class ProductService {
    async getAllPackages() {
        return apiClient.get(ENDPOINTS.PRODUCT.GET_ALL_PRODUCTS)
    }
    async getPackageDetails(packageId: number) {
        const url = ENDPOINTS.PRODUCT.GET_PACKAGE_DETAILS.replace(":packageId", String(packageId));
        return apiClient.get(url);
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