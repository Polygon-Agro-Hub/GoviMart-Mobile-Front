import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import { clearCart } from "@/store/cartSlice";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { PayHereAdapter } from "@/services/payment/payhere.adapter";
import { PayHereCheckoutModal } from "@/component/payment/PayHereCheckoutModal";

type PaymentScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentScreen"
>;

type PaymentScreenRouteProp = RouteProp<
  RootStackParamList,
  "PaymentScreen"
>;

interface Props {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

type SelectedPaymentMethod = "payhere" | "card_form";

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialAmount = route.params?.amount || 0;
  const headerTitle = route.params?.title || "Payment Summary";
  const orderContext = route.params?.orderContext;
  const isClearBalanceFlow = !orderContext;

  const [subTotal, setSubTotal] = useState<number>(initialAmount);
  const [loading, setLoading] = useState<boolean>(!initialAmount);

  // Selected Gateway / Method
  const [selectedMethod, setSelectedMethod] = useState<SelectedPaymentMethod>("payhere");

  // ─── PAYHERE MODAL STATE (Via Adapter Pattern) ────────────────────────────
  const [showPayHereModal, setShowPayHereModal] = useState(false);
  const [payHereConfig, setPayHereConfig] = useState<any>(null);
  const [payHereHtml, setPayHereHtml] = useState("");
  const [payHereOrderId, setPayHereOrderId] = useState("");

  // ─── CARD PAYMENT MODAL STATE ─────────────────────────────────────────────
  const [showCardModal, setShowCardModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardError, setCardError] = useState("");

  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);

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

  // ─── PAYHERE GATEWAY INITIATION VIA ADAPTER PATTERN ───────────────────────
  const handlePayWithPayHere = async () => {
    try {
      setSubmitting(true);

      // 1. Get PayHere Adapter from Factory
      const payHereAdapter = PaymentGatewayFactory.getAdapter("payhere") as PayHereAdapter;

      // 2. Initiate Payment Session (Fetches signed parameters & MD5 hash from API)
      const paymentConfig = await payHereAdapter.initiatePayment({
        amount: fullTotal,
        itemsDescription: isClearBalanceFlow
          ? "Clear Negative Credit Balance"
          : "GoviMart Order Payment",
        paymentType: isClearBalanceFlow ? "clear_balance" : "order",
        orderId: isClearBalanceFlow
          ? undefined
          : orderContext?.cartId
          ? `ORD_${orderContext.cartId}_${Date.now()}`
          : undefined,
      });

      // 3. Build in-app checkout HTML form using Adapter
      const html = payHereAdapter.generateHtmlForm(paymentConfig);

      setPayHereConfig(paymentConfig);
      setPayHereHtml(html);
      setPayHereOrderId(paymentConfig.order_id);
      setShowPayHereModal(true);
    } catch (err: any) {
      console.error("PayHere Adapter initiation error:", err);
      Alert.alert(
        "PayHere Error",
        err?.response?.data?.message || err?.message || "Failed to launch PayHere checkout. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── PAYHERE SUCCESS CALLBACK ─────────────────────────────────────────────
  const handlePayHereSuccess = async (orderId: string) => {
    console.log("[PayHere] Payment success callback for:", orderId);

    if (isClearBalanceFlow) {
      try {
        setSubmitting(true);
        // Clear user balance in backend
        await customerService.updateCreditBalance(subTotal);
        setShowSuccessModal(true);
      } catch (err: any) {
        console.error("Error clearing balance after PayHere:", err);
        setShowSuccessModal(true); // Webhook will also process this as backup
      } finally {
        setSubmitting(false);
      }
    } else {
      // Order payment flow
      try {
        setSubmitting(true);
        const payload = {
          cartId: orderContext?.cartId || 0,
          paymentMethod: "payhere",
          grandTotal: fullTotal,
          discountAmount: orderContext?.discount || 0,
          deliveryCharge: orderContext?.deliveryCharge || 0,
          creditPaid: 0,
          moneyPaid: fullTotal,
          isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
          checkoutDetails: {
            ...(orderContext?.checkoutDetails || {
              deliveryMethod: orderContext?.deliveryMethod || "home",
            }),
            payhereOrderId: orderId,
          },
        };

        const response = await orderService.createOrder(payload);
        if (response.data && response.data.status && response.data.data) {
          dispatch(clearCart());
          navigation.navigate("OrderConfirmed", {
            orderId: response.data.data.orderId,
            invoiceNumber: response.data.data.invoiceNumber,
            total: response.data.data.total,
          });
        } else {
          Alert.alert("Order Placed", "Your payment was received. Checking order status...");
        }
      } catch (err: any) {
        console.error("Error creating order after PayHere:", err);
        dispatch(clearCart());
        navigation.navigate("OrderConfirmed", {
          total: fullTotal,
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ─── PAYHERE CANCEL CALLBACK ─────────────────────────────────────────────
  const handlePayHereCancel = (orderId: string) => {
    console.log("[PayHere] Payment cancelled by user:", orderId);
    Alert.alert("Payment Cancelled", "You cancelled the PayHere transaction. No charges were made.");
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

  // ─── PRIMARY BUTTON DISPATCHER ────────────────────────────────────────────
  const handlePrimaryAction = () => {
    if (selectedMethod === "payhere") {
      handlePayWithPayHere();
    } else {
      setShowCardModal(true);
    }
  };

  // ─── PROCESS DIRECT CARD PAYMENT ──────────────────────────────────────────
  const handleExecuteClearBalance = async () => {
    if (!validateCardDetails()) {
      return;
    }

    try {
      setSubmitting(true);
      setCardError("");

      const response = await customerService.updateCreditBalance(subTotal);

      if (response.data && response.data.status) {
        setShowCardModal(false);
        setShowSuccessModal(true);
      } else {
        setCardError(response.data?.message || "Failed to clear credit balance.");
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Payment failed. Please check your card details and try again.";
      setCardError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishSuccess = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <CustomHeader
        title={headerTitle}
        navigation={navigation}
        showBackButton={true}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            Loading Payment Summary...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: 30,
            }}
          >
            {/* ─── 3D PAYMENT SUMMARY ILLUSTRATION ──────────────────────────── */}
            <View style={{ alignItems: "center", marginVertical: 14 }}>
              <Image
                source={require("@/assets/images/payment/payment-summery.webp")}
                style={{
                  width: 170,
                  height: 170,
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
                paddingVertical: 18,
                marginHorizontal: 16,
              }}
            >
              {/* TOTAL NEGATIVE CREDIT BALANCE / ORDER TOTAL */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
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
                  marginBottom: 16,
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
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Amount to Pay
                </Text>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "800",
                    color: "#000000",
                  }}
                >
                  Rs. {formatAmount(fullTotal)}
                </Text>
              </View>
            </View>

            {/* ─── PAYMENT METHOD SELECTION (PayHere vs Card) ─────────────── */}
            <View style={{ marginHorizontal: 16, marginTop: 18 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 10,
                }}
              >
                Select Payment Option
              </Text>

              {/* Option 1: PayHere Payment Gateway */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedMethod("payhere")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: selectedMethod === "payhere" ? "#3E206D" : "#E2E8F0",
                  backgroundColor: selectedMethod === "payhere" ? "#FAF5FF" : "#FFFFFF",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selectedMethod === "payhere" ? "#3E206D" : "#94A3B8",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  {selectedMethod === "payhere" && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#3E206D",
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      PayHere Online Gateway
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#16A34A",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#FFFFFF" }}>
                        POPULAR
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      marginTop: 2,
                    }}
                  >
                    Visa, Mastercard, Frimi, Genie, EzCash, mCash
                  </Text>
                </View>

                <Ionicons name="card" size={22} color="#3E206D" />
              </TouchableOpacity>

              {/* Option 2: Direct Card Input Form */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedMethod("card_form")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: selectedMethod === "card_form" ? "#3E206D" : "#E2E8F0",
                  backgroundColor: selectedMethod === "card_form" ? "#FAF5FF" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selectedMethod === "card_form" ? "#3E206D" : "#94A3B8",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  {selectedMethod === "card_form" && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#3E206D",
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Direct Card Form
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      marginTop: 2,
                    }}
                  >
                    Enter 16-digit card number directly in-app
                  </Text>
                </View>

                <Ionicons name="keypad" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* ─── SECURE PAYMENT BANNER ───────────────────────────────────── */}
            <View
              style={{
                backgroundColor: "#EDFFF2",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 14,
                marginHorizontal: 16,
                marginTop: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#C6F6D5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: "#2D5A3C",
                  fontWeight: "500",
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Your payment is 100% secure and processed through verified encryption standards.
              </Text>
            </View>
          </ScrollView>

          {/* ─── BOTTOM BUTTON ────────────────────────────────────────────── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 24,
              paddingTop: 10,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <TouchableOpacity
              activeOpacity={submitting ? 1 : 0.85}
              disabled={submitting}
              onPress={handlePrimaryAction}
              style={{
                height: 52,
                backgroundColor: "#000000",
                borderRadius: 28,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
                gap: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 4,
              }}
            >
              {submitting && !showCardModal && !showPayHereModal ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {selectedMethod === "payhere"
                      ? `Pay Rs. ${formatAmount(fullTotal)} with PayHere`
                      : `Enter Card Details (Rs. ${formatAmount(fullTotal)})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── PAYHERE CHECKOUT MODAL (Via Adapter Pattern) ─────────────────── */}
      <PayHereCheckoutModal
        visible={showPayHereModal}
        htmlForm={payHereHtml}
        checkoutUrl={payHereConfig?.checkout_url}
        postBody={payHereConfig?.post_body}
        domain={payHereConfig?.domain}
        orderId={payHereOrderId}
        amount={fullTotal}
        onSuccess={handlePayHereSuccess}
        onCancel={handlePayHereCancel}
        onClose={() => setShowPayHereModal(false)}
      />

      {/* ─── DIRECT CARD PAYMENT MODAL ────────────────────────────────────── */}
      <Modal
        visible={showCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !submitting && setShowCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 34,
              maxHeight: "90%",
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#0F172A",
                  }}
                >
                  Enter Card Details
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  Pay Rs. {formatAmount(fullTotal)} securely
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => !submitting && setShowCardModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F5F9",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Card Number Input */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 6,
                  marginTop: 6,
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
                  height: 50,
                }}
              >
                <TextInput
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={19}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: "#0F172A",
                    fontWeight: "500",
                  }}
                />

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

              {/* Name on Card Input */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 6,
                  marginTop: 14,
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
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  height: 50,
                  fontSize: 15,
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              />

              {/* Expiration Date & CVV */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
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
                    maxLength={5}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 50,
                      fontSize: 15,
                      color: "#0F172A",
                      fontWeight: "500",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
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
                    maxLength={3}
                    secureTextEntry={true}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 50,
                      fontSize: 15,
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
                    marginTop: 14,
                    borderWidth: 1,
                    borderColor: "#FECACA",
                  }}
                >
                  <Text style={{ color: "#DC2626", fontSize: 13 }}>
                    {cardError}
                  </Text>
                </View>
              )}

              {/* Submit Pay Now Button */}
              <TouchableOpacity
                activeOpacity={submitting ? 1 : 0.85}
                disabled={submitting}
                onPress={handleExecuteClearBalance}
                style={{
                  height: 52,
                  backgroundColor: "#3E206D",
                  borderRadius: 26,
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 22,
                  flexDirection: "row",
                  gap: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    </SafeAreaView>
  );
};

export default PaymentScreen;
