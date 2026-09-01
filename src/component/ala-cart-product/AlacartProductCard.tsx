import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { ProductType } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";

export const AlacartProductCard: React.FC<{
    product: ProductType;
    selected: boolean;
    onToggle: () => void;
}> = ({ product, selected, onToggle }) => {
    const price = parseFloat(product.normalPrice) || 0;
    const weightDisplay = `${product.startValue ?? "500"} ${(product.unitType || "g").toLowerCase()}`;
    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onToggle}
            className="flex-1"
        >
            <View
                className="bg-[#F4F3F3] pt-7 pb-6 px-3 items-center mx-2 relative mb-8"
                style={{
                    borderTopLeftRadius: 100,
                    borderTopRightRadius: 100,
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                    borderWidth: 1.5,
                    borderColor: selected ? "#FF9114" : "transparent",
                }}
            >
                {/* Circular image wrapper */}
                <View className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center shadow-sm border border-gray-100">
                    {product.image ? (
                        typeof product.image === "string" ? (
                            <Image
                                source={{ uri: product.image }}
                                className="w-12 h-12"
                                resizeMode="contain"
                            />
                        ) : (
                            <Image
                                source={product.image}
                                className="w-12 h-12"
                                resizeMode="contain"
                            />
                        )
                    ) : (
                        <Ionicons name="leaf-outline" size={28} color="#92D01B" />
                    )}
                </View>

                {/* Product Name */}
                <Text
                    className="text-black font-bold text-[14px] mt-2.5 text-center"
                    numberOfLines={1}
                >
                    {product.displayName}
                </Text>

                {/* Weight / Unit */}
                <Text className="text-[#8A8A8A] text-[12px] mt-1 text-center font-medium">
                    {weightDisplay}
                </Text>

                {/* Price */}
                <Text className="text-black font-extrabold text-[14px] mt-1 text-center">
                    Rs. {formatPrice(price)}
                </Text>

                {/* Bottom Action Button (Checkmark if selected, Plus if unselected) */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className="w-10 h-10 rounded-full items-center justify-center absolute -bottom-5"
                    style={{
                        backgroundColor: selected ? "#FF9114" : "#000000",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}
                >
                    {selected ? (
                        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                    ) : (
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};