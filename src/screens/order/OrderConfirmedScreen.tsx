import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { RootStackParamList } from "../../types/types";
import { clearCart } from "@/store/cartSlice";
import { generateAndShareInvoicePdf, InvoiceData } from "@/utils/invoiceGenerator";
import orderService from "@/services/order/order.service";

type OrderConfirmedNavigationProp = StackNavigationProp<
    RootStackParamList,
    "OrderConfirmed"
>;

type OrderConfirmedRouteProp = RouteProp<
    RootStackParamList,
    "OrderConfirmed"
>;

interface Props {
    navigation: OrderConfirmedNavigationProp;
    route: OrderConfirmedRouteProp;
}

const OrderConfirmed: React.FC<Props> = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

    React.useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    const orderContext = route.params?.orderContext;
    const invoiceNo = route.params?.invoiceNumber || "INV-PENDING";
    const passedTotal = route.params?.total;

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    // ─── SCHEDULE DATE RESOLUTION ──────────────────────────────────────────────
    const calcOrders = orderContext?.checkoutDetails?.calculatedOrders || [];
    let displayScheduleDate = "As Scheduled";
    if (calcOrders.length > 0) {
        // Recurring schedule: display the 1st scheduled order date
        displayScheduleDate = calcOrders[0].date || (calcOrders[0] as any).dateStr || "As Scheduled";
    } else if (orderContext?.checkoutDetails?.deliveryDate) {
        // One Time order delivery date
        displayScheduleDate = orderContext.checkoutDetails.deliveryDate;
    } else if (route.params?.deliveryDate || route.params?.scheduleDate) {
        displayScheduleDate = route.params?.deliveryDate || route.params?.scheduleDate || "As Scheduled";
    }

    const displayScheduleTime =
        orderContext?.checkoutDetails?.timeSlot ||
        route.params?.timeSlot ||
        "08:00 AM - 12:00 PM";

    // ─── TOTALS & BREAKDOWN ────────────────────────────────────────────────────
    const packageTotal = orderContext?.packageTotal || 0;
    const productTotal = orderContext?.productTotal || 0;
    const discount = orderContext?.discount || 0;
    const deliveryFee = orderContext?.deliveryCharge || 0;

    const total = passedTotal !== undefined
        ? passedTotal
        : (orderContext?.grandTotal !== undefined
            ? orderContext.grandTotal
            : Math.max(0, packageTotal + productTotal - discount + deliveryFee));

    const formatAmount = (amount: number) =>
        amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const handleBackHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
        });
    };

    const getInvoicePayload = async (): Promise<InvoiceData> => {
        const orderId = route.params?.orderId;
        if (orderId) {
            try {
                const res = await orderService.getInvoice(orderId);
                if (res.data?.status && res.data?.invoice) {
                    return res.data.invoice;
                }
            } catch (e) {
                console.warn("Could not fetch full invoice from API, falling back to local data:", e);
            }
        }

        // Fallback to local orderContext
        return {
            invoiceNumber: invoiceNo,
            invoiceDate: formattedDate,
            scheduledDate: displayScheduleDate,
            scheduleTimeSlot: displayScheduleTime,
            deliveryMethod: orderContext?.deliveryMethod || "home",
            paymentMethod: orderContext?.paymentMethod || "cash",
            packageTotal,
            productTotal,
            discount: String(discount),
            deliveryFee: String(deliveryFee),
            grandTotal: String(total),
            billingInfo: {
                fullName: orderContext?.checkoutDetails?.fullName || "Valued Customer",
                phone: orderContext?.checkoutDetails?.phone1 || "N/A",
                houseNo: orderContext?.checkoutDetails?.houseNo || "",
                street: orderContext?.checkoutDetails?.street || "",
                city: orderContext?.checkoutDetails?.cityName || "",
                buildingType: orderContext?.checkoutDetails?.buildingType || "House",
                buildingNo: orderContext?.checkoutDetails?.buildingNo || "",
                apartmentName: orderContext?.checkoutDetails?.buildingName || "",
                flatNo: orderContext?.checkoutDetails?.flatNumber || "",
                floorNo: orderContext?.checkoutDetails?.floorNumber || "",
            },
        };
    };

    const handleDownloadInvoice = async () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const invoiceData = await getInvoicePayload();
            await generateAndShareInvoicePdf(invoiceData, true);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleShareInvoice = async () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const invoiceData = await getInvoicePayload();
            await generateAndShareInvoicePdf(invoiceData, false);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* ─── SCROLLABLE CONTENT (Main content centered in screen) ──────── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    paddingHorizontal: 18,
                    paddingTop: 20,
                    paddingBottom: 28,
                }}
            >
                {/* ─── ORDER CONFIRMED TITLE ──────────────────────────────────── */}
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "800",
                        color: "#111111",
                    }}
                >
                    Order Confirmed!
                </Text>

                {/* ─── CONFIRMED STAR BADGE (Previous original design) ────────── */}
                <View
                    style={{
                        alignSelf: "center",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#F1F1F5",
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        marginTop: 12,
                        marginBottom: 10,
                    }}
                >
                    <Ionicons
                        name="star"
                        size={10}
                        color="#111111"
                    />
                    <Text
                        style={{
                            fontSize: 11,
                            color: "#222222",
                            fontWeight: "600",
                            marginLeft: 4,
                        }}
                    >
                        Confirmed
                    </Text>
                </View>

                {/* Subtitle Description */}
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 13,
                        lineHeight: 19,
                        color: "#62667A",
                        marginHorizontal: 16,
                        marginBottom: 16,
                    }}
                >
                    Thank you! Your order has been placed
                    {"\n"}
                    successfully. We'll deliver it as scheduled.
                </Text>

                {/* ─── ORDER ID BOX ────────────────────────────────────────────── */}
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: "#DDE3E9",
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        marginBottom: 14,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            color: "#747990",
                            fontWeight: "500",
                        }}
                    >
                        Order ID
                    </Text>

                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111111",
                            marginTop: 2,
                        }}
                    >
                        [{invoiceNo}]
                    </Text>

                    <Text
                        style={{
                            fontSize: 11.5,
                            color: "#747990",
                            marginTop: 4,
                        }}
                    >
                        At {formattedTime} on {formattedDate}
                    </Text>
                </View>

                {/* ─── SCHEDULE DATE CARD ──────────────────────────────────────── */}
                <View
                    style={{
                        height: 59,
                        borderRadius: 12,
                        backgroundColor: "#F3F3F7",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        marginBottom: 10,
                    }}
                >
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 10,
                        }}
                    >
                        <Ionicons
                            name="calendar"
                            size={18}
                            color="#FFFFFF"
                        />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#747990",
                            }}
                        >
                            Schedule Date
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: "#111111",
                                fontWeight: "600",
                                marginTop: 1,
                            }}
                        >
                            {displayScheduleDate}
                        </Text>
                    </View>
                </View>

                {/* ─── SCHEDULE TIME SLOT CARD ─────────────────────────────────── */}
                <View
                    style={{
                        height: 59,
                        borderRadius: 12,
                        backgroundColor: "#F3F3F7",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        marginBottom: 16,
                    }}
                >
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 10,
                        }}
                    >
                        <Ionicons
                            name="time"
                            size={18}
                            color="#FFFFFF"
                        />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#747990",
                            }}
                        >
                            Schedule Time Slot
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: "#111111",
                                fontWeight: "600",
                                marginTop: 1,
                            }}
                        >
                            {displayScheduleTime}
                        </Text>
                    </View>
                </View>

                {/* ─── ORDER SUMMARY CARD ──────────────────────────────────────── */}
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#111111",
                        marginBottom: 6,
                        marginLeft: 2,
                    }}
                >
                    Order Summary
                </Text>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: "#DDE3E9",
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        marginBottom: 14,
                    }}
                >
                    {/* For Packages (only if > 0) */}
                    {packageTotal > 0 && (
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                paddingVertical: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, color: "#60647A" }}>
                                For Packages
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}>
                                Rs. {formatAmount(packageTotal)}
                            </Text>
                        </View>
                    )}

                    {/* Ala Carte Items (only if > 0) */}
                    {productTotal > 0 && (
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                paddingVertical: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, color: "#60647A" }}>
                                Ala Carte Items
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}>
                                Rs. {formatAmount(productTotal)}
                            </Text>
                        </View>
                    )}

                    {/* Discount (only if > 0) */}
                    {discount > 0 && (
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                paddingVertical: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, color: "#60647A" }}>
                                Discount
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}>
                                - Rs. {formatAmount(discount)}
                            </Text>
                        </View>
                    )}

                    {/* Delivery Fee (ONLY if > 0 - never show if 0) */}
                    {deliveryFee > 0 && (
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                paddingVertical: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, color: "#60647A" }}>
                                Delivery Fee
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}>
                                + Rs. {formatAmount(deliveryFee)}
                            </Text>
                        </View>
                    )}

                    {/* Divider */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E4E6EA",
                            marginVertical: 6,
                        }}
                    />

                    {/* Total */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14.5,
                                fontWeight: "700",
                                color: "#111111",
                            }}
                        >
                            Total
                        </Text>

                        <Text
                            style={{
                                fontSize: 15.5,
                                fontWeight: "800",
                                color: "#111111",
                            }}
                        >
                            Rs. {formatAmount(total)}
                        </Text>
                    </View>
                </View>

                {/* ─── DELIVERY NOTIFICATION BANNER ─────────────────────────────── */}
                <View
                    style={{
                        height: 38,
                        borderRadius: 20,
                        backgroundColor: "#F3F3F5",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        marginBottom: 14,
                    }}
                >
                    <View
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 8,
                        }}
                    >
                        <Ionicons
                            name="notifications"
                            size={12}
                            color="#FFFFFF"
                        />
                    </View>

                    <Text
                        style={{
                            fontSize: 11,
                            color: "#555A68",
                            flex: 1,
                        }}
                    >
                        We'll notify you once your order is on the way.
                    </Text>
                </View>

                {/* ─── DIRECT BACK TO HOME BUTTON ──────────────────────────────── */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleBackHome}
                    style={{
                        height: 48,
                        borderRadius: 25,
                        backgroundColor: "#000000",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 14,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.18,
                        shadowRadius: 5,
                        elevation: 5,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "800",
                        }}
                    >
                        Direct Back to Home
                    </Text>
                </TouchableOpacity>

                {/* ─── INVOICE BUTTONS (Download & Share) ───────────────────────── */}
                <View
                    style={{
                        flexDirection: "row",
                        gap: 10,
                    }}
                >
                    {/* Download */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleDownloadInvoice}
                        style={{
                            flex: 1,
                            height: 48,
                            borderWidth: 1,
                            borderColor: "#111111",
                            borderRadius: 25,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FFFFFF",
                        }}
                    >
                        <Ionicons
                            name="download-outline"
                            size={16}
                            color="#111111"
                        />
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#111111",
                                marginLeft: 6,
                                fontWeight: "600",
                            }}
                        >
                            Download Invoice
                        </Text>
                    </TouchableOpacity>

                    {/* Share */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleShareInvoice}
                        style={{
                            flex: 1,
                            height: 48,
                            borderWidth: 1,
                            borderColor: "#111111",
                            borderRadius: 25,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FFFFFF",
                        }}
                    >
                        <Ionicons
                            name="share-outline"
                            size={16}
                            color="#111111"
                        />
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#111111",
                                marginLeft: 6,
                                fontWeight: "600",
                            }}
                        >
                            Share Invoice
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default OrderConfirmed;