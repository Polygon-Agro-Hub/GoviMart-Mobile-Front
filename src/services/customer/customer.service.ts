import { getAuthHeader } from "../config-service/auth-header";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import {
  AddressPayload,
  UpdateUserDetailsPayload,
  PhoneChangeOtpPayload,
  VerifyPhoneChangePayload,
} from "@/types/types";

class CustomerService {
  async getAccountDetails() {
    const headers = await getAuthHeader();
    return apiClient.get(ENDPOINTS.CUSTOMER.GET_ACCOUNT_DETAILS, { headers });
  }

  async getSavedAddresses() {
    const headers = await getAuthHeader();
    return apiClient.get(ENDPOINTS.CUSTOMER.GET_SAVED_ADDRESSES, { headers });
  }

  async addNewAddress(data: AddressPayload) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.ADD_ADDRESS, data, { headers });
  }

  async updateAddress(addressId: number, data: AddressPayload) {
    const headers = await getAuthHeader();
    const url = ENDPOINTS.CUSTOMER.UPDATE_ADDRESS.replace(":addressId", String(addressId));
    return apiClient.put(url, data, { headers });
  }

  async deleteAddress(addressId: number, buildingType: string) {
    const headers = await getAuthHeader();
    return apiClient.delete(
      `${ENDPOINTS.CUSTOMER.DELETE_ADDRESS}/${addressId}?buildingType=${buildingType}`,
      { headers }
    );
  }

  async updateUserDetails(data: UpdateUserDetailsPayload) {
    const headers = await getAuthHeader();
    return apiClient.put(ENDPOINTS.CUSTOMER.UPDATE_USER_DETAILS, data, { headers });
  }

  async deleteAccount() {
    const headers = await getAuthHeader();
    return apiClient.delete(ENDPOINTS.CUSTOMER.DELETE_ACCOUNT, { headers });
  }

  async sendPhoneChangeOtp(data: PhoneChangeOtpPayload) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.SEND_PHONE_CHANGE_OTP, data, { headers });
  }

  async verifyPhoneChange(data: VerifyPhoneChangePayload) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.VERIFY_PHONE_CHANGE_OTP, data, { headers });
  }

  async resendPhoneChangeOtp(data: { signupToken: string }) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.RESEND_PHONE_CHANGE_OTP, data, { headers });
  }
}

export default new CustomerService();