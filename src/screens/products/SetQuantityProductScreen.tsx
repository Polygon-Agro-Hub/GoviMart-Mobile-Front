import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useDispatch } from "react-redux";
import { replacePackageProduct } from "@/store/packageReviewSlice";

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
   Mock data — replace with route.params values
   e.g. const { fromProduct, toProduct } = route.params;
--------------------------------------------------------- */

const MOCK_FROM: ProductInfo = {
  id: "strawberry",
  name: "Strawberry",
  icon: "🍓",
  unit: "kg",
  baseQty: 0.5,
  pricePerBaseQty: 800,
};

const MOCK_TO: ProductInfo = {
  id: "apple",
  name: "Apple",
  icon: "🍎",
  unit: "kg",
  baseQty: 1,
  pricePerBaseQty: 500,
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
  <View className="flex-row items-center px-8 w-full">
    <ProductAvatar product={product} />
    <View className="ml-4">
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
      className={`text-[14px] ${bold ? "font-bold text-black" : "text-[#6B6B6B]"
        }`}
    >
      {label}
    </Text>
    <Text
      className={`text-[14px] ${bold ? "font-bold" : "font-semibold text-black"
        }`}
      style={valueColor ? { color: valueColor } : undefined}
    >
      {value}
    </Text>
  </View>
);

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ChangeProductQuantity: React.FC<Props> = ({ navigation, route }) => {
  const rawFrom = route.params?.fromProduct;
  const rawTo = route.params?.toProduct;
  const packageId = route.params?.packageId || "fruity";
  const stepIndex = route.params?.stepIndex ?? 0;

  const fromProduct: ProductInfo = useMemo(() => {
    if (rawFrom) {
      const rawUnit = (rawFrom.unit || "kg").toLowerCase();
      let rawQty = rawFrom.quantity || 1;
      const rawPrice = rawFrom.price || 500;
      if (rawUnit === "g") {
        rawQty = Number((rawQty / 1000).toFixed(3));
      }
      return {
        id: rawFrom.id?.toString() || "from",
        name: rawFrom.name || "Original Product",
        icon: rawFrom.icon || "🍓",
        image: rawFrom.image,
        unit: "kg",
        baseQty: rawQty,
        pricePerBaseQty: rawPrice,
      };
    }
    return MOCK_FROM;
  }, [rawFrom]);

  const toProduct: ProductInfo = useMemo(() => {
    if (rawTo) {
      const priceVal =
        parseFloat(rawTo.normalPrice || rawTo.price || rawTo.pricePerBaseQty) ||
        600;

      return {
        id: rawTo.id?.toString() || "to",
        name: rawTo.displayName || rawTo.name || "Replacement Product",
        icon: rawTo.icon || "🥗",
        image: rawTo.image,
        unit: "kg",
        baseQty: 1,
        pricePerBaseQty: priceVal,
      };
    }
    return MOCK_TO;
  }, [rawTo]);

  const step = 0.5;
  const minQty = 0.5;
  const maxQty = 10;

  const [quantity, setQuantity] = useState(
    typeof rawFrom?.quantity === "number" && rawFrom.quantity > 0
      ? (rawFrom.unit === "g" ? Number((rawFrom.quantity / 1000).toFixed(2)) || 0.5 : rawFrom.quantity)
      : 0.5
  );

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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-11 h-11 rounded-full border border-[#EEEEEE] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-[17px] font-semibold text-black mr-11">
          Set Quantity
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-[#6B6B6B] mx-6 mt-2">
          You are replacing {fromProduct.name} with {toProduct.name}.
        </Text>

        {/* From -> To */}
        <View className="items-center mt-6">
          <ProductRow
            product={fromProduct}
            subtitle={`${fromProduct.baseQty} ${fromProduct.unit}`}
            price={`Rs. ${fromPrice.toFixed(2)}`}
          />

          <View className="my-3">
            <Ionicons name="arrow-down" size={22} color="#000" />
          </View>

          <ProductRow
            product={toProduct}
            subtitle={`${quantity} ${toProduct.unit}`}
            price={`Rs. ${toPrice.toFixed(2)}`}
          />
        </View>

        {/* Quantity Stepper */}
        <View className="mx-6 mt-8 flex-row items-center justify-between rounded-full border-2 border-[#3B82F6] bg-[#F9F9F9] px-2 py-2">
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
            {quantity} {toProduct.unit}
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
            value={`Rs. ${fromPrice.toFixed(2)}`}
          />
          <View className="h-[1px] bg-[#ECECEC]" />
          <SummaryRow
            label={`${toProduct.name} Price`}
            value={`- Rs. ${toPrice.toFixed(2)}`}
          />
          <View className="h-[1px] bg-[#ECECEC]" />
          <SummaryRow
            label="Balance"
            value={`${isCredit ? "" : "- "}Rs. ${Math.abs(balance).toFixed(
              2
            )}`}
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
              Rs. {Math.abs(balance).toFixed(2)}
            </Text>{" "}
            will be credited to your account.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onReplace}
          activeOpacity={0.85}
          className="mx-6 mt-6 mb-8 bg-black rounded-2xl py-4 items-center"
        >
          <Text className="text-white text-[16px] font-bold">
            Replace
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChangeProductQuantity;