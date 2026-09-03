import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { PaymentOptionCard } from "@/component/payment/PaymentOptionCard";
import OrderSummary from "@/component/common/OrderSummary";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import { clearCart } from "@/store/cartSlice";
import CouponModal from "@/component/coupon/CouponModal";
import AppliedCouponCard from "@/component/coupon/AppliedCouponCard";

type PaymentMethodNavigationProp = StackNavigationProp<
    RootStackParamList,
    "PaymentMethod"
>;

type PaymentMethodRouteProp = RouteProp<
    RootStackParamList,
    "PaymentMethod"
>;

interface Props {
    navigation: PaymentMethodNavigationProp;
    route: PaymentMethodRouteProp;
}

type PaymentType = "cash" | "card";

const PaymentMethod: React.FC<Props> = ({
    navigation,
    route,
}) => {
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

    // Initial base totals from order context
    const baseTotal = Number(route.params?.total || orderContext?.grandTotal || 880);
    const initialDeliveryCharge = orderContext?.deliveryCharge || 0;

    // Adjustments based on coupon
    const effectiveDeliveryCharge = appliedCoupon?.isFreeDelivery ? 0 : initialDeliveryCharge;
    const deliveryFeeDiscount = appliedCoupon?.isFreeDelivery ? initialDeliveryCharge : 0;
    const couponDiscountAmount = appliedCoupon?.isFreeDelivery ? 0 : (appliedCoupon?.discount || 0);

    const totalAmount = Math.max(0, baseTotal - couponDiscountAmount - deliveryFeeDiscount);

    const [creditBalance, setCreditBalance] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentType>("cash");
    const [useCredit, setUseCredit] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const response = await customerService.getAccountDetails();
                if (response.data && response.data.data) {
                    const bal = parseFloat(response.data.data.creditBalance || 0);
                    setCreditBalance(Math.max(0, bal));
                }
            } catch (err) {
                console.log("Error loading credit balance:", err);
            }
        };
        fetchBalance();
    }, []);

    const creditUsed = useCredit
        ? Math.min(creditBalance, totalAmount)
        : 0;

    const remainingAfterCredit = totalAmount - creditUsed;

    const paymentAmount = useCredit
        ? remainingAfterCredit
        : totalAmount;

    // CONFIRM
    const handleConfirm = async () => {
        const totalDiscountApplied = (orderContext?.discount || 0) + couponDiscountAmount + deliveryFeeDiscount;
        const couponVal = appliedCoupon ? (appliedCoupon.isFreeDelivery ? initialDeliveryCharge : appliedCoupon.discount) : 0;

        if (paymentMethod === "card") {
            navigation.navigate("PaymentScreen", {
                amount: paymentAmount,
                title: "Payment Summary",
                orderContext: {
                    ...(orderContext as any),
                    grandTotal: totalAmount,
                    deliveryCharge: effectiveDeliveryCharge,
                    discount: totalDiscountApplied,
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
                paymentMethod: "cash",
                grandTotal: totalAmount,
                discountAmount: totalDiscountApplied,
                deliveryCharge: effectiveDeliveryCharge,
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
                        deliveryCharge: effectiveDeliveryCharge,
                        discount: totalDiscountApplied,
                    },
                });
            } else {
                Alert.alert("Order Failed", response.data.message || "Failed to create order. Please try again.");
            }
        } catch (error: any) {
            const errorData = error?.response?.data;
            const errorMsg = errorData?.message || (Array.isArray(errorData?.details) ? errorData.details.join("; ") : null) || error?.message || "Failed to place order. Please try again.";
            console.error("Order error in PaymentMethodScreen:", errorMsg, errorData);
            if (errorData?.code === "ITEMS_UNAVAILABLE") {
                Alert.alert(
                    "Items Unavailable",
                    "Some items in your cart are no longer available. Please review your cart.",
                    [{ text: "OK", onPress: () => navigation.navigate("MyCart") }]
                );
            } else {
                Alert.alert("Order Failed", errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* HEADER */}
            <CustomHeader title="Select Payment Method" navigation={navigation} showBackButton />

            {/* SCROLL CONTENT */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 340,
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
                            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                                <FontAwesome6
                                    name={useCredit ? "check" : "star"}
                                    solid
                                    size={10}
                                    color="#FFF"
                                />
                                <Text
                                    style={{
                                        color: "#FFF",
                                        fontSize: 10,
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
                                <Ionicons
                                    name="checkmark"
                                    size={14}
                                    color="#FFF"
                                />
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
                                <FontAwesome6
                                    name="wallet"
                                    solid
                                    size={18}
                                    color="#FFF"
                                />
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
                                        fontSize: 11.5,
                                        color: "#6B7280",
                                        lineHeight: 16,
                                        marginTop: 4,
                                    }}
                                >
                                    Pay with your credit balance and pay the rest with cash or card.
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
                    onPress={() => setPaymentMethod("cash")}
                />

                <View style={{ height: 12 }} />

                {/* CARD */}
                <PaymentOptionCard
                    title="Pay with Card"
                    description="Pay the full amount using your card."
                    total={paymentAmount}
                    icon="credit-card"
                    iconColor="#0788FF"
                    selected={paymentMethod === "card"}
                    onPress={() => setPaymentMethod("card")}
                />

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
                        <Ionicons
                            name="shield-checkmark"
                            size={18}
                            color="#268343"
                        />

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
                            fontSize: 11.5,
                            color: "#596B5E",
                            lineHeight: 16,
                            marginTop: 4,
                        }}
                    >
                        Your payment information is safe with us and will be processed securely.
                    </Text>
                </View>
            </ScrollView>

            {/* ─── FIXED BOTTOM SUMMARY & BUTTON ──────────────────────────────── */}
            <OrderSummary
                packageTotal={orderContext?.packageTotal || 0}
                productTotal={orderContext?.productTotal || 0}
                discount={(orderContext?.discount || 0) + couponDiscountAmount + deliveryFeeDiscount}
                deliveryFee={effectiveDeliveryCharge}
                grandTotal={totalAmount}
                buttonText={submitting ? "Processing..." : "Confirm Payment Method"}
                disabled={submitting}
                onCheckout={handleConfirm}
                containerStyle={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    marginBottom: 0,
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
                cartTotal={(orderContext?.packageTotal || 0) + (orderContext?.productTotal || 0)}
                cartId={orderContext?.cartId}
            />
        </SafeAreaView>
    );
};

export default PaymentMethod;