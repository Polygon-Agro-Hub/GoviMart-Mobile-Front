import { ReviewProduct } from "@/types/types";
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const ProductReviewCard: React.FC<{
    product: ReviewProduct;
    onIncrease: () => void;
    onDecrease: () => void;
    onChangeProduct: () => void;
    onResetToOriginal?: () => void;
}> = ({ product, onIncrease, onDecrease, onChangeProduct, onResetToOriginal }) => (
    <View className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl p-4 bg-white">
        <Text className="text-[13px] text-[#8A8A8A] mb-2">
            {product.category}
        </Text>

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
                <View className="flex-row items-center justify-between">
                    <Text className="text-[16px] font-semibold text-black">
                        {product.name}
                    </Text>
                    {product.isReplaced && (
                        <View className="bg-[#FFF0F0] px-2 py-0.5 rounded-full border border-[#FFD5D5]">
                            <Text className="text-[10px] font-bold text-[#E02424]">Replaced</Text>
                        </View>
                    )}
                </View>
                <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                    Price :{" "}
                    <Text className="font-bold text-black">
                        Rs. {product.price.toFixed(2)}
                    </Text>
                </Text>
            </View>
        </View>

        <View className="flex-row items-center justify-between mt-4 bg-[#F7F7F7] rounded-full px-2 py-1.5">
            <TouchableOpacity
                onPress={onDecrease}
                className="w-9 h-9 rounded-full bg-[#DADADA] items-center justify-center"
            >
                <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>

            <Text className="text-[15px] font-semibold text-black">
                {product.quantity} {product.unit}
            </Text>

            <TouchableOpacity
                onPress={onIncrease}
                className="w-9 h-9 rounded-full bg-black items-center justify-center"
            >
                <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
        </View>

        {product.isReplaced ? (
            <TouchableOpacity
                onPress={onResetToOriginal}
                activeOpacity={0.7}
                className="flex-row items-center justify-center mt-3"
            >
                <Ionicons name="sync-outline" size={14} color="#F04438" />
                <Text className="ml-1.5 text-[13px] font-semibold text-[#F04438] underline">
                    Reset to Original
                </Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity
                onPress={onChangeProduct}
                activeOpacity={0.7}
                className="flex-row items-center justify-center mt-3"
            >
                <Ionicons name="sync-outline" size={14} color="#000" />
                <Text className="ml-1.5 text-[13px] font-semibold text-black underline">
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
                    {product.excludedWarning}
                </Text>
            </View>
        )}
    </View>
);