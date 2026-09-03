import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Image,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList, ProductType } from "@/types/types";
import { AlacartCardSkeleton } from "@/component/ala-cart-product/AlacartCardSkeleton";
import { AlacartProductCard } from "@/component/ala-cart-product/AlacartProductCard";
import CustomHeader from "@/component/common/CustomHeader";
type Props = StackScreenProps<RootStackParamList, "ReplaceProduct">;

const ReplaceProduct: React.FC<Props> = ({ navigation, route }) => {
    type AlacartSelectedProduct = {
        id: number | string;
        displayName: string;
        image?: any;
        price: number;
        weightDisplay: string;
        quantity: number;
    };
    const normalizeToKg = (product: ProductType): ProductType => {
        const rawUnit = (product.unitType || "kg").toLowerCase();
        if (rawUnit === "g") {
            const rawVal = parseFloat(product.startValue || "500");
            const kgVal = Number((rawVal / 1000).toFixed(3));
            return {
                ...product,
                unitType: "kg",
                startValue: kgVal.toString(),
            };
        }
        return {
            ...product,
            unitType: "kg",
            startValue: product.startValue || "1",
        };
    };

    const FALLBACK_VEGETABLES: ProductType[] = [
        {
            id: 9001,
            type: "product",
            displayName: "Cantaloup",
            category: "Vegetables",
            cropNameEnglish: "Cantaloup",
            normalPrice: "800",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        },
        {
            id: 9002,
            type: "product",
            displayName: "Green Cornet",
            category: "Vegetables",
            cropNameEnglish: "Green Cornet",
            normalPrice: "1200",
            startValue: "1",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400",
        },
        {
            id: 9003,
            type: "product",
            displayName: "Lettuce",
            category: "Vegetables",
            cropNameEnglish: "Lettuce",
            normalPrice: "800",
            startValue: "0.1",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        },
        {
            id: 9004,
            type: "product",
            displayName: "Luffa",
            category: "Vegetables",
            cropNameEnglish: "Luffa",
            normalPrice: "1200",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        },
        {
            id: 9005,
            type: "product",
            displayName: "Okra",
            category: "Vegetables",
            cropNameEnglish: "Okra",
            normalPrice: "800",
            startValue: "0.1",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        },
        {
            id: 9006,
            type: "product",
            displayName: "Pumpkin",
            category: "Vegetables",
            cropNameEnglish: "Pumpkin",
            normalPrice: "1200",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        },
    ];
    const [loadingAlaCartProducts, setLoadingAlaCartProducts] = useState<boolean>(false);
    const [alaCartProducts, setAlaCartProducts] = useState<ProductType[]>(FALLBACK_VEGETABLES);
    const [alacartSelection, setAlacartSelection] = useState<
        Record<string | number, AlacartSelectedProduct>
    >({});

    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    const toggleAlacartProduct = (product: ProductType) => {
        const normalized = normalizeToKg(product);
        const price = parseFloat(normalized.normalPrice) || 0;
        const weightDisplay = `${normalized.startValue} kg`;

        setAlacartSelection((prev) => {
            // If clicking the currently selected product,
            // unselect it
            if (prev[normalized.id]) {
                return {};
            }

            // Otherwise, select ONLY this product
            return {
                [normalized.id]: {
                    id: normalized.id,
                    displayName: normalized.displayName,
                    image: normalized.image,
                    price,
                    weightDisplay,
                    quantity: 1,
                },
            };
        });
    };
    return (
        <View className="flex-1 bg-white">
            <CustomHeader showBackButton navigation={navigation} title="Replace a Product" />
            <Text className="text-[12px] text-center text-black mb-3 px-3">
                Click on a product to select.
            </Text>

            {/* 2-column Product Grid or Skeleton */}
            {loadingAlaCartProducts ? (
                <View className="mt-6 px-3">
                    <View className="flex-row justify-between mb-4">
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                    </View>
                    <View className="flex-row justify-between mb-4">
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                    </View>
                </View>
            ) : alaCartProducts.length === 0 ? (
                <View className="py-12 items-center justify-center">
                    <Ionicons name="basket-outline" size={48} color="#CCCCCC" />
                    <Text className="text-[#8A8A8A] text-[14px] mt-3">
                        No items available in this category
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{
                        flex: 1,
                    }}
                    contentContainerStyle={{
                        paddingHorizontal: 12,
                        paddingTop: 10,
                        paddingBottom: 110,
                    }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                    <View className="mt-6 px-3">
                        {(() => {
                            const rows: ProductType[][] = [];
                            for (let i = 0; i < alaCartProducts.length; i += 2) {
                                rows.push(alaCartProducts.slice(i, i + 2));
                            }
                            return rows.map((row, rowIndex) => (
                                <View key={rowIndex} className="flex-row justify-between mb-4">
                                    {row.map((product) => (
                                        <AlacartProductCard
                                            key={product.id}
                                            product={normalizeToKg(product)}
                                            selected={product.id in alacartSelection}
                                            onToggle={() => toggleAlacartProduct(product)}
                                        />
                                    ))}
                                    {row.length === 1 && <View className="flex-1 mx-2" />}
                                </View>
                            ));
                        })()}
                    </View>
                </ScrollView>
            )}

            <View className="absolute bottom-0 left-0 right-0 bg-white py-4 px-6 border-t border-[#F0F0F0]">
                <TouchableOpacity
                    disabled={Object.keys(alacartSelection).length === 0}
                    onPress={() => {
                        const selectedId = Object.keys(alacartSelection)[0];
                        const selectedProduct = alaCartProducts.find(
                            (p) => p.id.toString() === selectedId.toString()
                        );
                        if (!selectedProduct) return;

                        navigation.navigate("SetQauntity", {
                            fromProduct: route.params?.fromProduct,
                            toProduct: normalizeToKg(selectedProduct),
                            packageId: route.params?.packageId,
                            stepIndex: route.params?.stepIndex,
                        });
                    }}
                    activeOpacity={0.85}
                >
                    <Text
                        className="text-[15px] text-center text-white font-semibold py-4 rounded-full"
                        style={{
                            backgroundColor:
                                Object.keys(alacartSelection).length === 0
                                    ? "#7F919C"
                                    : "#000000",
                        }}
                    >
                        Select
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ReplaceProduct