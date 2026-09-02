import React from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

interface PackageItem {
    id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    totalItems: number;
    isUnavailable?: boolean;
}

interface Props {
    item: PackageItem;

    onIncrease: (id: number) => void;
    onDecrease: (id: number) => void;
    onDelete: (id: number) => void;
}

const PackageCartCard: React.FC<Props> = ({
    item,
    onIncrease,
    onDecrease,
    onDelete,
}) => {
    const isMinimum = item.quantity <= 1;
    const isUnavailable = !!item.isUnavailable;

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const activeColor = isUnavailable ? "#FF383C" : "#111";
    const borderColor = isUnavailable ? "#FF383C" : "#E9E9E9";

    return (
        <View
            style={{
                backgroundColor: "#FFF",
                borderRadius: 20,
                padding: 20,
                marginBottom: 14,
                borderWidth: 1.5,
                borderColor: borderColor,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                elevation: 2,
            }}
        >
            {/* TOP */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                {/* Package Image */}
                <Image
                    source={{ uri: item.image }}
                    style={{
                        width: 62,
                        height: 62,
                        borderRadius: 14,
                    }}
                />

                {/* Package Details */}
                <View
                    style={{
                        flex: 1,
                        marginLeft: 12,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "600",
                            color: activeColor,
                        }}
                    >
                        {item.name}
                    </Text>

                    <Text
                        style={{
                            marginTop: 4,
                            fontSize: 17,
                            fontWeight: "700",
                            color: activeColor,
                        }}
                    >
                        Rs. {formatPrice(item.price)}
                    </Text>
                </View>

                {/* DELETE */}
                <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    activeOpacity={0.8}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#FFF",
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: isUnavailable ? 1 : 0,
                        borderColor: isUnavailable ? "#FF383C" : "transparent",
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        shadowOffset: {
                            width: 0,
                            height: 2,
                        },
                        elevation: 3,
                    }}
                >
                    <FontAwesome6
                        name="trash"
                        size={17}
                        color={isUnavailable ? "#FF383C" : "#000"}
                    />
                </TouchableOpacity>
            </View>

            {/* DIVIDER */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 16,
                    marginHorizontal: -20,
                }}
            >
                <View style={{ flex: 1, height: 1, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row" }}>
                        {Array.from({ length: 100 }).map((_, index) => (
                            <View
                                key={index}
                                style={{
                                    width: 4,
                                    height: 1,
                                    backgroundColor: isUnavailable ? "#FF383C" : "#D9D9D9",
                                    marginRight: 4,
                                }}
                            />
                        ))}
                    </View>
                </View>
            </View>

            {/* BOTTOM */}
            {isUnavailable ? (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#FF383C",
                        }}
                    >
                        Qty : <Text style={{ fontWeight: "700" }}>{item.quantity}</Text>
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#FF383C",
                        }}
                    >
                        No longer available
                    </Text>
                </View>
            ) : (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    {/* TOTAL ITEMS */}
                    <Text
                        style={{
                            fontSize: 14,
                            color: "#777",
                        }}
                    >
                        Total Items:{" "}
                        <Text
                            style={{
                                color: "#111",
                                fontWeight: "600",
                            }}
                        >
                            {item.totalItems}
                        </Text>
                    </Text>

                    <View style={{ flex: 1 }} />

                    {/* MINUS */}
                    {!isMinimum ? (
                        <TouchableOpacity
                            disabled={isMinimum}
                            onPress={() => onDecrease(item.id)}
                            activeOpacity={0.8}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: isMinimum ? "#D9D9D9" : "#000",
                            }}
                        >
                            <Ionicons name="remove" size={16} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            disabled={isMinimum}
                            onPress={() => onDecrease(item.id)}
                            activeOpacity={0.8}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 16,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: isMinimum ? "#D9D9D9" : "#000",
                            }}
                        >
                            <FontAwesome6 name="trash" size={17} color="#FFF" />
                        </TouchableOpacity>
                    )}

                    {/* QUANTITY */}
                    <Text
                        style={{
                            minWidth: 48,
                            textAlign: "center",
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111",
                        }}
                    >
                        {item.quantity}
                    </Text>

                    {/* PLUS */}
                    <TouchableOpacity
                        onPress={() => onIncrease(item.id)}
                        activeOpacity={0.8}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#000",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons name="add" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default PackageCartCard;