import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import ProductBottomCart from "@/component/common/BottomCart";
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

  const minQuantity =
    unit === "kg"
      ? baseUnit === "kg"
        ? rawStartValue
        : rawStartValue / 1000
      : baseUnit === "kg"
        ? Math.round(rawStartValue * 1000)
        : rawStartValue;

  const stepSize = unit === "g" ? (minQuantity >= 500 ? 500 : 100) : 0.5;

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
    setQuantity((prev) => Number((prev + stepSize).toFixed(2)));
  };

  const decreaseQty = () => {
    if (quantity > minQuantity)
      setQuantity((prev) =>
        Number(Math.max(minQuantity, prev - stepSize).toFixed(2)),
      );
  };

  const changeUnit = (value: "kg" | "g") => {
    setUnit(value);
    if (value === "kg") {
      const newQty =
        unit === "g" ? Number((quantity / 1000).toFixed(2)) : quantity;
      const minKg = baseUnit === "kg" ? rawStartValue : rawStartValue / 1000;
      setQuantity(Math.max(minKg, newQty));
    } else {
      const newQty = unit === "kg" ? Math.round(quantity * 1000) : quantity;
      const minG =
        baseUnit === "kg" ? Math.round(rawStartValue * 1000) : rawStartValue;
      setQuantity(Math.max(minG, newQty));
    }
  };

  const onAddToCart = () => {
    dispatch(
      addProduct({
        id: product!.id,
        name: product!.displayName,
        image: product!.image,
        price: startEffectivePrice,
        weight: quantity,
        unit: unit,
        minimumWeight: minQuantity,
        step: stepSize,
      }),
    );
    showCartMessage("Added to Cart");
  };

  const onUpdateCart = () => {
    dispatch(
      addProduct({
        id: product!.id,
        name: product!.displayName,
        image: product!.image,
        price: startEffectivePrice,
        weight: quantity,
        unit: unit,
        minimumWeight: minQuantity,
        step: stepSize,
      }),
    );
    showCartMessage("Cart Updated");
  };

  const onRemoveFromCart = () => {
    dispatch(removeProduct(product!.id));
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
      <StatusBar backgroundColor="#FCEFD9" barStyle="dark-content" />

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
    </View>
  );
};

export default ViewProduct;
