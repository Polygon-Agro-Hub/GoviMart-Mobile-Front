import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import ProductBottomCart from "@/component/common/BottomCart";
import AuthPromptModal from "@/component/common/AuthPromptModal";
import cartService from "@/services/cart/cart.service";
import { useSelector, useDispatch } from "react-redux";
import {
  addProduct,
  removeProduct,
  CartState,
  ProductCartItem,
} from "@/store/cartSlice";
import { RootState, AppDispatch } from "@/store";

type Props = StackScreenProps<RootStackParamList, "ViewProduct">;

const ViewProduct: React.FC<Props> = ({ navigation, route }) => {
  const { product } = route.params;

  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const cartProducts = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.products,
  );
  const cartPackages = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.packages,
  );
  const totalCartItems = cartProducts.length + cartPackages.length;

  const existingCartItem = cartProducts.find(
    (p: ProductCartItem) => p.id === product?.id,
  );

  const baseUnit = (product?.unitType || "g").toLowerCase();
  const rawStartValue = Number(product?.startValue) || 1;

  const defaultStartUnit: "g" | "kg" =
    baseUnit === "kg" && rawStartValue < 1 ? "g" : (baseUnit as "g" | "kg");
  const defaultStartWeight =
    baseUnit === "kg" && rawStartValue < 1
      ? Math.round(rawStartValue * 1000)
      : rawStartValue;

  const initialUnit: "g" | "kg" = existingCartItem
    ? existingCartItem.unit
    : defaultStartUnit;
  const initialWeight = existingCartItem
    ? existingCartItem.weight
    : defaultStartWeight;

  const normalPriceVal = Number(product?.normalPrice) || 0;
  const discountedPriceVal =
    product?.discountedPrice != null ? Number(product.discountedPrice) : null;

  const hasDiscount =
    discountedPriceVal != null &&
    discountedPriceVal > 0 &&
    discountedPriceVal < normalPriceVal;

  const effectiveUnitPrice = hasDiscount ? discountedPriceVal : normalPriceVal;

  const startEffectivePrice = effectiveUnitPrice * rawStartValue;
  const startNormalPrice = normalPriceVal * rawStartValue;

  const [unit, setUnit] = useState<"g" | "kg">(initialUnit);
  const [quantity, setQuantity] = useState(initialWeight);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [viewCartVisible, setViewCartVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const rawChangeBy =
    product?.changeby != null && String(product.changeby).trim() !== "" && parseFloat(String(product.changeby)) > 0
      ? parseFloat(String(product.changeby))
      : rawStartValue;

  const minQuantity =
    unit === "kg"
      ? (baseUnit === "kg" ? rawStartValue : (rawStartValue < 1 ? rawStartValue : parseFloat((rawStartValue / 1000).toFixed(3))))
      : (baseUnit === "kg" ? Math.round(rawStartValue * 1000) : (rawStartValue < 1 ? Math.round(rawStartValue * 1000) : Math.round(rawStartValue)));

  const stepSize =
    unit === "kg"
      ? (baseUnit === "kg" ? rawChangeBy : (rawChangeBy < 1 ? rawChangeBy : parseFloat((rawChangeBy / 1000).toFixed(3))))
      : (baseUnit === "kg" ? Math.round(rawChangeBy * 1000) : (rawChangeBy < 1 ? Math.round(rawChangeBy * 1000) : Math.round(rawChangeBy)));

  const currentWeightInG = unit === "kg" ? quantity * 1000 : quantity;
  const startWeightInG =
    baseUnit === "kg" ? rawStartValue * 1000 : rawStartValue;
  const multiplier = startWeightInG > 0 ? currentWeightInG / startWeightInG : 1;

  const startWeightDisplay =
    baseUnit === "kg" && rawStartValue < 1
      ? `${Math.round(rawStartValue * 1000)} g`
      : `${rawStartValue} ${baseUnit}`;

  const formattedStartPrice =
    "Rs. " +
    startEffectivePrice.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const formattedStartNormalPrice =
    "Rs. " +
    startNormalPrice.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const comPrice = product?.comPrice != null ? Number(product.comPrice) : null;
  const discountedPrice =
    product?.discountedPrice != null
      ? Number(product.discountedPrice)
      : Number(product?.normalPrice) || 0;

  const discountSaving =
    comPrice != null && discountedPrice != null && comPrice > discountedPrice
      ? (comPrice - discountedPrice) * rawStartValue
      : null;

  const increaseQty = () => {
    setQuantity((prev) =>
      unit === "kg"
        ? parseFloat((prev + stepSize).toFixed(3))
        : Math.round(prev + stepSize)
    );
  };

  const decreaseQty = () => {
    if (quantity > minQuantity) {
      setQuantity((prev) => {
        const next =
          unit === "kg"
            ? parseFloat((prev - stepSize).toFixed(3))
            : Math.round(prev - stepSize);
        return Math.max(minQuantity, next);
      });
    }
  };

  const changeUnit = (value: "kg" | "g") => {
    if (unit === value) return;
    setUnit(value);
    const minKg = baseUnit === "kg" ? rawStartValue : (rawStartValue < 1 ? rawStartValue : parseFloat((rawStartValue / 1000).toFixed(3)));
    const minG = baseUnit === "kg" ? Math.round(rawStartValue * 1000) : (rawStartValue < 1 ? Math.round(rawStartValue * 1000) : Math.round(rawStartValue));

    if (value === "kg") {
      const newQty = parseFloat((quantity / 1000).toFixed(3));
      setQuantity(Math.max(minKg, newQty));
    } else {
      const newQty = Math.round(quantity * 1000);
      setQuantity(Math.max(minG, newQty));
    }
  };

  const onAddToCart = () => {
    if (!token) {
      setAuthModalVisible(true);
      return;
    }
    dispatch(
      addProduct({
        id: product!.id,
        name: product!.displayName,
        image: product!.image,
        price: normalPriceVal,
        normalPrice: normalPriceVal,
        discountedPrice: discountedPriceVal || undefined,
        comPrice: comPrice || undefined,
        weight: quantity,
        unit: unit,
        minimumWeight: minQuantity,
        step: stepSize,
      }),
    );
    if (token) {
      cartService.syncCartProduct(product!.id, quantity, unit).catch((err) =>
        console.error("Cart DB sync product error:", err)
      );
    }
    showCartMessage("Added to Cart");
  };

  const onUpdateCart = () => {
    if (!token) {
      setAuthModalVisible(true);
      return;
    }
    dispatch(
      addProduct({
        id: product!.id,
        name: product!.displayName,
        image: product!.image,
        price: normalPriceVal,
        normalPrice: normalPriceVal,
        discountedPrice: discountedPriceVal || undefined,
        comPrice: comPrice || undefined,
        weight: quantity,
        unit: unit,
        minimumWeight: minQuantity,
        step: stepSize,
      }),
    );
    if (token) {
      cartService.syncCartProduct(product!.id, quantity, unit).catch((err) =>
        console.error("Cart DB sync product error:", err)
      );
    }
    showCartMessage("Cart Updated");
  };

  const onRemoveFromCart = () => {
    dispatch(removeProduct(product!.id));
    if (token) {
      cartService.removeCartProduct(product!.id).catch((err) =>
        console.error("Cart DB remove product error:", err)
      );
    }
    showCartMessage("Removed from Cart");
    setViewCartVisible(false);
  };
  const showCartMessage = (message: string) => {
    setToastMessage(message);

    setToastVisible(true);

    setViewCartVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  return (
    <View className="flex-1 bg-[#FCEFD9]">
      {/* Close Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute right-5 top-3 z-50 bg-white w-11 h-11 rounded-full items-center justify-center"
      >
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>

      {/* Product Image */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
        }}
      >
        <View className="items-center mt-16 mb-16">
          <Image
            source={{ uri: product!.image }}
            resizeMode="contain"
            style={{
              width: "100%",
              height: 300,
            }}
          />
        </View>

        {/* Bottom Card */}

        <View
          className="bg-white flex-1 mt-2 px-6 pt-7 h-screen"
          style={{
            flex: 1,
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: {
              width: 0,
              height: -4,
            },

            elevation: 10,
          }}
        >
          {/* Product Name */}

          <Text
            className="text-black"
            style={{
              fontSize: 28,
              fontWeight: 500,
            }}
          >
            {product?.displayName}
          </Text>

          {/* Unit Switch */}

          <View className="flex-row mt-5">
            <TouchableOpacity
              onPress={() => changeUnit("kg")}
              style={{
                width: 58,
                height: 34,
                borderRadius: 17,
                backgroundColor: unit === "kg" ? "#FF931E" : "#FFD3A0",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                }}
              >
                kg
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeUnit("g")}
              style={{
                width: 58,
                height: 34,
                borderRadius: 17,
                backgroundColor: unit === "g" ? "#FF931E" : "#FFD3A0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                }}
              >
                g
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}

          <View
            style={{
              height: 1,
              backgroundColor: "#ECECEC",
              marginVertical: 20,
            }}
          />

          {/* Weight: Always displays database start value */}
          <Text
            style={{
              color: "#666",
              fontSize: 20,
              marginBottom: 5,
            }}
          >
            {startWeightDisplay}
          </Text>

          {/* Price: Always displays database start value relevant price */}
          {hasDiscount && (
            <Text
              style={{
                fontSize: 18,
                color: "#999",
                textDecorationLine: "line-through",
                marginBottom: 2,
              }}
            >
              {formattedStartNormalPrice}
            </Text>
          )}

          <Text
            style={{
              fontSize: 30,
              fontWeight: "700",
              color: "#000",
            }}
          >
            {formattedStartPrice}
          </Text>

          {/* Savings — only shown when product has a discount */}
          {discountSaving != null && (
            <View
              style={{
                backgroundColor: "#F3FFE4",
                marginTop: 16,
                borderRadius: 12,
                padding: 14,
                flexDirection: "row",
              }}
            >
              <Ionicons
                name="heart"
                color="#000"
                size={18}
                style={{ marginTop: 2 }}
              />

              <Text
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 14,
                  color: "#222",
                }}
              >
                You save{" "}
                <Text style={{ fontWeight: "bold" }}>
                  Rs.
                  {discountSaving.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>{" "}
                shopping within us than the marketplace.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Toast — shown at top over the image */}
      <CartToast visible={toastVisible} message={toastMessage} />

      {/* View Cart popup — floats above bottom bar */}
      <ViewCartPopup
        visible={viewCartVisible}
        itemCount={totalCartItems}
        onPress={() => navigation.navigate("MyCart")}
      />

      <ProductBottomCart
        minimumValue={minQuantity}
        step={stepSize}
        quantity={quantity}
        unit={unit as any}
        initialIsAdded={!!existingCartItem}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onAddToCart={onAddToCart}
        onUpdateCart={onUpdateCart}
        onRemoveFromCart={onRemoveFromCart}
      />

      <AuthPromptModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        navigation={navigation}
        title="Sign In to Add Product"
        subtitle="Please sign in or create an account to add fresh items to your cart and place orders."
      />
    </View>
  );
};

export default ViewProduct;
