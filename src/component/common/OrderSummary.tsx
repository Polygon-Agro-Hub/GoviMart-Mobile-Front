import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    ViewStyle,
    StyleProp,
} from "react-native";

export interface OrderSummaryProps {
    packageTotal?: number;
    productTotal?: number;
    discount?: number;
    deliveryFee?: number;
    grandTotal?: number;
    buttonText?: string;
    disabled?: boolean;
    onCheckout?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
    packageTotal = 0,
    productTotal = 0,
    discount = 0,
    deliveryFee,
    grandTotal,
    buttonText = "Proceed to Checkout",
    disabled = false,
    onCheckout,
    containerStyle,
}) => {
    const calculatedTotal =
        (packageTotal || 0) +
        (productTotal || 0) -
        (discount || 0) +
        (deliveryFee || 0);

    const total =
        grandTotal !== undefined ? grandTotal : Math.max(0, calculatedTotal);

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <View
            style={[
                {
                    backgroundColor: "#FFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 20,
                    paddingTop: 22,
                    paddingBottom: Platform.OS === "ios" ? 34 : 28,
                    marginTop: 20,
                    marginBottom: -8,
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 8,
                    shadowOffset: {
                        width: 0,
                        height: -3,
                    },
                    elevation: 15,
                },
                containerStyle,
            ]}
        >
            {/* For Packages (only show if packageTotal > 0) */}
            {Boolean(packageTotal && packageTotal > 0) && (
                <>
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
                                fontWeight: "400",
                                color: "#000000",
                            }}
                        >
                            For Packages
                        </Text>

                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: "#000000",
                            }}
                        >
                            Rs. {formatPrice(packageTotal)}
                        </Text>
                    </View>

                    {/* HR line 1 */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E1E7EE",
                            marginVertical: 14,
                        }}
                    />
                </>
            )}

            {/* Ala Carte Items (only show if productTotal > 0) */}
            {Boolean(productTotal && productTotal > 0) && (
                <>
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
                                fontWeight: "400",
                                color: "#000000",
                            }}
                        >
                            Ala Carte Items
                        </Text>

                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: "#000000",
                            }}
                        >
                            Rs. {formatPrice(productTotal)}
                        </Text>
                    </View>

                    {/* HR line 2 */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E1E7EE",
                            marginVertical: 14,
                        }}
                    />
                </>
            )}

            {/* Discount (only show if discount > 0) */}
            {Boolean(discount && discount > 0) && (
                <>
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
                                fontWeight: "400",
                                color: "#000000",
                            }}
                        >
                            Discount
                        </Text>

                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: "#000000",
                            }}
                        >
                            - Rs. {formatPrice(discount)}
                        </Text>
                    </View>

                    {/* HR line 3 */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E1E7EE",
                            marginVertical: 14,
                        }}
                    />
                </>
            )}

            {/* Delivery Fee (only show if deliveryFee is provided) */}
            {deliveryFee !== undefined && (
                <>
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
                                fontWeight: "400",
                                color: "#000000",
                            }}
                        >
                            Delivery Fee
                        </Text>

                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: "#000000",
                            }}
                        >
                            {deliveryFee > 0 ? `+ Rs. ${formatPrice(deliveryFee)}` : "Free"}
                        </Text>
                    </View>

                    {/* HR line */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E1E7EE",
                            marginVertical: 14,
                        }}
                    />
                </>
            )}

            {/* Total */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 2,
                    marginBottom: 20,
                }}
            >
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#000000",
                    }}
                >
                    Total
                </Text>

                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#000000",
                    }}
                >
                    Rs. {formatPrice(total)}
                </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                activeOpacity={disabled ? 1 : 0.85}
                disabled={disabled}
                onPress={onCheckout}
                style={{
                    height: 54,
                    backgroundColor: disabled ? "#8799A3" : "#000000",
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: disabled ? 0 : 0.15,
                    shadowRadius: 6,
                    shadowOffset: {
                        width: 0,
                        height: 3,
                    },
                    elevation: disabled ? 0 : 5,
                }}
            >
                <Text
                    style={{
                        color: "#FFF",
                        fontSize: 16,
                        fontWeight: "700",
                    }}
                >
                    {buttonText}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default OrderSummary;
