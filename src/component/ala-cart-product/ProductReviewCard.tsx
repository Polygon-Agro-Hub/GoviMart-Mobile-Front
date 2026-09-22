import { ReviewProduct } from "@/types/types";
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";

export const ProductReviewCard: React.FC<{
    product: ReviewProduct;
    categoryCount?: number;
    onIncrease: () => void;
    onDecrease: () => void;
    onChangeProduct: () => void;
    onResetToOriginal?: () => void;
}> = ({ product, categoryCount, onIncrease, onDecrease, onChangeProduct, onResetToOriginal }) => {
    const minQuantity = product.minQuantity ?? product.step ?? 1;
    const isMin = product.quantity <= minQuantity;
    const formatPrice = (value: number | string) =>
        (Number(value) || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <View className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl p-4 bg-white">
            <Text className="text-[14px] font-bold text-black">
                {product.category}
            </Text>

            <View style={{ height: 1, backgroundColor: "#E1E7EE", marginTop: 8, marginBottom: 12 }} />

            <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-full bg-[#F5F5F5] items-center justify-center overflow-hidden border border-[#F0F0F0]">
                    {product.image ? (
                        <Image
                            source={{ uri: product.image }}
                            className="w-9 h-9"
                            resizeMode="contain"
                        />
                    ) : (
                        <Text style={{ fontSize: 20 }}>{product.icon || "🥗"}</Text>
                    )}
                </View>
                <View className="ml-3 flex-1">
                    <Text className="text-[16px] font-semibold text-black">
                        {product.name}
                    </Text>
                    <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                        Price :{" "}
                        <Text className="font-bold text-black">
                            Rs. {formatPrice(product.price)}
                        </Text>
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center justify-between mt-4 bg-white border border-[#A3A3A3] rounded-full px-2 py-1.5">
                <TouchableOpacity
                    onPress={onDecrease}
                    disabled={isMin}
                    activeOpacity={isMin ? 1 : 0.7}
                    className={`w-9 h-9 rounded-full items-center justify-center ${isMin ? "bg-[#DADADA]" : "bg-black"}`}
                >
                    <Ionicons name="remove" size={18} color="#fff" />
                </TouchableOpacity>

                <Text className="text-[15px] font-semibold text-black">
                    {parseFloat(String(product.quantity))} {product.unit}
                </Text>

                <TouchableOpacity
                    onPress={onIncrease}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-black items-center justify-center"
                >
                    <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: "#E1E7EE", marginTop: 14, marginBottom: 12 }} />

            {product.isReplaced ? (
                <TouchableOpacity
                    onPress={onResetToOriginal}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-center"
                >
                    <Entypo name="back-in-time" size={16} color="#FF2D55" />
                    <Text className="ml-1.5 text-[13px] font-semibold text-[#FF2D55]">
                        Reset to Original
                    </Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={onChangeProduct}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-center"
                >
                    <Ionicons name="sync-outline" size={14} color="#000" />
                    <Text className="ml-1.5 text-[13px] font-semibold text-black">
                        Change Product
                    </Text>
                </TouchableOpacity>
            )}

            {product.excludedWarning && (
                <View className="flex-row items-start mt-3">
                    <Ionicons
                        name="alert-circle"
                        size={14}
                        color="#F04438"
                        style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 ml-1.5 text-[12px] text-[#F04438] leading-4">
                        You marked{" "}
                        <Text className="font-bold text-[#F04438]">
                            {product.name}
                        </Text>{" "}
                        as an exclude product for your packages. Please Change
                        Product if you don't need this.
                    </Text>
                </View>
            )}
        </View>
    );
};