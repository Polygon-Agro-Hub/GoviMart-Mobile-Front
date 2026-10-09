import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import cardStorageService, {
  SavedCard,
} from "@/services/payment/cardStorageService";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentsLkAdapter } from "@/services/payment/payments-lk.adapter";
import CustomHeader from "@/component/common/CustomHeader";

type SavedCardsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SavedCards"
>;

interface Props {
  navigation: SavedCardsNavigationProp;
}

const SavedCardsScreen: React.FC<Props> = ({ navigation }) => {
  const userProfile = useSelector(
    (state: RootState) => state.auth?.userProfile,
  );
  const userId = userProfile?.id || "current";
  const defaultHolder =
    userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : "Samantha Kularathna";

  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [initiatingGateway, setInitiatingGateway] = useState(false);

  // Load saved card from local storage
  const loadSavedCard = useCallback(async () => {
    try {
      setLoading(true);
      const card = await cardStorageService.getSavedCard(userId);
      setSavedCard(card);
    } catch (err) {
      console.log("Error loading saved card:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadSavedCard();
    }, [loadSavedCard]),
  );

  // Handle Add New Card -> Opens Payments.lk Hosted Sheet (Option 2)
  const handleAddNewCard = async () => {
    try {
      setInitiatingGateway(true);
      const adapter = PaymentGatewayFactory.getGateway(
        "payments_lk",
      ) as PaymentsLkAdapter;
      const session = await adapter.initiateCardSaveSession();
      setCheckoutSession(session);
      setCheckoutModalVisible(true);
    } catch (err: any) {
      console.error(
        "[SavedCards] Error launching Payments.lk card setup:",
        err,
      );
      Alert.alert(
        "Card Setup Error",
        err?.response?.data?.message ||
          err?.message ||
          "Could not launch Payments.lk checkout sheet. Please try again.",
      );
    } finally {
      setInitiatingGateway(false);
    }
  };

  const handleCheckoutSuccess = async (orderId: string) => {
    setCheckoutModalVisible(false);
    try {
      setLoading(true);

      // Give the card.saved webhook time to arrive and be processed before querying DB
      // The webhook is async — it may arrive a second or two after the WebView success callback
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let syncResult: any = null;
      if (checkoutSession?.sessionId) {
        const adapter = PaymentGatewayFactory.getGateway(
          "payments_lk",
        ) as PaymentsLkAdapter;
        syncResult = await adapter
          .syncCheckout(checkoutSession.sessionId)
          .catch((err) => {
            console.warn("[SavedCardsScreen] syncCheckout error:", err);
            return null;
          });
      }

      // Primary source: DB (populated by card.saved webhook)
      let loaded = await cardStorageService.getSavedCard(userId);

      // If still not in DB, wait a bit more and retry (webhook may be slightly delayed)
      if (!loaded) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        loaded = await cardStorageService.getSavedCard(userId);
      }

      setSavedCard(loaded);
      if (loaded) {
        Alert.alert(
          "Card Saved Successfully",
          "Your card has been securely verified and linked via Payments.lk for fast 1-click checkout!",
        );
      } else if (syncResult?.card) {
        setSavedCard(syncResult.card);
        Alert.alert(
          "Card Saved Successfully",
          "Your card has been securely verified and linked via Payments.lk for fast 1-click checkout!",
        );
      } else {
        Alert.alert(
          "Card Setup Notice",
          "Verification payment was received, but Payments.lk did not vault the card. Please ensure 'Keep my card on file' is checked on the payment page.",
        );
      }
    } catch (e) {
      await loadSavedCard();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutCancel = (orderId: string) => {
    setCheckoutModalVisible(false);
    Alert.alert(
      "Card Setup Cancelled",
      "No card was linked. You can link a payment card at any time.",
    );
  };

  // Handle Remove Card with confirmation
  const handleRemoveCard = () => {
    Alert.alert(
      "Remove Card",
      "Are you sure you want to remove your saved card? You can add another card anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await cardStorageService.removeCard(userId, savedCard?.id);
              setSavedCard(null);
              Alert.alert("Card Removed", "Your saved card has been removed.");
            } catch (err) {
              Alert.alert("Error", "Failed to remove card. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <CustomHeader
        title="Saved Cards"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#FF7A00" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STATE 1: NO SAVED CARD DATA                                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {!savedCard ? (
            <View>
              {/* White Container Card */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  paddingVertical: 36,
                  paddingHorizontal: 24,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 16,
                  elevation: 3,
                }}
              >
                {/* Center Card Icon with Orange Plus Badge */}
                <View style={{ position: "relative", marginBottom: 20 }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "#FFF5F2",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: "#1F2937",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        source={require("@/assets/images/payment/card.webp")}
                        className="w-10 h-10"
                        resizeMode="cover"
                      />
                    </View>
                  </View>

                  {/* Orange Plus Badge */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#FF7A00",
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                  </View>
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: "#111827",
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  No Card Added Yet
                </Text>

                {/* Subtitle */}
                <Text
                  style={{
                    fontSize: 14,
                    color: "#494A65",
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 20,
                    paddingHorizontal: 8,
                  }}
                >
                  You don't have any saved payment cards. Add a credit or debit
                  card for faster and seamless checkout.
                </Text>

                {/* Info Note Pill */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F2F2F6",
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    marginBottom: 26,
                  }}
                >
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color="#FF9114"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: "#494A65",
                    }}
                  >
                    Note: You can save 1 active card at a time
                  </Text>
                </View>

                {/* + Add New Card Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={initiatingGateway}
                  onPress={handleAddNewCard}
                  style={{
                    width: "80%",
                    backgroundColor: "#FF9114",
                    paddingVertical: 15,
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#FF7A00",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 5,
                    marginBottom: 18,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  {initiatingGateway ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        Connecting ...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        + Add New Card
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Visa & Mastercard Logos */}
                {/* Visa & Mastercard Logos */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  <Image
                    source={require("@/assets/images/payment/visa.webp")}
                    style={{ width: 44, height: 18 }}
                    resizeMode="contain"
                  />
                  <Image
                    source={require("@/assets/images/payment/master.webp")}
                    style={{ width: 32, height: 20 }}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Bottom Feature Badges (Encrypted & Fast 1-Click) */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 20,
                  gap: 12,
                }}
              >
                {/* Badge 1: Encrypted */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#FF9114",
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="lock-closed" size={16} color="#111827" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      Encrypted
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#494A65",
                      }}
                    >
                      100% Safe
                    </Text>
                  </View>
                </View>

                {/* Badge 2: Fast 1-Click */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#FF9114",
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="flash" size={16} color="#111827" />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      Fast 1-Click
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#494A65",
                      }}
                    >
                      Checkout
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* ══════════════════════════════════════════════════════════════════ */
            /* STATE 2 & 3: ACTIVE SAVED CARD PRESENT (VISA / MASTERCARD)         */
            /* ══════════════════════════════════════════════════════════════════ */
            <View>
              {/* Top Info Banner Pill */}
              <View
                style={{
                  alignSelf: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="information-circle"
                  size={15}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: "#4B5563",
                  }}
                >
                  Only 1 card can be saved at a time.
                </Text>
              </View>

              {/* Realistic Credit Card Container */}
              <View
                style={{
                  backgroundColor: "#192231",
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 18,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 14,
                  elevation: 7,
                }}
              >
                {/* Card Top: Chip and Contactless Wave */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 24,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {/* Gold EMV Chip */}
                    <View
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: "#E5B95F",
                        marginRight: 10,
                        padding: 3,
                        justifyContent: "space-around",
                      }}
                    >
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#C49A3E",
                        }}
                      />
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#C49A3E",
                        }}
                      />
                    </View>

                    {/* Contactless Wifi Icon */}
                    <MaterialCommunityIcons
                      name="contactless-payment"
                      size={24}
                      color="#94A3B8"
                    />
                  </View>

                  {/* Brand scheme logo badge on card */}
                  {savedCard.scheme === "mastercard" ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: "#EB001B",
                          marginRight: -7,
                        }}
                      />
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: "#F79E1B",
                          opacity: 0.9,
                        }}
                      />
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "900",
                        fontStyle: "italic",
                        color: "#FFFFFF",
                      }}
                    >
                      VISA
                    </Text>
                  )}
                </View>

                {/* Card Number Label */}
                <Text
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    fontWeight: "600",
                    color: "#94A3B8",
                    marginBottom: 4,
                  }}
                >
                  CARD NUMBER
                </Text>

                {/* Masked Card Number */}
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    letterSpacing: 2,
                    color: "#FFFFFF",
                    marginBottom: 24,
                    fontFamily: "monospace",
                  }}
                >
                  •••• •••• •••• {savedCard.last4}
                </Text>

                {/* Card Holder & Expiry Row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.2,
                        fontWeight: "600",
                        color: "#94A3B8",
                        marginBottom: 3,
                      }}
                    >
                      CARD HOLDER
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                      }}
                    >
                      {savedCard.cardHolder}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.2,
                        fontWeight: "600",
                        color: "#94A3B8",
                        marginBottom: 3,
                      }}
                    >
                      EXPIRES
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#FFFFFF",
                      }}
                    >
                      {savedCard.expiryMonth}/{savedCard.expiryYear}
                    </Text>
                  </View>
                </View>
              </View>

              {/* White Card Info & Action Container */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                  marginBottom: 16,
                }}
              >
                {/* Card Brand Header Row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor:
                        savedCard.scheme === "mastercard"
                          ? "#FEF3C7"
                          : "#EFF6FF",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    {savedCard.scheme === "mastercard" ? (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: "#EB001B",
                            marginRight: -4,
                          }}
                        />
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: "#F79E1B",
                            opacity: 0.9,
                          }}
                        />
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "900",
                          fontStyle: "italic",
                          color: "#1D4ED8",
                        }}
                      >
                        VISA
                      </Text>
                    )}
                  </View>

                  <View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      {savedCard.scheme === "mastercard"
                        ? "Mastercard"
                        : "Visa"}{" "}
                      ending in {savedCard.last4}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 1,
                      }}
                    >
                      Added on {savedCard.addedAt || "Jan 14, 2024"}
                    </Text>
                  </View>
                </View>

                {/* Shield Note */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 20,
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color="#6B7280"
                    style={{ marginTop: 2, marginRight: 8 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "#6B7280",
                      lineHeight: 18,
                    }}
                  >
                    Your card details are encrypted and tokenized securely. Only
                    one primary payment card can be kept active at a time.
                  </Text>
                </View>

                {/* Remove Card Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleRemoveCard}
                  style={{
                    width: "100%",
                    backgroundColor: "#FEF2F2",
                    paddingVertical: 12,
                    borderRadius: 24,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#EF4444"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    Remove Card
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Instructions Footer */}
              <Text
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  textAlign: "center",
                  lineHeight: 18,
                  paddingHorizontal: 20,
                }}
              >
                To add another card, delete your current active card above and
                link a new payment method.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── PAYMENTS.LK HOSTED CHECKOUT MODAL ───────────────────────────── */}
      {checkoutSession && (
        <PaymentCheckoutModal
          visible={checkoutModalVisible}
          gatewayName="payments_lk"
          checkoutUrl={checkoutSession.checkoutUrl}
          orderId={String(checkoutSession.orderId)}
          amount={checkoutSession.amount}
          customerAddress={checkoutSession.customerAddress}
          onSuccess={handleCheckoutSuccess}
          onCancel={handleCheckoutCancel}
          onClose={() => setCheckoutModalVisible(false)}
        />
      )}
    </View>
  );
};

export default SavedCardsScreen;
