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
    const url = ENDPOINTS.CUSTOMER.UPDATE_ADDRESS.replace(
      ":addressId",
      String(addressId),
    );
    return apiClient.put(url, data, { headers });
  }

  async deleteAddress(addressId: number, buildingType: string) {
    const headers = await getAuthHeader();
    return apiClient.delete(
      `${ENDPOINTS.CUSTOMER.DELETE_ADDRESS}/${addressId}?buildingType=${buildingType}`,
      { headers },
    );
  }

  async updateUserDetails(data: UpdateUserDetailsPayload) {
    const headers = await getAuthHeader();
    return apiClient.put(ENDPOINTS.CUSTOMER.UPDATE_USER_DETAILS, data, {
      headers,
    });
  }

  async deleteAccount() {
    const headers = await getAuthHeader();
    return apiClient.delete(ENDPOINTS.CUSTOMER.DELETE_ACCOUNT, { headers });
  }

  async getDeleteAccountStatus() {
    const headers = await getAuthHeader();
    return apiClient.get(ENDPOINTS.CUSTOMER.GET_DELETE_ACCOUNT_STATUS, {
      headers,
    });
  }

  async sendPhoneChangeOtp(data: PhoneChangeOtpPayload) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.SEND_PHONE_CHANGE_OTP, data, {
      headers,
    });
  }

  async verifyPhoneChange(data: VerifyPhoneChangePayload) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.VERIFY_PHONE_CHANGE_OTP, data, {
      headers,
    });
  }

  async resendPhoneChangeOtp(data: { signupToken: string }) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.CUSTOMER.RESEND_PHONE_CHANGE_OTP, data, {
      headers,
    });
  }

  async updateCreditBalance(creditBalance: number) {
    const headers = await getAuthHeader();
    return apiClient.put(
      ENDPOINTS.CUSTOMER.UPDATE_CREDIT_BALANCE,
      { creditBalance },
      { headers },
    );
  }

  async getDeliveryEligibility() {
    const headers = await getAuthHeader();
    return apiClient.get(ENDPOINTS.CUSTOMER.GET_DELIVERY_ELIGIBILITY, {
      headers,
    });
  }

  async uploadProfileImage(
    uri: string,
    name = "profile.jpg",
    type = "image/jpeg",
  ) {
    const headers = await getAuthHeader();
    const formData = new FormData();
    formData.append("profileImage", {
      uri,
      name,
      type,
    } as any);

    return apiClient.post(ENDPOINTS.CUSTOMER.UPLOAD_PROFILE_IMAGE, formData, {
      headers: {
        ...headers,
      },
      transformRequest: (data, requestHeaders) => {
        if (requestHeaders) {
          delete requestHeaders["Content-Type"];
          delete requestHeaders["content-type"];
        }
        return data;
      },
    });
  }
}

export default new CustomerService();
