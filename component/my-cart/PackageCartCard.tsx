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

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <View
            style={{
                backgroundColor: "#FFF",
                borderRadius: 20,
                padding: 20,
                marginBottom: 14,

                borderWidth: 1,
                borderColor: "#E9E9E9",

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
                            color: "#111",
                        }}
                    >
                        {item.name}
                    </Text>

                    <Text
                        style={{
                            marginTop: 4,
                            fontSize: 17,
                            fontWeight: "700",
                            color: "#111",
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
                        color="#000"
                    />
                </TouchableOpacity>
            </View>

            {/* DIVIDER */}

            <View className="flex-row items-center my-4">
                <View className="flex-1 h-[1px] overflow-hidden">
                    <View className="flex-row">
                        {Array.from({ length: 100 }).map((_, index) => (
                            <View
                                key={index}
                                className="w-1 h-[1px] bg-[#D9D9D9] mr-1"
                            />
                        ))}
                    </View>
                </View>
            </View>

            {/* BOTTOM */}

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

                        backgroundColor: isMinimum
                            ? "#D9D9D9"
                            : "#000",
                    }}
                >
                    <Ionicons
                        name="remove"
                        size={16}
                        color="#FFF"
                    />
                </TouchableOpacity>)
                :
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

                        backgroundColor: isMinimum
                            ? "#D9D9D9"
                            : "#000",
                    }}
                >
                    <FontAwesome6
                        name="trash"
                        size={17}
                        color="#FFF"
                    />
                </TouchableOpacity>}

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
                    <Ionicons
                        name="add"
                        size={18}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PackageCartCard;