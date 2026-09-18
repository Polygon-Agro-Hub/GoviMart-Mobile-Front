import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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

const ReplaceProduct: React.FC<Props> = ({ navigation, route }) => {
  const fromProduct = route.params?.fromProduct;
  const targetProductTypeId =
    fromProduct?.productTypeId ||
    fromProduct?.productType ||
    fromProduct?.category;
  const initialProductTypeName =
    fromProduct?.productTypeName || fromProduct?.category || "Product Type";

  const [resolvedTypeName, setResolvedTypeName] = useState<string>(
    initialProductTypeName,
  );
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
      ]),
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
        const res =
          await productService.getProductsByProductType(targetProductTypeId);
        if (
          res.data?.status &&
          Array.isArray(res.data.products) &&
          res.data.products.length > 0
        ) {
          productsList = res.data.products;
          if (productsList[0]?.productTypeName) {
            setResolvedTypeName(productsList[0].productTypeName);
          }
        }
      }

      // 2. Fallback to category query if productTypeId is empty or returned 0
      if (productsList.length === 0 && fromProduct?.category) {
        const cleanCategory = fromProduct.category
          .toLowerCase()
          .includes("fruit")
          ? "Fruits"
          : "Vegetables";
        const catRes =
          await productService.getProductsByCategory(cleanCategory);
        if (
          catRes.data?.status &&
          Array.isArray(catRes.data.products) &&
          catRes.data.products.length > 0
        ) {
          productsList = catRes.data.products;
        }
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

      setAvailableProducts(formatted);
    } catch (error) {
      console.log("Failed to fetch products for product type:", error);
      setAvailableProducts([]);
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
      <CustomHeader
        showBackButton
        navigation={navigation}
        title="Replace Product"
      />

      <Text
        style={{ color: "#5A5859" }}
        className="text-[14px] text-center px-4 mt-2 mb-3"
      >
        Click on a product to select.
      </Text>

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
                <View
                  key={`replace-row-${rowIndex}`}
                  className="flex-row justify-between mb-4"
                >
                  {row.map((product, pIdx) => (
                    <AlacartProductCard
                      key={`replace-prod-${product.id}-${rowIndex}-${pIdx}`}
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
              (p) => p.id.toString() === selectedId.toString(),
            );
            if (!selectedProduct) return;

            console.log(
              "\n[ReplaceProductScreen] Navigating to SetQauntity with:",
              {
                orderId: route.params?.orderId,
                fromProduct: route.params?.fromProduct,
                toProduct: normalizeToKg(selectedProduct),
                packageId: route.params?.packageId,
                orderPackageId: route.params?.orderPackageId,
                replceId:
                  route.params?.fromProduct?.itemId || route.params?.replceId,
                stepIndex: route.params?.stepIndex,
              },
            );

            navigation.navigate("SetQauntity", {
              orderId: route.params?.orderId,
              fromProduct: route.params?.fromProduct,
              toProduct: normalizeToKg(selectedProduct),
              packageId: route.params?.packageId,
              orderPackageId: route.params?.orderPackageId,
              replceId:
                route.params?.fromProduct?.itemId || route.params?.replceId,
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

export default ReplaceProduct;
