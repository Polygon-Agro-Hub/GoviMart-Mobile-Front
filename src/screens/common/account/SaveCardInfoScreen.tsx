import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentsLkAdapter } from "@/services/payment/payments-lk.adapter";
import cardStorageService from "@/services/payment/cardStorageService";
import CustomHeader from "@/component/common/CustomHeader";

type SaveCardInfoNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SaveCardInfo"
>;

interface Props {
  navigation: SaveCardInfoNavigationProp;
}

const SaveCardInfoScreen: React.FC<Props> = ({ navigation }) => {
  const userProfile = useSelector((state: RootState) => state.auth?.userProfile);
  const userId = userProfile?.id || "current";

  const [cardScheme, setCardScheme] = useState<"visa" | "mastercard">("visa");
  const [saveSecurely, setSaveSecurely] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<UnifiedCheckoutSession | null>(null);

  // Open Payments.lk Hosted Sheet (Option 2)
  const handleOpenPaymentsLkSheet = async () => {
    try {
      setInitiating(true);
      const adapter = PaymentGatewayFactory.getGateway("payments_lk") as PaymentsLkAdapter;
      const session = await adapter.initiateCardSaveSession();
      setCheckoutSession(session);
      setCheckoutModalVisible(true);
    } catch (err: any) {
      console.error("[SaveCardInfo] Error initiating Payments.lk session:", err);
      Alert.alert(
        "Gateway Error",
        err?.response?.data?.message ||
          err?.message ||
          "Could not launch Payments.lk checkout sheet. Please try again."
      );
    } finally {
      setInitiating(false);
    }
  };

  const handlePaymentSuccess = async (orderId: string) => {
    setCheckoutModalVisible(false);
    try {
      if (checkoutSession?.sessionId) {
        const adapter = PaymentGatewayFactory.getGateway("payments_lk") as PaymentsLkAdapter;
        await adapter.syncCheckout(checkoutSession.sessionId).catch(() => null);
      }
      await cardStorageService.getSavedCard(userId);
      Alert.alert(
        "Card Linked Successfully",
        "Your payment card has been securely verified and linked through Payments.lk for fast 1-click checkout!",
        [
          {
            text: "View Saved Cards",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      navigation.goBack();
    }
  };

  const handlePaymentCancel = (orderId: string) => {
    setCheckoutModalVisible(false);
    Alert.alert(
      "Setup Cancelled",
      "No card was saved. You can try linking a payment card at any time."
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      {/* ─── TOP HEADER ─────────────────────────────────────────────────── */}
      <CustomHeader
        title="Save Card Info"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        {/* ─── CARD NETWORK PILL SELECTOR ──────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {/* VISA PILL */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setCardScheme("visa")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 30,
              backgroundColor: cardScheme === "visa" ? "#F0F6FF" : "#FFFFFF",
              borderWidth: 1.5,
              borderColor: cardScheme === "visa" ? "#0077FF" : "#E5E7EB",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  fontStyle: "italic",
                  color: "#1A1F71",
                  letterSpacing: 0.5,
                }}
              >
                VISA
              </Text>
            </View>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: cardScheme === "visa" ? "#000000" : "#E5E7EB",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {cardScheme === "visa" && (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* MASTERCARD PILL */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setCardScheme("mastercard")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 30,
              backgroundColor:
                cardScheme === "mastercard" ? "#F0F6FF" : "#FFFFFF",
              borderWidth: 1.5,
              borderColor: cardScheme === "mastercard" ? "#0077FF" : "#E5E7EB",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#EB001B",
                  marginRight: -6,
                }}
              />
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#F79E1B",
                  opacity: 0.9,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#111827",
                  marginLeft: 4,
                }}
              >
                Mastercard
              </Text>
            </View>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor:
                  cardScheme === "mastercard" ? "#000000" : "transparent",
                borderWidth: cardScheme === "mastercard" ? 0 : 1.5,
                borderColor: "#D1D5DB",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {cardScheme === "mastercard" && (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── PAYMENTS.LK OFFICIAL HOSTED GATEWAY NOTICE ─────────────── */}
        <View
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            padding: 22,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "#E0F2FE",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="shield-checkmark" size={28} color="#0284C7" />
          </View>

          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            Hosted Secure Card Setup
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#475569",
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            To ensure maximum security and PCI-DSS compliance, your card is
            entered directly into the official **Payments.lk** hosted sheet.
            GoviMart never receives, sees, or stores your card numbers.
          </Text>

          {/* Benefits Bullet Points */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={{ fontSize: 13, color: "#334155", fontWeight: "500" }}>
                1-Click fast checkout for all future orders
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={{ fontSize: 13, color: "#334155", fontWeight: "500" }}>
                Bank-level 256-bit SSL tokenization
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={{ fontSize: 13, color: "#334155", fontWeight: "500" }}>
                Verified via official Payments.lk webhooks
              </Text>
            </View>
          </View>
        </View>

        {/* ─── "SAVE THIS CARD SECURELY" CHECKBOX ─────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSaveSecurely(!saveSecurely)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 20,
            paddingHorizontal: 4,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: saveSecurely ? "#0077FF" : "#D1D5DB",
              backgroundColor: saveSecurely ? "#0077FF" : "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 2,
              marginRight: 12,
            }}
          >
            {saveSecurely && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 3,
              }}
            >
              Save this card securely
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#6B7280",
                lineHeight: 17,
              }}
            >
              Stored with Payments.lk tokenization for 1-click checkout.
            </Text>
          </View>
        </TouchableOpacity>

        {/* ─── 100% SECURE PAYMENTS BANNER ─────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F0FDF4",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 24,
            marginBottom: 26,
            borderWidth: 1,
            borderColor: "#DCFCE7",
            gap: 8,
          }}
        >
          <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#15803D",
            }}
          >
            100% Secure Payments with Payments.lk
          </Text>
        </View>

        {/* ─── ACTION BUTTON: OPEN PAYMENTS.LK SHEET ──────────────────── */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleOpenPaymentsLkSheet}
          disabled={initiating}
          style={{
            width: "100%",
            height: 58,
            backgroundColor: "#FF7A00",
            borderRadius: 29,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            shadowColor: "#FF7A00",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          {initiating ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Opening Payments.lk...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Open Payments.lk Secure Checkout
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ─── PAYMENTS.LK HOSTED CHECKOUT MODAL ───────────────────────── */}
      {checkoutSession && (
        <PaymentCheckoutModal
          visible={checkoutModalVisible}
          gatewayName="payments_lk"
          checkoutUrl={checkoutSession.checkoutUrl}
          orderId={String(checkoutSession.orderId)}
          amount={checkoutSession.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onClose={() => setCheckoutModalVisible(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default SaveCardInfoScreen;
