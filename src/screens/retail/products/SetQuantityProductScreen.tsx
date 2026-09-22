import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useDispatch } from "react-redux";
import { replacePackageProduct } from "@/store/packageReviewSlice";
import CustomHeader from "@/component/common/CustomHeader";

type Props = StackScreenProps<RootStackParamList, "SetQauntity">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type ProductInfo = {
  id: string;
  name: string;
  icon?: string; // emoji fallback if no image
  image?: string; // uri — takes priority over icon
  unit: "kg" | "g";
  baseQty: number; // qty the price below refers to, e.g. 0.5, 1
  pricePerBaseQty: number;
};

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */

const ProductAvatar: React.FC<{ product: ProductInfo }> = ({ product }) =>
  product.image ? (
    <Image
      source={{ uri: product.image }}
      className="w-16 h-16 rounded-full bg-[#F5F5F5]"
    />
  ) : (
    <View className="w-16 h-16 rounded-full bg-[#F5F5F5] items-center justify-center">
      <Text style={{ fontSize: 28 }}>{product.icon}</Text>
    </View>
  );

const ProductRow: React.FC<{
  product: ProductInfo;
  subtitle: string;
  price: string;
}> = ({ product, subtitle, price }) => (
  <View className="flex-row items-center justify-center px-8 w-full">
    <ProductAvatar product={product} />
    <View className="ml-4 items-start">
      <Text className="text-[16px] font-bold text-black">{product.name}</Text>
      <Text className="text-[13px] text-[#8A8A8A] mt-0.5">{subtitle}</Text>
      <Text className="text-[16px] font-bold text-black mt-0.5">{price}</Text>
    </View>
  </View>
);

const SummaryRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => (
  <View className="flex-row justify-between items-center py-3">
    <Text
      className={`text-[14px] ${bold ? "font-bold text-black" : "text-[#6B6B6B]"}`}
    >
      {label}
    </Text>
    <Text
      className={`text-[14px] ${bold ? "font-bold" : "font-semibold text-black"}`}
      style={valueColor ? { color: valueColor } : undefined}
    >
      {value}
    </Text>
  </View>
);

const formatPrice = (value: number | string) =>
  (Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Formats a quantity that is ALWAYS stored internally in kg into the
// unit the product should actually be displayed in ("g" or "kg").
const formatQty = (qtyKg: number, unit: "kg" | "g") =>
  unit === "g"
    ? `${Math.round(qtyKg * 1000)} g`
    : `${parseFloat(String(qtyKg))} kg`;

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ChangeProductQuantity: React.FC<Props> = ({ navigation, route }) => {
  const rawFrom = route.params?.fromProduct;
  const rawTo = route.params?.toProduct;
  const packageId = route.params?.packageId || "";
  const stepIndex = route.params?.stepIndex ?? 0;

  // Display unit for each side, taken from their own unitType — NOT
  // hardcoded to "kg". Internal math always stays in kg regardless.
  const fromDisplayUnit: "kg" | "g" =
    (rawFrom?.unitType || rawFrom?.unit || "kg").toLowerCase() === "g"
      ? "g"
      : "kg";
  const toDisplayUnit: "kg" | "g" =
    (rawTo?.unitType || "kg").toLowerCase() === "g" ? "g" : "kg";

  const fromProduct: ProductInfo = useMemo(() => {
    const rawUnit = (rawFrom?.unit || "kg").toLowerCase();
    let rawQty =
      parseFloat(String(rawFrom?.quantity || rawFrom?.qty || 1)) || 1;
    const rawPrice = rawFrom?.price || 0;
    if (rawUnit === "g") {
      rawQty = Number((rawQty / 1000).toFixed(3));
    }
    const cleanBaseQty = parseFloat(String(rawQty)) || 1;
    return {
      id: rawFrom?.id?.toString() || "from",
      name: rawFrom?.name || "Original Product",
      icon: rawFrom?.icon || "🥬",
      image: rawFrom?.image,
      unit: "kg",
      baseQty: cleanBaseQty,
      pricePerBaseQty: rawPrice,
    };
  }, [rawFrom]);

  const toProduct: ProductInfo = useMemo(() => {
    // Prefer the true per-kg rate (perKgPrice, set by normalizeToKg in
    // ReplaceProductScreen). Falling back to normalPrice/price only if
    // perKgPrice wasn't provided.
    const priceVal =
      parseFloat(
        String(
          rawTo?.perKgPrice ??
            rawTo?.normalPrice ??
            rawTo?.price ??
            rawTo?.pricePerBaseQty ??
            0,
        ),
      ) || 0;

    return {
      id: rawTo?.id?.toString() || "to",
      name: rawTo?.displayName || rawTo?.name || "Replacement Product",
      icon: rawTo?.icon || "🥗",
      image: rawTo?.image,
      unit: "kg",
      baseQty: 1,
      pricePerBaseQty: priceVal, // this is now the per-kg rate
    };
  }, [rawTo]);

  const rawStepVal =
    rawTo?.changeby != null &&
    String(rawTo.changeby).trim() !== "" &&
    parseFloat(String(rawTo.changeby)) > 0
      ? parseFloat(String(rawTo.changeby))
      : rawTo?.step != null && parseFloat(String(rawTo.step)) > 0
        ? parseFloat(String(rawTo.step))
        : parseFloat(String(rawTo?.startValue)) || 0.5;

  const rawMinVal =
    rawTo?.startValue != null &&
    String(rawTo.startValue).trim() !== "" &&
    parseFloat(String(rawTo.startValue)) > 0
      ? parseFloat(String(rawTo.startValue))
      : rawStepVal;

  const step =
    rawStepVal > 10
      ? parseFloat((rawStepVal / 1000).toFixed(3))
      : parseFloat(rawStepVal.toFixed(3));
  const minQty =
    rawMinVal > 10
      ? parseFloat((rawMinVal / 1000).toFixed(3))
      : parseFloat(rawMinVal.toFixed(3));
  const maxQty = 10;

  // Default quantity comes from the REPLACEMENT product's (toProduct's)
  // own startValue — i.e. minQty, already derived from rawTo above —
  // not from the original product being replaced (rawFrom).
  const [quantity, setQuantity] = useState<number>(minQty);

  const fromUnitPrice = fromProduct.pricePerBaseQty;
  const fromPrice = fromUnitPrice * fromProduct.baseQty;

  const toUnitPrice = toProduct.pricePerBaseQty; // per-kg rate
  const toPrice = useMemo(
    () => Number((toUnitPrice * quantity).toFixed(2)),
    [toUnitPrice, quantity],
  );

  const balance = useMemo(() => fromPrice - toPrice, [fromPrice, toPrice]);
  const isCredit = balance >= 0;

  const decrease = () =>
    setQuantity((q: number) =>
      Math.max(minQty, parseFloat((q - step).toFixed(3))),
    );

  const increase = () =>
    setQuantity((q: number) =>
      Math.min(maxQty, parseFloat((q + step).toFixed(3))),
    );

  const dispatch = useDispatch();

  const onReplace = async () => {
    const newProductObj = {
      id: String(rawTo?.id ?? toProduct.id),
      itemId: rawFrom?.itemId,
      productId: rawTo?.id
        ? Number(rawTo.id)
        : parseInt(toProduct.id) || undefined,
      category:
        rawFrom?.category || rawTo?.productTypeName || "Replaced Product",
      name: toProduct.name,
      icon: toProduct.icon || "🥗",
      image: toProduct.image,
      price: toUnitPrice, // per-kg rate, so downstream qty*price math stays correct
      quantity: quantity,
      minQuantity: minQty,
      unit: "kg" as const, // internal storage unit stays kg
      step: step,
      productType: rawFrom?.productType || rawTo?.productTypeId,
      productTypeId: rawFrom?.productTypeId || rawTo?.productTypeId,
      productTypeName: rawFrom?.productTypeName || rawTo?.productTypeName,
      isReplaced: true,
      originalProduct: rawFrom?.originalProduct || rawFrom,
    };

    dispatch(
      replacePackageProduct({
        packageId: route.params?.packageId,
        orderPackageId: route.params?.orderPackageId,
        originalProductId: String(rawFrom?.id ?? fromProduct.id),
        newProduct: newProductObj,
      }),
    );

    navigation.navigate("ReviewPackage", {
      orderId: route.params?.orderId,
      targetStepIndex: stepIndex,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <CustomHeader
        title="Set Quantity"
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text className="text-[14px] text-[#6B6B6B] text-center mx-6 mt-2">
            You are replacing {fromProduct.name} with {toProduct.name}.
          </Text>

          <View className="items-center mt-6">
            <ProductRow
              product={fromProduct}
              subtitle={formatQty(fromProduct.baseQty, fromDisplayUnit)}
              price={`Rs. ${formatPrice(fromPrice)}`}
            />

            <View className="my-3">
              <Ionicons name="arrow-down" size={22} color="#000" />
            </View>

            <ProductRow
              product={toProduct}
              subtitle={formatQty(quantity, toDisplayUnit)}
              price={`Rs. ${formatPrice(toPrice)}`}
            />
          </View>

          <View className="mx-6 mt-8 flex-row items-center justify-between rounded-full border border-[#E1E7EE] bg-[#FBFBFB] px-2 py-2">
            <TouchableOpacity
              onPress={decrease}
              disabled={quantity <= minQty}
              activeOpacity={0.7}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                quantity <= minQty ? "bg-[#EEEEEE]" : "bg-[#D9D9D9]"
              }`}
            >
              <Ionicons name="remove" size={20} color="#374151" />
            </TouchableOpacity>

            <Text className="text-[16px] font-semibold text-black">
              {formatQty(quantity, toDisplayUnit)}
            </Text>

            <TouchableOpacity
              onPress={increase}
              disabled={quantity >= maxQty}
              activeOpacity={0.7}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                quantity >= maxQty ? "bg-[#9CA3AF]" : "bg-black"
              }`}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="mx-6 mt-8">
            <SummaryRow
              label={`${fromProduct.name} Price`}
              value={`Rs. ${formatPrice(fromPrice)}`}
            />
            <View className="h-[1px] bg-[#ECECEC]" />
            <SummaryRow
              label={`${toProduct.name} Price`}
              value={`- Rs. ${formatPrice(toPrice)}`}
            />
            <View className="h-[1px] bg-[#ECECEC]" />
            <SummaryRow
              label="Balance"
              value={`Rs. ${formatPrice(Math.abs(balance))}`}
              bold
              valueColor={isCredit ? "#3B82F6" : "#EF4444"}
            />
          </View>

          <View className="mx-6 mt-6 bg-[#F5F5F5] rounded-2xl p-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            <Text className="text-[13px] text-[#6B6B6B] leading-5">
              You have already paid for this order, so the remaining balance of{" "}
              <Text className="font-bold text-black">
                Rs. {formatPrice(Math.abs(balance))}
              </Text>{" "}
              will be credited to your account.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onReplace}
          activeOpacity={0.85}
          className="mx-6 mt-6 mb-8 h-[54px] bg-black rounded-full justify-center items-center shadow-sm"
        >
          <Text className="text-white text-[16px] font-bold">Replace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ChangeProductQuantity;
