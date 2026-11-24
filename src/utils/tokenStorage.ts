import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY_ACCESS_TOKEN = "userToken";
const KEY_REFRESH_TOKEN = "userRefreshToken";

/**
 * Checks whether SecureStore is available on the current platform runtime.
 */
const isSecureStoreAvailable = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const tokenStorage = {
  /**
   * Save the access token securely.
   */
  async setToken(token: string): Promise<void> {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, token);
        // Clean up any legacy plaintext copy
        await AsyncStorage.removeItem(KEY_ACCESS_TOKEN).catch(() => {});
      } else {
        await AsyncStorage.setItem(KEY_ACCESS_TOKEN, token);
      }
    } catch (err) {
      console.error("[TokenStorage] Failed to save access token:", err);
      // Fallback
      await AsyncStorage.setItem(KEY_ACCESS_TOKEN, token).catch(() => {});
    }
  },

  /**
   * Retrieve the access token securely.
   * Automatically migrates legacy tokens stored in AsyncStorage to SecureStore.
   */
  async getToken(): Promise<string | null> {
    try {
      if (await isSecureStoreAvailable()) {
        let token = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
        if (!token) {
          // Check for legacy migration from AsyncStorage
          const legacyToken = await AsyncStorage.getItem(KEY_ACCESS_TOKEN);
          if (legacyToken) {
            await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, legacyToken);
            await AsyncStorage.removeItem(KEY_ACCESS_TOKEN).catch(() => {});
            token = legacyToken;
          }
        }
        return token;
      }
      return await AsyncStorage.getItem(KEY_ACCESS_TOKEN);
    } catch (err) {
      console.error("[TokenStorage] Failed to get access token:", err);
      return await AsyncStorage.getItem(KEY_ACCESS_TOKEN).catch(() => null);
    }
  },

  /**
   * Save the refresh token securely.
   */
  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
        await AsyncStorage.removeItem(KEY_REFRESH_TOKEN).catch(() => {});
      } else {
        await AsyncStorage.setItem(KEY_REFRESH_TOKEN, refreshToken);
      }
    } catch (err) {
      console.error("[TokenStorage] Failed to save refresh token:", err);
      await AsyncStorage.setItem(KEY_REFRESH_TOKEN, refreshToken).catch(() => {});
    }
  },

  /**
   * Retrieve the refresh token securely.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (await isSecureStoreAvailable()) {
        let refreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
        if (!refreshToken) {
          const legacyToken = await AsyncStorage.getItem(KEY_REFRESH_TOKEN);
          if (legacyToken) {
            await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, legacyToken);
            await AsyncStorage.removeItem(KEY_REFRESH_TOKEN).catch(() => {});
            refreshToken = legacyToken;
          }
        }
        return refreshToken;
      }
      return await AsyncStorage.getItem(KEY_REFRESH_TOKEN);
    } catch (err) {
      console.error("[TokenStorage] Failed to get refresh token:", err);
      return await AsyncStorage.getItem(KEY_REFRESH_TOKEN).catch(() => null);
    }
  },

  /**
   * Clear both access and refresh tokens across SecureStore and AsyncStorage.
   */
  async clearTokens(): Promise<void> {
    try {
      if (await isSecureStoreAvailable()) {
        await Promise.all([
          SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN).catch(() => {}),
          SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN).catch(() => {}),
        ]);
      }
    } catch (err) {
      console.error("[TokenStorage] SecureStore deletion error:", err);
    }

    try {
      await Promise.all([
        AsyncStorage.removeItem(KEY_ACCESS_TOKEN).catch(() => {}),
        AsyncStorage.removeItem(KEY_REFRESH_TOKEN).catch(() => {}),
      ]);
    } catch (err) {
      console.error("[TokenStorage] AsyncStorage deletion error:", err);
    }
  },
};
export default tokenStorage;
