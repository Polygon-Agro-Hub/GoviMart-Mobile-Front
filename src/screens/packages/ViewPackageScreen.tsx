import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { addPackage, setPackageQuantity, removePackage } from "@/store/cartSlice";
import { RootStackParamList } from "@/types/types";
import BottomCart from "@/component/common/BottomCart";

import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import productService from "@/services/product/product.service";

type Props = StackScreenProps<RootStackParamList, "ViewPackage">;

const ViewPackage: React.FC<Props> = ({ navigation, route }) => {
    const { packageId, packageName, image, price } = route.params;
    const dispatch = useDispatch();
    const existingPackage = useSelector((state: RootState) =>
        state.cart.packages.find((p) => String(p.id) === String(packageId))
    );
    const cartProducts = useSelector((state: RootState) => state.cart.products);
    const cartPackages = useSelector((state: RootState) => state.cart.packages);
    const totalCartItems = cartProducts.length + cartPackages.length;

    const [packageItems, setPackageItems] = useState<{ itemName: string; quantity: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const [quantity, setQuantity] = useState(existingPackage ? existingPackage.quantity : 1);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const [viewCartVisible, setViewCartVisible] = useState(!!existingPackage);

    useEffect(() => {
        if (existingPackage) {
            setQuantity(existingPackage.quantity);
            setViewCartVisible(true);
        }
    }, [existingPackage]);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const response = await productService.getPackageDetails(packageId);
                if (response.data && response.data.status) {
                    const items = response.data.packageItems.map((item: any) => ({
                        itemName: item.displayName || item.itemName || "",
                        quantity: item.quantity,
                    }));
                    setPackageItems(items);
                }
            } catch (error) {
                console.error("failed to fetch package details: ", error);
                Alert.alert("Error", "Failed to load package details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [packageId]);

    const totalItems = packageItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const increaseQty = () => {
        setQuantity((prev) => prev + 1);
    };

    const decreaseQty = () => {
        if (quantity > 1) setQuantity((prev) => prev - 1);
    };

    const onAddToCart = async () => {
        dispatch(
            addPackage({
                id: packageId,
                name: packageName,
                image: image,
                price: price,
                quantity: quantity,
                totalItems: totalItems,
            })
        );
        showCartMessage("Added to Cart");
    };

    const onUpdateCart = async () => {
        dispatch(
            setPackageQuantity({
                id: packageId,
                quantity: quantity,
            })
        );
        showCartMessage("Cart Updated");
    };

    const onRemoveFromCart = async () => {
        dispatch(removePackage(packageId));
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

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#FCEFD9] items-center justify-center">
                <ActivityIndicator size="large" color="#000" />
            </SafeAreaView>
        );
    }

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
                    flexGrow: 1,
                }}
            >
                <View className="items-center mt-10 mb-10">
                    <Image
                        source={{ uri: image }}
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
                        {packageName}
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
                        {(price * quantity).toLocaleString("en-US", {
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
                    {packageItems.map((item, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingVertical: 14,
                                paddingHorizontal: 15,
                                borderBottomWidth:
                                    index === packageItems.length - 1 ? 0 : 1,
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
                visible={viewCartVisible && totalCartItems > 0}
                itemCount={totalCartItems}
                onPress={() => navigation.navigate("MyCart")}
            />

            <BottomCart
                minimumValue={1}
                step={1}
                quantity={quantity}
                initialIsAdded={!!existingPackage}
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