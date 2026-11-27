import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  BackHandler,
  Modal,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import { CartState } from "@/store/cartSlice";
import CustomHeader from "@/component/common/CustomHeader";
import { PaymentOptionCard } from "@/component/payment/PaymentOptionCard";
import PaymentMethodSummary from "@/component/payment/PaymentMethodSummary";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import productService from "@/services/product/product.service";
import { clearCart } from "@/store/cartSlice";
import CouponModal from "@/component/coupon/CouponModal";
import AppliedCouponCard from "@/component/coupon/AppliedCouponCard";
import UnavailableItemsModal from "@/component/common/UnavailableItemsModal";
import BackConfirmationModal from "@/component/common/BackConfirmationModal";
import cardStorageService, {
  SavedCard,
} from "@/services/payment/cardStorageService";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentsLkAdapter } from "@/services/payment/payments-lk.adapter";
import { getMinDeliveryDate } from "@/component/common/CustomCalendarModal";
import {
  OrderProcessingModal,
  ProcessingStep,
  UnconfirmedStateProps,
} from "@/component/common/OrderProcessingModal";
import { orderRecoveryService } from "@/services/order/orderRecovery.service";

type PaymentMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentMethod"
>;

type PaymentMethodRouteProp = RouteProp<RootStackParamList, "PaymentMethod">;

interface Props {
  navigation: PaymentMethodNavigationProp;
  route: PaymentMethodRouteProp;
}

type PaymentType = "cash" | "card";

let paymentSessionEndTime: number | null = null;

// ─── PAYMENT DUE DATE HELPERS ───────────────────────────────────────────────
// Normal orders: pay-by date = delivery - 3 (18 -> 15)
const NORMAL_GAP_DAYS = 3;
// Wholesale orders: pay-by date = delivery - 2 (20 -> 18)
const WHOLESALE_GAP_DAYS = 2;
// Package orders with isFinalizeImdt = 0: delivery - 2 (18 -> 16)
const PACKAGE_GAP_DAYS = 2;

const CHECKOUT_PROCESSING_STEPS: ProcessingStep[] = [
  { id: "validate", label: "Validating order items & pricing" },
  { id: "payment", label: "Awaiting Payment..." },
  { id: "create", label: "Creating order" },
  { id: "invoice", label: "Finalizing order details" },
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const parseDateOnly = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const s = String(val).trim().replace(/\//g, "-");
  if (s.includes("-")) {
    const parts = s.split("T")[0].split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
  }

  // Handle English date formats like "October 14, 2026" or "Oct 14, 2026"
  const englishMonths: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  const match = s.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (match) {
    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (englishMonths[monthName] !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, englishMonths[monthName], day);
    }
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const PaymentMethod: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const userProfile = useSelector(
    (state: RootState) => state.auth?.userProfile,
  );
  const orderContext = route.params?.orderContext;
  const isNavigatingAwayRef = useRef(false);
  const isOrderFinalizedRef = useRef(false);
  const isSessionExpiredRef = useRef(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const isCreatingOrderRef = useRef(false);
  const checkoutStartedAtRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const sessionExpiredTimeoutRef = useRef<any>(null);
  const [backConfirmVisible, setBackConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [isReconciling, setIsReconciling] = useState(false);
  const [unconfirmedState, setUnconfirmedState] =
    useState<UnconfirmedStateProps | null>(null);

  // Helper to safely clear all timers and session state
  const clearSessionTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (sessionExpiredTimeoutRef.current) {
      clearTimeout(sessionExpiredTimeoutRef.current);
      sessionExpiredTimeoutRef.current = null;
    }
    paymentSessionEndTime = null;
    setIsConfirming(false);
  }, []);

  const handleSessionExpiry = useCallback(() => {
    if (isOrderFinalizedRef.current || isSessionExpiredRef.current) return;
    isSessionExpiredRef.current = true;
    setIsSessionExpired(true);
    isNavigatingAwayRef.current = true;
    setIsConfirming(false);
    setSubmitting(false);

    clearSessionTimers();
    setCheckoutModalVisible(false);
    setCouponModalVisible(false);
    setUnavailableModalVisible(false);
    setBackConfirmVisible(false);
    pendingOrderPayloadRef.current = null;
    setPendingOrderPayload(null);

    Alert.alert(
      "Session Expired",
      "Your payment session has expired. You are being redirected to your cart.",
      [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("MyCart");
          },
        },
      ],
      { cancelable: false },
    );
  }, [navigation, clearSessionTimers]);

  // ─── SAVED CARD & GATEWAY STATE ─────────────────────────────────────────
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [selectedCardOption, setSelectedCardOption] = useState<
    "saved_card" | "new_card"
  >("saved_card");
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null);
  const pendingOrderPayloadRef = useRef<any>(null);

  // Auto-recovery check on mount: check if there was an in-flight paid order that needs reconciliation
  useEffect(() => {
    const checkPendingRecovery = async () => {
      try {
        const pending = await orderRecoveryService.getPendingOrder();
        if (
          pending &&
          pending.isPaid &&
          pending.flowType === "checkout" &&
          Date.now() - pending.timestamp < 10 * 60 * 1000
        ) {
          const check = await orderRecoveryService.reconcileCheckoutOrder(
            pending.amount,
          );
          if (check.reconciled && check.orderData) {
            await orderRecoveryService.clearPendingOrder();
            clearSessionTimers();
            dispatch(clearCart());
            navigation.navigate("OrderConfirmed", {
              orderId: check.orderData.orderId,
              processOrderId: check.orderData.processOrderId,
              invoiceNumber: check.orderData.invoiceNumber,
              total: check.orderData.total || pending.amount,
              couponValue: appliedCoupon?.discount || 0,
              orderContext: {
                ...orderContext,
                paymentMethod: "card",
                savedCard: savedCard,
              },
            });
          }
        }
      } catch (err) {
        console.warn("[PaymentMethod] Error checking pending recovery:", err);
      }
    };
    checkPendingRecovery();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadCard = async () => {
        try {
          const card = await cardStorageService.getSavedCard(userProfile?.id);
          if (isMounted) {
            setSavedCard(card);
            if (card) {
              setSelectedCardOption("saved_card");
            } else {
              setSelectedCardOption("new_card");
            }
          }
        } catch (e) {
          console.log("Error loading saved card in PaymentMethodScreen:", e);
        }
      };
      loadCard();
      return () => {
        isMounted = false;
      };
    }, [userProfile?.id]),
  );

  // ─── 5-MINUTE SESSION TIMER ──────────────────────────────────────────────
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!paymentSessionEndTime || paymentSessionEndTime <= Date.now()) {
      paymentSessionEndTime = Date.now() + 5 * 60 * 1000;
    }
    return Math.max(0, Math.floor((paymentSessionEndTime - Date.now()) / 1000));
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBackPress = () => {
    setBackConfirmVisible(true);
  };

  const getScheduledDeliveryDate = (): Date | null => {
    const deliveryDateRaw =
      orderContext?.checkoutDetails?.deliveryDate ||
      orderContext?.checkoutDetails?.calculatedOrders?.[0]?.date;
    return parseDateOnly(deliveryDateRaw);
  };

  const isEarliestDeliveryDate = (): boolean => {
    // 1. If cart has a package that is not available on the system earliest date
    if (orderContext?.checkoutDetails?.hasPackageUnavailableOnEarliest) {
      return false;
    }

    // 2. If earliest delivery date was explicitly null (no earliest date available)
    if (orderContext?.checkoutDetails?.earliestDeliveryDate === null) {
      return false;
    }

    const scheduledDate = getScheduledDeliveryDate();
    if (!scheduledDate) return false;

    const hasPkg =
      (cartPackages?.length || 0) > 0 || (orderContext?.packageTotal || 0) > 0;
    const alaCarteOnly = !hasPkg;

    const buyerType = userProfile?.buyerType || orderContext?.buyerType;
    const sysEarliestDate = getMinDeliveryDate(buyerType, alaCarteOnly);
    sysEarliestDate.setHours(0, 0, 0, 0);

    return scheduledDate.getTime() === sysEarliestDate.getTime();
  };

  const getPaymentDueText = (): string => {
    const scheduledDate = getScheduledDeliveryDate();
    if (!scheduledDate) return "your scheduled order date";

    const hasPkg =
      (cartPackages?.length || 0) > 0 || (orderContext?.packageTotal || 0) > 0;
    const isPackageFlow = orderContext?.isFinalizeImdt !== 1 && hasPkg;

    const buyerType = userProfile?.buyerType || orderContext?.buyerType;
    const isWholesale = String(buyerType || "").toLowerCase() === "wholesale";

    const offset = isPackageFlow
      ? PACKAGE_GAP_DAYS
      : isWholesale
        ? WHOLESALE_GAP_DAYS
        : NORMAL_GAP_DAYS;
    const due = new Date(scheduledDate);
    due.setDate(due.getDate() - offset);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "today";

    return `${MONTHS_LONG[due.getMonth()]} ${getOrdinal(due.getDate())}`;
  };

  useEffect(() => {
    // Reset finalized and expired flags when entering screen
    isOrderFinalizedRef.current = false;
    isSessionExpiredRef.current = false;
    setIsSessionExpired(false);

    if (!paymentSessionEndTime || paymentSessionEndTime <= Date.now()) {
      paymentSessionEndTime = Date.now() + 5 * 60 * 1000;
    }

    const checkTimer = () => {
      // 1. If order is already completed, navigating away, or expired, do not tick
      if (
        isOrderFinalizedRef.current ||
        isNavigatingAwayRef.current ||
        isSessionExpiredRef.current
      ) {
        return;
      }

      // 2. If Payments.lk checkout modal is currently active, extend timer so customer is not interrupted
      if (checkoutModalVisible) {
        paymentSessionEndTime = Date.now() + 5 * 60 * 1000;
        setRemainingSeconds(300);
        return;
      }

      if (!paymentSessionEndTime) return;
      const diff = Math.max(
        0,
        Math.floor((paymentSessionEndTime - Date.now()) / 1000),
      );
      setRemainingSeconds(diff);

      if (diff <= 0) {
        handleSessionExpiry();
      }
    };

    checkTimer();
    timerIntervalRef.current = setInterval(checkTimer, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (sessionExpiredTimeoutRef.current) {
        clearTimeout(sessionExpiredTimeoutRef.current);
        sessionExpiredTimeoutRef.current = null;
      }
    };
  }, [checkoutModalVisible, handleSessionExpiry]);

  // Handle app resuming from background after sleep/multitasking
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        if (isOrderFinalizedRef.current || isSessionExpiredRef.current) return;
        if (paymentSessionEndTime && paymentSessionEndTime <= Date.now()) {
          setRemainingSeconds(0);
          handleSessionExpiry();
        } else if (paymentSessionEndTime) {
          const diff = Math.max(
            0,
            Math.floor((paymentSessionEndTime - Date.now()) / 1000),
          );
          setRemainingSeconds(diff);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [handleSessionExpiry]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        handleBackPress();
        return true;
      };

      const backSub = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBack,
      );
      return () => {
        backSub.remove();
      };
    }, []),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isNavigatingAwayRef.current || !navigation.isFocused()) {
        return;
      }

      if (e.data.action.type === "GO_BACK" || e.data.action.type === "POP") {
        e.preventDefault();
        handleBackPress();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // ─── COUPON STATE ─────────────────────────────────────────────────────────
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    discount: number;
    isFreeDelivery: boolean;
  } | null>(null);

  const cartProducts = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.products,
  );
  const cartPackages = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.packages,
  );
  const [unavailableModalVisible, setUnavailableModalVisible] = useState(false);

  const formatPrice = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Initial base totals from order context
  const baseTotal = Number(
    route.params?.total || orderContext?.grandTotal || 880,
  );
  const initialDeliveryCharge = orderContext?.deliveryCharge || 0;

  // Adjustments based on coupon
  const effectiveDeliveryCharge = appliedCoupon?.isFreeDelivery
    ? 0
    : initialDeliveryCharge;
  const deliveryFeeDiscount = appliedCoupon?.isFreeDelivery
    ? initialDeliveryCharge
    : 0;
  const couponDiscountAmount = appliedCoupon?.isFreeDelivery
    ? 0
    : appliedCoupon?.discount || 0;

  const totalAmount = Math.max(
    0,
    baseTotal - couponDiscountAmount - deliveryFeeDiscount,
  );

  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [cashLimit, setCashLimit] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>("cash");
  const [useCredit, setUseCredit] = useState(false);

  const isImmediateFinalize = orderContext?.isFinalizeImdt === 1;
  const isExceedCashLimit = cashLimit !== null && totalAmount >= cashLimit;
  const isCashDisabled = isImmediateFinalize || isExceedCashLimit;

  const hasPackageInCart =
    (cartPackages?.length || 0) > 0 || (orderContext?.packageTotal || 0) > 0;

  // isFinalizeImdt = 0 AND has package -> no EPSD check
  const isPackagePayToConfirm = !isImmediateFinalize && hasPackageInCart;

  useEffect(() => {
    const fetchBalanceAndLimit = async () => {
      try {
        const response = await customerService.getAccountDetails();
        if (response.data && response.data.data) {
          const bal = parseFloat(response.data.data.creditBalance || 0);
          setCreditBalance(Math.max(0, bal));

          const userId = response.data.data.id;
          if (userId) {
            try {
              const deliveredRes =
                await orderService.getDeliveredOrdersTotal(userId);
              if (deliveredRes.data && deliveredRes.data.data) {
                const limit = parseFloat(
                  deliveredRes.data.data.creditBalance || 2000,
                );
                setCashLimit(limit);
              }
            } catch (limitErr) {
              console.log(
                "Error loading delivered total / cash limit:",
                limitErr,
              );
              setCashLimit(2000);
            }
          }
        }
      } catch (err) {
        console.log("Error loading account details:", err);
      }
    };
    fetchBalanceAndLimit();
  }, []);

  useEffect(() => {
    if (isCashDisabled) {
      setPaymentMethod("card");
    }
  }, [isCashDisabled]);

  const creditUsed = useCredit ? Math.min(creditBalance, totalAmount) : 0;

  const remainingAfterCredit = totalAmount - creditUsed;

  const paymentAmount = useCredit ? remainingAfterCredit : totalAmount;

  // Fully paid with credit balance: no earliest-date check, order is saved as paid
  const isFullCredit = useCredit && creditUsed > 0 && paymentAmount <= 0;

  const handleCheckoutSuccess = async (orderId: string, cardHolder?: string) => {
    // Prevent double invocation if WebView fires onSuccess multiple times
    if (isCreatingOrderRef.current) return;
    isCreatingOrderRef.current = true;

    // 1. Mark order as finalized immediately & kill the session timer to prevent any expiry alert
    isOrderFinalizedRef.current = true;
    isNavigatingAwayRef.current = true;
    clearSessionTimers();

    setCheckoutModalVisible(false);
    setSubmitting(true);
    setProcessingStage(1); // Payment stage
    setUnconfirmedState(null);
    try {
      if (checkoutSession?.sessionId) {
        const adapter = PaymentGatewayFactory.getGateway(
          "payments_lk",
        ) as PaymentsLkAdapter;
        await adapter.syncCheckout(checkoutSession.sessionId, cardHolder).catch(() => null);
      }

      const payloadToUse =
        pendingOrderPayloadRef.current || pendingOrderPayload;
      if (!payloadToUse) {
        throw new Error(
          "Order details missing. Please contact customer support.",
        );
      }

      // Persist in-flight paid order intent in case connection drops during createOrder
      await orderRecoveryService.savePendingOrder({
        correlationId: orderRecoveryService.generateCorrelationId(),
        flowType: "checkout",
        amount: paymentAmount,
        paymentMethod: "card",
        isPaid: true,
        timestamp: Date.now(),
        payload: payloadToUse,
      });

      setProcessingStage(2); // Creating order on server
      // ── Risk 4-C fix: attach checkoutSessionId so the backend can verify
      //    payment status directly with the gateway instead of trusting isPaid=1 ──
      const finalPayload = {
        ...payloadToUse,
        checkoutSessionId: checkoutSession?.sessionId ?? null,
      };
      const response = await orderService.createOrder(finalPayload);
      if (!response.data || !response.data.status || !response.data.data) {
        throw new Error(response.data?.message || "Failed to finalize order");
      }

      setProcessingStage(3); // Finalizing invoice & delivery
      await orderRecoveryService.clearPendingOrder();
      const orderData = response.data.data;
      clearSessionTimers();
      dispatch(clearCart());
      navigation.navigate("OrderConfirmed", {
        orderId: orderData.orderId,
        processOrderId: orderData.processOrderId,
        invoiceNumber: orderData.invoiceNumber,
        total: orderData.total || paymentAmount,
        couponValue: appliedCoupon?.discount || 0,
        orderContext: {
          ...orderContext,
          paymentMethod: "card",
          savedCard: savedCard,
        },
      });
    } catch (err: any) {
      isOrderFinalizedRef.current = false;
      isNavigatingAwayRef.current = false;
      isCreatingOrderRef.current = false;
      console.error(
        "[PaymentMethod] Order finalization error after payment:",
        err,
      );
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        err?.message?.includes("timeout") ||
        !err?.response ||
        err?.message?.includes("Network Error");

      const isCartMissingOrCleared =
        err?.response?.status === 403 ||
        err?.response?.data?.message?.includes("Cart does not belong") ||
        err?.response?.data?.message?.includes("Active cart not found");

      if (isTimeout || isCartMissingOrCleared) {
        setIsReconciling(true);
        const check = await orderRecoveryService.reconcileCheckoutOrder({
          expectedTotal: paymentAmount,
          checkoutStartedAt: checkoutStartedAtRef.current,
        });
        setIsReconciling(false);

        if (check.reconciled && check.orderData) {
          await orderRecoveryService.clearPendingOrder();
          clearSessionTimers();
          dispatch(clearCart());
          setSubmitting(false);
          navigation.navigate("OrderConfirmed", {
            orderId: check.orderData.orderId,
            processOrderId: check.orderData.processOrderId,
            invoiceNumber: check.orderData.invoiceNumber,
            total: check.orderData.total || paymentAmount,
            couponValue: appliedCoupon?.discount || 0,
            orderContext: {
              ...orderContext,
              paymentMethod: "card",
              savedCard: savedCard,
            },
          });
          return;
        }

        setUnconfirmedState({
          title: "Order Taking Longer Than Expected",
          message:
            "Your payment was received, but server confirmation timed out due to slow network. We saved your transaction securely.",
          isPaid: true,
          onCheckStatus: async () => {
            setIsReconciling(true);
            const statusCheck =
              await orderRecoveryService.reconcileCheckoutOrder({
                expectedTotal: paymentAmount,
                checkoutStartedAt: checkoutStartedAtRef.current,
              });
            setIsReconciling(false);
            if (statusCheck.reconciled && statusCheck.orderData) {
              await orderRecoveryService.clearPendingOrder();
              clearSessionTimers();
              dispatch(clearCart());
              setUnconfirmedState(null);
              setSubmitting(false);
              navigation.navigate("OrderConfirmed", {
                orderId: statusCheck.orderData.orderId,
                processOrderId: statusCheck.orderData.processOrderId,
                invoiceNumber: statusCheck.orderData.invoiceNumber,
                total: statusCheck.orderData.total || paymentAmount,
                couponValue: appliedCoupon?.discount || 0,
                orderContext: {
                  ...orderContext,
                  paymentMethod: "card",
                  savedCard: savedCard,
                },
              });
            } else {
              Alert.alert(
                "Processing in Background",
                "The server is still processing your order. Please check again in a few moments.",
              );
            }
          },
          onRetry: async () => {
            setUnconfirmedState(null);
            handleCheckoutSuccess(orderId);
          },
          onCancel: () => {
            setUnconfirmedState(null);
            setSubmitting(false);
          },
        });
        return;
      }

      setSubmitting(false);
      Alert.alert(
        "Order Processing Issue",
        err?.response?.data?.message ||
        err?.message ||
        "Payment was received, but there was an issue finalizing your order. Please contact customer support.",
      );
    } finally {
      isCreatingOrderRef.current = false;
      if (!unconfirmedState) {
        pendingOrderPayloadRef.current = null;
        setPendingOrderPayload(null);
      }
    }
  };

  const handleCheckoutCancel = async (orderId: string) => {
    setCheckoutModalVisible(false);
    pendingOrderPayloadRef.current = null;
    setPendingOrderPayload(null);

    // Give customer a fresh 5-minute session to select another method or retry
    paymentSessionEndTime = Date.now() + 5 * 60 * 1000;
    setRemainingSeconds(300);

    // Check if Payments.lk returned a specific reason for decline/cancellation
    let failureReason = "";
    if (checkoutSession?.sessionId) {
      try {
        const adapter = PaymentGatewayFactory.getGateway(
          "payments_lk"
        ) as PaymentsLkAdapter;
        const syncRes = await adapter.syncCheckout(checkoutSession.sessionId);
        const payment = syncRes?.checkout?.payment || syncRes?.payment || {};
        if (payment.failureMessage) {
          failureReason = payment.failureMessage;
        } else if (payment.failure?.reason) {
          failureReason = payment.failure.reason;
        }
      } catch { }
    }

    if (failureReason) {
      Alert.alert(
        "Card Payment Unsuccessful",
        `${failureReason} Please verify your card details or try with another card.`
      );
    } else {
      Alert.alert(
        "Payment Cancelled",
        "The card payment was not completed. You can try again whenever you are ready."
      );
    }
  };

  const handleConfirm = async () => {
    // 0. Strict guard against duplicate submissions
    if (isConfirming || (submitting && !unconfirmedState)) return;

    // 1. Strict guard: NEVER proceed or enter payment flow if session is expired or navigating away
    const isExpired =
      isSessionExpired ||
      isSessionExpiredRef.current ||
      isNavigatingAwayRef.current ||
      remainingSeconds <= 0 ||
      (paymentSessionEndTime !== null && paymentSessionEndTime <= Date.now());

    if (isExpired) {
      handleSessionExpiry();
      return;
    }

    checkoutStartedAtRef.current = Date.now();
    setIsConfirming(true);

    // Proactively check availability of items in cart
    const productIds: number[] = (cartProducts || []).map((p: any) => p.id);
    const packageIds: number[] = (cartPackages || []).map((p: any) => p.id);
    if (productIds.length > 0 || packageIds.length > 0) {
      try {
        const availRes = await productService.checkAvailability(
          productIds,
          packageIds,
        );

        if (
          isSessionExpiredRef.current ||
          isNavigatingAwayRef.current ||
          (paymentSessionEndTime !== null &&
            paymentSessionEndTime <= Date.now())
        ) {
          setIsConfirming(false);
          handleSessionExpiry();
          return;
        }

        if (availRes.data && availRes.data.status && availRes.data.data) {
          const { products: pMap, packages: pkgMap } = availRes.data.data;
          const hasUnavailProd = productIds.some(
            (id) => pMap && pMap[id] === false,
          );
          const hasUnavailPkg = packageIds.some(
            (id) => pkgMap && pkgMap[id] === false,
          );
          if (hasUnavailProd || hasUnavailPkg) {
            setIsConfirming(false);
            setUnavailableModalVisible(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Availability check error:", err);
      }
    }

    // Guard: check again before initiating payment
    if (
      isSessionExpiredRef.current ||
      isNavigatingAwayRef.current ||
      (paymentSessionEndTime !== null && paymentSessionEndTime <= Date.now())
    ) {
      setIsConfirming(false);
      handleSessionExpiry();
      return;
    }

    const itemDiscount = orderContext?.discount || 0;
    const isFreeDelivery = Boolean(appliedCoupon?.isFreeDelivery);
    const couponVal = appliedCoupon
      ? appliedCoupon.isFreeDelivery
        ? 0
        : appliedCoupon.discount
      : 0;
    const deliveryChargeToSave = isFreeDelivery ? 0 : effectiveDeliveryCharge;

    if (paymentMethod === "card" && paymentAmount > 0) {
      const isEarliest = isEarliestDeliveryDate();

      if (isEarliest) {
        // Earliest possible date: User pays NOW via payment gateway
        try {
          if (
            isSessionExpiredRef.current ||
            isNavigatingAwayRef.current ||
            (paymentSessionEndTime !== null &&
              paymentSessionEndTime <= Date.now())
          ) {
            setIsConfirming(false);
            handleSessionExpiry();
            return;
          }
          const payload = {
            cartId: orderContext?.cartId || 0,
            paymentMethod: "card",
            grandTotal: totalAmount,
            discountAmount: itemDiscount,
            deliveryCharge: deliveryChargeToSave,
            creditPaid: creditUsed,
            moneyPaid: paymentAmount,
            isPaid: 1,
            amount: totalAmount,
            isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
            checkoutDetails: {
              ...(orderContext?.checkoutDetails || {
                deliveryMethod: orderContext?.deliveryMethod || "home",
              }),
              isCoupon: Boolean(appliedCoupon),
              couponValue: couponVal,
              couponType: appliedCoupon?.type || null,
              couponCode: appliedCoupon?.code || null,
              normalDeliveryCharge: initialDeliveryCharge,
            },
          };

          const adapter = PaymentGatewayFactory.getGateway(
            "payments_lk",
          ) as PaymentsLkAdapter;

          // If user has a saved card, navigate to "Place My Order" screen
          if (savedCard) {
            setIsConfirming(false);
            setSubmitting(false);
            navigation.navigate("PlaceMyOrderCard", {
              orderContext: {
                ...orderContext,
                paymentMethod: "card",
                savedCard: savedCard,
              },
              payload,
              paymentAmount,
              totalAmount,
              couponVal,
              savedCard,
              initialDeliveryCharge,
            });
            return;
          }

          // Option 2: Launch Payments.lk Hosted Modal (When no saved card exists)
          if (
            isSessionExpiredRef.current ||
            isNavigatingAwayRef.current ||
            (paymentSessionEndTime !== null &&
              paymentSessionEndTime <= Date.now())
          ) {
            setIsConfirming(false);
            handleSessionExpiry();
            return;
          }

          // Store order payload in ref/state — order will ONLY be created upon payment success!
          pendingOrderPayloadRef.current = payload;
          setPendingOrderPayload(payload);

          const session = await adapter.initiatePayment({
            amount: paymentAmount,
            paymentType: "order",
            itemsDescription: "Polygon Order Payment",
            saveCard: true,
          });

          setIsConfirming(false);
          setCheckoutSession(session);
          setCheckoutModalVisible(true);
        } catch (err: any) {
          setIsConfirming(false);
          setSubmitting(false);
          console.error("[PaymentMethod] Card payment error:", err);
          Alert.alert(
            "Payment Failed",
            err?.response?.data?.message ||
            err?.message ||
            "Could not process card payment. Please try again or pay with cash.",
          );
        } finally {
          setIsConfirming(false);
          setSubmitting(false);
        }
        return;
      } else {
        // NOT earliest possible date: Do NOT navigate to payment gateway. Confirm order directly with isPaid = 0, amount = 0.0, moneyPaid = 0.0
        if (
          isSessionExpiredRef.current ||
          isNavigatingAwayRef.current ||
          (paymentSessionEndTime !== null &&
            paymentSessionEndTime <= Date.now())
        ) {
          setIsConfirming(false);
          handleSessionExpiry();
          return;
        }
        try {
          setIsConfirming(false);
          setSubmitting(true);
          const payload = {
            cartId: orderContext?.cartId || 0,
            paymentMethod: "card",
            grandTotal: totalAmount,
            discountAmount: itemDiscount,
            deliveryCharge: deliveryChargeToSave,
            creditPaid: creditUsed,
            moneyPaid: 0,
            isPaid: 0,
            amount: 0,
            isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
            checkoutDetails: {
              ...(orderContext?.checkoutDetails || {
                deliveryMethod: orderContext?.deliveryMethod || "home",
              }),
              isCoupon: Boolean(appliedCoupon),
              couponValue: couponVal,
              couponType: appliedCoupon?.type || null,
              couponCode: appliedCoupon?.code || null,
              normalDeliveryCharge: initialDeliveryCharge,
            },
          };

          const response = await orderService.createOrder(payload);
          if (response.data && response.data.status && response.data.data) {
            const orderData = response.data.data;
            isOrderFinalizedRef.current = true;
            isNavigatingAwayRef.current = true;
            clearSessionTimers();
            dispatch(clearCart());
            navigation.navigate("OrderConfirmed", {
              orderId: orderData.orderId,
              processOrderId: orderData.processOrderId,
              invoiceNumber: orderData.invoiceNumber,
              total: orderData.total || totalAmount,
              couponValue: couponVal,
              orderContext: {
                ...(orderContext as any),
                paymentMethod: paymentMethod,
                grandTotal: totalAmount,
                deliveryCharge: deliveryChargeToSave,
                discount: itemDiscount,
                creditPaid: creditUsed,
                moneyPaid: 0,
                appliedCoupon,
                isCoupon: Boolean(appliedCoupon),
                couponValue: couponVal,
                couponDiscount: couponVal,
                couponType: appliedCoupon?.type || null,
                couponCode: appliedCoupon?.code || null,
                isFreeDeliveryCoupon: isFreeDelivery,
                checkoutDetails: {
                  ...(orderContext?.checkoutDetails || {
                    deliveryMethod: orderContext?.deliveryMethod || "home",
                  }),
                  isCoupon: Boolean(appliedCoupon),
                  couponValue: couponVal,
                  couponType: appliedCoupon?.type || null,
                  couponCode: appliedCoupon?.code || null,
                  normalDeliveryCharge: initialDeliveryCharge,
                },
              },
            });
            return;
          } else {
            throw new Error(
              response.data?.message || "Failed to finalize order",
            );
          }
        } catch (err: any) {
          setIsConfirming(false);
          setSubmitting(false);
          console.error("[PaymentMethod] Future card order error:", err);
          const isTimeout =
            err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
          Alert.alert(
            isTimeout ? "Order Processing Delay" : "Order Failed",
            isTimeout
              ? "Your order is taking longer than usual to process. Please check your Order History or contact support before trying again."
              : err?.response?.data?.message ||
              err?.message ||
              "Could not place your order. Please try again.",
          );
        } finally {
          setIsConfirming(false);
          setSubmitting(false);
        }
        return;
      }
    }

    if (
      isSessionExpiredRef.current ||
      isNavigatingAwayRef.current ||
      (paymentSessionEndTime !== null && paymentSessionEndTime <= Date.now())
    ) {
      setIsConfirming(false);
      handleSessionExpiry();
      return;
    }

    try {
      setIsConfirming(false);
      setSubmitting(true);
      setProcessingStage(0); // Validating
      setUnconfirmedState(null);

      // Persist pending order intent
      await orderRecoveryService.savePendingOrder({
        correlationId: orderRecoveryService.generateCorrelationId(),
        flowType: "checkout",
        amount: totalAmount,
        paymentMethod: paymentMethod === "card" ? "card" : "cash",
        isPaid: Boolean(isFullCredit),
        timestamp: Date.now(),
        payload: null,
      });

      setProcessingStage(1); // Payment / Credit
      const payload = {
        cartId: orderContext?.cartId || 0,
        paymentMethod:
          paymentAmount === 0
            ? "card"
            : paymentMethod === "card"
              ? "card"
              : "cash",
        grandTotal: totalAmount,
        discountAmount: itemDiscount,
        deliveryCharge: deliveryChargeToSave,
        creditPaid: creditUsed,
        moneyPaid: paymentAmount,
        // Full credit payment: processorders.isPaid = 1 and amount = total
        ...(isFullCredit ? { isPaid: 1, amount: totalAmount } : {}),
        isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
        checkoutDetails: {
          ...(orderContext?.checkoutDetails || {
            deliveryMethod: orderContext?.deliveryMethod || "home",
          }),
          isCoupon: Boolean(appliedCoupon),
          couponValue: couponVal,
          couponType: appliedCoupon?.type || null,
          couponCode: appliedCoupon?.code || null,
          normalDeliveryCharge: initialDeliveryCharge,
        },
      };

      setProcessingStage(2); // Creating order on server
      const response = await orderService.createOrder(payload);
      if (response.data && response.data.status && response.data.data) {
        setProcessingStage(3); // Finalizing invoice
        await orderRecoveryService.clearPendingOrder();
        isOrderFinalizedRef.current = true;
        isNavigatingAwayRef.current = true;
        clearSessionTimers();
        dispatch(clearCart());
        setSubmitting(false);
        navigation.navigate("OrderConfirmed", {
          orderId: response.data.data.orderId,
          processOrderId: response.data.data.processOrderId,
          invoiceNumber: response.data.data.invoiceNumber,
          total: response.data.data.total,
          couponValue: couponVal,
          orderContext: {
            ...(orderContext as any),
            grandTotal: totalAmount,
            deliveryCharge: deliveryChargeToSave,
            discount: itemDiscount,
            creditPaid: creditUsed,
            moneyPaid: paymentAmount,
            appliedCoupon,
            isCoupon: Boolean(appliedCoupon),
            couponValue: couponVal,
            couponDiscount: couponVal,
            couponType: appliedCoupon?.type || null,
            couponCode: appliedCoupon?.code || null,
            isFreeDeliveryCoupon: isFreeDelivery,
            checkoutDetails: {
              ...(orderContext?.checkoutDetails || {
                deliveryMethod: orderContext?.deliveryMethod || "home",
              }),
              isCoupon: Boolean(appliedCoupon),
              couponValue: couponVal,
              couponType: appliedCoupon?.type || null,
              couponCode: appliedCoupon?.code || null,
            },
            paymentMethod:
              paymentAmount === 0
                ? "Card"
                : paymentMethod === "card"
                  ? "Card"
                  : "Cash",
          },
        });
      } else {
        setSubmitting(false);
        Alert.alert(
          "Order Failed",
          response.data?.message || "Failed to create order. Please try again.",
        );
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        error?.message?.includes("timeout") ||
        !error?.response ||
        error?.message?.includes("Network Error");

      const isCartMissingOrCleared =
        error?.response?.status === 403 ||
        errorData?.message?.includes("Cart does not belong") ||
        errorData?.message?.includes("Active cart not found");

      if (isTimeout || isCartMissingOrCleared) {
        setIsReconciling(true);
        const check = await orderRecoveryService.reconcileCheckoutOrder({
          expectedTotal: totalAmount,
          checkoutStartedAt: checkoutStartedAtRef.current,
        });
        setIsReconciling(false);
        if (check.reconciled && check.orderData) {
          await orderRecoveryService.clearPendingOrder();
          clearSessionTimers();
          dispatch(clearCart());
          setSubmitting(false);
          navigation.navigate("OrderConfirmed", {
            orderId: check.orderData.orderId,
            processOrderId: check.orderData.processOrderId,
            invoiceNumber: check.orderData.invoiceNumber,
            total: check.orderData.total || totalAmount,
            couponValue: couponVal,
            orderContext: {
              ...orderContext,
              paymentMethod: "card",
              savedCard: savedCard,
            },
          });
          return;
        }

        setUnconfirmedState({
          title: "Network Delay Detected",
          message:
            "Your order was submitted, but the network timed out before receiving confirmation. Check status to see if it was placed.",
          isPaid: Boolean(isFullCredit),
          onCheckStatus: async () => {
            setIsReconciling(true);
            const statusCheck =
              await orderRecoveryService.reconcileCheckoutOrder({
                expectedTotal: totalAmount,
                checkoutStartedAt: checkoutStartedAtRef.current,
              });
            setIsReconciling(false);
            if (statusCheck.reconciled && statusCheck.orderData) {
              await orderRecoveryService.clearPendingOrder();
              clearSessionTimers();
              dispatch(clearCart());
              setUnconfirmedState(null);
              setSubmitting(false);
              navigation.navigate("OrderConfirmed", {
                orderId: statusCheck.orderData.orderId,
                processOrderId: statusCheck.orderData.processOrderId,
                invoiceNumber: statusCheck.orderData.invoiceNumber,
                total: statusCheck.orderData.total || totalAmount,
                couponValue: couponVal,
                orderContext: {
                  ...orderContext,
                  paymentMethod: "card",
                  savedCard: savedCard,
                },
              });
            } else {
              Alert.alert(
                "Order Not Found",
                "Your order has not been placed on the server yet. You can retry safely.",
              );
            }
          },
          onRetry: async () => {
            setUnconfirmedState(null);
            setSubmitting(false);
            setIsConfirming(false);
            handleConfirm();
          },
          onCancel: () => {
            setUnconfirmedState(null);
            setSubmitting(false);
          },
        });
        return;
      }

      setIsConfirming(false);
      setSubmitting(false);
      const errorMsg =
        errorData?.message ||
        (Array.isArray(errorData?.details)
          ? errorData.details.join("; ")
          : null) ||
        error?.message ||
        "Failed to place order. Please try again.";
      console.error("Order error in PaymentMethodScreen:", errorMsg, errorData);
      if (errorData?.code === "ITEMS_UNAVAILABLE") {
        setUnavailableModalVisible(true);
      } else {
        Alert.alert("Order Failed", errorMsg);
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* HEADER */}
      <CustomHeader
        title="Select Payment Method"
        navigation={navigation}
        showBackButton
        onBackPress={handleBackPress}
      />

      {/* SCROLL CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingBottom: 16 }}>
          {/* ─── SESSION ACTIVE CARD ──────────────────────────────────────── */}
          <View
            style={{
              marginHorizontal: 15,
              marginTop: 14,
              marginBottom: 4,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: "#FF9114",
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Left Clock Icon */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 22,
                backgroundColor: "#F0F3F6",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <FontAwesome6 name="clock" solid size={23} color="#000000" />
            </View>

            {/* Content & Badge */}
            <View style={{ flex: 1 }}>
              {/* Header row with title & timer badge */}
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
                    fontWeight: "700",
                    color: "#000000",
                  }}
                >
                  Session Active
                </Text>

                <View
                  style={{
                    backgroundColor: "#FF9114",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                      letterSpacing: 0.5,
                    }}
                  >
                    {formatTime(remainingSeconds)}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text
                style={{
                  fontSize: 12.5,
                  color: "#6B7280",
                  lineHeight: 18,
                  marginTop: 4,
                  fontWeight: "400",
                }}
              >
                This page will close in 5 minutes and you will be redirected to
                the cart.
              </Text>
            </View>
          </View>

          {/* ─── APPLY COUPON CARD ────────────────────────────────────────── */}
          {appliedCoupon ? (
            <AppliedCouponCard
              code={appliedCoupon.code}
              type={appliedCoupon.type}
              discount={appliedCoupon.discount}
              isFreeDelivery={appliedCoupon.isFreeDelivery}
              deliveryCharge={initialDeliveryCharge}
              onRemove={() => setAppliedCoupon(null)}
            />
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setCouponModalVisible(true)}
              style={{
                marginHorizontal: 15,
                marginTop: 14,
                marginBottom: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#BAC2C7",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              {/* Left Coupon Image */}
              <Image
                source={require("@/assets/images/order/coupon.webp")}
                style={{
                  width: 44,
                  height: 44,
                  resizeMode: "contain",
                  marginRight: 14,
                }}
              />

              {/* Text Details */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#111111",
                  }}
                >
                  Apply Coupon
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 2,
                    fontWeight: "400",
                  }}
                >
                  Get discount on your order.
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#111111" />
            </TouchableOpacity>
          )}

          {/* DESCRIPTION */}
          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: 13,
              marginTop: 14,
              marginBottom: 16,
            }}
          >
            Choose how you want to pay for this order.
          </Text>

          {/* Total Amount Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginHorizontal: 15,
              marginBottom: 14,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "#F2F2F6",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "#111111",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <FontAwesome6 name="bag-shopping" size={14} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "400",
                  color: "#111111",
                }}
              >
                Total Amount
              </Text>
            </View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#111111",
              }}
            >
              Rs. {formatPrice(totalAmount)}
            </Text>
          </View>

          {/* CREDIT BALANCE */}
          {creditBalance > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setUseCredit(!useCredit)}
              style={{
                marginHorizontal: 15,
                minHeight: 110,
                borderWidth: 1.5,
                borderColor: useCredit ? "#FF9114" : "#E1E7EE",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: useCredit ? "#FFF4E8" : "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: useCredit ? 0.08 : 0.04,
                shadowRadius: 4,
                elevation: 2,
                marginBottom: 14,
              }}
            >
              {/* Badge */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 60,
                  backgroundColor: useCredit ? "#34C759" : "#000000",
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <View
                  style={{ flexDirection: "row", gap: 4, alignItems: "center" }}
                >
                  <FontAwesome6
                    name={useCredit ? "check" : "star"}
                    solid
                    size={11}
                    color="#FFF"
                  />
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 11.5,
                      fontWeight: "600",
                    }}
                  >
                    {useCredit ? "Applied" : "Recommended"}
                  </Text>
                </View>
              </View>

              {/* Check */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: useCredit ? "#FF9114" : "#FFF",
                  borderWidth: useCredit ? 0 : 2,
                  borderColor: "#BAC2C7",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {useCredit && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>

              {/* Content */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 26,
                }}
              >
                {/* Credit Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#FF9114",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <FontAwesome6 name="wallet" solid size={18} color="#FFF" />
                </View>

                {/* Content */}
                <View style={{ flex: 1, paddingRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#111111",
                    }}
                  >
                    Use My Polygon Wallet
                  </Text>

                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      marginTop: 4,
                    }}
                  >
                    Available Balance :{" "}
                    <Text
                      style={{
                        color: useCredit ? "#FF9114" : "#111111",
                        fontWeight: "700",
                      }}
                    >
                      Rs.{" "}
                      {creditBalance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Text>

                  <Text
                    style={{
                      fontSize: 12.5,
                      color: "#6B7280",
                      lineHeight: 17,
                      marginTop: 4,
                    }}
                  >
                    Pay with your Polygon Wallet and pay the rest with cash or
                    card.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* CASH */}
          <PaymentOptionCard
            title="Pay with Cash"
            description="Pay the full amount in cash upon delivery."
            total={paymentAmount}
            icon="money-bill-wave"
            iconColor="#00B83D"
            selected={paymentMethod === "cash"}
            disabled={isCashDisabled}
            onPress={() => setPaymentMethod("cash")}
          />

          <View style={{ height: 12 }} />

          {/* CARD */}
          <PaymentOptionCard
            title="Pay with Card"
            description="Pay the full amount in using your card."
            total={paymentAmount}
            icon="credit-card"
            iconColor="#0788FF"
            selected={paymentMethod === "card"}
            onPress={() => setPaymentMethod("card")}
          />

          {/* CASH UNAVAILABLE BANNER */}
          {isCashDisabled && (
            <View
              style={{
                marginHorizontal: 15,
                marginTop: 14,
                backgroundColor: "#FDE8E8",
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color="#991B1B"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: "#1F2937",
                  lineHeight: 17,
                  fontWeight: "500",
                }}
              >
                {isImmediateFinalize ? (
                  "Immediate Finalization requires card payment."
                ) : (
                  <>
                    Cash payment is not available for orders equal or greater
                    than{" "}
                    <Text style={{ fontWeight: "700", color: "#991B1B" }}>
                      Rs.{" "}
                      {(cashLimit || 2000).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    .
                  </>
                )}
              </Text>
            </View>
          )}

          {!isFullCredit && !isEarliestDeliveryDate() && (
            <View
              style={{
                marginHorizontal: 15,
                marginTop: 14,
                backgroundColor: "#FFF5E9",
                borderWidth: 1,
                borderColor: "#FFD8A8",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#1E293B",
                  marginBottom: 4,
                }}
              >
                Please Note :
              </Text>
              <Text style={{ fontSize: 13, color: "#475569", lineHeight: 19 }}>
                Please review and finalize your order by{" "}
                <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                  {getPaymentDueText()}
                </Text>
                {" "}after receiving your order confirmation. If paying by card or
                using Polygon Wallet to cover the full order total, complete any
                outstanding payments by the deadline.
              </Text>
            </View>
          )}

          {/* SECURE PAYMENT */}
          <View
            style={{
              marginHorizontal: 15,
              marginTop: 20,
              backgroundColor: "#EDFFF2",
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color="#268343" />

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#268343",
                  marginLeft: 6,
                }}
              >
                100% Secure Payments
              </Text>
            </View>

            <Text
              style={{
                fontSize: 12.5,
                color: "#596B5E",
                lineHeight: 17,
                marginTop: 4,
              }}
            >
              Your payment information is safe with us and will be processed
              securely.
            </Text>
          </View>
        </View>

        {/* ─── BOTTOM SUMMARY & BUTTON ──────────────────────────────── */}
        <PaymentMethodSummary
          useCredit={useCredit}
          creditUsed={creditUsed}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          totalAmount={totalAmount}
          submitting={submitting}
          loading={isConfirming}
          disabled={isSessionExpired || remainingSeconds <= 0}
          onConfirm={handleConfirm}
        />
      </ScrollView>

      {/* ─── COUPON MODAL ──────────────────────────────────────────────── */}
      <CouponModal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        onApplyCoupon={(couponResult) => {
          setAppliedCoupon(couponResult);
        }}
        deliveryMethod={orderContext?.deliveryMethod || "home"}
        cartTotal={Math.max(
          0,
          (orderContext?.packageTotal || 0) +
          (orderContext?.productTotal || 0) -
          (orderContext?.discount || 0),
        )}
        cartId={orderContext?.cartId}
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

      {/* ─── GO BACK CONFIRMATION MODAL ─────────────────────────────────── */}
      <BackConfirmationModal
        visible={backConfirmVisible}
        title="Are you sure you want to go back?"
        message={`Going back will cause you to lose all your\ncheckout and payment details.\nAre you sure you want to go back?`}
        confirmLabel="Yes, Go Back"
        cancelLabel="No, Stay on the page"
        onConfirm={() => {
          setBackConfirmVisible(false);
          isNavigatingAwayRef.current = true;
          clearSessionTimers();
          navigation.navigate("MyCart");
        }}
        onCancel={() => {
          setBackConfirmVisible(false);
        }}
      />

      {/* ─── PAYMENTS.LK HOSTED CHECKOUT MODAL ───────────────────────── */}
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

      {/* ─── FULL SCREEN LOADING CONFIRMATION ──────────────────────────── */}
      <Modal
        visible={(submitting || isConfirming) && !checkoutModalVisible && !unconfirmedState}
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
              {paymentMethod === "card" &&
                paymentAmount > 0 &&
                (isEarliestDeliveryDate())
                ? "Awaiting Payment..."
                : "Confirming your order..."}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: "400",
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              Please do not close the app.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ─── ENHANCED ORDER PROCESSING MODAL (PHASE 2 & PHASE 3) ───────────── */}
      <OrderProcessingModal
        visible={submitting}
        currentStepIndex={processingStage}
        title="Processing Your Order"
        isReconciling={isReconciling}
        unconfirmedState={unconfirmedState}
        slowThresholdSeconds={5}
      />
    </View>
  );
};

export default PaymentMethod;
