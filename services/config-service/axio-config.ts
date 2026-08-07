import { environment } from "@/environment/environment";
import axios from "axios";

const apiClient = axios.create({
  baseURL: environment.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;