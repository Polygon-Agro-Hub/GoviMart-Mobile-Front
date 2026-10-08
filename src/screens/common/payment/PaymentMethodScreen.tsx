import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  BackHandler,
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

const PaymentMethod: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const orderContext = route.params?.orderContext;
  const isNavigatingAwayRef = useRef(false);
  const [backConfirmVisible, setBackConfirmVisible] = useState(false);

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

  useEffect(() => {
    if (!paymentSessionEndTime || paymentSessionEndTime <= Date.now()) {
      paymentSessionEndTime = Date.now() + 5 * 60 * 1000;
    }

    const interval = setInterval(() => {
      if (!paymentSessionEndTime) return;
      const diff = Math.max(
        0,
        Math.floor((paymentSessionEndTime - Date.now()) / 1000),
      );
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        paymentSessionEndTime = null;
        isNavigatingAwayRef.current = true;

        setCouponModalVisible(false);
        setUnavailableModalVisible(false);
        setBackConfirmVisible(false);

        setTimeout(() => {
          Alert.alert(
            "Session Expired",
            "Your payment session has expired. You are being redirected to your cart.",
            [{ text: "OK", onPress: () => navigation.navigate("MyCart") }],
            { cancelable: false },
          );
        }, 400);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [navigation]);

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
  const [submitting, setSubmitting] = useState(false);

  const isImmediateFinalize = orderContext?.isFinalizeImdt === 1;
  const isExceedCashLimit = cashLimit !== null && totalAmount >= cashLimit;
  const isCashDisabled = isImmediateFinalize || isExceedCashLimit;

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

  // CONFIRM
  const handleConfirm = async () => {
    // Proactively check availability of items in cart
    const productIds: number[] = (cartProducts || []).map((p: any) => p.id);
    const packageIds: number[] = (cartPackages || []).map((p: any) => p.id);
    if (productIds.length > 0 || packageIds.length > 0) {
      try {
        const availRes = await productService.checkAvailability(
          productIds,
          packageIds,
        );
        if (availRes.data && availRes.data.status && availRes.data.data) {
          const { products: pMap, packages: pkgMap } = availRes.data.data;
          const hasUnavailProd = productIds.some(
            (id) => pMap && pMap[id] === false,
          );
          const hasUnavailPkg = packageIds.some(
            (id) => pkgMap && pkgMap[id] === false,
          );
          if (hasUnavailProd || hasUnavailPkg) {
            setUnavailableModalVisible(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Availability check error:", err);
      }
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
      isNavigatingAwayRef.current = true;
      paymentSessionEndTime = null;
      navigation.navigate("PaymentScreen", {
        amount: paymentAmount,
        title: "Payment Summary",
        orderContext: {
          ...(orderContext as any),
          grandTotal: totalAmount,
          deliveryCharge: deliveryChargeToSave,
          discount: itemDiscount,
          creditPaid: creditUsed,
          moneyPaid: paymentAmount,
          paymentMethod: "card",
          appliedCoupon,
          isCoupon: Boolean(appliedCoupon),
          couponValue: couponVal,
          couponDiscount: couponVal,
          couponType: appliedCoupon?.type || null,
          couponCode: appliedCoupon?.code || null,
          isFreeDeliveryCoupon: isFreeDelivery,
          checkoutDetails: {
            ...(orderContext?.checkoutDetails || {}),
            isCoupon: Boolean(appliedCoupon),
            couponValue: couponVal,
            couponType: appliedCoupon?.type || null,
            couponCode: appliedCoupon?.code || null,
          },
        },
      });
      return;
    }

    try {
      setSubmitting(true);
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
        isFinalizeImdt: orderContext?.isFinalizeImdt || 0,
        checkoutDetails: {
          ...(orderContext?.checkoutDetails || {
            deliveryMethod: orderContext?.deliveryMethod || "home",
          }),
          isCoupon: Boolean(appliedCoupon),
          couponValue: couponVal,
          couponType: appliedCoupon?.type || null,
          couponCode: appliedCoupon?.code || null,
        },
      };

      const response = await orderService.createOrder(payload);
      if (response.data && response.data.status && response.data.data) {
        isNavigatingAwayRef.current = true;
        paymentSessionEndTime = null;
        dispatch(clearCart());
        navigation.navigate("OrderConfirmed", {
          orderId: response.data.data.orderId,
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
        Alert.alert(
          "Order Failed",
          response.data.message || "Failed to create order. Please try again.",
        );
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
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
    } finally {
      setSubmitting(false);
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
                    Use Credit Balance
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
                    Pay with your credit balance and pay the rest with cash or
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
        cartTotal={
          (orderContext?.packageTotal || 0) + (orderContext?.productTotal || 0)
        }
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
          paymentSessionEndTime = null;
          navigation.navigate("MyCart");
        }}
        onCancel={() => {
          setBackConfirmVisible(false);
        }}
      />
    </View>
  );
};

export default PaymentMethod;
