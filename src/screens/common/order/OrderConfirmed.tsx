import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { SummaryRow } from "@/component/order/SummaryRow";
import LoadingPage from "@/component/common/LoadingPage";
import orderService from "@/services/order/order.service";

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
  // Ala carte total at today's NORMAL marketplace price (gross)
  const [itemsTotal, setItemsTotal] = useState(0);
  // Discount = today's normal price - today's discounted price (ala carte)
  const [itemsDiscount, setItemsDiscount] = useState(0);
  const [hasLiveItemPrices, setHasLiveItemPrices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"confirm" | "cancel" | null>(
    null,
  );
  // Stores the recalculated total (today's marketplace prices) for the confirm call.
  // A ref so handleConfirm (defined before derived values) reads the latest value.
  const newTotalRef = React.useRef<number | null>(null);

  const [rawPackagesData, setRawPackagesData] = useState<any[]>([]);
  const [rawItemsData, setRawItemsData] = useState<any[]>([]);

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

          // Today's marketplace prices (marketplaceitems), NOT the stored order price.
          // gross = normal price, net = discounted price (or normal if no discount)
          let gross = 0;
          let net = 0;
          let live = false;

          items.forEach((it) => {
            const qty = parseFloat(it.qty) || 1;
            const unit = String(it.unit || "kg").toLowerCase();
            const qtyInKg = unit === "g" ? qty / 1000 : qty;

            const mktNormal = parseFloat(it.marketNormalPrice) || 0;
            const mktDisc = parseFloat(it.marketDiscountedPrice) || 0;
            const perKgNet = mktDisc > 0 ? mktDisc : mktNormal;

            if (perKgNet > 0) {
              live = true;
              const perKgGross = mktNormal > 0 ? mktNormal : perKgNet;
              gross += perKgGross * qtyInKg;
              net += perKgNet * qtyInKg;
            } else {
              // Fallback: stored price in orderadditionalitems
              const stored = num(it.price);
              gross += stored;
              net += stored;
            }
          });

          setItemsTotal(gross);
          setItemsDiscount(Math.max(0, gross - net));
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

  // ─── handlers ──────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    try {
      setSubmitting("confirm");
      if (orderId) {
        const liveTotal = newTotalRef.current;
        await orderService.confirmOrderWithLivePrices({
          orderId,
          ...(liveTotal != null ? { newTotal: liveTotal } : {}),
        });
      }
      navigation.goBack();
    } catch (err) {
      console.error("Confirm order failed:", err);
      Alert.alert("Could not confirm", "Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleCancel = () => {
    const effectiveOrderId = orderId ? String(orderId) : "";
    const processOrderId =
      order?.processOrderId || order?.proOrderId || order?.id || orderId;

    const pkgs = rawPackagesData.map((p: any) => ({
      id: String(p.id || p.packageId || p.displayName || "pkg"),
      name: p.displayName || p.packageName || p.name || "Package",
      icon: p.icon,
      image: p.image || p.packageImage,
      qty: parseFloat(p.packageQty || p.qty || p.quantity) || 1,
      unitPrice:
        typeof p.priceNum === "number"
          ? p.priceNum
          : num(String(p.productPrice || 0).replace(/Rs\.?|,/gi, "")),
      serviceFee: parseFloat(p.serviceFee) || 0,
      packingFee: parseFloat(p.packingFee) || 0,
    }));

    const alacarts = rawItemsData.map((it: any) => {
      const qty = parseFloat(it.qty) || 1;
      const unit = it.unit || "kg";
      const mktNormal = parseFloat(it.marketNormalPrice) || 0;
      const mktDiscounted = parseFloat(it.marketDiscountedPrice) || 0;
      const perKg =
        mktDiscounted > 0 ? mktDiscounted : mktNormal > 0 ? mktNormal : 0;
      const qtyInKg = String(unit).toLowerCase() === "g" ? qty / 1000 : qty;
      const itemPrice = perKg > 0 ? perKg * qtyInKg : num(it.price);
      const origPrice =
        mktNormal > 0 ? mktNormal * qtyInKg : num(it.normalPrice);

      return {
        id: String(it.id || it.productId || "item"),
        name: it.displayName || it.name || "Item",
        image: it.image,
        weight: `${qty} ${unit}`,
        price: itemPrice,
        originalPrice: origPrice > itemPrice ? origPrice : undefined,
      };
    });

    const pMethod = (order?.paymentMethod || "").trim().toLowerCase();
    const isPaidVal =
      Number(order?.isPaid) === 1 ||
      order?.isPaid === true ||
      String(order?.isPaid) === "1";
    const isCardOrOnline =
      pMethod.includes("card") ||
      pMethod.includes("payhere") ||
      pMethod.includes("online") ||
      (isPaidVal && !pMethod.includes("cash") && !pMethod.includes("cod"));
    const isCashMethod = pMethod.includes("cash") || pMethod.includes("cod");

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
    // Recalculated total from today's prices (same value shown on this screen)
    const processOrderTotal = orderFullTotal;
    const totalCashDue =
      isCashMethod && !isPaidVal
        ? Math.max(0, processOrderTotal - totalPaidCredit)
        : 0;

    let refundCreditAmount = 0;
    if (isCardOrOnline) {
      refundCreditAmount = totalPaidCard + totalPaidCredit;
    } else if (pMethod.includes("credit")) {
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
    });
  };

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
  const scheduleTime = isPickup ? "09:30 PM" : order?.sheduleTime || "N/A";

  const isCouponApplied = Number(order?.isCoupon) === 1;

  const isFreeDeliveryCoupon = Boolean(
    isCouponApplied &&
      order?.couponType &&
      (String(order.couponType).toLowerCase().includes("free") ||
        String(order.couponType).toLowerCase().includes("delivery")),
  );

  // Discount is recalculated from today's marketplace prices.
  // Falls back to the stored discount only when no live prices exist.
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

  // Total is recalculated from live data. DB fullTotal is only a fallback.
  const hasLiveData = packagesTotal > 0 || itemsTotal > 0;
  const calculatedTotal = Math.max(
    0,
    packagesTotal +
      itemsTotal -
      productDiscount -
      couponDiscount +
      (!isPickup && !isFreeDeliveryCoupon ? deliveryFee : 0),
  );
  const orderFullTotal = hasLiveData
    ? calculatedTotal
    : num(order?.fullTotal ?? order?.total);

  const creditPaid = num(order?.creditPaid);
  const paymentMethod = (order?.paymentMethod || "").toLowerCase();
  const isCardOrder = paymentMethod === "card" || paymentMethod === "payhere";
  const isCashOrder = paymentMethod === "cash";
  const remaining = Math.max(0, orderFullTotal - creditPaid);

  const cardBrand: string = order?.cardBrand || order?.cardType || "Master";
  const cardLast4: string = order?.cardLast4 || order?.cardNumber || "3501";

  // Keep the ref in sync so handleConfirm always sends the same total shown on screen.
  newTotalRef.current = hasLiveData ? orderFullTotal : null;

  const busy = submitting !== null;

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

          <Divider my={6} />

          <SummaryRow
            label="Total"
            value={`Rs. ${formatAmount(orderFullTotal)}`}
            bold
          />
        </View>

        {/* PAYMENT NOTICE */}
        {isCardOrder ? (
          <View
            style={{
              backgroundColor: "#EEF3FF",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 11, color: "#111", lineHeight: 16 }}>
              You will be charged{" "}
              <Text style={{ fontWeight: "700" }}>
                Rs. {formatAmount(remaining)}
              </Text>{" "}
              upon clicking confirm using the saved card number.
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
              <CardBrand brand={cardBrand} />
              <Text style={{ fontSize: 11, color: "#111" }}>
                {/visa/i.test(cardBrand) ? "Visa" : "Master"} ●●●●{" "}
                {String(cardLast4).slice(-4)}
              </Text>
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

          {creditPaid > 0 && (
            <SummaryRow
              label="Paid By Credit"
              value={`Rs. ${formatAmount(creditPaid)}`}
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

          {isCashOrder && remaining > 0 && (
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
              Confirm & Accept My Order
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default OrderConfirmation;