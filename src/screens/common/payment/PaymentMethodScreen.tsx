import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
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

const PaymentMethod: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const orderContext = route.params?.orderContext;

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
        dispatch(clearCart());
        navigation.navigate("OrderConfirmed", {
          orderId: response.data.data.orderId,
          invoiceNumber: response.data.data.invoiceNumber,
          total: response.data.data.total,
          orderContext: {
            ...(orderContext as any),
            grandTotal: totalAmount,
            deliveryCharge: deliveryChargeToSave,
            discount: itemDiscount,
            creditPaid: creditUsed,
            moneyPaid: paymentAmount,
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
      />

      {/* SCROLL CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 220,
        }}
      >
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

        {/* ─── TOTAL AMOUNT / ORDER SUMMARY SECTION ──────────────────────── */}
        <View
          style={{
            marginHorizontal: 15,
            marginTop: 10,
            marginBottom: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#E1E7EE",
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 18,
            paddingVertical: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#111111",
              marginBottom: 10,
            }}
          >
            Order Summary
          </Text>

          {/* For Packages */}
          {Boolean(
            orderContext?.packageTotal && orderContext.packageTotal > 0,
          ) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, color: "#64748B" }}>
                For Packages
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: "600", color: "#111111" }}
              >
                Rs. {formatPrice(orderContext?.packageTotal || 0)}
              </Text>
            </View>
          )}

          {/* Ala Carte Items */}
          {Boolean(
            orderContext?.productTotal && orderContext.productTotal > 0,
          ) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, color: "#64748B" }}>
                Ala Carte Items
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: "600", color: "#111111" }}
              >
                Rs. {formatPrice(orderContext?.productTotal || 0)}
              </Text>
            </View>
          )}

          {/* Item Discount */}
          {Boolean(orderContext?.discount && orderContext.discount > 0) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, color: "#64748B" }}>
                Item Discount
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: "600", color: "#16A34A" }}
              >
                - Rs. {formatPrice(orderContext?.discount || 0)}
              </Text>
            </View>
          )}

          {/* Delivery Fee */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 13.5, color: "#64748B" }}>
              Delivery Fee
            </Text>
            <Text
              style={{ fontSize: 13.5, fontWeight: "600", color: "#111111" }}
            >
              {effectiveDeliveryCharge > 0
                ? `+ Rs. ${formatPrice(effectiveDeliveryCharge)}`
                : "Free"}
            </Text>
          </View>

          {/* Coupon Discount */}
          {Boolean(couponDiscountAmount > 0) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, color: "#64748B" }}>
                Coupon Discount
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: "600", color: "#16A34A" }}
              >
                - Rs. {formatPrice(couponDiscountAmount)}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "#E5E7EB",
              marginVertical: 10,
            }}
          />

          {/* Total Amount Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#111111",
              }}
            >
              Total Amount
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#111111",
              }}
            >
              Rs. {formatPrice(totalAmount)}
            </Text>
          </View>
        </View>

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

        {/* BASIC PAYMENT HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 19,
            marginTop: 10,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "#E1E7EE",
            }}
          />

          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: "#64748B",
              marginHorizontal: 10,
            }}
          >
            Basic Payment Methods
          </Text>

          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "#E1E7EE",
            }}
          />
        </View>

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
                  Cash payment is not available for orders equal or greater than{" "}
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
      </ScrollView>

      {/* ─── FIXED BOTTOM SUMMARY & BUTTON ──────────────────────────────── */}
      <PaymentMethodSummary
        useCredit={useCredit}
        creditUsed={creditUsed}
        paymentAmount={paymentAmount}
        paymentMethod={paymentMethod}
        totalAmount={totalAmount}
        submitting={submitting}
        onConfirm={handleConfirm}
        containerStyle={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

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
    </View>
  );
};

export default PaymentMethod;
