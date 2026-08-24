import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { PaymentOptionCard } from "@/component/payment/PaymentOptionCard";

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
    /*
     * You can get the total from route params.
     * Example:
     *
     * navigation.navigate("PaymentMethod", {
     *     total: 880,
     * });
     */

    const totalAmount = Number(route.params?.total || 880);

    // Example credit balance
    const creditBalance = 300;

    const [paymentMethod, setPaymentMethod] = useState<PaymentType>("cash");
    const [useCredit, setUseCredit] = useState(false);

    // FORMAT MONEY
    const formatAmount = (amount: number) => {
        return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const creditUsed = useCredit
        ? Math.min(creditBalance, totalAmount)
        : 0;

    const remainingAfterCredit = totalAmount - creditUsed;

    const paymentAmount = useCredit
        ? remainingAfterCredit
        : totalAmount;

    // DISPLAY PAYMENT METHOD
    const getPaymentLabel = () => {
        if (paymentMethod === "cash") {
            return "Pay with Cash";
        }

        if (paymentMethod === "card") {
            return "Pay with Card";
        }
    };

    // CONFIRM
    const handleConfirm = () => {
        console.log("Payment Method:", paymentMethod);
        navigation.navigate("OrderConfirmed")
        /*
         * API / next navigation here
         *
         * navigation.navigate("OrderSummary", {
         *     paymentMethod,
         *     total: totalAmount,
         * });
         */
    };

    return (
        <View
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
                    paddingBottom: 180,
                }}
            >

                {/* DESCRIPTION */}
                <Text
                    style={{
                        textAlign: "center",
                        color: "#5F6280",
                        fontSize: 12,
                        marginTop: 12,
                        marginBottom: 14,
                    }}
                >
                    Choose how you want to pay for this order.
                </Text>

                {/* TOTAL AMOUNT */}
                <View
                    style={{
                        height: 36,
                        marginBottom: 15,
                        backgroundColor: "#F2F2F6",
                        marginHorizontal: 15,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 8,
                        borderTopLeftRadius: 19,
                        borderTopRightRadius: 19
                    }}
                >
                    <View
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#000",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons
                            name="wallet"
                            size={12}
                            color="#FFF"
                        />
                    </View>

                    <Text
                        style={{
                            flex: 1,
                            marginLeft: 8,
                            fontSize: 14,
                            color: "#0000",
                        }}
                    >
                        Total Amount
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: "#000",
                        }}
                    >
                        Rs. {formatAmount(totalAmount)}
                    </Text>
                </View>

                {/* CREDIT BALANCE */}
                {creditBalance > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setUseCredit(!useCredit)}
                        style={{
                            marginHorizontal: 15,
                            minHeight: 120,

                            borderWidth: 1,
                            borderColor:
                                useCredit
                                    ? "#FF9114"
                                    : "#DDE3E9",

                            borderRadius: 18,

                            paddingHorizontal: 15,
                            paddingVertical: 12,

                            backgroundColor:
                                useCredit
                                    ? "#FFF4E8"
                                    : "#FFFFFF",

                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity:
                                useCredit
                                    ? 0.08
                                    : 0.04,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        {/* Recommended */}

                        <View
                            style={{
                                position: "absolute",
                                top: 9,
                                left: 55,

                                backgroundColor:
                                    useCredit
                                        ? "#34C759"
                                        : "#000",

                                borderRadius: 3,

                                paddingHorizontal: 5,
                                paddingVertical: 2,
                            }}
                        >
                            <View style={{ flexDirection: "row", gap: "5", alignItems: "center" }}>
                                <FontAwesome6 name={useCredit ? "check" : "star"}
                                    solid
                                    size={10}
                                    color="#FFF" />
                                <Text
                                    style={{
                                        color: "#FFF",
                                        fontSize: 9,
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
                                top: 9,
                                right: 9,

                                width: 18,
                                height: 18,

                                borderRadius: 5,

                                backgroundColor:
                                    useCredit
                                        ? "#FF9114"
                                        : "#FFF",

                                borderWidth:
                                    useCredit
                                        ? 0
                                        : 2,

                                borderColor: "#111",

                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {useCredit && (
                                <Ionicons
                                    name="checkmark"
                                    size={12}
                                    color="#FFF"
                                />
                            )}
                        </View>

                        {/* Content */}

                        <View
                            style={{
                                flexDirection: "row",
                                marginTop: 28,
                            }}
                        >
                            {/* Credit Icon */}

                            <View
                                style={{
                                    width: 33,
                                    height: 33,
                                    borderRadius: 99,

                                    backgroundColor:
                                        useCredit
                                            ? "#FF9114"
                                            : "#FF9114",

                                    justifyContent: "center",
                                    alignItems: "center",

                                    marginRight: 10,
                                }}
                            >
                                <FontAwesome6
                                    name="wallet"
                                    solid
                                    size={16}
                                    color="#FFF"
                                />
                            </View>

                            {/* Content */}

                            <View
                                style={{
                                    flex: 1,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "800",
                                        color: "#111",
                                    }}
                                >
                                    Use Credit Balance
                                </Text>

                                {/* Available Balance */}

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#666",
                                        marginTop: 5,
                                    }}
                                >
                                    Available Balance :{" "}
                                    <Text
                                        style={{
                                            color:
                                                useCredit
                                                    ? "#FF9114"
                                                    : "#0000",

                                            fontWeight: "800",
                                        }}
                                    >
                                        Rs.{" "}
                                        {creditBalance.toLocaleString(
                                            "en-US",
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}
                                    </Text>
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: "#777",
                                        lineHeight: 15,
                                        marginTop: 5,
                                    }}
                                >
                                    Pay with your credit balance and pay
                                    the rest with cash or card.
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
                        marginTop: 28,
                        marginBottom: 15,
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
                            fontSize: 11,
                            color: "#494A65",
                            marginHorizontal: 7,
                        }}
                    >
                        Basic Payment Methods
                    </Text>

                    <View
                        style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: "#E1E5E9",
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

                {/* CARD */}
                <View style={{ height: 13 }} /> {/*for gap creating*/}

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
                        marginTop: 22,

                        backgroundColor: "#EDFFF2",

                        borderRadius: 17,

                        paddingHorizontal: 12,
                        paddingVertical: 11,
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
                            size={16}
                            color="#268343"
                        />

                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "800",
                                color: "#268343",
                                marginLeft: 5,
                            }}
                        >
                            100% Secure Payments
                        </Text>
                    </View>

                    <Text
                        style={{
                            fontSize: 9,
                            color: "#596B5E",
                            lineHeight: 14,
                            marginTop: 4,
                        }}
                    >
                        Your payment information is safe with us
                        and will be processed securely.
                    </Text>
                </View>
            </ScrollView>

            {/* BOTTOM PAYMENT SUMMARY */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,

                    backgroundColor: "#FFFFFF",

                    paddingTop: 12,
                    paddingBottom: 10,
                    paddingHorizontal: 14,

                    borderTopWidth: 1,
                    borderTopColor: "#EEEEEE",

                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: -3,
                    },
                    shadowOpacity: 0.08,
                    shadowRadius: 7,

                    elevation: 12,
                }}
            >
                {/* Selected payment */}
                {useCredit && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <FontAwesome6
                            name="wallet"
                            solid
                            size={17}
                            color="#000000"
                        />

                        <Text
                            style={{
                                flex: 1,
                                marginLeft: 5,
                                fontSize: 13,
                                color: "#333",
                            }}
                        >
                            Pay with Credit Balance
                        </Text>

                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: "#00000",
                            }}
                        >
                            Rs.{" "}
                            {creditUsed.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Text>
                    </View>
                )}

                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingBottom: 10,
                    }}
                >
                    <FontAwesome6
                        name={
                            paymentMethod === "cash"
                                ? "money-bill-wave"
                                : paymentMethod === "card"
                                    ? "credit-card"
                                    : "credit-card"
                        }
                        solid
                        size={16}
                        color="#111"
                    />

                    <Text
                        style={{
                            flex: 1,
                            fontSize: 13,
                            color: "#333",
                            marginLeft: 5,
                        }}
                    >
                        {getPaymentLabel()}
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#111",
                        }}
                    >
                        Rs.{" "}
                        {formatAmount(
                            paymentAmount
                        )}
                    </Text>
                </View>

                {/* Divider */}

                <View
                    style={{
                        height: 1,
                        backgroundColor: "#EEEEEE",
                        marginHorizontal: -14,
                    }}
                />

                {/* Total */}

                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                    }}
                >
                    <Text
                        style={{
                            flex: 1,
                            fontSize: 13,
                            color: "#111",
                            fontWeight: "500",
                        }}
                    >
                        Total
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            color: "#111",
                            fontWeight: "800",
                        }}
                    >
                        Rs.{" "}
                        {formatAmount(totalAmount)}
                    </Text>
                </View>

                {/* Confirm Button */}

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleConfirm}
                    style={{
                        height: 48,

                        backgroundColor: "#000",

                        borderRadius: 25,

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
                        Confirm Payment Method
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PaymentMethod;