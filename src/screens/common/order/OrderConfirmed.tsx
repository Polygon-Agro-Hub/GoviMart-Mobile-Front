import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { SummaryRow } from "@/component/order/SummaryRow";
import LoadingPage from "@/component/common/LoadingPage";
import { AlertModal } from "@/component/common/AlertModal";
import orderService from "@/services/order/order.service";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import cardStorageService, { SavedCard } from "@/services/payment/cardStorageService";
import apiClient from "@/services/config-service/axio-config";
import { ENDPOINTS } from "@/services/config-service/endpoints";
import { getAuthHeader } from "@/services/config-service/auth-header";

// NOTE: add  OrderConfirmation: { orderId: number }  to RootStackParamList
type OrderConfirmationNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OrderConfirmation"
>;
type OrderConfirmationRouteProp = RouteProp<
  RootStackParamList,
  "OrderConfirmation"
>;

interface Props {
  navigation: OrderConfirmationNavigationProp;
  route: OrderConfirmationRouteProp;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-08-04 05:30:00" -> "August 04, 2026" (reads digits literally, no TZ shift)
const formatLongDate = (raw: any): string => {
  if (!raw) return "N/A";
  const str = raw instanceof Date ? raw.toISOString() : String(raw);
  const m = str.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (!m) return "N/A";
  return `${MONTHS_LONG[parseInt(m[2], 10) - 1]} ${m[3]}, ${m[1]}`;
};

// "July 20, 2026" and "11:00 AM" from a created date
const formatPlacedAt = (raw: any): { date: string; time: string } => {
  if (!raw) return { date: "", time: "" };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    time: d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const formatAmount = (amount: number | string) => {
  const n =
    typeof amount === "number"
      ? amount
      : parseFloat(
          String(amount || "")
            .replace(/Rs\.?/gi, "")
            .replace(/LKR/gi, "")
            .replace(/,/g, "")
            .trim(),
        ) || 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const num = (v: any) => parseFloat(String(v ?? 0)) || 0;

// Fixed service fee for orderApp = "Dash" AND isPackage = 0 (must match DASH_SERVICE_FEE on the server)
const DASH_SERVICE_FEE = 180;

// Same rules as the backend (isCardPayment in package-review.dao.js)
const detectPayment = (order: any) => {
  const m = String(order?.paymentMethod || "").trim().toLowerCase();
  const paid =
    Number(order?.isPaid) === 1 ||
    order?.isPaid === true ||
    String(order?.isPaid) === "1";
  const hasCard = /card|payhere|online/.test(m);
  const hasCash = /cash|cod/.test(m);
  const hasCredit = m.includes("credit");
  const isCard = hasCard || (paid && !hasCash && !hasCredit);
  return { m, paid, isCard, isCash: hasCash, hasCredit };
};

// ─── CARD BRAND BADGE ────────────────────────────────────────────────────────
const CardBrand: React.FC<{ brand?: string }> = ({ brand }) => {
  const b = (brand || "").toLowerCase();
  if (b.includes("visa")) {
    return (
      <Text
        style={{
          fontSize: 14,
          fontWeight: "900",
          fontStyle: "italic",
          color: "#1A1F71",
          marginRight: 8,
        }}
      >
        VISA
      </Text>
    );
  }
  // Mastercard (default)
  return (
    <View
      style={{
        width: 22,
        height: 14,
        marginRight: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: "#EB001B",
        }}
      />
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: "#F79E1B",
          marginLeft: -6,
          opacity: 0.95,
        }}
      />
    </View>
  );
};

// ─── SCHEDULE TILE ───────────────────────────────────────────────────────────
const ScheduleTile: React.FC<{
  icon: "calendar" | "clock";
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F1F1F5",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    }}
  >
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
      }}
    >
      <FontAwesome6
        name={icon === "calendar" ? "calendar-days" : "clock"}
        size={10}
        color="#FFF"
      />
    </View>
    <View>
      <Text style={{ fontSize: 11, color: "#747990" }}>{label}</Text>
      <Text
        style={{ fontSize: 12, fontWeight: "600", color: "#111", marginTop: 1 }}
      >
        {value}
      </Text>
    </View>
  </View>
);

const Divider: React.FC<{ my?: number }> = ({ my = 8 }) => (
  <View style={{ height: 1, backgroundColor: "#E1E7EE", marginVertical: my }} />
);

// ─── SCREEN ──────────────────────────────────────────────────────────────────
const OrderConfirmation: React.FC<Props> = ({ navigation, route }) => {
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState<any>(null);
  const [packagesTotal, setPackagesTotal] = useState(0);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsDiscount, setItemsDiscount] = useState(0);
  const [hasLiveItemPrices, setHasLiveItemPrices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"confirm" | "cancel" | null>(
    null,
  );
  // Recalculated total (today's marketplace prices) sent to the confirm call.
  const newTotalRef = useRef<number | null>(null);

  const [rawPackagesData, setRawPackagesData] = useState<any[]>([]);
  const [rawItemsData, setRawItemsData] = useState<any[]>([]);

  // ── Success modal state ──────────────────────────────────────────────────
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successInvoiceNo, setSuccessInvoiceNo] = useState("");

  // True from the moment the gateway reports success until the confirm API
  // finishes. Kept in a ref too so the gateway modal's onClose (which fires
  // right after onSuccess) can't reset the loading state mid-confirm.
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const paymentProcessingRef = useRef(false);
  const startPaymentProcessing = () => {
    paymentProcessingRef.current = true;
    setPaymentProcessing(true);
  };
  const stopPaymentProcessing = () => {
    paymentProcessingRef.current = false;
    setPaymentProcessing(false);
  };

  const userProfile = useSelector((state: RootState) => state.auth.userProfile);

  // ── Payment Gateway & Saved Card State ───────────────────────────────────
  const [activeGateway, setActiveGateway] = useState<string>("payments_lk");
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [pendingConfirmPayload, setPendingConfirmPayload] = useState<{
    orderId: string | number;
    processOrderId?: string | number;
    newTotal?: number;
    isPaid?: number;
  } | null>(null);

  // Fetch active payment gateway
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
      } catch {
        setActiveGateway("payments_lk");
      }
    };
    fetchActiveGateway();
  }, []);

  // Fetch saved card for 1-click charge
  useEffect(() => {
    let isMounted = true;
    const loadCard = async () => {
      try {
        const card = await cardStorageService.getSavedCard(userProfile?.id);
        if (isMounted) setSavedCard(card);
      } catch {}
    };
    loadCard();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [orderRes, packagesRes, itemsRes] = await Promise.all([
          orderService.getOrderById(orderId),
          orderService.getOrderPackages(orderId),
          orderService.getOrderAdditionalItems(orderId),
        ]);

        if (orderRes.data?.status) {
          setOrder(orderRes.data.order || orderRes.data.data || orderRes.data);
        }

        if (packagesRes.data?.status) {
          setRawPackagesData(packagesRes.data.data || []);
          // one package may appear on several rows -> group by id like OrderDetails
          const seen = new Map<string, { price: number; qty: number }>();
          (packagesRes.data.data as any[]).forEach((p) => {
            const key = String(p.packageId || p.displayName);
            const price =
              typeof p.priceNum === "number"
                ? p.priceNum
                : num(String(p.productPrice).replace(/Rs\.?|,/gi, ""));
            const qty = parseFloat(p.packageQty || p.qty || p.quantity) || 1;
            const ex = seen.get(key);
            if (ex) ex.qty += qty;
            else seen.set(key, { price, qty });
          });
          let total = 0;
          seen.forEach((v) => (total += v.price * v.qty));
          setPackagesTotal(total);
        }

        if (itemsRes.data?.status) {
          const items = (itemsRes.data.data || []) as any[];
          setRawItemsData(items);

          // ONLY CURRENT MARKETPLACE VALUES ARE USED.
          // If today normalPrice == discountedPrice, discount is 0.
          let currentGrossTotal = 0;
          let currentDiscountTotal = 0;
          let live = false;

          items.forEach((it) => {
            const qty = parseFloat(it.qty) || 1;
            const unit = String(it.unit || "kg").toLowerCase();
            const qtyInKg = unit === "g" ? qty / 1000 : qty;

            const mktNormal = parseFloat(it.marketNormalPrice) || 0;
            const mktDisc = parseFloat(it.marketDiscountedPrice) || 0;

            if (mktNormal > 0 || mktDisc > 0) {
              live = true;
              const currentNormalPerKg = mktNormal > 0 ? mktNormal : mktDisc;
              const currentNetPerKg =
                mktDisc > 0 ? mktDisc : currentNormalPerKg;

              const lineGross = currentNormalPerKg * qtyInKg;
              const lineNet = currentNetPerKg * qtyInKg;

              const lineDiscount =
                currentNormalPerKg > currentNetPerKg
                  ? Math.max(0, lineGross - lineNet)
                  : 0;

              currentGrossTotal += lineGross;
              currentDiscountTotal += lineDiscount;
            } else {
              currentGrossTotal += num(it.price);
            }
          });

          setItemsTotal(currentGrossTotal);
          setItemsDiscount(currentDiscountTotal);
          setHasLiveItemPrices(live);
        }
      } catch (err) {
        console.error("Error fetching order confirmation:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  // ─── loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <CustomHeader
          showBackButton
          navigation={navigation}
          title="Order Confirmation"
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingPage message="Loading Order..." fullScreen={false} />
        </View>
      </View>
    );
  }

  // ─── derived values ────────────────────────────────────────────────────────
  const invoiceNo =
    order?.invoiceNo || order?.invNo || order?.invoiceNumber || "N/A";
  const placed = formatPlacedAt(order?.createdAt);

  const isPickup =
    (order?.delivaryMethod || order?.deliveryType || "").toUpperCase() ===
    "PICKUP";

  const scheduleDate = formatLongDate(order?.sheduleDate);
  const scheduleTime =
    String(order?.sheduleTime || order?.scheduleTime || "").trim() || "N/A";

  const isCouponApplied = Number(order?.isCoupon) === 1;

  const isFreeDeliveryCoupon = Boolean(
    isCouponApplied &&
      order?.couponType &&
      (String(order.couponType).toLowerCase().includes("free") ||
        String(order.couponType).toLowerCase().includes("delivery")),
  );

  const productDiscount = hasLiveItemPrices
    ? itemsDiscount
    : num(order?.discount);
  const couponDiscount =
    isCouponApplied && !isFreeDeliveryCoupon ? num(order?.couponValue) : 0;

  const deliveryFee = num(
    order?.curDlvrCharge != null && order?.curDlvrCharge !== ""
      ? order.curDlvrCharge
      : order?.deliveryCharge,
  );

  // DASH SERVICE FEE: orderApp = "Dash" AND isPackage = 0 adds a fixed
  // "Service Fee" (Rs. 180) ON TOP of the normal delivery fee. It is always
  // charged (no pickup / free-delivery-coupon waiver) and is part of the total.
  // Display condition only (no extra fetch): uses order.orderApp and order.isPackage.
  const isPackageValue = order?.isPackage;
  const isDashServiceFee =
    String(order?.orderApp || "").trim().toLowerCase() === "dash" &&
    isPackageValue != null &&
    String(isPackageValue).trim() !== "" &&
    Number(isPackageValue) === 0;
  const serviceFee = isDashServiceFee ? DASH_SERVICE_FEE : 0;
  // Delivery fee keeps its normal rules for every order
  const deliveryFeeCharged =
    !isPickup && !isFreeDeliveryCoupon ? deliveryFee : 0;

  // Total is recalculated from live data. DB fullTotal is only a fallback.
  const hasLiveData = packagesTotal > 0 || itemsTotal > 0;
  const calculatedTotal = Math.max(
    0,
    packagesTotal +
      itemsTotal -
      productDiscount -
      couponDiscount +
      deliveryFeeCharged +
      serviceFee,
  );
  const orderFullTotal = hasLiveData
    ? calculatedTotal
    : num(order?.fullTotal ?? order?.total);

  const pay = detectPayment(order);
  const creditPaid = num(order?.creditPaid);
  const isCardOrder = pay.isCard;
  const isCashOrder = pay.isCash;
  // Credit already applied can never exceed the total
  const creditApplied = Math.min(creditPaid, orderFullTotal);
  const remaining = Math.max(0, orderFullTotal - creditApplied);

  const isUnpaidCardOrder = isCardOrder && !pay.paid;
  const cardBrand: string =
    savedCard?.scheme || order?.cardBrand || order?.cardType || "Master";
  const cardLast4: string =
    savedCard?.last4 || order?.cardLast4 || order?.cardNumber || "";

  // Keep the ref in sync so handleConfirm sends the same total shown on screen.
  newTotalRef.current = hasLiveData ? orderFullTotal : null;

  const busy = submitting !== null;
  // Loading modal: hidden while the gateway checkout modal or the success
  // modal is on screen so two native modals are never stacked.
  const isSubmitting =
    (submitting === "confirm" || paymentProcessing) &&
    !checkoutModalVisible &&
    !showSuccessOverlay;

  // ─── handlers (defined after the derived values they use) ─────────────────
  const showSuccess = () => {
    setSuccessInvoiceNo(invoiceNo);
    setShowSuccessOverlay(true);
  };

  const handlePaymentSuccess = async (confirmPayload?: any) => {
    // Show loading immediately, before anything else changes.
    startPaymentProcessing();
    setSubmitting("confirm");
    setCheckoutModalVisible(false);
    setCheckoutSession(null);

    const payload = confirmPayload ?? pendingConfirmPayload;
    if (!payload) {
      Alert.alert("Error", "Order details missing. Please contact support.");
      stopPaymentProcessing();
      setSubmitting(null);
      return;
    }

    try {
      await orderService.confirmOrderWithLivePrices({
        ...payload,
        isPaid: 1,
      });

      setPendingConfirmPayload(null);
      showSuccess();
    } catch (err: any) {
      console.error("Post-payment confirm order failed:", err);
      Alert.alert(
        "Confirmation Error",
        "Your payment was received but the order could not be confirmed. Please contact support.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } finally {
      stopPaymentProcessing();
      setSubmitting(null);
    }
  };

  const handlePaymentCancel = () => {
    if (paymentProcessingRef.current) return; // payment already succeeded
    setCheckoutModalVisible(false);
    setCheckoutSession(null);
    setPendingConfirmPayload(null);
    setSubmitting(null);
    Alert.alert(
      "Payment Cancelled",
      "The payment was not completed. Your order was not confirmed. You can try again.",
    );
  };

  const handleConfirm = async () => {
    if (submitting) return; // prevent double-tap
    if (Number(order?.isConfirmed) === 1) {
      Alert.alert(
        "Already Confirmed!",
        "You have already confirmed this order. You cannot make any further changes.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
      return;
    }

    const liveTotal = newTotalRef.current;
    const effectiveOrderId = orderId ? String(orderId) : "";
    const processOrderId =
      order?.processOrderId || order?.proOrderId || order?.id || orderId;

    // ── If paymentMethod == "card" and isPaid == 0 -> settle total from gateway ──
    if (isUnpaidCardOrder && remaining > 0) {
      const confirmPayload = {
        orderId: effectiveOrderId,
        processOrderId: processOrderId || undefined,
        ...(liveTotal != null ? { newTotal: liveTotal } : {}),
        isPaid: 1,
      };
      setPendingConfirmPayload(confirmPayload);
      setSubmitting("confirm");

      try {
        const adapter = PaymentGatewayFactory.getAdapter(activeGateway as any);

        // 1-Click Saved Card attempt first
        if (savedCard && adapter.chargeSavedCard) {
          try {
            const chargeRes = await adapter.chargeSavedCard({
              cardId: savedCard.id,
              amount: remaining,
              paymentType: "order",
              orderId: String(processOrderId || effectiveOrderId),
              itemsDescription: `Polygon Order Payment - ${invoiceNo}`,
            });
            if (chargeRes.success) {
              await handlePaymentSuccess(confirmPayload);
              return;
            }
          } catch (chargeErr: any) {
            const isInvalid =
              chargeErr?.response?.data?.cardInvalid ||
              chargeErr?.message?.includes("invalid") ||
              chargeErr?.message?.includes("expired") ||
              chargeErr?.message?.includes("No such object");
            if (!isInvalid) {
              setSubmitting(null);
              Alert.alert(
                "Payment Error",
                chargeErr?.response?.data?.message ||
                  chargeErr?.message ||
                  "Payment failed. Please try again.",
              );
              return;
            }
            setSavedCard(null); // Fallback to hosted checkout modal
          }
        }

        // Hosted Checkout Modal
        const session = await adapter.initiatePayment({
          orderId: String(processOrderId || effectiveOrderId),
          amount: remaining,
          paymentType: "order",
          itemsDescription: `Polygon Order Payment - ${invoiceNo}`,
        });

        setCheckoutSession(session);
        setCheckoutModalVisible(true);
      } catch (err: any) {
        setSubmitting(null);
        Alert.alert(
          "Payment Error",
          err?.response?.data?.message ||
            err?.message ||
            "Failed to start payment. Please try again.",
        );
      }
      return;
    }

    // Direct confirm (Cash, already paid card order, or 100% credit covered)
    try {
      setSubmitting("confirm");
      if (orderId) {
        await orderService.confirmOrderWithLivePrices({
          orderId,
          processOrderId: processOrderId || undefined,
          ...(liveTotal != null ? { newTotal: liveTotal } : {}),
          ...(isUnpaidCardOrder ? { isPaid: 1 } : {}),
        });
      }
      showSuccess();
    } catch (err: any) {
      console.error("Confirm order failed:", err?.response?.data || err);
      Alert.alert(
        "Could not confirm",
        err?.response?.data?.message || "Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleCancel = () => {
    const effectiveOrderId = orderId ? String(orderId) : "";
    const processOrderId =
      order?.processOrderId || order?.proOrderId || order?.id || orderId;

    // Group the same package (same key as the totals calculation) so a
    // package ordered twice is ONE row with qty 2 (shown as "X2").
    const pkgMap = new Map<string, any>();
    rawPackagesData.forEach((p: any) => {
      const key = String(p.packageId || p.displayName || p.id || "pkg");
      const qty = parseFloat(p.packageQty || p.qty || p.quantity) || 1;
      const existing = pkgMap.get(key);
      if (existing) {
        existing.qty += qty;
        return;
      }
      pkgMap.set(key, {
        id: key,
        name: p.displayName || p.packageName || p.name || "Package",
        icon: p.icon,
        image: p.image || p.packageImage,
        qty,
        unitPrice:
          typeof p.priceNum === "number"
            ? p.priceNum
            : num(String(p.productPrice || 0).replace(/Rs\.?|,/gi, "")),
        serviceFee: parseFloat(p.serviceFee) || 0,
        packingFee: parseFloat(p.packingFee) || 0,
      });
    });
    const pkgs = Array.from(pkgMap.values());

    const alacarts = rawItemsData.map((it: any) => {
      const qty = parseFloat(it.qty) || 1;
      const unit = it.unit || "kg";
      const mktNormal = parseFloat(it.marketNormalPrice) || 0;
      const mktDiscounted = parseFloat(it.marketDiscountedPrice) || 0;
      const perKg =
        mktDiscounted > 0 ? mktDiscounted : mktNormal > 0 ? mktNormal : 0;
      const qtyInKg = String(unit).toLowerCase() === "g" ? qty / 1000 : qty;
      const itemPrice = perKg > 0 ? perKg * qtyInKg : num(it.price);
      const hasCurrentPromo =
        mktNormal > 0 && mktDiscounted > 0 && mktNormal - mktDiscounted > 0.01;
      const origPrice = hasCurrentPromo ? mktNormal * qtyInKg : undefined;

      return {
        id: String(it.id || it.productId || "item"),
        name: it.displayName || it.name || "Item",
        image: it.image,
        weight: `${qty} ${unit}`,
        price: itemPrice,
        originalPrice: origPrice,
      };
    });

    const isCardOrOnline = pay.isCard;
    const isCashMethod = pay.isCash;

    const initialPaidAmount =
      num(order?.amount) > 0 ? num(order?.amount) : orderFullTotal;
    const moneyPaid = num(order?.moneyPaid);
    const creditPaidVal = num(order?.creditPaid);

    const totalPaidCard = isCardOrOnline
      ? moneyPaid > 0
        ? moneyPaid
        : initialPaidAmount
      : 0;
    const totalPaidCredit = creditPaidVal || 0;
    const processOrderTotal = orderFullTotal;
    const totalCashDue =
      isCashMethod && !pay.paid
        ? Math.max(0, processOrderTotal - totalPaidCredit)
        : 0;

    // Amount returned to the credit balance on cancel = the creditPaid column value
    // (same rule as the server).
    let refundCreditAmount = 0;
    if (isCardOrOnline) {
      refundCreditAmount = totalPaidCredit;
    } else if (pay.hasCredit && !isCashMethod) {
      refundCreditAmount =
        totalPaidCredit > 0 ? totalPaidCredit : processOrderTotal;
    } else {
      refundCreditAmount = totalPaidCredit > 0 ? totalPaidCredit : 0;
    }

    navigation.navigate("OrderCancelConfirmation", {
      orderId: effectiveOrderId,
      processOrderId: processOrderId ? String(processOrderId) : undefined,
      packages: pkgs,
      alaCarteItems: alacarts,
      totalPaid: initialPaidAmount,
      totalPaidCard,
      totalPaidCredit,
      totalCashDue,
      processOrderTotal,
      paymentMethod: order?.paymentMethod || "cash",
      refundCreditAmount,
      serviceFee, // DASH: 0 when not a Dash order
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <CustomHeader
        showBackButton
        navigation={navigation}
        title="Order Confirmation"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 15,
          paddingTop: 6,
          paddingBottom: 20,
        }}
      >
        {/* INTRO */}
        <Text
          style={{
            fontSize: 11,
            color: "#475569",
            textAlign: "center",
            lineHeight: 16,
            marginBottom: 12,
          }}
        >
          Here is the updated total for your order{" "}
          <Text style={{ fontWeight: "700", color: "#111" }}>[{invoiceNo}]</Text>
          {placed.date ? ` placed at ${placed.time} on ${placed.date}.` : "."}
        </Text>

        {/* NOTICE */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: "#EEF3FF",
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <Ionicons
            name="information-circle"
            size={16}
            color="#111"
            style={{ marginTop: 1, marginRight: 8 }}
          />
          <Text
            style={{ flex: 1, fontSize: 11, color: "#111", lineHeight: 16 }}
          >
            Review & confirm your updated order details below by 6:00 PM today.
            Please confirm to proceed with scheduling or cancel if no longer
            needed.
          </Text>
        </View>

        {/* SCHEDULE */}
        <ScheduleTile
          icon="calendar"
          label="Schedule Date"
          value={scheduleDate}
        />
        <ScheduleTile
          icon="clock"
          label="Schedule Time Slot"
          value={scheduleTime}
        />

        {/* UPDATED ORDER SUMMARY */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            marginBottom: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#111" }}>
            Updated Order Summery
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (orderId) {
                navigation.navigate("ConfirmOrderDetailsScreen", {
                  orderId: String(orderId),
                });
              }
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: "#0066FF",
                textDecorationLine: "underline",
              }}
            >
              View Order Details
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E8",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 12,
            marginBottom: 14,
          }}
        >
          {packagesTotal > 0 && (
            <SummaryRow
              label="Packages"
              value={`Rs. ${formatAmount(packagesTotal)}`}
            />
          )}
          {itemsTotal > 0 && (
            <SummaryRow
              label="Ala Carte Items"
              value={`Rs. ${formatAmount(itemsTotal)}`}
            />
          )}
          {productDiscount > 0 && (
            <SummaryRow
              label="Discount"
              value={`- Rs. ${formatAmount(productDiscount)}`}
            />
          )}
          {couponDiscount > 0 && (
            <SummaryRow
              label="Coupon Discount"
              value={`- Rs. ${formatAmount(couponDiscount)}`}
            />
          )}
          {!isPickup && (
            <SummaryRow
              label={
                isFreeDeliveryCoupon
                  ? "Delivery Fee (Coupon Applied!)"
                  : "Delivery Fee"
              }
              value={`+ Rs. ${formatAmount(isFreeDeliveryCoupon ? 0 : deliveryFee)}`}
            />
          )}
          {serviceFee > 0 && (
            <SummaryRow
              label="Service Fee"
              value={`+ Rs. ${formatAmount(serviceFee)}`}
            />
          )}

          <Divider my={6} />

          <SummaryRow
            label="Total"
            value={`Rs. ${formatAmount(orderFullTotal)}`}
            bold
          />
        </View>

        {/* PAYMENT NOTICE */}
        {isCardOrder ? (
          isUnpaidCardOrder ? (
            remaining > 0 ? (
              <View
                style={{
                  backgroundColor: "#EEF3FF",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 11, color: "#111", lineHeight: 16 }}>
                  {savedCard ? (
                    <>
                      You will be charged{" "}
                      <Text style={{ fontWeight: "700" }}>
                        Rs. {formatAmount(remaining)}
                      </Text>{" "}
                      upon clicking confirm using your saved card.
                    </>
                  ) : (
                    <>
                      You will be redirected to the secure payment gateway to pay{" "}
                      <Text style={{ fontWeight: "700" }}>
                        Rs. {formatAmount(remaining)}
                      </Text>{" "}
                      upon clicking confirm.
                    </>
                  )}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFF",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginTop: 8,
                  }}
                >
                  {savedCard ? (
                    <>
                      <CardBrand brand={cardBrand} />
                      <Text style={{ fontSize: 11, color: "#111" }}>
                        {/visa/i.test(cardBrand) ? "Visa" : "Master"} ●●●●{" "}
                        {String(cardLast4).slice(-4)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color="#0066FF"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: "#111",
                        }}
                      >
                        Pay via Payment Gateway (Card)
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#E8F9EC",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#1F7A3A"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: "#1F7A3A",
                    lineHeight: 16,
                  }}
                >
                  Your order is fully covered by your credit balance.
                </Text>
              </View>
            )
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#E8F9EC",
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#1F7A3A"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: "#1F7A3A",
                  lineHeight: 16,
                }}
              >
                This order has been paid online.
              </Text>
            </View>
          )
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#E8F9EC",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color="#1F7A3A"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 11,
                color: "#1F7A3A",
                lineHeight: 16,
              }}
            >
              Once you accepted this order you can pay upon{" "}
              {isPickup ? "pickup" : "delivery"}.
            </Text>
          </View>
        )}

        {/* PAYMENT SUMMARY */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E8",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 12,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#111",
              marginBottom: 12,
            }}
          >
            Payment Summery
          </Text>

          {creditApplied > 0 && (
            <SummaryRow
              label="Paid By Credit"
              value={`Rs. ${formatAmount(creditApplied)}`}
              icon="wallet"
              iconColor="#8D5B4C"
            />
          )}

          {isCardOrder && remaining > 0 && (
            <SummaryRow
              label="Pay with Card"
              value={`Rs. ${formatAmount(remaining)}`}
              icon="credit-card"
              iconColor="#0088FF"
              valueColor="#FF9114"
            />
          )}

          {!isCardOrder && isCashOrder && remaining > 0 && (
            <SummaryRow
              label="Pay with Cash"
              value={`Rs. ${formatAmount(remaining)}`}
              icon="money-bill-wave"
              iconColor="#00B83D"
              valueColor="#FF9114"
            />
          )}

          <View style={{ height: 4 }} />

          <SummaryRow
            label="Total"
            value={`Rs. ${formatAmount(orderFullTotal)}`}
            bold
          />
        </View>

        {/* ACTIONS */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={busy}
          onPress={handleCancel}
          style={{
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "#FFF",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
            opacity: busy && submitting !== "cancel" ? 0.5 : 1,
          }}
        >
          {submitting === "cancel" ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#FF3B30" }}>
              Cancel My Order
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={busy}
          onPress={handleConfirm}
          style={{
            height: 44,
            borderRadius: 22,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
            opacity: busy && submitting !== "confirm" ? 0.5 : 1,
          }}
        >
          {submitting === "confirm" ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFF" }}>
              {isUnpaidCardOrder && remaining > 0
                ? `Pay Rs. ${formatAmount(remaining)} & Confirm Order`
                : "Confirm & Accept My Order"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Loading modal: blocks taps between payment completing and the
          success modal / navigation. */}
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              paddingVertical: 36,
              paddingHorizontal: 40,
              alignItems: "center",
              minWidth: 220,
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
              Confirming your order...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Payment Gateway Checkout Modal */}
      {checkoutSession && (
        <PaymentCheckoutModal
          visible={checkoutModalVisible}
          gatewayName={checkoutSession.gateway}
          checkoutUrl={checkoutSession.checkoutUrl}
          postBody={checkoutSession.postBody}
          orderId={checkoutSession.orderId}
          amount={checkoutSession.amount}
          customerAddress={checkoutSession.customerAddress}
          onSuccess={(_orderId) => handlePaymentSuccess()}
          onCancel={(_orderId) => handlePaymentCancel()}
          onClose={() => {
            setCheckoutModalVisible(false);
            // onClose fires right after onSuccess: don't wipe the loading
            // state / payload while the confirm call is still running.
            if (paymentProcessingRef.current) return;
            setCheckoutSession(null);
            setPendingConfirmPayload(null);
            setSubmitting(null);
          }}
        />
      )}

      {/* Success alert — shown briefly after the order is confirmed */}
      <AlertModal
        visible={showSuccessOverlay}
        type="success"
        title="Successful!"
        message={`Your order ${successInvoiceNo || invoiceNo}\nconfirmed successfully.`}
        autoClose={true}
        duration={2500}
        onClose={() => {
          setShowSuccessOverlay(false);
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        }}
      />
    </View>
  );
};

export default OrderConfirmation;