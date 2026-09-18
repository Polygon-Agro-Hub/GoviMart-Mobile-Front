import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

export interface PaymentMethodSummaryProps {
    useCredit: boolean;
    creditUsed: number;
    paymentAmount: number;
    paymentMethod: "cash" | "card";
    totalAmount: number;
    submitting?: boolean;
    onConfirm: () => void;
    containerStyle?: StyleProp<ViewStyle>;
}

const PaymentMethodSummary: React.FC<PaymentMethodSummaryProps> = ({
    useCredit,
    creditUsed,
    paymentAmount,
    paymentMethod,
    totalAmount,
    submitting = false,
    onConfirm,
    containerStyle,
}) => {
    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const isCreditActive = useCredit && creditUsed > 0;
    const remainingAmount = isCreditActive ? paymentAmount : totalAmount;

    return (
        <View
            style={[
                {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: Platform.OS === "ios" ? 34 : 24,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    shadowOffset: {
                        width: 0,
                        height: -3,
                    },
                    elevation: 12,
                },
                containerStyle,
            ]}
        >
            {/* Pay with Credit Balance Row */}
            {isCreditActive && (
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 3,
                        marginBottom: remainingAmount > 0 ? 8 : 0,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 22,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8,
                            }}
                        >
                            <FontAwesome6 name="wallet" size={15} color="#111111" />
                        </View>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#111111",
                            }}
                        >
                            Pay with Credit Balance
                        </Text>
                    </View>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#111111",
                        }}
                    >
                        Rs. {formatPrice(creditUsed)}
                    </Text>
                </View>
            )}

            {/* Pay with Card or Cash Row */}
            {(!isCreditActive || remainingAmount > 0) && (
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 3,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 22,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8,
                            }}
                        >
                            {paymentMethod === "card" ? (
                                <FontAwesome6 name="credit-card" size={15} color="#111111" />
                            ) : (
                                <FontAwesome6 name="money-bill-1" size={15} color="#111111" />
                            )}
                        </View>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#111111",
                            }}
                        >
                            {paymentMethod === "card" ? "Pay with Card" : "Pay with Cash"}
                        </Text>
                    </View>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#111111",
                        }}
                    >
                        Rs. {formatPrice(remainingAmount)}
                    </Text>
                </View>
            )}

            {/* Divider Line */}
            <View
                style={{
                    height: 1,
                    backgroundColor: "#E5E7EB",
                    marginVertical: 12,
                }}
            />

            {/* Total Row */}
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
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#111111",
                    }}
                >
                    Total
                </Text>

                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#111111",
                    }}
                >
                    Rs. {formatPrice(totalAmount)}
                </Text>
            </View>

            {/* Confirm Payment Method Button */}
            <TouchableOpacity
                activeOpacity={submitting ? 1 : 0.85}
                disabled={submitting}
                onPress={onConfirm}
                style={{
                    height: 52,
                    backgroundColor: submitting ? "#8799A3" : "#000000",
                    borderRadius: 26,
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 16,
                    shadowColor: "#000",
                    shadowOpacity: submitting ? 0 : 0.15,
                    shadowRadius: 6,
                    shadowOffset: {
                        width: 0,
                        height: 3,
                    },
                    elevation: submitting ? 0 : 4,
                }}
            >
                {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 16,
                            fontWeight: "700",
                        }}
                    >
                        Confirm Payment Method
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default PaymentMethodSummary;
