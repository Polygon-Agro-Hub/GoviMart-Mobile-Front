import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
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
import { AlertModal } from "@/component/common/AlertModal";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import apiClient from "@/services/config-service/axio-config";
import { ENDPOINTS } from "@/services/config-service/endpoints";
import { getAuthHeader } from "@/services/config-service/auth-header";

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
  const [activeGateway, setActiveGateway] = useState<string>("payments_lk");

  // ─── CHECKOUT MODAL STATE ─────────────────────────────────────────────────
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [pendingOrderResult, setPendingOrderResult] = useState<{
    orderId: any;
    invoiceNumber: any;
    total: any;
  } | null>(null);

  // ─── ALERT MODAL STATE ────────────────────────────────────────────────────
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" = "error"
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [unavailableModalVisible, setUnavailableModalVisible] = useState(false);

  // Fetch active gateway configuration from backend
  useEffect(() => {
    const fetchActiveGateway = async () => {
      try {
        const headers = await getAuthHeader();
        const res = await apiClient.get(ENDPOINTS.PAYMENT.ACTIVE_GATEWAY, {
          headers,
        });
        if (res.data?.status && res.data?.data?.activeGateway) {
          setActiveGateway(res.data.data.activeGateway);
        }
      } catch (err) {
        // Fallback to default payments_lk
        setActiveGateway("payments_lk");
      }
    };
    fetchActiveGateway();
  }, []);

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

  const fullTotal = subTotal;

  const formatAmount = (amt: number) => {
    return amt.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ─── EXECUTE PAYMENT INITIATION ───────────────────────────────────────────
  const handleExecutePayment = async () => {
    try {
      setSubmitting(true);

      const adapter = PaymentGatewayFactory.getAdapter(activeGateway as any);

      if (isClearBalanceFlow) {
        // Clear negative balance flow
        const session = await adapter.initiatePayment({
          amount: subTotal,
          paymentType: "clear_balance",
          itemsDescription: "Clear Negative Credit Balance",
        });

        setCheckoutSession(session);
        setCheckoutModalVisible(true);
      } else {
        // Order flow: create pending order first, then launch payment session
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
          const orderData = response.data.data;
          setPendingOrderResult(orderData);

          const session = await adapter.initiatePayment({
            orderId: String(orderData.orderId || orderData.invoiceNumber),
            amount: fullTotal,
            paymentType: "order",
            itemsDescription: `Order #${
              orderData.invoiceNumber || orderData.orderId
            }`,
          });

          setCheckoutSession(session);
          setCheckoutModalVisible(true);
        } else {
          showAlert(
            "Order Creation Failed",
            response.data?.message ||
              "Could not initialize order for payment. Please try again."
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
          "Payment initiation failed. Please try again.";
        showAlert("Payment Error", errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CHECKOUT MODAL HANDLERS ─────────────────────────────────────────────
  const handlePaymentSuccess = async (orderId: string) => {
    setCheckoutModalVisible(false);

    if (isClearBalanceFlow) {
      showAlert(
        "Payment Successful",
        "Your negative credit balance has been cleared successfully! You can now continue placing orders without restrictions.",
        "success"
      );
    } else {
      dispatch(clearCart());
      navigation.navigate("OrderConfirmed", {
        orderId: pendingOrderResult?.orderId || orderId,
        invoiceNumber: pendingOrderResult?.invoiceNumber || "",
        total: pendingOrderResult?.total || fullTotal,
        couponValue: orderContext?.couponValue,
        orderContext,
      });
    }
  };

  const handlePaymentCancel = (orderId: string) => {
    setCheckoutModalVisible(false);
    showAlert(
      "Payment Cancelled",
      "The payment was not completed. You can try again whenever you are ready."
    );
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertType === "success" && isClearBalanceFlow) {
      navigation.goBack();
    }
  };

  const gatewayDisplayName =
    activeGateway === "payhere" ? "PayHere" : "Payments.lk";

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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* ─── PAYMENT SUMMARY CARD ────────────────────────────────────── */}
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: "#F8FAFC",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                padding: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 14,
                }}
              >
                Payment Summary
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    color: "#64748B",
                    fontWeight: "500",
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
                  backgroundColor: "#E2E8F0",
                  marginVertical: 10,
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
                    fontSize: 20,
                    fontWeight: "800",
                    color: "#FF8A00",
                  }}
                >
                  Rs. {formatAmount(fullTotal)}
                </Text>
              </View>
            </View>

            {/* ─── GATEWAY DETAILS CARD ───────────────────────────────────── */}
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                padding: 18,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons name="card" size={20} color="#FF8A00" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Payment Method
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: "#EFF6FF",
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "#1D4ED8",
                    }}
                  >
                    {gatewayDisplayName}
                  </Text>
                </View>
              </View>

              {/* Supported Payment Badges */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {["VISA", "Mastercard", "LankaQR", "Amex"].map((brand) => (
                  <View
                    key={brand}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      backgroundColor: "#F1F5F9",
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#334155",
                      }}
                    >
                      {brand}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 12.5,
                  color: "#64748B",
                  lineHeight: 18,
                }}
              >
                You will be redirected to the official 3D Secure hosted payment
                page powered by{" "}
                <Text style={{ fontWeight: "600", color: "#334155" }}>
                  {gatewayDisplayName}
                </Text>
                . Card numbers are never stored on your device.
              </Text>
            </View>

            {/* ─── SECURITY BANNER ────────────────────────────────────────── */}
            <View
              style={{
                backgroundColor: "#EDFFF2",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginHorizontal: 16,
                marginTop: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "#C6F6D5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="shield-checkmark" size={17} color="#16A34A" />
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
                Verified PCI-DSS compliant 256-bit encryption. Safe, fast, and
                secure.
              </Text>
            </View>
          </ScrollView>

          {/* ─── BOTTOM SUBMIT BUTTON ─────────────────────────────────────── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 30 : 16,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderColor: "#F1F5F9",
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
                    Pay Rs. {formatAmount(fullTotal)} with {gatewayDisplayName}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── PAYMENT CHECKOUT MODAL (Payments.lk / PayHere) ──────────────── */}
      {checkoutSession && (
        <PaymentCheckoutModal
          visible={checkoutModalVisible}
          gatewayName={checkoutSession.gateway}
          checkoutUrl={checkoutSession.checkoutUrl}
          postBody={checkoutSession.postBody}
          orderId={String(checkoutSession.orderId)}
          amount={checkoutSession.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onClose={() => setCheckoutModalVisible(false)}
        />
      )}

      {/* ─── ALERT MODAL ──────────────────────────────────────────────────── */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
        autoClose={false}
        showOkButton={true}
        okButtonText={
          alertType === "success" && isClearBalanceFlow
            ? "Back to Profile"
            : "OK"
        }
      />

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
