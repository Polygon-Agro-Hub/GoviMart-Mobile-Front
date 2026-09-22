import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";
import { LoginPayload, SignUpPayload } from "@/types/types";

class AuthService {
  login(data: LoginPayload) {
    return apiClient.post(ENDPOINTS.AUTH.LOGIN, data);
  }

  logout() {
    return apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  }

  refreshToken(token: string) {
    return apiClient.post(ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken: token });
  }

  signUp(data: SignUpPayload) {
    return apiClient.post(ENDPOINTS.AUTH.SIGN_UP, data);
  }

  async updatePassword(data: { currentPassword?: string; newPassword?: string; confirmNewPassword?: string }) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.AUTH.UPDATE_PASSWORD, data, { headers });
  }

  getCities(q?: string) {
    return apiClient.get(ENDPOINTS.AUTH.GET_CITIES, {
      params: q ? { q } : undefined,
    });
  }

  requestForgotPasswordOtp(data: {
    type: "email" | "sms";
    email?: string;
    phoneCode?: string;
    phoneNumber?: string;
  }) {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST_OTP, data);
  }

  resendForgotPasswordOtp(data: { resetToken: string }) {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_RESEND_OTP, data);
  }

  verifyForgotPasswordOtp(data: {
    code: string;
    referenceId: string;
    resetToken: string;
  }) {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY_OTP, data);
  }

  resetForgotPassword(data: {
    verifiedResetToken: string;
    newPassword: string;
    confirmNewPassword: string;
  }) {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_RESET, data);
  }
}

export default new AuthService();