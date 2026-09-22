import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { ProductType } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import FixedMarqueeText from "../marquee-text/MarqueeText";

// Same price display types coming from the backend
// (marketplaceitems.displayType) as used on the Home screen:
// "AP&SP&D" -> Actual Price (struck through) + Sale Price + Discount% badge
// "AP&SP"   -> Actual Price (struck through) + Sale Price, no badge
// "D&AP"    -> Only Sale Price + Discount% badge, no struck-through actual price
type DisplayType = "AP&SP&D" | "D&AP" | "AP&SP";

/**
 * startValue / changeby are always stored in kg in the DB.
 * unitType (from the DB column) just controls the display label.
 * discountedPrice (fallback normalPrice) is the PER-KG rate — the
 * displayed price is that rate multiplied by the quantity in kg.
 */
const normalizeToKg = (product: ProductType) => {
    const rawUnit = (product.unitType || "kg").toLowerCase();

    const rawStartValue = parseFloat(String(product.startValue || "1")) || 1;
    const rawChangeBy =
        product.changeby != null && String(product.changeby).trim() !== ""
            ? parseFloat(String(product.changeby))
            : rawStartValue;

    const qtyKg = Number(rawStartValue.toFixed(3));
    const stepKg = Number(rawChangeBy.toFixed(3));

    // Per-kg rates as stored in the DB
    const perKgNormalPrice = parseFloat(String(product.normalPrice || "0")) || 0;
    const perKgDiscountedPrice =
        product.discountedPrice != null && String(product.discountedPrice).trim() !== ""
            ? parseFloat(String(product.discountedPrice))
            : 0;

    // Displayed prices = per-kg rate * quantity in kg
    const totalNormalPrice = Number((perKgNormalPrice * qtyKg).toFixed(2));
    const totalDiscountedPrice =
        perKgDiscountedPrice > 0
            ? Number((perKgDiscountedPrice * qtyKg).toFixed(2))
            : totalNormalPrice;

    // Label built straight from the DB's unitType column: "g" -> grams, else kg
    const weightDisplay =
        rawUnit === "g" ? `${Math.round(qtyKg * 1000)} g` : `${qtyKg} kg`;

    return {
        qtyKg,
        stepKg,
        perKgNormalPrice,
        perKgDiscountedPrice,
        totalNormalPrice,
        totalDiscountedPrice,
        weightDisplay,
    };
};

export const AlacartProductCard: React.FC<{
    product: ProductType;
    selected: boolean;
    onToggle: () => void;
}> = ({ product, selected, onToggle }) => {
    const {
        totalNormalPrice,
        totalDiscountedPrice,
        weightDisplay,
    } = normalizeToKg(product);

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // --- Discount logic, mirrored from Home.tsx ---
    const hasDiscount =
        totalDiscountedPrice > 0 && totalDiscountedPrice < totalNormalPrice;

    const displayType = (product as any).displayType as DisplayType | undefined;

    const showDiscountBadge =
        hasDiscount &&
        (displayType === "AP&SP&D" || displayType === "D&AP" || !displayType);

    const showStruckNormalPrice =
        hasDiscount &&
        (displayType === "AP&SP&D" || displayType === "AP&SP" || !displayType);

    const basePrice = hasDiscount ? totalDiscountedPrice : totalNormalPrice;

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
                {/* Discount % badge, top-left — same placement style as Home */}
                {showDiscountBadge && product.discount ? (
                    <View
                        style={{
                            position: "absolute",
                            top: 15,
                            left: 4,
                            width: 35,
                            height: 35,
                            backgroundColor: "#F34261",
                            borderRadius: 100,
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 10,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#FFF",
                            }}
                        >
                            {product.discount}%
                        </Text>
                    </View>
                ) : null}

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
                  <View style={{ width: "100%", marginTop: 4 }}>
                          <FixedMarqueeText
                            key={product.id}
                            text={product?.displayName!}
                            style={{
                              color: "#000000",
                              fontWeight: "bold",
                              fontSize: 13,
                              textAlign: "center",
                            }}
                          />
                        </View>

                {/* Weight / Unit — derived from unitType/startValue via normalizeToKg */}
                <Text className="text-[#8A8A8A] text-[12px] mt-1 text-center font-medium">
                    {weightDisplay}
                </Text>

                {/* Struck-through normal price, shown only when a discount applies
                    and displayType calls for it */}
                {showStruckNormalPrice && (
                    <Text className="text-gray-400 text-[11px] line-through text-center mt-0.5">
                        Rs. {formatPrice(totalNormalPrice)}
                    </Text>
                )}

                {/* Price */}
                <Text className="text-black font-extrabold text-[14px] mt-1 text-center">
                    Rs. {formatPrice(basePrice)}
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