import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
    packageTotal: number;
    productTotal: number;
    discount: number;
    // onCheckout?: () => void;
}

const OrderSummary: React.FC<Props> = ({
    packageTotal,
    productTotal,
    discount,
    // onCheckout,
}) => {
    const total = packageTotal + productTotal - discount;

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <View
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,

                backgroundColor: "#FFF",

                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,

                paddingHorizontal: 18,
                paddingTop: 20,
                paddingBottom: 28,

                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: {
                    width: 0,
                    height: -2,
                },
                elevation: 15,
            }}
        >
            {/* Package */}

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <Text
                    style={{
                        fontSize: 15,
                        color: "#5B5B5B",
                    }}
                >
                    For Packages
                </Text>

                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: "600",
                    }}
                >
                    Rs. {formatPrice(packageTotal)}
                </Text>
            </View>

            {/* Products */}

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <Text
                    style={{
                        fontSize: 15,
                        color: "#5B5B5B",
                    }}
                >
                    Ala Carte Items
                </Text>

                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: "600",
                    }}
                >
                    Rs. {formatPrice(productTotal)}
                </Text>
            </View>

            {/* Discount */}

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <Text
                    style={{
                        fontSize: 15,
                        color: "#5B5B5B",
                    }}
                >
                    Discount
                </Text>

                <Text
                    style={{
                        fontSize: 15,
                        color: "#D62828",
                        fontWeight: "700",
                    }}
                >
                    - Rs. {formatPrice(discount)}
                </Text>
            </View>

            {/* Divider */}

            <View
                style={{
                    height: 1,
                    backgroundColor: "#ECECEC",
                    marginBottom: 18,
                }}
            />

            {/* Total */}

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 24,
                }}
            >
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "700",
                    }}
                >
                    Total
                </Text>

                <Text
                    style={{
                        fontSize: 20,
                        fontWeight: "800",
                    }}
                >
                    Rs. {formatPrice(total)}
                </Text>
            </View>

            {/* Checkout */}

            <TouchableOpacity
                activeOpacity={0.85}
                // onPress={onCheckout}
                style={{
                    height: 56,
                    backgroundColor: "#000",
                    borderRadius: 30,

                    justifyContent: "center",
                    alignItems: "center",

                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowRadius: 6,
                    shadowOffset: {
                        width: 0,
                        height: 3,
                    },
                    elevation: 6,
                }}
            >
                <Text
                    style={{
                        color: "#FFF",
                        fontSize: 17,
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