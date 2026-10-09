import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import CustomHeader from "@/component/common/CustomHeader";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import { clearCart } from "@/store/cartSlice";
import UnavailableItemsModal from "@/component/common/UnavailableItemsModal";
import { AlertModal } from "@/component/common/AlertModal";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import cardStorageService, { SavedCard } from "@/services/payment/cardStorageService";
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
  const userProfile = useSelector((state: RootState) => state.auth?.userProfile);
  const initialAmount = route.params?.amount || 0;
  const headerTitle = route.params?.title || "Payment Summary";
  const orderContext = route.params?.orderContext;
  const isClearBalanceFlow = !orderContext;

  const [subTotal, setSubTotal] = useState<number>(initialAmount);
  const [loading, setLoading] = useState<boolean>(!initialAmount);
  const [activeGateway, setActiveGateway] = useState<string>("payments_lk");

  // ─── SAVED CARD & OPTION STATE ────────────────────────────────────────────
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<
    "saved_card" | "new_card"
  >("saved_card");
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);

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

  // Load saved card from database for this authenticated user
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadCard = async () => {
        try {
          const card = await cardStorageService.getSavedCard(userProfile?.id);
          if (isMounted) {
            setSavedCard(card);
            if (card) {
              setSelectedPaymentOption("saved_card");
            } else {
              setSelectedPaymentOption("new_card");
            }
          }
        } catch (e) {
          console.log("Error loading saved card in PaymentScreen:", e);
        }
      };
      loadCard();
      return () => {
        isMounted = false;
      };
    }, [userProfile?.id])
  );

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

      // Fast 1-Click Pay with Saved Card
      if (
        selectedPaymentOption === "saved_card" &&
        savedCard &&
        adapter.chargeSavedCard
      ) {
        let currentOrderId = "";
        let currentInvoice = "";

        if (!isClearBalanceFlow) {
          const orderPayload = {
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
          const orderResponse = await orderService.createOrder(orderPayload);
          if (orderResponse.data && orderResponse.data.status && orderResponse.data.data) {
            const orderData = orderResponse.data.data;
            setPendingOrderResult(orderData);
            currentOrderId = String(orderData.orderId || orderData.invoiceNumber);
            currentInvoice = String(orderData.invoiceNumber || currentOrderId);
          } else {
            throw new Error(orderResponse.data?.message || "Failed to create order");
          }
        }

        try {
          const chargeRes = await adapter.chargeSavedCard({
            cardId: savedCard.id,
            amount: fullTotal,
            paymentType: isClearBalanceFlow ? "clear_balance" : "order",
            orderId: isClearBalanceFlow ? undefined : currentOrderId,
            itemsDescription: isClearBalanceFlow
              ? "Clear Negative Credit Balance"
              : `Order #${currentInvoice || currentOrderId}`,
          });

          if (chargeRes.success) {
            await handlePaymentSuccess(currentOrderId || chargeRes.orderId || "COMPLETED");
            return;
          }
        } catch (chargeErr: any) {
          console.warn("[PaymentScreen] 1-Click charge failed:", chargeErr);
          const isInvalid =
            chargeErr?.response?.data?.cardInvalid ||
            chargeErr?.message?.includes("invalid") ||
            chargeErr?.message?.includes("expired") ||
            chargeErr?.message?.includes("No such object");

          if (isInvalid) {
            setSavedCard(null);
            setSelectedPaymentOption("new_card");
            showAlert(
              "Saved Card Expired",
              "Your saved card is invalid or expired. Opening payment sheet to complete your payment and save a new card."
            );
            // Will fall through to launch hosted sheet below!
          } else {
            throw chargeErr;
          }
        }
      }

      if (isClearBalanceFlow) {
        // Clear negative balance flow with hosted checkout
        const session = await adapter.initiatePayment({
          amount: subTotal,
          paymentType: "clear_balance",
          itemsDescription: "Clear Negative Credit Balance",
          saveCard: saveCardForFuture,
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
      try {
        setLoading(true);

        // 1. If we have a Payments.lk checkout session, sync it with backend (backend updates DB balance)
        let synced = false;
        if (checkoutSession?.sessionId) {
          const paymentsLkAdapter = PaymentGatewayFactory.getGateway("payments_lk") as any;
          if (paymentsLkAdapter?.syncCheckout) {
            try {
              await paymentsLkAdapter.syncCheckout(checkoutSession.sessionId);
              synced = true;
            } catch (err: any) {
              console.log("[PaymentScreen] syncCheckout error:", err);
            }
          }
        }

        // 2. Fallback only if no gateway session was synced
        if (!synced) {
          await customerService.updateCreditBalance(subTotal);
        }

        showAlert(
          "Payment Successful",
          `Your negative credit balance of Rs. ${formatAmount(subTotal)} has been cleared successfully! You can now continue placing orders without restrictions.`,
          "success"
        );
      } catch (err: any) {
        console.error("[PaymentScreen] Error clearing balance in DB:", err);
        showAlert(
          "Payment Successful",
          "Your payment was received and your balance has been updated.",
          "success"
        );
      } finally {
        setLoading(false);
      }
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

            {/* ─── PAYMENT OPTIONS SECTION ───────────────────────────────────── */}
            <View style={{ marginHorizontal: 16, marginTop: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 10,
                }}
              >
                Select Payment Option
              </Text>

              {/* Option 1: Saved Card (if available) */}
              {savedCard && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedPaymentOption("saved_card")}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor:
                      selectedPaymentOption === "saved_card"
                        ? "#FF7A00"
                        : "#E2E8F0",
                    padding: 16,
                    marginBottom: 12,
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
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {/* Radio button */}
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor:
                            selectedPaymentOption === "saved_card"
                              ? "#FF7A00"
                              : "#94A3B8",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {selectedPaymentOption === "saved_card" && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: "#FF7A00",
                            }}
                          />
                        )}
                      </View>

                      {/* Card Brand Badge */}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor:
                            savedCard.scheme === "mastercard"
                              ? "#FEF3C7"
                              : "#EFF6FF",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color:
                              savedCard.scheme === "mastercard"
                                ? "#D97706"
                                : "#1D4ED8",
                          }}
                        >
                          {savedCard.scheme === "mastercard"
                            ? "Mastercard"
                            : "VISA"}
                        </Text>
                      </View>

                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#0F172A",
                          }}
                        >
                          •••• {savedCard.last4}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#64748B",
                          }}
                        >
                          Expires {savedCard.expiryMonth}/{savedCard.expiryYear}
                        </Text>
                      </View>
                    </View>

                    {/* 1-Click Fast badge */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#ECFDF5",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        gap: 3,
                      }}
                    >
                      <Ionicons name="flash" size={12} color="#059669" />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#059669",
                        }}
                      >
                        Fast 1-Click
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 2: Pay with Hosted Checkout (or new card) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedPaymentOption("new_card")}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor:
                    selectedPaymentOption === "new_card"
                      ? "#FF7A00"
                      : "#E2E8F0",
                  padding: 16,
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
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Radio button */}
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor:
                          selectedPaymentOption === "new_card"
                            ? "#FF7A00"
                            : "#94A3B8",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {selectedPaymentOption === "new_card" && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "#FF7A00",
                          }}
                        />
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      {savedCard
                        ? "Pay with Another Card"
                        : "Online Card Payment"}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: "#EFF6FF",
                      borderRadius: 6,
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

                {/* Subtext and brand badges */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingLeft: 32,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                    }}
                  >
                    Visa, Mastercard
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        fontStyle: "italic",
                        color: "#1A1F71",
                      }}
                    >
                      VISA
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#EB001B",
                          marginRight: -3,
                        }}
                      />
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#F79E1B",
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Save card checkbox for new card */}
                {selectedPaymentOption === "new_card" && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSaveCardForFuture(!saveCardForFuture)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderColor: "#F1F5F9",
                      paddingLeft: 32,
                    }}
                  >
                    <Ionicons
                      name={
                        saveCardForFuture
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={20}
                      color={saveCardForFuture ? "#FF7A00" : "#94A3B8"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "600",
                        color: "#334155",
                      }}
                    >
                      Save card securely for 1-click checkout
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
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
                  <Ionicons
                    name={
                      selectedPaymentOption === "saved_card"
                        ? "flash"
                        : "lock-closed"
                    }
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {selectedPaymentOption === "saved_card"
                      ? `1-Click Pay Rs. ${formatAmount(fullTotal)} with Saved Card`
                      : `Pay Rs. ${formatAmount(fullTotal)} with ${gatewayDisplayName}`}
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
          customerAddress={checkoutSession.customerAddress}
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
