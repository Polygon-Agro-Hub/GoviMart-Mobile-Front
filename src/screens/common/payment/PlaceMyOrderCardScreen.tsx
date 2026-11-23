import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import { clearCart } from "@/store/cartSlice";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { PaymentsLkAdapter } from "@/services/payment/payments-lk.adapter";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import orderService from "@/services/order/order.service";
import { orderRecoveryService } from "@/services/order/orderRecovery.service";

type PlaceMyOrderCardNavProp = StackNavigationProp<
  RootStackParamList,
  "PlaceMyOrderCard"
>;

type PlaceMyOrderCardRouteProp = RouteProp<
  RootStackParamList,
  "PlaceMyOrderCard"
>;

interface Props {
  navigation: PlaceMyOrderCardNavProp;
  route: PlaceMyOrderCardRouteProp;
}

export const PlaceMyOrderCardScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const userProfile = useSelector((state: RootState) => state.auth?.userProfile);

  const {
    orderContext,
    payload,
    paymentAmount = 0,
    totalAmount = 0,
    couponVal = 0,
    savedCard,
    flowType = "checkout",
    reviewPayload,
    invoiceNumber,
  } = route.params || {};

  const [submitting, setSubmitting] = useState(false);
  const [submittingType, setSubmittingType] = useState<"saved" | "another" | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<UnifiedCheckoutSession | null>(null);

  const isCreatingOrderRef = useRef(false);

  // Card holder name
  const cardHolderName =
    savedCard?.cardHolder && savedCard.cardHolder !== "Cardholder"
      ? savedCard.cardHolder
      : userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
      : "Samantha Kularathna";

  const cardLast4 = savedCard?.last4 || "4821";
  const expiryMonth = savedCard?.expiryMonth || "08";
  const expiryYear = savedCard?.expiryYear || "27";

  const adapter = PaymentGatewayFactory.getGateway("payments_lk") as PaymentsLkAdapter;

  // ─── 1. USE SAVED DEBIT / CREDIT CARD (1-CLICK CHARGE) ───────────────────
  const handleUseSavedCard = async () => {
    if (submitting || isCreatingOrderRef.current) return;
    try {
      setSubmitting(true);
      setSubmittingType("saved");

      const description =
        flowType === "review_package"
          ? `Polygon Package Order Payment - ${invoiceNumber || ""}`
          : flowType === "order_confirmation"
          ? `Polygon Order Price Difference - ${invoiceNumber || ""}`
          : "Polygon Order Payment";

      const targetOrderId =
        reviewPayload?.processOrderId ||
        reviewPayload?.orderId ||
        payload?.cartId ||
        orderContext?.cartId ||
        Date.now();

      // 1-Click Charge saved card
      const chargeRes = await adapter.chargeSavedCard({
        cardId: savedCard.id,
        amount: paymentAmount,
        itemsDescription: description,
        paymentType: "order",
        orderId: String(targetOrderId),
      });

      if (chargeRes.success) {
        // Flow 1: Review Package
        if (flowType === "review_package") {
          await orderService.confirmPackageReview({
            ...reviewPayload,
            isPaid: 1,
            paymentId: chargeRes.paymentId || null,
          });
          setSubmitting(false);
          Alert.alert(
            "Successful!",
            `Your order ${invoiceNumber || ""}\nreviewed and dispatched successfully!`,
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                  });
                },
              },
            ]
          );
          return;
        }

        // Flow 2: Order Confirmation (price changes)
        if (flowType === "order_confirmation") {
          await orderService.confirmOrderWithLivePrices({
            ...reviewPayload,
            isPaid: 1,
          });
          setSubmitting(false);
          Alert.alert(
            "Successful!",
            `Your order ${invoiceNumber || ""}\nconfirmed successfully!`,
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                  });
                },
              },
            ]
          );
          return;
        }

        // Flow 3: Standard Checkout
        await orderRecoveryService.updatePendingOrder({ isPaid: true });

        // Finalize order creation with verified payment ID
        const finalPayload = {
          ...payload,
          isPaid: 1,
          paymentId: chargeRes.paymentId || null,
          checkoutSessionId: chargeRes.paymentId || null,
        };
        const response = await orderService.createOrder(finalPayload);

        if (!response.data || !response.data.status || !response.data.data) {
          throw new Error(response.data?.message || "Failed to finalize order");
        }

        const orderData = response.data.data;
        await orderRecoveryService.clearPendingOrder();
        dispatch(clearCart());
        setSubmitting(false);

        navigation.navigate("OrderConfirmed", {
          orderId: orderData.orderId,
          processOrderId: orderData.processOrderId,
          invoiceNumber: orderData.invoiceNumber,
          total: orderData.total || totalAmount,
          couponValue: couponVal,
          orderContext: {
            ...(orderContext as any),
            paymentMethod: "card",
            savedCard: savedCard,
          },
        });
        return;
      }

      throw new Error(chargeRes.message || "Saved card charge was not successful.");
    } catch (err: any) {
      setSubmitting(false);
      setSubmittingType(null);
      console.warn("[PlaceMyOrderCard] Saved card charge failed:", err);

      const isInvalid =
        err?.response?.data?.cardInvalid ||
        err?.message?.includes("invalid") ||
        err?.message?.includes("expired") ||
        err?.message?.includes("No such object");

      if (isInvalid) {
        Alert.alert(
          "Card Expired or Invalid",
          "Your saved card is no longer valid or expired. Would you like to enter another card?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Use Another Card",
              onPress: () => handleUseAnotherCard(),
            },
          ]
        );
      } else {
        Alert.alert(
          "Payment Failed",
          err?.response?.data?.message ||
            err?.message ||
            "Unable to process payment with saved card. You can try with another card.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Use Another Card",
              onPress: () => handleUseAnotherCard(),
            },
          ]
        );
      }
    }
  };

  // ─── 2. USE ANOTHER DEBIT / CREDIT CARD (OPEN GATEWAY) ───────────────────
  const handleUseAnotherCard = async () => {
    if (submitting || isCreatingOrderRef.current) return;
    try {
      setSubmitting(true);
      setSubmittingType("another");

      const description =
        flowType === "review_package"
          ? `Polygon Package Order Payment - ${invoiceNumber || ""}`
          : flowType === "order_confirmation"
          ? `Polygon Order Price Difference - ${invoiceNumber || ""}`
          : "Polygon Order Payment";

      const targetOrderId =
        reviewPayload?.processOrderId ||
        reviewPayload?.orderId ||
        payload?.cartId ||
        orderContext?.cartId ||
        Date.now();

      const session = await adapter.initiatePayment({
        orderId: String(targetOrderId),
        amount: paymentAmount,
        paymentType: "order",
        itemsDescription: description,
        saveCard: true,
      });

      setCheckoutSession(session);
      setCheckoutModalVisible(true);
    } catch (err: any) {
      console.error("[PlaceMyOrderCard] Launch checkout error:", err);
      Alert.alert(
        "Gateway Error",
        err?.response?.data?.message ||
          err?.message ||
          "Could not launch card payment sheet. Please try again."
      );
    } finally {
      setSubmitting(false);
      setSubmittingType(null);
    }
  };

  // ─── 3. CHECKOUT MODAL SUCCESS CALLBACK (NEW CARD) ───────────────────────
  const handleCheckoutSuccess = async (orderId: string, cardHolder?: string) => {
    if (isCreatingOrderRef.current) return;
    isCreatingOrderRef.current = true;

    setCheckoutModalVisible(false);
    setSubmitting(true);
    setSubmittingType("another");

    try {
      if (checkoutSession?.sessionId) {
        await adapter.syncCheckout(checkoutSession.sessionId, cardHolder).catch(() => null);
      }

      // Flow 1: Review Package
      if (flowType === "review_package") {
        await orderService.confirmPackageReview({
          ...reviewPayload,
          isPaid: 1,
          checkoutSessionId: checkoutSession?.sessionId ?? null,
        });
        setSubmitting(false);
        Alert.alert(
          "Successful!",
          `Your order ${invoiceNumber || ""}\nreviewed and dispatched successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Home" }],
                });
              },
            },
          ]
        );
        return;
      }

      // Flow 2: Order Confirmation
      if (flowType === "order_confirmation") {
        await orderService.confirmOrderWithLivePrices({
          ...reviewPayload,
          isPaid: 1,
        });
        setSubmitting(false);
        Alert.alert(
          "Successful!",
          `Your order ${invoiceNumber || ""}\nconfirmed successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Home" }],
                });
              },
            },
          ]
        );
        return;
      }

      // Flow 3: Standard Checkout
      await orderRecoveryService.savePendingOrder({
        correlationId: orderRecoveryService.generateCorrelationId(),
        flowType: "checkout",
        amount: paymentAmount,
        paymentMethod: "card",
        isPaid: true,
        timestamp: Date.now(),
        payload,
      });

      const finalPayload = {
        ...payload,
        checkoutSessionId: checkoutSession?.sessionId ?? null,
      };

      const response = await orderService.createOrder(finalPayload);
      if (!response.data || !response.data.status || !response.data.data) {
        throw new Error(response.data?.message || "Failed to finalize order");
      }

      const orderData = response.data.data;
      await orderRecoveryService.clearPendingOrder();
      dispatch(clearCart());
      setSubmitting(false);

      navigation.navigate("OrderConfirmed", {
        orderId: orderData.orderId,
        processOrderId: orderData.processOrderId,
        invoiceNumber: orderData.invoiceNumber,
        total: orderData.total || totalAmount,
        couponValue: couponVal,
        orderContext: {
          ...(orderContext as any),
          paymentMethod: "card",
        },
      });
    } catch (err: any) {
      setSubmitting(false);
      setSubmittingType(null);
      isCreatingOrderRef.current = false;
      console.error("[PlaceMyOrderCard] Create order error:", err);
      Alert.alert(
        "Order Creation Notice",
        err?.response?.data?.message ||
          err?.message ||
          "Payment was received, but order finalization encountered a delay. Please check Order History."
      );
    }
  };

  const handleCheckoutCancel = async () => {
    setCheckoutModalVisible(false);

    let failureReason = "";
    if (checkoutSession?.sessionId) {
      try {
        const syncRes = await adapter.syncCheckout(checkoutSession.sessionId);
        const payment = syncRes?.checkout?.payment || syncRes?.payment || {};
        if (payment.failureMessage) {
          failureReason = payment.failureMessage;
        } else if (payment.failure?.reason) {
          failureReason = payment.failure.reason;
        }
      } catch {}
    }

    if (failureReason) {
      Alert.alert(
        "Card Payment Unsuccessful",
        `${failureReason} Please verify your card details or try with another card.`
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 20),
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "#FFFFFF",
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#000000",
          }}
        >
          {flowType === "review_package" || flowType === "order_confirmation"
            ? "Confirm Order Payment"
            : "Place My Order"}
        </Text>

        {/* Empty balancing spacer */}
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
      >
        {/* ─── ONLY 1 CARD NOTICE BADGE ─────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F1F5F9",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignSelf: "center",
            marginBottom: 20,
            gap: 6,
          }}
        >
          <Ionicons name="information-circle" size={17} color="#94A3B8" />
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              fontWeight: "500",
            }}
          >
            Only 1 card can be saved at a time.
          </Text>
        </View>

        {/* ─── CREDIT CARD GRAPHIC ──────────────────────────────────────── */}
        <View
          style={{
            width: "100%",
            height: 205,
            borderRadius: 24,
            backgroundColor: "#161F2E",
            padding: 24,
            justifyContent: "space-between",
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 14,
            elevation: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle curved background overlay circle for card texture */}
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(255, 255, 255, 0.04)",
            }}
          />

          {/* TOP ROW: Gold Chip & Contactless Icon */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Gold Chip Component */}
            <View
              style={{
                width: 44,
                height: 32,
                borderRadius: 6,
                backgroundColor: "#E5B94C",
                borderWidth: 1,
                borderColor: "#C59B27",
                padding: 3,
                justifyContent: "center",
                position: "relative",
              }}
            >
              <View
                style={{
                  height: 1,
                  backgroundColor: "#9A7513",
                  width: "100%",
                  marginBottom: 4,
                }}
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: "#9A7513",
                  width: "100%",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: 14,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: "#9A7513",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: 14,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: "#9A7513",
                }}
              />
            </View>

            {/* Contactless symbol •)) */}
            <FontAwesome6
              name="wifi"
              size={18}
              color="#FFFFFF"
              style={{ transform: [{ rotate: "90deg" }] }}
            />
          </View>

          {/* MIDDLE ROW: Card Number */}
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#94A3B8",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              CARD NUMBER
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#FFFFFF",
                letterSpacing: 3,
              }}
            >
              ••••    ••••    ••••    {cardLast4}
            </Text>
          </View>

          {/* BOTTOM ROW: Card Holder & Expires */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#94A3B8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                CARD HOLDER
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                {cardHolderName}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#94A3B8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                EXPIRES
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                {expiryMonth}/{expiryYear}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── GREEN PCI-DSS ENCRYPTION NOTICE ─────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#E8F8EE",
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 16,
            gap: 12,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: "#D1F2DD",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#22C55E",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>

          <Text
            style={{
              fontSize: 12.5,
              color: "#166534",
              fontWeight: "600",
              flex: 1,
              lineHeight: 18,
            }}
          >
            Verified PCI-DSS compliant 256-bit encryption. Safe, fast, and secure.
          </Text>
        </View>

        {/* ─── PRIMARY BUTTON: USE SAVED DEBIT / CREDIT CARD ───────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleUseSavedCard}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 28,
            backgroundColor: "#000000",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {submitting && submittingType === "saved" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                Charging Saved Card...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Use Saved Debit / Credit Card
            </Text>
          )}
        </TouchableOpacity>

        {/* ─── OR DIVIDER ──────────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#000000",
            textAlign: "center",
            marginVertical: 18,
          }}
        >
          Or..
        </Text>

        {/* ─── SECONDARY BUTTON: USE ANOTHER DEBIT / CREDIT CARD ────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleUseAnotherCard}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 28,
            backgroundColor: "#FFFFFF",
            borderWidth: 1.5,
            borderColor: "#000000",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {submitting && submittingType === "another" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#000000" size="small" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>
                Opening Payments.lk...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#000000",
              }}
            >
              Use Another Debit / Credit Card
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ─── PAYMENTS.LK CHECKOUT MODAL (FOR ANOTHER CARD) ─────────────── */}
      <PaymentCheckoutModal
        visible={checkoutModalVisible}
        checkoutUrl={checkoutSession?.checkoutUrl || ""}
        orderId={checkoutSession?.orderId || ""}
        amount={paymentAmount}
        sessionId={checkoutSession?.sessionId}
        customerAddress={checkoutSession?.customerAddress}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
        onClose={() => setCheckoutModalVisible(false)}
      />

      {/* ─── FULL SCREEN LOADING OVERLAY WHILE PROCESSING ──────────────── */}
      <Modal
        visible={submitting && !checkoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              paddingVertical: 32,
              paddingHorizontal: 36,
              alignItems: "center",
              minWidth: 230,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <ActivityIndicator size="large" color="#000000" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                fontWeight: "600",
                color: "#000000",
                textAlign: "center",
              }}
            >
              {submittingType === "saved"
                ? "Processing Payment..."
                : "Confirming your order..."}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              Please do not close the app.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PlaceMyOrderCardScreen;
