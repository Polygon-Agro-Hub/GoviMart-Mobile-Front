import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";

interface Props {
    packageTotal: number;
    productTotal: number;
    discount: number;
    onCheckout?: () => void;
}

const OrderSummary: React.FC<Props> = ({
    packageTotal,
    productTotal,
    discount,
    onCheckout,
}) => {
    const total = Math.max(0, packageTotal + productTotal - discount);

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <View
            style={{
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
            }}
        >
            {/* For Packages */}
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

            {/* Ala Carte Items */}
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

            {/* Discount */}
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
                    {discount > 0 ? `- Rs. ${formatPrice(discount)}` : "- Rs. 0.00"}
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

            {/* Proceed to Checkout Button */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onCheckout}
                style={{
                    height: 54,
                    backgroundColor: "#000",
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: {
                        width: 0,
                        height: 3,
                    },
                    elevation: 5,
                }}
            >
                <Text
                    style={{
                        color: "#FFF",
                        fontSize: 16,
                        fontWeight: "700",
                    }}
                >
                    Proceed to Checkout
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default OrderSummary;