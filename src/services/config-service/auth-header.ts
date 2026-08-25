import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "@/store";

export const getAuthHeader = async () => {
  const reduxToken = store.getState().auth.token;
  const token = reduxToken || (await AsyncStorage.getItem("userToken"));

  return {
    Authorization: `Bearer ${token}`,
  };
};