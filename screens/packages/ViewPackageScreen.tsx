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
import BottomCart from "@/component/common/BottomCart";

import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";


type Props = StackScreenProps<RootStackParamList, "ViewPackage">;

const ViewPackage: React.FC<Props> = ({ navigation, route }) => {
    const { itemPackage } = route.params;

    const [unit, setUnit] = useState<"kg" | "g">("g");
    const [quantity, setQuantity] = useState(1);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const [viewCartVisible, setViewCartVisible] = useState(false);

    const increaseQty = () => {
        setQuantity((prev) => prev + 1);
    };

    const decreaseQty = () => {
        if (quantity > 1) setQuantity((prev) => prev - 1);

    };

    const onAddToCart = async () => {
        // API
        console.log("Added");
        showCartMessage("Added to Cart");
    };

    const onUpdateCart = async () => {
        // API

        console.log("Updated");
        showCartMessage("Cart Updated");

    };

    const onRemoveFromCart = async () => {
        // API

        console.log("Removed");
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
    }
    // let samplePackages  = packages[1]

    const totalItems = itemPackage.packageItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

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


                <View className="items-center mt-10 mb-10">
                    <Image
                        source={{ uri: itemPackage.image }}
                        resizeMode="contain"
                        style={{
                            width: "100%",
                            height: 200,
                        }}
                    />
                </View>

                {/* White area */}

                <View
                    style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                        marginTop: 10,
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        paddingHorizontal: 20,
                        paddingTop: 22,
                        paddingBottom: 30,

                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        shadowOffset: {
                            width: 0,
                            height: -2,
                        },
                        elevation: 6,
                    }}
                >
                    {/* Package Name */}
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "500",
                            color: "#111827",
                            marginBottom: 10,
                        }}
                    >
                        {itemPackage.name}
                    </Text>

                    {/* Price */}
                    <Text
                        style={{
                            fontSize: 20,
                            fontWeight: "800",
                            color: "#000",
                            marginBottom: 6,
                        }}
                    >
                        {itemPackage.price.toLocaleString("en-US", {
                            style: "currency",
                            currency: "LKR",
                        })}
                    </Text>
                    <View
                                            style={{
                                                height: 1,
                                                backgroundColor: "#ECECEC",
                                                marginVertical: 16,
                                            }}
                                        />

                    {/* Section Title */}
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#111827",
                            marginBottom: 10,
                               paddingHorizontal: 15,
                        }}
                    >
                        All ({totalItems} Items)
                    </Text>

                     

                    {/* Package Items */}
                    {itemPackage.packageItems.map((item, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingVertical: 14,
                                paddingHorizontal: 15,
                                borderBottomWidth:
                                    index === itemPackage.packageItems.length - 1 ? 0 : 1,
                                borderBottomColor: "#E5E7EB",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 15,
                                    color: "#667085",
                                    flex: 1,
                                }}
                            >
                                {item.itemName}
                            </Text>

                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "500",
                                    color: "#667085",
                                }}
                            >
                                {item.quantity.toString().padStart(2, "0")}
                            </Text>
                        </View>
                    ))}
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

            <BottomCart
                minimumValue={1}
                step={1}
                quantity={quantity}
                onIncrease={increaseQty}
                onDecrease={decreaseQty}
                onAddToCart={onAddToCart}
                onUpdateCart={onUpdateCart}
                onRemoveFromCart={onRemoveFromCart}
            />

        </View>
    );
};

export default ViewPackage;