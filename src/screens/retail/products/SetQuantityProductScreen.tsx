import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  useWindowDimensions,
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
  unit: "kg";
  baseQty: number; // qty (in kg) the price below refers to
  pricePerBaseQty: number;
};

/* ---------------------------------------------------------
   Layout constants for the product rows
--------------------------------------------------------- */

const ROW_SIDE_PADDING = 32; // space left/right of each row
const AVATAR_SIZE = 80; // circle size
const AVATAR_GAP = 16; // gap between circle and text
const TEXT_MAX_WIDTH = 170; // width of the name/qty/price column

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */

const ProductAvatar: React.FC<{ product: ProductInfo }> = ({ product }) => (
  <View
    className="rounded-full bg-[#F5F5F5] items-center justify-center overflow-hidden"
    style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 }}
  >
    {product.image ? (
      <Image
        source={{ uri: product.image }}
        style={{ width: 52, height: 52 }}
        resizeMode="contain"
      />
    ) : (
      <Text style={{ fontSize: 32 }}>{product.icon}</Text>
    )}
  </View>
);

const ProductRow: React.FC<{
  product: ProductInfo;
  subtitle: string;
  price: string;
}> = ({ product, subtitle, price }) => {
  const { width: screenWidth } = useWindowDimensions();

  // Never wider than what fits on screen (keeps 32px margin each side)
  const textWidth = Math.min(
    TEXT_MAX_WIDTH,
    screenWidth - 64 - AVATAR_SIZE - AVATAR_GAP,
  );

  return (
    // justify-center puts the image + text block in the middle of the screen
    <View className="flex-row items-center justify-center w-full">
      <ProductAvatar product={product} />

      <View style={{ width: textWidth, marginLeft: AVATAR_GAP }}>
        <Text
          className="text-[16px] font-bold text-black"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {product.name}
        </Text>
        <Text className="text-[13px] text-[#8A8A8A] mt-0.5">{subtitle}</Text>
        <Text className="text-[16px] font-bold text-black mt-0.5">
          {price}
        </Text>
      </View>
    </View>
  );
};

const SummaryRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => (
  <View className="flex-row justify-between items-center py-3">
    <Text
      className={`flex-1 mr-4 text-[14px] ${
        bold ? "font-bold text-black" : "text-[#6B6B6B]"
      }`}
      numberOfLines={2}
    >
      {label}
    </Text>
    <Text
      className={`text-[14px] ${
        bold ? "font-bold" : "font-semibold text-black"
      }`}
      style={[{ flexShrink: 0 }, valueColor ? { color: valueColor } : null]}
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

// Quantities are ALWAYS shown in kg. The unit type is never switched.
const formatQty = (qtyKg: number) => `${parseFloat(String(qtyKg))} kg`;

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ChangeProductQuantity: React.FC<Props> = ({ navigation, route }) => {
  const rawFrom = route.params?.fromProduct;
  const rawTo = route.params?.toProduct;
  const stepIndex = route.params?.stepIndex ?? 0;

  // ---------------------------------------------------------------------
  // Payment / delivery method — drives which "Please Note" copy is shown.
  // Forwarded from ReviewPackage -> ReplaceProduct -> here via route.params.
  // ---------------------------------------------------------------------
  // Delivery method -> orders.delivaryMethod       ("Pickup" / "Delivery")
  // Payment method  -> processorders.paymentMethod ("Cash" / "Card")
  const paymentMethod: string = String(route.params?.paymentMethod || "")
    .trim()
    .toLowerCase();
  const deliveryMethod: string = String(route.params?.deliveryMethod || "")
    .trim()
    .toLowerCase();

  // "pickup" (or "Pickup" from the DB) -> pickup. "home" / "delivery" -> delivery.
  const isPickup = deliveryMethod.includes("pickup");
  const isCard =
    paymentMethod.includes("card") ||
    paymentMethod.includes("payhere") ||
    paymentMethod.includes("online");

  const fromProduct: ProductInfo = useMemo(() => {
    // The package item quantity is always stored in kg, so it is used as-is.
    // (No "> 10 means grams" guessing — with no max limit, 10+ kg is valid.)
    const rawQty =
      parseFloat(String(rawFrom?.quantity ?? rawFrom?.qty ?? 1)) || 1;
    const rawPrice = rawFrom?.price || 0;
    return {
      id: rawFrom?.id?.toString() || "from",
      name: rawFrom?.name || "Original Product",
      icon: rawFrom?.icon || "🥬",
      image: rawFrom?.image,
      unit: "kg",
      baseQty: rawQty,
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
      pricePerBaseQty: priceVal, // per-kg rate
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

  // NOTE: there is intentionally NO maximum quantity.

  // Default quantity comes from the REPLACEMENT product's own startValue
  // (minQty), not from the original product being replaced.
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
  // Treat anything that rounds to Rs. 0.00 as zero (avoids float noise)
  const isBalanceZero = Number(balance.toFixed(2)) === 0;

  const decrease = () =>
    setQuantity((q: number) =>
      Math.max(minQty, parseFloat((q - step).toFixed(3))),
    );

  const increase = () =>
    setQuantity((q: number) => parseFloat((q + step).toFixed(3)));

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
      unit: "kg" as const, // unit type is always kg
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

const amountText = (
  <Text className="font-bold text-black">
    Rs. {formatPrice(Math.abs(balance))}
  </Text>
);

// 1) Check PAYMENT first.
//    Card  → already paid, so credited / additional (delivery method doesn't matter)
//    Cash  → then check DELIVERY: pickup or delivery
const noteContent = isCard ? (
  isCredit ? (
    <>
      You have already paid for this order, so the remaining balance of{" "}
      {amountText} will be credited to your account.
    </>
  ) : (
    <>
      You have already paid for this order. The additional {amountText} will
      need to be paid at the end of this process.
    </>
  )
) : (
  <>
    The total amount you need to pay upon {isPickup ? "pickup" : "delivery"}{" "}
    will be{" "}
    <Text className="font-bold text-black">
      {isCredit ? "reduced" : "increased"}
    </Text>{" "}
    by {amountText} at the end of this process.
  </>
);

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

          <View className="mt-6">
            <ProductRow
              product={fromProduct}
              subtitle={formatQty(fromProduct.baseQty)}
              price={`Rs. ${formatPrice(fromPrice)}`}
            />

            <View className="my-3 items-center">
              <Ionicons name="arrow-down" size={22} color="#000" />
            </View>

            <ProductRow
              product={toProduct}
              subtitle={formatQty(quantity)}
              price={`Rs. ${formatPrice(toPrice)}`}
            />
          </View>

          <View className="mx-6 mt-8 flex-row items-center justify-between rounded-full border border-[#E1E7EE] bg-[#FBFBFB] px-2 py-2">
            <TouchableOpacity
              onPress={decrease}
              disabled={quantity <= minQty}
              activeOpacity={0.7}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                quantity <= minQty ? "bg-[#EEEEEE]" : "bg-[#000000]"
              }`}
            >
              <Ionicons
                name="remove"
                size={20}
                color={quantity <= minQty ? "#9CA3AF" : "#fff"}
              />
            </TouchableOpacity>

            <Text className="text-[16px] font-semibold text-black">
              {formatQty(quantity)}
            </Text>

            {/* No max limit: the + button is always enabled */}
            <TouchableOpacity
              onPress={increase}
              activeOpacity={0.7}
              className="w-11 h-11 rounded-full items-center justify-center bg-black"
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
              valueColor={
                isBalanceZero ? "#000000" : isCredit ? "#3B82F6" : "#EF4444"
              }
            />
          </View>

          {/* Hidden when the balance is zero */}
          {!isBalanceZero && (
            <View className="mx-6 mt-6 bg-[#F5F5F5] rounded-2xl p-4">
              <Text className="text-[14px] font-bold text-black mb-1">
                Please Note :
              </Text>
              <Text className="text-[13px] text-[#6B6B6B] leading-5">
                {noteContent}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={onReplace}
          activeOpacity={0.85}
          className="mx-6 mt-6 mb-8 h-[54px] bg-black rounded-full justify-center items-center shadow-sm"
          style={{
            height: 50,
            borderRadius: 40,

            // iOS shadow (X 0, Y 2, Blur 4, #000000 @ 20%)
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,

            // Android shadow
            elevation: 6,
          }}
        >
          <Text className="text-white text-[16px] font-bold">Replace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ChangeProductQuantity;