import { environment } from "@/environment/environment";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { updateToken, logoutSuccess } from "@/store/authSlice";
import { tokenStorage } from "@/utils/tokenStorage";
import { ENDPOINTS } from "./endpoints";

const apiClient = axios.create({
  baseURL: environment.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      const token = store.getState().auth.token || (await tokenStorage.getToken());
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── 401 Response Interceptor with Concurrent Token Refresh Queue (Fix 5.A) ────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If no response or status isn't 401, reject immediately
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    // Avoid refresh loops for auth endpoints
    if (
      requestUrl.includes(ENDPOINTS.AUTH.REFRESH_TOKEN) ||
      requestUrl.includes(ENDPOINTS.AUTH.LOGIN) ||
      requestUrl.includes(ENDPOINTS.AUTH.SIGN_UP)
    ) {
      return Promise.reject(error);
    }

    // If already retried once, do not retry again
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests while token refresh is in flight
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = await tokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      // Perform direct refresh request using a bare axios instance to avoid interceptor loops
      const refreshResponse = await axios.post(
        `${environment.API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`,
        { refreshToken: storedRefreshToken },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const newToken =
        refreshResponse.data?.data?.token || refreshResponse.data?.token;

      if (!newToken) {
        throw new Error("Token refresh response missing access token");
      }

      // Persist new token securely and update Redux
      await tokenStorage.setToken(newToken);
      store.dispatch(updateToken(newToken));

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      // Refresh token expired or invalid: clear tokens and log user out
      await tokenStorage.clearTokens();
      store.dispatch(logoutSuccess());
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;