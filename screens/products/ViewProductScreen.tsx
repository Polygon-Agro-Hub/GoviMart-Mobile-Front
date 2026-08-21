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

type Props = StackScreenProps<RootStackParamList, "ViewProduct">;

const ViewProduct: React.FC<Props> = ({ navigation, route }) => {
    const { product } = route.params;

    const [unit, setUnit] = useState((product?.unitType!).toLowerCase());
    const [quantity, setQuantity] = useState(Number(product?.startValue));
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const [viewCartVisible, setViewCartVisible] = useState(false);

    const increaseQty = () => {
        if (unit === "g") {
            setQuantity((prev) => prev + 100);
        } else {
            setQuantity((prev) => Number((prev + 0.5).toFixed(1)));
        }
    };

    const decreaseQty = () => {
        if (unit === "g") {
            if (quantity > 100) setQuantity((prev) => prev - 100);
        } else {
            if (quantity > 0.5)
                setQuantity((prev) => Number((prev - 0.5).toFixed(1)));
        }
    };

    const changeUnit = (value: "kg" | "g") => {
        setUnit(value);

        if (value === "g") {
            setQuantity(500);
        } else {
            setQuantity(1);
        }
    };

    const onAddToCart = async () => {
        // API

        console.log("Added");
        showCartMessage("Added to Cart");

        //   setTopToast("Added to Cart");

        //   setBottomToast(true);

        //   setTimeout(() => {
        //     setBottomToast(false);
        //   }, 3000);
    };

    const onUpdateCart = async () => {
        // API

        console.log("Updated");

        //   setTopToast("Cart Updated");

        //   setBottomToast(true);

        //   setTimeout(() => {
        //     setBottomToast(false);
        //   }, 3000);
        showCartMessage("Cart Updated");

    };

    const onRemoveFromCart = async () => {
        // API

        console.log("Removed");

        //   setTopToast("Removed from Cart");

        //   setBottomToast(false);

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
                            fontWeight: 700,
                            color: "#000",
                        }}
                    >
                        {"Rs. "+product?.normalPrice}
                    </Text>

                    {/* Savings */}

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
                                Rs.50.00
                            </Text>{" "}
                            shopping within us than the marketplace.
                        </Text>
                    </View>

                </View>
            </ScrollView>

            {/* Bottom Cart */}
            <CartToast
                visible={toastVisible}
                message={toastMessage}
            />

            <ViewCartPopup
                visible={viewCartVisible}
                itemCount={1}
            // onPress={() => navigation.navigate("Cart")}
            />

            <ProductBottomCart
                minimumValue={Number(product?.startValue!)}
                step={100}
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