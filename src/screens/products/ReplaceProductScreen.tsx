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
import productService from "@/services/product/product.service";

type Props = StackScreenProps<RootStackParamList, "ReplaceProduct">;

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

const FALLBACK_PRODUCTS_BY_TYPE: Record<string, ProductType[]> = {
    fruit: [
        {
            id: 9101,
            type: "product",
            displayName: "Strawberry",
            category: "Fruits",
            cropNameEnglish: "Strawberry",
            normalPrice: "1000",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
        },
        {
            id: 9102,
            type: "product",
            displayName: "Lemon",
            category: "Fruits",
            cropNameEnglish: "Lemon",
            normalPrice: "400",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=400",
        },
        {
            id: 9103,
            type: "product",
            displayName: "Grapes",
            category: "Fruits",
            cropNameEnglish: "Grapes",
            normalPrice: "1200",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400",
        },
        {
            id: 9104,
            type: "product",
            displayName: "Apple",
            category: "Fruits",
            cropNameEnglish: "Apple",
            normalPrice: "600",
            startValue: "0.5",
            unitType: "kg",
            image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
        },
    ],
    veggie: [
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
            image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400",
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
            image: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400",
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
            image: "https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=400",
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
            image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400",
        },
    ],
};

const ReplaceProduct: React.FC<Props> = ({ navigation, route }) => {
    const fromProduct = route.params?.fromProduct;
    const targetProductTypeId = fromProduct?.productTypeId || fromProduct?.productType || fromProduct?.category;
    const initialProductTypeName = fromProduct?.productTypeName || fromProduct?.category || "Product Type";

    const [resolvedTypeName, setResolvedTypeName] = useState<string>(initialProductTypeName);
    const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
    const [availableProducts, setAvailableProducts] = useState<ProductType[]>([]);
    const [alacartSelection, setAlacartSelection] = useState<
        Record<string | number, AlacartSelectedProduct>
    >({});

    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    // Fetch replacement products filtered strictly by productTypeId from producttypes table
    const fetchReplacementsByProductType = async () => {
        setLoadingProducts(true);
        try {
            let productsList: any[] = [];

            if (targetProductTypeId) {
                // 1. Query by productTypeId using producttypes table
                const res = await productService.getProductsByProductType(targetProductTypeId);
                if (res.data?.status && Array.isArray(res.data.products) && res.data.products.length > 0) {
                    productsList = res.data.products;
                    if (productsList[0]?.productTypeName) {
                        setResolvedTypeName(productsList[0].productTypeName);
                    }
                }
            }

            // 2. Fallback to category if productTypeId is empty or returned 0
            if (productsList.length === 0 && fromProduct?.category) {
                const cleanCategory = (fromProduct.category.toLowerCase().includes("fruit")) ? "Fruits" : "Vegetables";
                const catRes = await productService.getProductsByCategory(cleanCategory);
                if (catRes.data?.status && Array.isArray(catRes.data.products) && catRes.data.products.length > 0) {
                    productsList = catRes.data.products;
                }
            }

            // 3. Fallback to mock data if API returns empty
            if (productsList.length === 0) {
                const isFruit = String(fromProduct?.name || fromProduct?.category).toLowerCase().includes("fruit") ||
                    String(fromProduct?.name || "").toLowerCase().includes("berry") ||
                    String(fromProduct?.name || "").toLowerCase().includes("lemon");
                productsList = isFruit ? FALLBACK_PRODUCTS_BY_TYPE.fruit : FALLBACK_PRODUCTS_BY_TYPE.veggie;
            }

            // Exclude fromProduct itself
            const fromIdStr = String(fromProduct?.id || "").toLowerCase();
            const fromNameStr = String(fromProduct?.name || "").toLowerCase();

            const formatted = productsList
                .map((item: any) => ({
                    ...item,
                    type: "product",
                }))
                .filter((p: any) => {
                    const pid = String(p.id).toLowerCase();
                    const pname = String(p.displayName || "").toLowerCase();
                    return pid !== fromIdStr && pname !== fromNameStr;
                });

            setAvailableProducts(formatted.length > 0 ? formatted : productsList);
        } catch (error) {
            console.log("Failed to fetch products for product type:", error);
            const isFruit = String(fromProduct?.name || fromProduct?.category).toLowerCase().includes("fruit");
            setAvailableProducts(isFruit ? FALLBACK_PRODUCTS_BY_TYPE.fruit : FALLBACK_PRODUCTS_BY_TYPE.veggie);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        fetchReplacementsByProductType();
    }, [targetProductTypeId]);

    const toggleAlacartProduct = (product: ProductType) => {
        const normalized = normalizeToKg(product);
        const price = parseFloat(normalized.normalPrice) || 0;
        const weightDisplay = `${normalized.startValue} kg`;

        setAlacartSelection((prev) => {
            if (prev[normalized.id]) {
                return {};
            }
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
            <CustomHeader showBackButton navigation={navigation} title="Replace Product" />

            {/* Original / Replacing Product Card */}
            {fromProduct && (
                <View className="mx-4 mt-3 mb-2 p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex-row items-center">
                    <View className="w-14 h-14 rounded-2xl bg-white border border-[#EEEEEE] items-center justify-center overflow-hidden mr-3">
                        {fromProduct.image ? (
                            <Image
                                source={{ uri: fromProduct.image }}
                                className="w-12 h-12 rounded-xl"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={{ fontSize: 26 }}>{fromProduct.icon || "🥗"}</Text>
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                            Replacing Product
                        </Text>
                        <Text className="text-[16px] font-bold text-black mt-0.5" numberOfLines={1}>
                            {fromProduct.name}
                        </Text>
                        <Text className="text-[12px] text-[#4B5563] mt-0.5 font-medium">
                            {resolvedTypeName} • {fromProduct.quantity} {fromProduct.unit || "kg"}
                        </Text>
                    </View>
                    <View className="bg-[#FEF3C7] px-3 py-1.5 rounded-full border border-[#FDE68A]">
                        <Text className="text-[11px] font-bold text-[#B45309]">Selected</Text>
                    </View>
                </View>
            )}

            {/* Product Type Filter Badge */}
            <View className="mx-4 mt-2 mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Ionicons name="pricetag-outline" size={16} color="#4B5563" />
                    <Text className="text-[13px] font-semibold text-[#374151] ml-1.5">
                        Allowed Type: <Text className="font-bold text-black">{resolvedTypeName}</Text>
                    </Text>
                </View>
                <Text className="text-[12px] text-[#6B7280]">
                    {availableProducts.length} Options
                </Text>
            </View>

            {/* 2-column Product Grid or Skeleton */}
            {loadingProducts ? (
                <View className="mt-2 px-3">
                    <View className="flex-row justify-between mb-4">
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                    </View>
                    <View className="flex-row justify-between mb-4">
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                        <AlacartCardSkeleton pulseAnim={pulseAnim} />
                    </View>
                </View>
            ) : availableProducts.length === 0 ? (
                <View className="py-20 items-center justify-center flex-1">
                    <Ionicons name="basket-outline" size={52} color="#CCCCCC" />
                    <Text className="text-[#8A8A8A] text-[15px] font-medium mt-3">
                        No replacement products available for {resolvedTypeName}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 12,
                        paddingTop: 4,
                        paddingBottom: 110,
                    }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                    <View className="px-3">
                        {(() => {
                            const rows: ProductType[][] = [];
                            for (let i = 0; i < availableProducts.length; i += 2) {
                                rows.push(availableProducts.slice(i, i + 2));
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

            {/* Bottom Floating Action Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white py-4 px-6 border-t border-[#F0F0F0]">
                <TouchableOpacity
                    disabled={Object.keys(alacartSelection).length === 0}
                    onPress={() => {
                        const selectedId = Object.keys(alacartSelection)[0];
                        const selectedProduct = availableProducts.find(
                            (p) => p.id.toString() === selectedId.toString()
                        );
                        if (!selectedProduct) return;

                        navigation.navigate("SetQauntity", {
                            fromProduct: route.params?.fromProduct,
                            toProduct: normalizeToKg(selectedProduct),
                            packageId: route.params?.packageId,
                            orderPackageId: route.params?.orderPackageId,
                            replceId: route.params?.replceId,
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
                        Select Replacement Product
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ReplaceProduct;