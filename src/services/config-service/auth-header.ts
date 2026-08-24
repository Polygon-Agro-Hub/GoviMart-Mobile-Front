import AsyncStorage from "@react-native-async-storage/async-storage";

export const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem("userToken");

  return {
    Authorization: `Bearer ${token}`,
  };
};