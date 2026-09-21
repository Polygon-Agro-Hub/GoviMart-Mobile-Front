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
      <Text className="text-[16px] font-bold text-black">
        {product.name}
      </Text>
      <Text className="text-[13px] text-[#8A8A8A] mt-0.5">{subtitle}</Text>
      <Text className="text-[16px] font-bold text-black mt-0.5">
        {price}
      </Text>
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

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ChangeProductQuantity: React.FC<Props> = ({ navigation, route }) => {
  const rawFrom = route.params?.fromProduct;
  const rawTo = route.params?.toProduct;
  const packageId = route.params?.packageId || "";
  const stepIndex = route.params?.stepIndex ?? 0;

  const fromProduct: ProductInfo = useMemo(() => {
    const rawUnit = (rawFrom?.unit || "kg").toLowerCase();
    let rawQty = parseFloat(String(rawFrom?.quantity || rawFrom?.qty || 1)) || 1;
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
    const priceVal =
      parseFloat(rawTo?.normalPrice || rawTo?.price || rawTo?.pricePerBaseQty) ||
      0;

    return {
      id: rawTo?.id?.toString() || "to",
      name: rawTo?.displayName || rawTo?.name || "Replacement Product",
      icon: rawTo?.icon || "🥗",
      image: rawTo?.image,
      unit: "kg",
      baseQty: 1,
      pricePerBaseQty: priceVal,
    };
  }, [rawTo]);

  const step = 0.5;
  const minQty = 0.5;
  const maxQty = 10;

  const [quantity, setQuantity] = useState(() => {
    const rawUnit = (rawFrom?.unit || "kg").toLowerCase();
    const parsedQty = parseFloat(String(rawFrom?.quantity ?? 0.5));
    if (!isNaN(parsedQty) && parsedQty > 0) {
      return rawUnit === "g" ? Number((parsedQty / 1000).toFixed(3)) || 0.5 : parsedQty;
    }
    return 0.5;
  });

  const fromUnitPrice = fromProduct.pricePerBaseQty;
  const fromPrice = fromUnitPrice * fromProduct.baseQty;

  const toUnitPrice = toProduct.pricePerBaseQty;
  const toPrice = useMemo(
    () => toUnitPrice * quantity,
    [toUnitPrice, quantity]
  );

  const balance = useMemo(() => fromPrice - toPrice, [fromPrice, toPrice]);
  const isCredit = balance >= 0;

  const decrease = () =>
    setQuantity((q: number) => Math.max(minQty, Number((q - step).toFixed(2))));

  const increase = () =>
    setQuantity((q: number) => Math.min(maxQty, Number((q + step).toFixed(2))));

  const dispatch = useDispatch();

  const onReplace = async () => {
    const newProductObj = {
      id: String(rawTo?.id ?? toProduct.id),
      itemId: rawFrom?.itemId,
      productId: rawTo?.id ? Number(rawTo.id) : (parseInt(toProduct.id) || undefined),
      category: rawFrom?.category || rawTo?.productTypeName || "Replaced Product",
      name: toProduct.name,
      icon: toProduct.icon || "🥗",
      image: toProduct.image,
      price: toUnitPrice,
      quantity: quantity,
      minQuantity: step || 0.5,
      unit: "kg" as const,
      step: step,
      productType: rawFrom?.productType || rawTo?.productTypeId,
      productTypeId: rawFrom?.productTypeId || rawTo?.productTypeId,
      productTypeName: rawFrom?.productTypeName || rawTo?.productTypeName,
      isReplaced: true,
      originalProduct: rawFrom?.originalProduct || rawFrom,
    };

    console.log("\n[SetQuantityProductScreen] onReplace triggered. Dispatching replacePackageProduct to Redux:", {
      packageId: route.params?.packageId,
      orderPackageId: route.params?.orderPackageId,
      originalProductId: String(rawFrom?.id ?? fromProduct.id),
      newProduct: newProductObj,
    });

    dispatch(
      replacePackageProduct({
        packageId: route.params?.packageId,
        orderPackageId: route.params?.orderPackageId,
        originalProductId: String(rawFrom?.id ?? fromProduct.id),
        newProduct: newProductObj,
      })
    );

    navigation.navigate("ReviewPackage", {
      orderId: route.params?.orderId,
      targetStepIndex: stepIndex,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
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

          {/* From -> To */}
          <View className="items-center mt-6">
            <ProductRow
              product={fromProduct}
              subtitle={`${parseFloat(String(fromProduct.baseQty))} kg`}
              price={`Rs. ${formatPrice(fromPrice)}`}
            />

            <View className="my-3">
              <Ionicons name="arrow-down" size={22} color="#000" />
            </View>

            <ProductRow
              product={toProduct}
              subtitle={`${parseFloat(String(quantity))} kg`}
              price={`Rs. ${formatPrice(toPrice)}`}
            />
          </View>

          {/* Quantity Stepper */}
          <View className="mx-6 mt-8 flex-row items-center justify-between rounded-full border border-[#E1E7EE] bg-[#FBFBFB] px-2 py-2">
            <TouchableOpacity
              onPress={decrease}
              disabled={quantity <= minQty}
              activeOpacity={0.7}
              className={`w-11 h-11 rounded-full items-center justify-center ${quantity <= minQty ? "bg-[#EEEEEE]" : "bg-[#D9D9D9]"
                }`}
            >
              <Ionicons name="remove" size={20} color="#374151" />
            </TouchableOpacity>

            <Text className="text-[16px] font-semibold text-black">
              {parseFloat(String(quantity))} kg
            </Text>

            <TouchableOpacity
              onPress={increase}
              disabled={quantity >= maxQty}
              activeOpacity={0.7}
              className={`w-11 h-11 rounded-full items-center justify-center ${quantity >= maxQty ? "bg-[#9CA3AF]" : "bg-black"
                }`}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Price breakdown */}
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
              value={`${isCredit ? "" : "- "}Rs. ${formatPrice(Math.abs(balance))}`}
              bold
              valueColor="#3B82F6"
            />
          </View>

          {/* Note */}
          <View className="mx-6 mt-6 bg-[#F5F5F5] rounded-2xl p-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            <Text className="text-[13px] text-[#6B6B6B] leading-5">
              You have already paid for this order, so the remaining
              balance of{" "}
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
          <Text className="text-white text-[16px] font-bold">
            Replace
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ChangeProductQuantity;