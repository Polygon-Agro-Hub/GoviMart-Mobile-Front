import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";

import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { clearCart } from "@/store/cartSlice";

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

    React.useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

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

    const order = {
        invoiceNumber: invoiceNo,
        orderDate: formattedDate,
        orderTime: formattedTime,
        scheduleDate: "As Scheduled",
        scheduleTime: "Standard Slot",
        itemsTotal: passedTotal || 600,
        discount: 0,
        deliveryFee: 0,
    };

    const total = passedTotal !== undefined ? passedTotal : (
        order.itemsTotal -
        order.discount +
        order.deliveryFee
    );

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

    const handleDownloadInvoice = () => {
        Alert.alert(
            "Download Invoice",
            "Invoice download will be available here."
        );
    };

    const handleShareInvoice = () => {
        Alert.alert(
            "Share Invoice",
            "Invoice sharing will be available here."
        );
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 17,
                    paddingTop: 25,
                    paddingBottom: 25,
                }}
            >
                {/* ================================================= */}
                {/* ORDER CONFIRMED */}
                {/* ================================================= */}

                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 19,
                        fontWeight: "800",
                        color: "#111111",
                    }}
                >
                    Order Confirmed!
                </Text>

                {/* Confirmed Badge */}

                <View
                    style={{
                        alignSelf: "center",
                        flexDirection: "row",
                        alignItems: "center",

                        backgroundColor: "#F1F1F5",

                        borderRadius: 20,

                        paddingHorizontal: 9,
                        paddingVertical: 4,

                        marginTop: 17,
                    }}
                >
                    <Ionicons
                        name="star"
                        size={10}
                        color="#111"
                    />

                    <Text
                        style={{
                            fontSize: 11,
                            color: "#222",
                            marginLeft: 4,
                        }}
                    >
                        Confirmed
                    </Text>
                </View>

                {/* Description */}

                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 17,
                        color: "#62667A",
                        marginTop: 12,
                        marginHorizontal: 20,
                    }}
                >
                    Thank you! Your order has been placed
                    {"\n"}
                    successfully. We'll deliver it as scheduled.
                </Text>

                {/* ================================================= */}
                {/* ORDER ID */}
                {/* ================================================= */}

                <View
                    style={{
                        marginTop: 16,

                        borderWidth: 1,
                        borderColor: "#DDE3E9",

                        borderRadius: 9,

                        paddingHorizontal: 10,
                        paddingVertical: 8,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 10,
                            color: "#747990",
                        }}
                    >
                        Order ID
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#111",
                            marginTop: 3,
                        }}
                    >
                        [{order.invoiceNumber}]
                    </Text>

                    <Text
                        style={{
                            fontSize: 10,
                            color: "#747990",
                            marginTop: 5,
                        }}
                    >
                        At {order.orderTime} on {order.orderDate}
                    </Text>
                </View>

                {/* ================================================= */}
                {/* SCHEDULE DATE */}
                {/* ================================================= */}

                <View
                    style={{
                        height: 59,

                        marginTop: 20,

                        borderRadius: 10,

                        backgroundColor: "#F3F3F7",

                        flexDirection: "row",
                        alignItems: "center",

                        paddingHorizontal: 10,
                    }}
                >
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,

                            backgroundColor: "#000",

                            justifyContent: "center",
                            alignItems: "center",

                            marginRight: 9,
                        }}
                    >
                        <Ionicons
                            name="calendar"
                            size={17}
                            color="#FFFFFF"
                        />
                    </View>

                    <View>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#747990",
                            }}
                        >
                            Schedule Date
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: "#111",
                                fontWeight: "600",
                                marginTop: 2,
                            }}
                        >
                            {order.scheduleDate}
                        </Text>
                    </View>
                </View>

                {/* ================================================= */}
                {/* SCHEDULE TIME */}
                {/* ================================================= */}

                <View
                    style={{
                        height: 59,

                        marginTop: 10,

                        borderRadius: 10,

                        backgroundColor: "#F3F3F7",

                        flexDirection: "row",
                        alignItems: "center",

                        paddingHorizontal: 10,
                    }}
                >
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,

                            backgroundColor: "#000",

                            justifyContent: "center",
                            alignItems: "center",

                            marginRight: 9,
                        }}
                    >
                        <Ionicons
                            name="time"
                            size={18}
                            color="#FFFFFF"
                        />
                    </View>

                    <View>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#747990",
                            }}
                        >
                            Schedule Time Slot
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: "#111",
                                fontWeight: "600",
                                marginTop: 2,
                            }}
                        >
                            {order.scheduleTime}
                        </Text>
                    </View>
                </View>

                {/* ================================================= */}
                {/* ORDER SUMMARY */}
                {/* ================================================= */}

                <Text
                    style={{
                        fontSize: 12,
                        color: "#111",
                        marginTop: 37,
                        marginBottom: 6,
                    }}
                >
                    Order Summary
                </Text>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: "#DDE3E9",
                        borderRadius: 9,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                    }}
                >
                    {/* Items */}

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#60647A",
                            }}
                        >
                            Ala Carte Items
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                color: "#222",
                            }}
                        >
                            Rs. {formatAmount(order.itemsTotal)}
                        </Text>
                    </View>

                    {/* Discount */}

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#60647A",
                            }}
                        >
                            Discount
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                color: "#222",
                            }}
                        >
                            - Rs. {formatAmount(order.discount)}
                        </Text>
                    </View>

                    {/* Delivery */}

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#60647A",
                            }}
                        >
                            Delivery Fee
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                color: "#222",
                            }}
                        >
                            + Rs. {formatAmount(order.deliveryFee)}
                        </Text>
                    </View>

                    {/* Divider */}

                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E4E6EA",
                            marginVertical: 4,
                        }}
                    />

                    {/* Total */}

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: "#111",
                            }}
                        >
                            Total
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "800",
                                color: "#111",
                            }}
                        >
                            Rs. {formatAmount(total)}
                        </Text>
                    </View>
                </View>

                {/* ================================================= */}
                {/* DELIVERY NOTIFICATION */}
                {/* ================================================= */}

                <View
                    style={{
                        height: 38,

                        marginTop: 20,

                        borderRadius: 20,

                        backgroundColor: "#F3F3F5",

                        flexDirection: "row",
                        alignItems: "center",

                        paddingHorizontal: 10,
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
                            fontSize: 10,
                            color: "#555A68",
                        }}
                    >
                        We'll notify you once your order is on the way.
                    </Text>
                </View>

                {/* ================================================= */}
                {/* BACK TO HOME */}
                {/* ================================================= */}

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleBackHome}
                    style={{
                        height: 48,

                        marginTop: 12,

                        borderRadius: 25,

                        backgroundColor: "#000000",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
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

                {/* ================================================= */}
                {/* INVOICE BUTTONS */}
                {/* ================================================= */}

                <View
                    style={{
                        flexDirection: "row",
                        marginTop: 26,
                        marginBottom: 4,
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
                            borderColor: "#111",

                            borderRadius: 25,

                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",

                            marginRight: 9,
                        }}
                    >
                        <Ionicons
                            name="download"
                            size={16}
                            color="#111"
                        />

                        <Text
                            style={{
                                fontSize: 11,
                                color: "#111",
                                marginLeft: 6,
                                fontWeight: "500",
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
                            borderColor: "#111",

                            borderRadius: 25,

                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",

                            marginLeft: 9,
                        }}
                    >
                        <Ionicons
                            name="share-outline"
                            size={17}
                            color="#111"
                        />

                        <Text
                            style={{
                                fontSize: 11,
                                color: "#111",
                                marginLeft: 6,
                                fontWeight: "500",
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