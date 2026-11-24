import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PackageMeta } from "@/store/packageReviewSlice";
import { ReviewProduct } from "@/types/types";
import { formatPrice, toDisplayProduct } from "../../../utils/reviewPackageUtils";
import { PriceRow } from "../common/PriceRow";
import { RowDivider } from "../common/RowDivider";
import { ProgressDots } from "../common/ProgressDots";
import { renderExcludedWarning } from "../common/ExcludedWarning";
import { ProductReviewCard } from "@/component/ala-cart-product/ProductReviewCard";
import { HurryBanner } from "@/component/package/common/HurryBanner";

interface PackageStepViewProps {
  pkg: PackageMeta;
  products: ReviewProduct[];
  templateProds: ReviewProduct[];
  availableSlots: number;
  scheduleDateStr: string;
  totalSteps: number;
  currentStepIndex: number;
  onCancelOrder: () => void;
  updateProductQuantity: (pkgId: string, productId: string, delta: number) => void;
  onChangeProduct: (pkgId: string, product: ReviewProduct) => void;
  onResetToOriginal: (pkgId: string, productId: string) => void;
  onNext: () => void;
}

export const PackageStepView: React.FC<PackageStepViewProps> = ({
  pkg,
  products,
  templateProds,
  availableSlots,
  scheduleDateStr,
  totalSteps,
  currentStepIndex,
  onCancelOrder,
  updateProductQuantity,
  onChangeProduct,
  onResetToOriginal,
  onNext,
}) => {
  const templateSum = templateProds.reduce(
    (s, p) => s + p.price * p.quantity,
    0,
  );
  const currentSum = products.reduce(
    (s, p) => s + p.price * p.quantity,
    0,
  );
  // diff = extra cost / saving the user caused by changing/replacing items
  const diff = currentSum - templateSum;

  const serviceFee = pkg.serviceFee;
  const packingFee = pkg.packingFee;

  // Discount Received = definepackage.price - marketplacepackages.productPrice
  const discountPerUnit = pkg.discountPerUnit ?? 0;

  // Original Package = definepackage.price (productPrice + discount)
  const originalPackagePrice = pkg.unitPrice + discountPerUnit;

  // Full Total (1 package) = productPrice + packingFee + serviceFee (+ changes)
  const totalFor1Package = pkg.unitPrice + packingFee + serviceFee + diff;
  const totalForNPackages = totalFor1Package * pkg.qty;

  // Count how many products fall under each category within
  // THIS package only, so the header shown on every card in
  // that category reflects the correct group size.
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    const key = p.category || "Other";
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
        paddingBottom: 0,
      }}
    >
      <View>
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

        <Text className="text-[19px] font-bold text-black mx-5 mt-4">
          Package : {pkg.name}
          {pkg.qty > 1 ? ` (x${pkg.qty})` : ""}
        </Text>
        <Text className="text-[13px] text-[#6B6B6B] mx-5 mt-1 mb-2">
          You can change the products and quantity as needed.
        </Text>

        {products.map((product, index) => (
          <React.Fragment
            key={`pkg-${pkg.id}-item-${product.itemId || product.productId || product.id}-idx-${index}`}
          >
            <ProductReviewCard
              // display-only copy: price shown = price x quantity.
              // excludedWarning is cleared here so the card does not
              // draw it inside itself; it is rendered below the card.
              product={{
                ...toDisplayProduct(product),
                excludedWarning: undefined,
              }}
              categoryCount={categoryCounts[product.category || "Other"]}
              onIncrease={() => updateProductQuantity(pkg.id, product.id, 1)}
              onDecrease={() => updateProductQuantity(pkg.id, product.id, -1)}
              // these use the ORIGINAL product (per-kg price)
              onChangeProduct={() => onChangeProduct(pkg.id, product)}
              onResetToOriginal={() => onResetToOriginal(pkg.id, product.id)}
            />

            {/* Exclude warning: shown UNDER the card, outside it */}
            {!!product.excludedWarning && (
              <View className="mx-5 mt-2 mb-3 flex-row items-start">
                <Ionicons
                  name="information-circle"
                  size={14}
                  color="#FF383C"
                  style={{ marginTop: 2, marginRight: 6 }}
                />
                <Text
                  className="flex-1 text-[13px] leading-5"
                  style={{ color: "#FF383C" }}
                >
                  {renderExcludedWarning(
                    product.excludedWarning,
                    product.name,
                  )}
                </Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Price Breakdown & Confirm Button (Inside ScrollView) */}
      <View
        style={{
          backgroundColor: "#FFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: Platform.OS === "ios" ? 34 : 12,
          marginTop: 20,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          elevation: 15,
        }}
      >
        <PriceRow
          label="Original Package"
          value={`Rs. ${formatPrice(originalPackagePrice)}`}
        />

        {discountPerUnit > 0 && (
          <>
            <RowDivider />
            <PriceRow
              label="Discount Received"
              value={`- Rs. ${formatPrice(discountPerUnit)}`}
              valueColor="#1B8A3A"
            />
          </>
        )}

        <RowDivider />
        <PriceRow label="Service Fee" value={`Rs. ${formatPrice(serviceFee)}`} />

        <RowDivider />
        <PriceRow label="Packing Fee" value={`Rs. ${formatPrice(packingFee)}`} />

        {/* Due to Changes — shown only when user has modified products */}
        {diff !== 0 && (
          <>
            <RowDivider />
            <PriceRow
              label="Due to Changes"
              value={`${diff > 0 ? "+ " : "- "}Rs. ${formatPrice(Math.abs(diff))}`}
              valueColor={diff > 0 ? "#FF2D55" : "#0088FF"}
            />
          </>
        )}

        <RowDivider />
        <PriceRow
          label="Total for a Package"
          value={`Rs. ${formatPrice(totalFor1Package)}`}
          strong
          big={pkg.qty === 1}
          marginBottom={pkg.qty > 1 ? 0 : 20}
        />

        {pkg.qty > 1 && (
          <>
            <RowDivider />
            <PriceRow
              label={`Total for ${pkg.qty} Packages`}
              value={`Rs. ${formatPrice(totalForNPackages)}`}
              strong
              big
              marginBottom={20}
            />
          </>
        )}

        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.85}
          style={{
            height: 54,
            backgroundColor: "#000000",
            borderRadius: 30,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: {
              width: 0,
              height: 3,
            },
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Confirm & Continue ({currentStepIndex + 1})
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PackageStepView;
