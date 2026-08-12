import React from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

interface ProductItem {
    id: number;
    name: string;
    image: string;
    price: number;
    weight: number;
    unit: "g" | "kg";
    minimumWeight: number;
    step: number;
}

interface Props {
    item: ProductItem;
    onIncrease: (id: number) => void;
    onDecrease: (id: number) => void;
    onDelete: (id: number) => void;
    onChangeUnit: (id: number, unit: "g" | "kg") => void;
}

const ProductCartCard: React.FC<Props> = ({ item, onDecrease, onDelete, onIncrease, onChangeUnit }) => {
    const isMinimum = item.weight <= item.minimumWeight;

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
            {/* Top */}

            <View
                style={{
                    flexDirection: "row",
                }}
            >
                <Image
                    source={{ uri: item.image }}
                    style={{
                        width: 58,
                        height: 58,
                        borderRadius: 14,
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
                            fontSize: 17,
                            fontWeight: "600",
                        }}
                    >
                        {item.name}
                    </Text>

                    <Text
                        style={{
                            marginTop: 4,
                            fontWeight: "700",
                            fontSize: 18,
                        }}
                    >
                        Rs. {formatPrice(item.price)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: "#FFF",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <FontAwesome6
                        name="trash"
                        size={16}
                    />
                </TouchableOpacity>
            </View>

            {/* Divider */}

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

            {/* Bottom */}

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                <Text
                    style={{
                        color: "#7C7C7C",
                        fontSize: 14,
                    }}
                >
                    Unit :
                </Text>

                {/* kg */}

                <TouchableOpacity
                    onPress={() =>
                        onChangeUnit(item.id, "kg")
                    }
                    style={{
                        marginLeft: 10,
                        backgroundColor:
                            item.unit === "kg"
                                ? "#FF8C1A"
                                : "#FFD8B3",

                        paddingHorizontal: 16,
                        height: 28,
                        borderRadius: 14,

                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            color: "#FFF",
                        }}
                    >
                        kg
                    </Text>
                </TouchableOpacity>

                {/* g */}

                <TouchableOpacity
                    onPress={() =>
                        onChangeUnit(item.id, "g")
                    }
                    style={{
                        marginLeft: 8,
                        backgroundColor:
                            item.unit === "g"
                                ? "#FF8C1A"
                                : "#FFD8B3",

                        paddingHorizontal: 18,
                        height: 28,
                        borderRadius: 14,

                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            color: "#FFF",
                        }}
                    >
                        g
                    </Text>
                </TouchableOpacity>

                <View
                    style={{ flex: 1 }}
                />
                {/* Minus */}

                {!isMinimum ? (
                    <TouchableOpacity
                        disabled={isMinimum}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,

                            backgroundColor: isMinimum
                                ? "#D9D9D9"
                                : "#000",

                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons
                            name="remove"
                            size={18}
                            color="#FFF"
                        />
                    </TouchableOpacity>) :
                    <TouchableOpacity
                        disabled={isMinimum}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,

                            backgroundColor: isMinimum
                                ? "#D9D9D9"
                                : "#000",

                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome6
                            name="trash"
                            size={17}
                            color="#FFF"
                        />
                    </TouchableOpacity>}

                <Text
                    style={{
                        width: 60,
                        textAlign: "center",
                        fontWeight: "600",
                    }}
                >
                    {item.weight} {item.unit}
                </Text>

                {/* Plus */}

                <TouchableOpacity
                    onPress={() => onIncrease(item.id)}
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,

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

export default ProductCartCard;