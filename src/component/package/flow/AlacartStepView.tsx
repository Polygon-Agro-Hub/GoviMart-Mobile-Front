import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { HurryBanner } from "@/component/package/common/HurryBanner";
import ProgressDots from "../common/ProgressDots";
import { AlacartCardSkeleton } from "@/component/ala-cart-product/AlacartCardSkeleton";
import { AlacartProductCard } from "@/component/ala-cart-product/AlacartProductCard";
import { CATEGORIES, CATEGORY_IMAGES } from "../../../constants/reviewPackage.constants";
import { ProductType } from "@/types/types";
import { AlacartSelectedProduct } from "@/store/packageReviewSlice";

interface AlacartStepViewProps {
  availableSlots: number | null | undefined;
  scheduleDateStr: string;
  onCancelOrder: () => void;
  totalSteps: number;
  currentStepIndex: number;
  selectedAlaCartCategory: string;
  onSelectCategory: (categoryId: string) => void;
  loadingAlaCartProducts: boolean;
  pulseAnim: Animated.Value;
  alaCartProducts: ProductType[];
  disabledAlacartProductIds: Set<string>;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  toggleAlacartProduct: (product: ProductType) => void;
  removeAlacartItem: (itemId: number | string) => void;
}

const AlacartStepView: React.FC<AlacartStepViewProps> = ({
  availableSlots,
  scheduleDateStr,
  onCancelOrder,
  totalSteps,
  currentStepIndex,
  selectedAlaCartCategory,
  onSelectCategory,
  loadingAlaCartProducts,
  pulseAnim,
  alaCartProducts,
  disabledAlacartProductIds,
  alacartSelection,
  toggleAlacartProduct,
  removeAlacartItem,
}) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View className="bg-white pt-1 pb-3">
        <HurryBanner
          ordersLeft={
            typeof availableSlots === "number"
              ? Math.max(0, availableSlots)
              : 0
          }
          date={scheduleDateStr}
          showCancelLink
          onCancelOrder={onCancelOrder}
        />
        <ProgressDots total={totalSteps} current={currentStepIndex} />
      </View>

      <Text className="text-[20px] font-bold text-black text-center mt-4">
        Ala Carte Items
      </Text>
      <Text className="text-[13px] text-[#6B6B6B] text-center mt-1 mb-4">
        Feel free to add anything you like from here!
      </Text>

      {/* Category filter selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        className="flex-row"
      >
        {CATEGORIES.map((category) => {
          const isActive = category.id === selectedAlaCartCategory;
          return (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.9}
              onPress={() => onSelectCategory(category.id)}
              style={{
                width: 76,
                height: 98,
                backgroundColor: isActive ? category.activeBg : "#FFFFFF",
                borderWidth: 1.2,
                borderColor: isActive
                  ? category.activeBg
                  : category.borderColor,
                borderTopLeftRadius: 38,
                borderTopRightRadius: 38,
                borderBottomLeftRadius: 18,
                borderBottomRightRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isActive ? "#FFFFFF" : category.circleBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={CATEGORY_IMAGES[category.id]}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: isActive ? "#FFFFFF" : "#1E1E1E",
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
          <Image
            source={require("@/assets/images/order/no-replce-products.webp")}
            style={{ width: 56, height: 56 }}
            resizeMode="contain"
          />
          <Text className="text-[#8A8A8A] text-[14px] mt-3">
            No items available in this category
          </Text>
        </View>
      ) : (
        <View className="mt-6 px-3">
          {(() => {
            const rows: ProductType[][] = [];
            for (let i = 0; i < alaCartProducts.length; i += 2) {
              rows.push(alaCartProducts.slice(i, i + 2));
            }
            return rows.map((row, rowIndex) => (
              <View
                key={`alacart-row-${rowIndex}`}
                className="flex-row justify-between mb-4"
              >
                {row.map((product, pIdx) => {
                  const isDisabled =
                    product.isEnable === 0 ||
                    product.isEnable === false ||
                    disabledAlacartProductIds.has(String(product.id));
                  const isSelected = Object.values(alacartSelection).some(
                    (item) =>
                      String(item.productId || item.id) ===
                      String(product.id) && Boolean(item.isAddedNow),
                  );
                  return (
                    <AlacartProductCard
                      key={`alacart-prod-${product.id}-${rowIndex}-${pIdx}`}
                      product={product}
                      selected={isSelected && !isDisabled}
                      disabled={isDisabled}
                      onToggle={() => {
                        if (!isDisabled) {
                          // If it was previously selected and is now disabled,
                          // remove it from selection
                          if (isSelected && isDisabled) {
                            removeAlacartItem(
                              Object.values(alacartSelection).find(
                                (item) =>
                                  String(item.productId || item.id) ===
                                  String(product.id),
                              )?.id ?? product.id,
                            );
                          } else {
                            toggleAlacartProduct(product);
                          }
                        }
                      }}
                    />
                  );
                })}
                {row.length === 1 && <View className="flex-1 mx-2" />}
              </View>
            ));
          })()}
        </View>
      )}
    </ScrollView>
  );
};

export default React.memo(AlacartStepView);
