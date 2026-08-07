import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";

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
}

export default new AuthService();