import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

class AuthService {
  login(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.LOGIN, data);
  }

  logout() {
    return apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  }

  signUp(data:any) {
    return apiClient.post(ENDPOINTS.AUTH.SIGN_UP, data);
  }

  async updatePassword(data: any) {
    const headers = await getAuthHeader();
    return apiClient.post(ENDPOINTS.AUTH.UPDATE_PASSWORD, data, { headers });
  }
}

export default new AuthService();