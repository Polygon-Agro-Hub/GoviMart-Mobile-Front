import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  increasePackageQuantity,
  decreasePackageQuantity,
  removePackage,
  increaseProductWeight,
  decreaseProductWeight,
  removeProduct,
  changeProductUnit,
  updateAvailabilityMap,
  setCartFromBackend,
} from "@/store/cartSlice";
import PackageCartCard from "@/component/my-cart/PackageCartCard";
import ProductCartCard from "@/component/my-cart/ProductCartCard";
import OrderSummary from "@/component/my-cart/OrderSummary";
import CustomHeader from "@/component/common/CustomHeader";
import AuthPromptModal from "@/component/common/AuthPromptModal";
import productService from "@/services/product/product.service";
import cartService from "@/services/cart/cart.service";
import { RootStackParamList, OrderContext } from "@/types/types";

type NavigationProp = StackNavigationProp<
    RootStackParamList,
    "MyCart"
>;

interface Props {
    navigation: NavigationProp;
}

const MyCart: React.FC<Props> = ({ navigation }) => {
    const dispatch = useDispatch();
    const token = useSelector((state: RootState) => state.auth.token);
    const { packages, products } = useSelector((state: RootState) => state.cart);
    const [cartId, setCartId] = useState<number | null>(null);
    const [authModalVisible, setAuthModalVisible] = useState(false);

    // ─── FETCH & SYNC DB CART + CHECK AVAILABILITY ON FOCUS ─────────────────────
    useFocusEffect(
        useCallback(() => {
            const syncAndCheckCart = async () => {
                try {
                    if (token) {
                        // For logged-in users, getUserCart() is the single source of truth.
                        // It queries the DB and already provides real-time isUnavailable flags for both products and packages.
                        const dbCartRes = await cartService.getUserCart();
                        if (dbCartRes.data && dbCartRes.data.status && dbCartRes.data.data) {
                            if (dbCartRes.data.data.cartId) {
                                setCartId(dbCartRes.data.data.cartId);
                            }
                            const dbProducts = dbCartRes.data.data.products || [];
                            const dbPackages = dbCartRes.data.data.packages || [];
                            dispatch(setCartFromBackend({ products: dbProducts, packages: dbPackages }));
                        }
                    } else {
                        // For guest / unauthenticated users, check availability of local Redux items
                        const productIds = products.map((p) => p.id);
                        const packageIds = packages.map((p) => p.id);

                        if (productIds.length > 0 || packageIds.length > 0) {
                            const response = await productService.checkAvailability(productIds, packageIds);
                            if (response.data && response.data.status) {
                                dispatch(
                                    updateAvailabilityMap({
                                        products: response.data.products || {},
                                        packages: response.data.packages || {},
                                    })
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error("Cart sync/availability check error:", error);
                }
            };

            syncAndCheckCart();
        }, [dispatch, token])
    );

    // ─── HANDLERS ─────────────────────────────────────────────────────────────
    const increaseWeight = (id: number) => {
        dispatch(increaseProductWeight(id));
        const item = products.find((p) => p.id === id);
        if (item && token) {
            const newWeight = item.weight + item.step;
            cartService.syncCartProduct(id, newWeight, item.unit).catch((err) =>
                console.error("Failed DB sync for increaseWeight:", err)
            );
        }
    };

    const decreaseWeight = (id: number) => {
        dispatch(decreaseProductWeight(id));
        const item = products.find((p) => p.id === id);
        if (item && token) {
            const newWeight = Math.max(item.minimumWeight, item.weight - item.step);
            cartService.syncCartProduct(id, newWeight, item.unit).catch((err) =>
                console.error("Failed DB sync for decreaseWeight:", err)
            );
        }
    };

    const deleteProduct = (id: number) => {
        dispatch(removeProduct(id));
        if (token) {
            cartService.removeCartProduct(id).catch((err) =>
                console.error("Failed DB sync for deleteProduct:", err)
            );
        }
    };

    const changeProductUnitHandler = (id: number, newUnit: "g" | "kg") => {
        dispatch(changeProductUnit({ id, newUnit }));
        const item = products.find((p) => p.id === id);
        if (item && token) {
            const newWeight = newUnit === "kg" ? item.weight / 1000 : item.weight * 1000;
            cartService.syncCartProduct(id, newWeight, newUnit).catch((err) =>
                console.error("Failed DB sync for changeProductUnit:", err)
            );
        }
    };

    const increasePackage = (id: number) => {
        dispatch(increasePackageQuantity(id));
        const pkg = packages.find((p) => p.id === id);
        if (pkg && token) {
            cartService.syncCartPackage(id, pkg.quantity + 1).catch((err) =>
                console.error("Failed DB sync for increasePackage:", err)
            );
        }
    };

    const decreasePackage = (id: number) => {
        dispatch(decreasePackageQuantity(id));
        const pkg = packages.find((p) => p.id === id);
        if (pkg && token && pkg.quantity > 1) {
            cartService.syncCartPackage(id, pkg.quantity - 1).catch((err) =>
                console.error("Failed DB sync for decreasePackage:", err)
            );
        }
    };

    const deletePackage = (id: number) => {
        dispatch(removePackage(id));
        if (token) {
            cartService.removeCartPackage(id).catch((err) =>
                console.error("Failed DB sync for deletePackage:", err)
            );
        }
    };

    // ─── TOTAL CALCULATIONS (Excludes unavailable items) ─────────────────────
    const productTotal = products.reduce((total, product) => {
        if (product.isUnavailable) return total;
        const weightMultiplier = product.unit === "kg" ? product.weight : product.weight / 1000;
        return total + product.price * weightMultiplier;
    }, 0);

    const packageTotal = packages.reduce((total, pkg) => {
        if (pkg.isUnavailable) return total;
        return total + pkg.price * pkg.quantity;
    }, 0);

    const totalDiscount = products.reduce((total, product) => {
        if (product.isUnavailable || !product.normalPrice || product.normalPrice <= product.price) return total;
        const weightMultiplier = product.unit === "kg" ? product.weight : product.weight / 1000;
        return total + (product.normalPrice - product.price) * weightMultiplier;
    }, 0);

    const handleCheckout = () => {
        if (!token) {
            setAuthModalVisible(true);
            return;
        }

        if (packages.length === 0 && products.length === 0) {
            Alert.alert("Empty Cart", "Your cart is empty. Please add items to proceed.");
            return;
        }

        const hasUnavailable = packages.some((p) => p.isUnavailable) || products.some((p) => p.isUnavailable);
        if (hasUnavailable) {
            Alert.alert("Unavailable Items", "Some items in your cart are currently unavailable. Please remove them before proceeding.");
            return;
        }

        const grandTotal = Math.max(0, packageTotal + productTotal - totalDiscount);
        const orderContext: OrderContext = {
            cartId: cartId || undefined,
            grandTotal,
            packageTotal,
            productTotal,
            discount: totalDiscount,
        };

        if (packages.length > 0) {
            navigation.navigate("PackageConfirmation", { orderContext });
        } else {
            navigation.navigate("OrderDeliveryMethod", { orderContext });
        }
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFF",
            }}
        >
            {/* Header */}
            <CustomHeader
                title="My Cart"
                titleColor="black"
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
                {/* Cart Items */}
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    {/* Package Section */}
                    {packages.length > 0 && (
                        <>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "700",
                                    marginBottom: 12,
                                    marginTop: 6,
                                }}
                            >
                                Packages ({packages.length.toString().padStart(2, "0")})
                            </Text>

                            {packages.map((item) => (
                                <PackageCartCard
                                    key={item.id}
                                    item={item}
                                    onIncrease={increasePackage}
                                    onDecrease={decreasePackage}
                                    onDelete={deletePackage}
                                />
                            ))}
                        </>
                    )}

                    {/* Product Section */}
                    {products.length > 0 && (
                        <>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "700",
                                    marginTop: packages.length > 0 ? 20 : 6,
                                    marginBottom: 12,
                                }}
                            >
                                Ala Carte Items ({products.length.toString().padStart(2, "0")})
                            </Text>

                            {products.map((item) => (
                                <ProductCartCard
                                    key={item.id}
                                    item={item}
                                    onIncrease={increaseWeight}
                                    onDecrease={decreaseWeight}
                                    onDelete={deleteProduct}
                                    onChangeUnit={changeProductUnitHandler}
                                />
                            ))}
                        </>
                    )}

                    {packages.length === 0 && products.length === 0 && (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 }}>
                            <Text style={{ fontSize: 16, color: "#64748B", fontWeight: "500" }}>
                                Your cart is empty
                            </Text>
                        </View>
                    )}
                </View>

                {/* Order Summary — displays at bottom if low data, or scrolls naturally if many items */}
                <OrderSummary
                    packageTotal={packageTotal}
                    productTotal={productTotal}
                    discount={totalDiscount}
                    onCheckout={handleCheckout}
                />
            </ScrollView>

            <AuthPromptModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
                navigation={navigation}
                title="Sign In to Checkout"
                subtitle="Please sign in or create an account to proceed to delivery selection and complete your order."
            />
        </View>
    );
};

export default MyCart;