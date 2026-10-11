import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../config-service/axio-config";
import { ENDPOINTS } from "../config-service/endpoints";
import { getAuthHeader } from "../config-service/auth-header";

export interface SavedCard {
  id: string;
  scheme: "visa" | "mastercard" | "unknown";
  last4: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  addedAt: string; // e.g. "Jan 14, 2024"
  token?: string; // Payments.lk card token
  paymentId?: string;
  customerEmail?: string;
}

const STORAGE_PREFIX = "@polygon_saved_card_";

/**
 * Local Card Storage Service
 * Stores cards in local AsyncStorage and syncs with backend saved_cards.txt file.
 * Enforces the rule: "Only 1 card can be saved at a time".
 */
export const cardStorageService = {
  /**
   * Retrieves the saved card for the authenticated user directly from MySQL DB via backend API.
   * If the user has a saved card in DB, returns that card.
   * If the user has no saved card in DB, purges local cache and returns null.
   */
  async getSavedCard(userId?: string | number): Promise<SavedCard | null> {
    const key = `${STORAGE_PREFIX}${userId || "current"}`;

    // 1. Primary authoritative source: Always fetch from MySQL DB for this user
    try {
      const headers = await getAuthHeader();
      const response = await apiClient.get(ENDPOINTS.PAYMENT.CARDS, { headers });
      if (response.data?.status && Array.isArray(response.data?.data)) {
        if (response.data.data.length > 0) {
          const backendCard = response.data.data[0];
          const normalized: SavedCard = {
            id: backendCard.id,
            scheme: (backendCard.scheme || "visa").toLowerCase() as any,
            last4: backendCard.last4,
            cardHolder: backendCard.customerName || backendCard.cardHolder || "Cardholder",
            expiryMonth: backendCard.expiryMonth || "01",
            expiryYear: backendCard.expiryYear || "39",
            addedAt: backendCard.addedAt || "Recently Added",
            token: backendCard.id,
            paymentId: backendCard.paymentId,
            customerEmail: backendCard.customerEmail,
          };

          // Keep local storage in sync with DB
          await AsyncStorage.setItem(key, JSON.stringify(normalized));
          return normalized;
        } else {
          // DB explicitly has NO saved card for this user -> purge any stale cached card
          await AsyncStorage.removeItem(key);
          return null;
        }
      }
    } catch (err) {
      console.warn("[CardStorageService] Error fetching saved card from DB:", (err as any)?.message);
    }

    // 2. Only if network request failed completely, check local cache as offline fallback
    try {
      const json = await AsyncStorage.getItem(key);
      if (!json) return null;
      return JSON.parse(json) as SavedCard;
    } catch (error) {
      return null;
    }
  },

  /**
   * Saves or replaces the user's primary active card in both local storage and backend file
   */
  async saveCard(card: SavedCard, userId?: string | number): Promise<void> {
    const key = `${STORAGE_PREFIX}${userId || "current"}`;

    // 1. Save in AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(card));
    } catch (error) {
      console.error("[CardStorageService] Error saving card locally:", error);
    }

    // 2. Sync to backend file
    try {
      const headers = await getAuthHeader();
      await apiClient.post(
        ENDPOINTS.PAYMENT.CARDS,
        {
          id: card.id,
          scheme: card.scheme,
          last4: card.last4,
          cardHolder: card.cardHolder,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          addedAt: card.addedAt,
          token: card.token,
        },
        { headers }
      );
    } catch (err) {
      // Sync failure is non-blocking since it's already in AsyncStorage
      console.warn("[CardStorageService] Could not sync card to backend file:", (err as any)?.message);
    }
  },

  /**
   * Removes the saved card from local storage, backend database, and Payments.lk
   */
  async removeCard(userId?: string | number, cardId?: string): Promise<void> {
    const key = `${STORAGE_PREFIX}${userId || "current"}`;

    // 1. Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("[CardStorageService] Error removing card locally:", error);
    }

    // 2. Remove from backend DB & Payments.lk vault
    try {
      const headers = await getAuthHeader();
      const endpointId = cardId || "current";
      await apiClient.delete(`${ENDPOINTS.PAYMENT.CARDS}/${endpointId}`, { headers });
    } catch (err) {
      console.warn("[CardStorageService] Could not remove card from backend:", (err as any)?.message);
    }
  },
};

export default cardStorageService;
