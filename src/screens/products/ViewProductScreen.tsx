import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import ProductBottomCart from "@/component/common/BottomCart";
import { useDispatch } from "react-redux";
import { addProduct, removeProduct } from "@/store/cartSlice";
import { AppDispatch } from "@/store";

type Props = StackScreenProps<RootStackParamList, "ViewProduct">;

const ViewProduct: React.FC<Props> = ({ navigation, route }) => {
    const { product } = route.params;

    const dispatch = useDispatch<AppDispatch>();

    // Product base values (always in the product's native unitType, e.g. "g")
    const baseUnit = (product?.unitType || "g").toLowerCase(); // "g" or "kg"
    const baseValue = Number(product?.startValue) || 1;       // e.g. 500 (in baseUnit)
    const basePrice = Number(product?.normalPrice) || 0;

    const [unit, setUnit] = useState(baseUnit);
    const [quantity, setQuantity] = useState(baseValue);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const [viewCartVisible, setViewCartVisible] = useState(false);

    // Minimum quantity in the currently selected unit
    const minQuantity = unit === baseUnit
        ? baseValue
        : unit === "kg"
            ? Number((baseValue / 1000).toFixed(1))   // g→kg: 500g = 0.5kg
            : Math.round(baseValue * 1000);            // kg→g: 0.5kg = 500g

    // Step size in the currently selected unit
    const stepSize = unit === "g" ? 100 : 0.5;

    // Normalize quantity to base unit before calculating price
    // e.g. if baseUnit="g" and unit="kg": 0.5kg × 1000 = 500g
    const quantityInBaseUnit = unit === baseUnit
        ? quantity
        : unit === "kg"
            ? quantity * 1000   // kg → g
            : quantity / 1000;  // g  → kg

    // Dynamic price: scales with quantity
    const dynamicPrice = (quantityInBaseUnit / baseValue) * basePrice;
    const formattedPrice = "Rs. " + dynamicPrice.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const comPrice = product?.comPrice != null ? Number(product.comPrice) : null;
    const discountedPrice = product?.discountedPrice != null ? Number(product.discountedPrice) : null;

    // Savings per base unit: comPrice - discountedPrice (or fallback if comPrice is compared against normalPrice or discount against normalPrice)
    const savingPerBaseUnit =
        comPrice != null && discountedPrice != null && comPrice > discountedPrice
            ? comPrice - discountedPrice
            : comPrice != null && basePrice > 0 && comPrice > basePrice
            ? comPrice - basePrice
            : discountedPrice != null && basePrice > discountedPrice
            ? basePrice - discountedPrice
            : null;

    // Discount saving scaled with quantity (in base unit)
    const discountSaving = savingPerBaseUnit != null && savingPerBaseUnit > 0
        ? (savingPerBaseUnit / baseValue) * quantityInBaseUnit
        : null;

    const increaseQty = () => {
        setQuantity((prev) => Number((prev + stepSize).toFixed(1)));
    };

    const decreaseQty = () => {
        if (quantity > minQuantity)
            setQuantity((prev) => Number((prev - stepSize).toFixed(1)));
    };

    const changeUnit = (value: "kg" | "g") => {
        setUnit(value);
        // Reset to minimum in the new unit
        if (value === baseUnit) {
            setQuantity(baseValue);
        } else if (value === "kg") {
            setQuantity(Number((baseValue / 1000).toFixed(1)));  // 500g → 0.5kg
        } else {
            setQuantity(Math.round(baseValue * 1000));            // 0.5kg → 500g
        }
    };


    const onAddToCart = () => {
        dispatch(
            addProduct({
                id: product!.id,
                name: product!.displayName,
                image: product!.image,
                price: Number(product!.normalPrice),
                weight: quantity,
                unit: unit as "g" | "kg",
                minimumWeight: minQuantity,
                step: stepSize,
            })
        );
        showCartMessage("Added to Cart");
    };

    const onUpdateCart = () => {
        dispatch(
            addProduct({
                id: product!.id,
                name: product!.displayName,
                image: product!.image,
                price: Number(product!.normalPrice),
                weight: quantity,
                unit: unit as "g" | "kg",
                minimumWeight: minQuantity,
                step: stepSize,
            })
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

            <StatusBar
                backgroundColor="#FCEFD9"
                barStyle="dark-content"
            />

            {/* Close Button */}

            <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="absolute right-5 top-3 z-50 bg-white w-11 h-11 rounded-full items-center justify-center"
            >
                <Ionicons
                    name="close"
                    size={24}
                    color="#000"
                />
            </TouchableOpacity>

            {/* Product Image */}
            <ScrollView

                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    // paddingBottom: 120, // Prevent content from being hidden behind the bottom bar
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
                            fontWeight: 500
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
                                backgroundColor:
                                    unit === "kg"
                                        ? "#FF931E"
                                        : "#FFD3A0",
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
                                backgroundColor:
                                    unit === "g"
                                        ? "#FF931E"
                                        : "#FFD3A0",
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

                    {/* Weight */}

                    <Text
                        style={{
                            color: "#666",
                            fontSize: 20,
                            marginBottom: 5,
                        }}
                    >
                        {quantity} {unit}
                    </Text>

                    {/* Price */}

                    <Text
                        style={{
                            fontSize: 30,
                            fontWeight: "700",
                            color: "#000",
                        }}
                    >
                        {formattedPrice}
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
                                    Rs.{discountSaving.toLocaleString("en-LK", {
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
            <CartToast
                visible={toastVisible}
                message={toastMessage}
            />

            {/* View Cart popup — floats above bottom bar */}
            <ViewCartPopup
                visible={viewCartVisible}
                itemCount={1}
                onPress={() => navigation.navigate("MyCart")}
            />

            <ProductBottomCart
                minimumValue={minQuantity}
                step={stepSize}
                quantity={quantity}
                unit={unit as any}
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