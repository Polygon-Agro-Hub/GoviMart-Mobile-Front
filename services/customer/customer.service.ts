import { getAuthHeader } from "../config-service/auth-header"
import apiClient from "../config-service/axio-config"
import { ENDPOINTS } from "../config-service/endpoints"


class CustomerService {
    async getAccountDetails() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.CUSTOMER.GET_ACCOUNT_DETAILS, { headers })
    }
    async getSavedAddresses() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.CUSTOMER.GET_SAVED_ADDRESSES, { headers })
    }
    async addNewAddress(data: any) {
        const headers = await getAuthHeader();
        return apiClient.post(ENDPOINTS.CUSTOMER.ADD_ADDRESS, data, { headers })
    }
    async updateAddress(data: any) {
        const headers = await getAuthHeader();
        return apiClient.put(ENDPOINTS.CUSTOMER.UPDATE_ADDRESS, data, { headers })
    }
}
export default new CustomerService