import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PackageItem {
    id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    totalItems: number;
}

interface Props {
    item: PackageItem;
}

const PackageCartCard: React.FC<Props> = ({
    item,
}) => {
    const [qty, setQty] = useState(item.quantity);

    return (
        <View
            style={{
                backgroundColor: "#F3F3F3",
                borderRadius: 20,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#E5E7EB",
            }}
        >
            {/* Top */}

            <View
                style={{
                    flexDirection: "row",
                    padding: 14,
                }}
            >
                <Image
                    source={{ uri: item.image }}
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                    }}
                />

                <View
                    style={{
                        flex: 1,
                        marginLeft: 12,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#111827",
                        }}
                    >
                        {item.name}
                    </Text>

                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#000",
                            marginTop: 4,
                        }}
                    >
                        Rs.{" "}
                        {item.price.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                </View>

                {/* Delete */}

                <TouchableOpacity
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: "#EAEAEA",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Ionicons
                        name="trash"
                        size={16}
                        color="#000"
                    />
                </TouchableOpacity>
            </View>

            {/* Bottom */}

            <View
                style={{
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                }}
            >
                <Text
                    style={{
                        color: "#808080",
                        fontSize: 13,
                    }}
                >
                    Total Items : {item.totalItems}
                </Text>

                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    {/* Minus */}

                    <TouchableOpacity
                        onPress={() =>
                            qty > 1 && setQty(qty - 1)
                        }
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor:
                                qty === 1 ? "#D9D9D9" : "#000",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons
                            name="remove"
                            size={14}
                            color="#FFF"
                        />
                    </TouchableOpacity>

                    <Text
                        style={{
                            marginHorizontal: 20,
                            fontSize: 15,
                            fontWeight: "600",
                        }}
                    >
                        {qty}
                    </Text>

                    {/* Plus */}

                    <TouchableOpacity
                        onPress={() => setQty(qty + 1)}
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: "#000",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons
                            name="add"
                            size={14}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default PackageCartCard;