import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import { clearCart } from "@/store/cartSlice";
import UnavailableItemsModal from "@/component/common/UnavailableItemsModal";
// Note: PayHere adapter and modal files are preserved in the codebase and can be relinked if needed.

type PaymentScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentScreen"
>;

type PaymentScreenRouteProp = RouteProp<RootStackParamList, "PaymentScreen">;

interface Props {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialAmount = route.params?.amount || 0;
  const headerTitle = route.params?.title || "Payment Summary";
  const orderContext = route.params?.orderContext;
  const isClearBalanceFlow = !orderContext;

  const [subTotal, setSubTotal] = useState<number>(initialAmount);
  const [loading, setLoading] = useState<boolean>(!initialAmount);

  // ─── CARD PAYMENT STATE ───────────────────────────────────────────────────
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardError, setCardError] = useState("");

  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [unavailableModalVisible, setUnavailableModalVisible] = useState(false);

  useEffect(() => {
    if (!initialAmount) {
      const fetchBalance = async () => {
        try {
          setLoading(true);
          const response = await customerService.getAccountDetails();
          if (response.data && response.data.data) {
            const rawBalance = Number(response.data.data.creditBalance || 0);
            setSubTotal(Math.abs(rawBalance));
          }
        } catch (error) {
          console.log("Error fetching account balance: ", error);
        } finally {
          setLoading(false);
        }
      };
      fetchBalance();
    }
  }, [initialAmount]);

  // Full total to pay equals the balance / order amount (no processing fee)
  const fullTotal = subTotal;

  const formatAmount = (amt: number) => {
    return amt.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ─── CARD INPUT FORMATTING ────────────────────────────────────────────────
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    const formatted = cleaned.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
    if (cardError) setCardError("");
  };

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
    if (cardError) setCardError("");
  };

  const handleNameChange = (text: string) => {
    const lettersOnly = text.replace(/[^a-zA-Z\s]/g, "");
    setNameOnCard(lettersOnly);
    if (cardError) setCardError("");
  };

  const handleCvvChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 3);
    setCvv(digitsOnly);
    if (cardError) setCardError("");
  };

  // ─── CARD VALIDATION ──────────────────────────────────────────────────────
  const validateCardDetails = (): boolean => {
    const rawDigits = cardNumber.replace(/\s/g, "");
    if (!rawDigits) {
      setCardError("Card number is required.");
      return false;
    }
    if (rawDigits.length !== 16) {
      setCardError("Card number must be 16 digits.");
      return false;
    }
    if (!nameOnCard.trim()) {
      setCardError("Name on card is required.");
      return false;
    }
    if (!expiry.trim()) {
      setCardError("Expiration date is required.");
      return false;
    }
    const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(expiry);
    if (!expiryMatch) {
      setCardError("Use MM/YY format for expiration date.");
      return false;
    }
    const month = Number(expiryMatch[1]);
    const year = Number(expiryMatch[2]);
    if (month < 1 || month > 12) {
      setCardError("Enter a valid expiration month (01-12).");
      return false;
    }
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setCardError("This card has expired.");
      return false;
    }
    if (!cvv.trim()) {
      setCardError("CVV is required.");
      return false;
    }
    if (cvv.length !== 3) {
      setCardError("CVV must be exactly 3 digits.");
      return false;
    }

    setCardError("");
    return true;
  };

  // ─── PROCESS CARD PAYMENT ─────────────────────────────────────────────────
  const handleExecutePayment = async () => {
    if (!validateCardDetails()) {
      return;
    }

    try {
      setSubmitting(true);
      setCardError("");

      if (isClearBalanceFlow) {
        const response = await customerService.updateCreditBalance(subTotal);

        if (response.data && response.data.status) {
          setShowSuccessModal(true);
        } else {
          setCardError(
            response.data?.message || "Failed to clear credit balance.",
          );
        }
      } else {
        // Direct card flow for order placement
        const payload = {
          cartId: orderContext?.cartId || 0,
          paymentMethod: "card",
          grandTotal: orderContext?.grandTotal || fullTotal,
          discountAmount: orderContext?.discount || 0,
          deliveryCharge: orderContext?.deliveryCharge || 0,
          creditPaid: orderContext?.creditPaid || 0,
          moneyPaid: orderContext?.moneyPaid || fullTotal,
          isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
          checkoutDetails: {
            ...(orderContext?.checkoutDetails || {
              deliveryMethod: orderContext?.deliveryMethod || "home",
            }),
          },
        };

        const response = await orderService.createOrder(payload);
        if (response.data && response.data.status && response.data.data) {
          dispatch(clearCart());
          navigation.navigate("OrderConfirmed", {
            orderId: response.data.data.orderId,
            invoiceNumber: response.data.data.invoiceNumber,
            total: response.data.data.total,
            orderContext,
          });
        } else {
          setCardError(
            response.data?.message ||
              "Failed to create order. Please try again.",
          );
        }
      }
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.code === "ITEMS_UNAVAILABLE") {
        setUnavailableModalVisible(true);
      } else {
        const errorMsg =
          errorData?.message ||
          (Array.isArray(errorData?.details)
            ? errorData.details.join("; ")
            : null) ||
          err?.message ||
          "Payment failed. Please check your card details and try again.";
        setCardError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishSuccess = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <CustomHeader
        title={headerTitle}
        navigation={navigation}
        showBackButton={true}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#FF8A00" />
          <Text style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            Loading Payment Summary...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === "ios" ? 120 : 140}
            extraHeight={Platform.OS === "ios" ? 120 : 140}
            keyboardOpeningTime={0}
            enableResetScrollToCoords={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: 110,
            }}
          >
            {/* ─── 3D PAYMENT SUMMARY ILLUSTRATION ──────────────────────────── */}
            <View style={{ alignItems: "center", marginVertical: 10 }}>
              <Image
                source={require("@/assets/images/payment/payment-summery.webp")}
                style={{
                  width: 140,
                  height: 140,
                  resizeMode: "contain",
                }}
              />
            </View>

            {/* ─── PAYMENT SUMMARY CARD ─────────────────────────────────────── */}
            <View
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 20,
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginHorizontal: 16,
              }}
            >
              {/* TOTAL NEGATIVE CREDIT BALANCE / ORDER TOTAL */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#4B5563",
                    fontWeight: "500",
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  {isClearBalanceFlow
                    ? "Total Negative Credit Balance"
                    : "Order Total"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: isClearBalanceFlow ? "#FF383C" : "#111827",
                  }}
                >
                  {isClearBalanceFlow ? "- " : ""}Rs. {formatAmount(subTotal)}
                </Text>
              </View>

              {/* DIVIDER */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E5E7EB",
                  marginBottom: 12,
                }}
              />

              {/* FULL TOTAL */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Amount to Pay
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "#000000",
                  }}
                >
                  Rs. {formatAmount(fullTotal)}
                </Text>
              </View>
            </View>

            {/* ─── CARD DETAILS SECTION ───────────────────────────────────── */}
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 18,
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              {/* Card Section Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="card" size={20} color="#FF8A00" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Card Details
                  </Text>
                </View>

                {/* Card Type Badges */}
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      backgroundColor: "#1E293B",
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      VISA
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      backgroundColor: "#DC2626",
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      MC
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card Number Input */}
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Card Number
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  height: 48,
                  marginBottom: 12,
                }}
              >
                <TextInput
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  returnKeyType="next"
                  maxLength={19}
                  style={{
                    flex: 1,
                    fontSize: 14.5,
                    color: "#0F172A",
                    fontWeight: "500",
                  }}
                />
                <Ionicons name="card-outline" size={18} color="#94A3B8" />
              </View>

              {/* Name on Card Input */}
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Name on Card
              </Text>
              <TextInput
                value={nameOnCard}
                onChangeText={handleNameChange}
                placeholder="JOHN DOE"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                returnKeyType="next"
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  height: 48,
                  fontSize: 14.5,
                  color: "#0F172A",
                  fontWeight: "500",
                  marginBottom: 12,
                }}
              />

              {/* Expiry Date & CVV */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    Expiry Date
                  </Text>
                  <TextInput
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    placeholder="MM/YY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    returnKeyType="next"
                    maxLength={5}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14.5,
                      color: "#0F172A",
                      fontWeight: "500",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    CVV
                  </Text>
                  <TextInput
                    value={cvv}
                    onChangeText={handleCvvChange}
                    placeholder="123"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={3}
                    secureTextEntry={true}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 14.5,
                      color: "#0F172A",
                      fontWeight: "500",
                    }}
                  />
                </View>
              </View>

              {/* Error Message */}
              {Boolean(cardError) && (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: "#FECACA",
                  }}
                >
                  <Text style={{ color: "#DC2626", fontSize: 12.5 }}>
                    {cardError}
                  </Text>
                </View>
              )}
            </View>

            {/* ─── SECURE PAYMENT BANNER ───────────────────────────────────── */}
            <View
              style={{
                backgroundColor: "#EDFFF2",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginHorizontal: 16,
                marginTop: 14,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "#C6F6D5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
              </View>

              <Text
                style={{
                  fontSize: 11.5,
                  color: "#2D5A3C",
                  fontWeight: "500",
                  flex: 1,
                  lineHeight: 15,
                }}
              >
                Your payment is 100% secure and processed through verified
                encryption standards.
              </Text>
            </View>
          </KeyboardAwareScrollView>

          {/* ─── BOTTOM SUBMIT BUTTON ─────────────────────────────────────── */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 16,
              paddingBottom: Platform.OS === "ios" ? 34 : 16,
              paddingTop: 12,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderColor: "#F1F5F9",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.08,
              shadowRadius: 5,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              activeOpacity={submitting ? 1 : 0.85}
              disabled={submitting}
              onPress={handleExecutePayment}
              style={{
                height: 54,
                backgroundColor: "#FF8A00",
                borderRadius: 27,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
                gap: 8,
                shadowColor: "#FF8A00",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
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
                    Pay Rs. {formatAmount(fullTotal)} Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* ─── PAYMENT SUCCESS MODAL ────────────────────────────────────────── */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleFinishSuccess}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingVertical: 28,
              width: "100%",
              maxWidth: 340,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#DCFCE7",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Payment Successful!
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                textAlign: "center",
                lineHeight: 19,
                marginBottom: 24,
              }}
            >
              {isClearBalanceFlow
                ? "Your negative credit balance has been cleared successfully. You can now continue placing orders without restrictions!"
                : "Your order payment has been completed successfully."}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleFinishSuccess}
              style={{
                width: "100%",
                height: 48,
                backgroundColor: "#000000",
                borderRadius: 24,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {isClearBalanceFlow ? "Back to Profile" : "Done"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── UNAVAILABLE ITEMS MODAL ─────────────────────────────────────── */}
      <UnavailableItemsModal
        visible={unavailableModalVisible}
        onClose={() => setUnavailableModalVisible(false)}
        onViewCart={() => {
          setUnavailableModalVisible(false);
          navigation.navigate("MyCart");
        }}
      />
    </View>
  );
};

export default PaymentScreen;
