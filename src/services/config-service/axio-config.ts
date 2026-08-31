import { environment } from "@/environment/environment";
import axios from "axios";
import { store } from "@/store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const apiClient = axios.create({
  baseURL: environment.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization) {
    const token = store.getState().auth.token || (await AsyncStorage.getItem("userToken"));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;