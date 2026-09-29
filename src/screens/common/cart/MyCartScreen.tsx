import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Alert,
    RefreshControl,
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
import ConfirmationModal from "@/component/common/ConfirmationModal";
import LottieView from "lottie-react-native";
import productService from "@/services/product/product.service";
import cartService from "@/services/cart/cart.service";
import customerService from "@/services/customer/customer.service";
import socketService from "@/services/socket/socket.service";
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
    const [isNegativeCreditModalVisible, setIsNegativeCreditModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const isCartSyncingRef = React.useRef(false);
    const deletedProductIdsRef = React.useRef<Set<number>>(new Set());
    const deletedPackageIdsRef = React.useRef<Set<number>>(new Set());
    const packageSyncTimersRef = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const productSyncTimersRef = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const productsRef = React.useRef(products);
    const packagesRef = React.useRef(packages);
    React.useEffect(() => {
        productsRef.current = products;
        packagesRef.current = packages;
    }, [products, packages]);

    const sortedProducts = React.useMemo(() => {
        return [...products].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        );
    }, [products]);

    // Clear debounce timers on unmount
    React.useEffect(() => {
        return () => {
            Object.values(packageSyncTimersRef.current).forEach(clearTimeout);
            Object.values(productSyncTimersRef.current).forEach(clearTimeout);
        };
    }, []);

    // ─── FETCH & SYNC DB CART + CHECK AVAILABILITY ─────────────────────────────
    const syncAndCheckCart = useCallback(async (force = false) => {
        try {
            if (!force && isCartSyncingRef.current) return;

            if (token) {
                // For logged-in users, getUserCart() is the single source of truth.
                const dbCartRes = await cartService.getUserCart();
                if (isCartSyncingRef.current && !force) return;

                if (dbCartRes.data && dbCartRes.data.status && dbCartRes.data.data) {
                    if (dbCartRes.data.data.cartId) {
                        setCartId(dbCartRes.data.data.cartId);
                    }
                    const rawProducts = dbCartRes.data.data.products || [];
                    const rawPackages = dbCartRes.data.data.packages || [];

                    // Filter out any items that the user just deleted in this session
                    const dbProducts = rawProducts.filter(
                        (p: any) => !deletedProductIdsRef.current.has(p.id)
                    );
                    const dbPackages = rawPackages.filter(
                        (pkg: any) => !deletedPackageIdsRef.current.has(pkg.id)
                    );

                    dispatch(setCartFromBackend({ products: dbProducts, packages: dbPackages }));
                }
            } else {
                // For guest / unauthenticated users, check availability of local Redux items
                const productIds = productsRef.current.map((p) => p.id);
                const packageIds = packagesRef.current.map((p) => p.id);

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
    }, [dispatch, token]);

    // ─── REAL-TIME SOCKET SUBSCRIPTION FOR PRODUCT/PACKAGE STATUS ──────────────
    React.useEffect(() => {
        socketService.connect();
        const unsubscribe = socketService.onCatalogUpdate((data) => {
            console.log("📦 [MyCartScreen] Real-time catalog/status update received via Socket.IO:", data);
            isCartSyncingRef.current = false;
            syncAndCheckCart(true);
        });

        return () => {
            unsubscribe();
        };
    }, [syncAndCheckCart]);

    useFocusEffect(
        useCallback(() => {
            syncAndCheckCart();
        }, [syncAndCheckCart])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            isCartSyncingRef.current = false;
            deletedProductIdsRef.current.clear();
            deletedPackageIdsRef.current.clear();
            await syncAndCheckCart(true);
        } finally {
            setRefreshing(false);
        }
    };

    // ─── HANDLERS ─────────────────────────────────────────────────────────────
    const increaseWeight = (id: number) => {
        const item = productsRef.current.find((p) => p.id === id);
        if (!item) return;
        if (item.maxWeight != null && item.weight >= item.maxWeight) {
            return;
        }
        isCartSyncingRef.current = true;
        dispatch(increaseProductWeight(id));

        if (token) {
            const nextW = item.unit === "kg"
                ? parseFloat((item.weight + item.step).toFixed(3))
                : Math.round(item.weight + item.step);
            const newWeight = item.maxWeight != null ? Math.min(item.maxWeight, nextW) : nextW;

            if (productSyncTimersRef.current[id]) {
                clearTimeout(productSyncTimersRef.current[id]);
            }
            productSyncTimersRef.current[id] = setTimeout(() => {
                cartService.syncCartProduct(id, newWeight, item.unit)
                    .catch((err) => console.error("Failed DB sync for increaseWeight:", err))
                    .finally(() => {
                        setTimeout(() => { isCartSyncingRef.current = false; }, 800);
                    });
            }, 350);
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const decreaseWeight = (id: number) => {
        const item = productsRef.current.find((p) => p.id === id);
        if (!item) return;
        if (item.weight <= item.minimumWeight) {
            deleteProduct(id);
            return;
        }
        isCartSyncingRef.current = true;
        dispatch(decreaseProductWeight(id));

        if (token) {
            const decremented = item.unit === "kg"
                ? parseFloat((item.weight - item.step).toFixed(3))
                : Math.round(item.weight - item.step);
            const newWeight = Math.max(item.minimumWeight, decremented);

            if (productSyncTimersRef.current[id]) {
                clearTimeout(productSyncTimersRef.current[id]);
            }
            productSyncTimersRef.current[id] = setTimeout(() => {
                cartService.syncCartProduct(id, newWeight, item.unit)
                    .catch((err) => console.error("Failed DB sync for decreaseWeight:", err))
                    .finally(() => {
                        setTimeout(() => { isCartSyncingRef.current = false; }, 800);
                    });
            }, 350);
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const deleteProduct = (id: number) => {
        isCartSyncingRef.current = true;
        deletedProductIdsRef.current.add(id);
        if (productSyncTimersRef.current[id]) {
            clearTimeout(productSyncTimersRef.current[id]);
            delete productSyncTimersRef.current[id];
        }
        dispatch(removeProduct(id));
        if (token) {
            cartService.removeCartProduct(id)
                .catch((err) => console.error("Failed DB sync for deleteProduct:", err))
                .finally(() => {
                    setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
                });
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const changeProductUnitHandler = (id: number, newUnit: "g" | "kg") => {
        const item = productsRef.current.find((p) => p.id === id);
        if (!item || item.unit === newUnit) return;
        isCartSyncingRef.current = true;
        dispatch(changeProductUnit({ id, newUnit }));
        const newWeight = newUnit === "kg" ? parseFloat((item.weight / 1000).toFixed(3)) : Math.round(item.weight * 1000);

        if (token) {
            if (productSyncTimersRef.current[id]) {
                clearTimeout(productSyncTimersRef.current[id]);
            }
            productSyncTimersRef.current[id] = setTimeout(() => {
                cartService.syncCartProduct(id, newWeight, newUnit)
                    .catch((err) => console.error("Failed DB sync for changeProductUnit:", err))
                    .finally(() => {
                        setTimeout(() => { isCartSyncingRef.current = false; }, 800);
                    });
            }, 350);
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const increasePackage = (id: number) => {
        const pkg = packagesRef.current.find((p) => p.id === id);
        if (!pkg) return;
        isCartSyncingRef.current = true;
        dispatch(increasePackageQuantity(id));
        const newQty = pkg.quantity + 1;

        if (token) {
            if (packageSyncTimersRef.current[id]) {
                clearTimeout(packageSyncTimersRef.current[id]);
            }
            packageSyncTimersRef.current[id] = setTimeout(() => {
                cartService.syncCartPackage(id, newQty)
                    .catch((err) => console.error("Failed DB sync for increasePackage:", err))
                    .finally(() => {
                        setTimeout(() => { isCartSyncingRef.current = false; }, 800);
                    });
            }, 350);
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const decreasePackage = (id: number) => {
        const pkg = packagesRef.current.find((p) => p.id === id);
        if (!pkg) return;
        if (pkg.quantity <= 1) {
            deletePackage(id);
            return;
        }
        isCartSyncingRef.current = true;
        dispatch(decreasePackageQuantity(id));
        const newQty = pkg.quantity - 1;

        if (token) {
            if (packageSyncTimersRef.current[id]) {
                clearTimeout(packageSyncTimersRef.current[id]);
            }
            packageSyncTimersRef.current[id] = setTimeout(() => {
                cartService.syncCartPackage(id, newQty)
                    .catch((err) => console.error("Failed DB sync for decreasePackage:", err))
                    .finally(() => {
                        setTimeout(() => { isCartSyncingRef.current = false; }, 800);
                    });
            }, 350);
        } else {
            isCartSyncingRef.current = false;
        }
    };

    const deletePackage = (id: number) => {
        isCartSyncingRef.current = true;
        deletedPackageIdsRef.current.add(id);
        if (packageSyncTimersRef.current[id]) {
            clearTimeout(packageSyncTimersRef.current[id]);
            delete packageSyncTimersRef.current[id];
        }
        dispatch(removePackage(id));
        if (token) {
            cartService.removeCartPackage(id)
                .catch((err) => console.error("Failed DB sync for deletePackage:", err))
                .finally(() => {
                    setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
                });
        } else {
            isCartSyncingRef.current = false;
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
        if (product.isUnavailable) return total;
        const normalPrice = product.normalPrice || product.price;
        const discountedPrice = product.discountedPrice;
        if (!discountedPrice || discountedPrice >= normalPrice) return total;
        const weightMultiplier = product.unit === "kg" ? product.weight : product.weight / 1000;
        return total + (normalPrice - discountedPrice) * weightMultiplier;
    }, 0);

    const savedAmount = products.reduce((total, product) => {
        if (product.isUnavailable) return total;
        const comPrice = product.comPrice || 0;
        const effectivePrice = product.discountedPrice && product.discountedPrice > 0
            ? product.discountedPrice
            : (product.normalPrice || product.price);
        const marketPrice = comPrice > 0
            ? comPrice
            : ((product.normalPrice || product.price) > effectivePrice ? (product.normalPrice || product.price) : 0);
        const weightMultiplier = product.unit === "kg" ? product.weight : product.weight / 1000;
        const diff = (marketPrice - effectivePrice) * weightMultiplier;
        return total + (diff > 0 ? diff : 0);
    }, 0);

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const handleCheckout = async () => {
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

        try {
            const accRes = await customerService.getAccountDetails();
            const bal = parseFloat(accRes?.data?.data?.creditBalance || 0);
            if (bal < 0) {
                setIsNegativeCreditModalVisible(true);
                return;
            }
        } catch (err) {
            console.log("Error checking credit balance in cart:", err);
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={["#FF9114"]}
                        tintColor="#FF9114"
                    />
                }
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: packages.length === 0 && products.length === 0 ? "center" : "space-between",
                }}
            >
                {packages.length === 0 && products.length === 0 ? (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            paddingHorizontal: 20,
                            paddingBottom: 40,
                        }}
                    >
                        <LottieView
                            source={require("@/assets/json/cart/no-cart-item.json")}
                            style={{ width: 140, height: 140 }}
                            autoPlay
                            loop
                        />
                        <Text
                            style={{
                                fontSize: 15,
                                color: "#8B96A5",
                                fontWeight: "400",
                                marginTop: 12,
                                textAlign: "center",
                            }}
                        >
                            Your cart is empty.
                        </Text>
                    </View>
                ) : (
                    <>
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

                                    {sortedProducts.map((item) => (
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

                            {/* Saving Price Box */}
                            {savedAmount > 0 && (
                                <View
                                    style={{
                                        backgroundColor: "#EDFBF2",
                                        borderRadius: 20,
                                        paddingVertical: 14,
                                        paddingHorizontal: 18,
                                        marginTop: 14,
                                        marginBottom: 14,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "700",
                                            color: "#166534",
                                            marginBottom: 4,
                                        }}
                                    >
                                        Great News!
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: "#334155",
                                            lineHeight: 20,
                                        }}
                                    >
                                        You’ll save Rs. {formatPrice(savedAmount)} compared to the market price.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Order Summary */}
                        <OrderSummary
                            packageTotal={packageTotal}
                            productTotal={productTotal}
                            discount={totalDiscount}
                            onCheckout={handleCheckout}
                        />
                    </>
                )}
            </ScrollView>

            <AuthPromptModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
                navigation={navigation}
                title="Sign In to Checkout"
                subtitle="Please sign in or create an account to proceed to delivery selection and complete your order."
            />

            <ConfirmationModal
                visible={isNegativeCreditModalVisible}
                title="Negative Credit Balance"
                message="You have an outstanding negative credit balance. Please settle your balance in your account before placing an order."
                confirmLabel="Go to Account"
                cancelLabel="Cancel"
                confirmButtonColor="#FF9114"
                iconName="wallet-outline"
                iconColor="#FF9114"
                iconBgColor="bg-orange-50"
                buttonLayout="column"
                onConfirm={() => {
                    setIsNegativeCreditModalVisible(false);
                    navigation.navigate("Profile" as any);
                }}
                onCancel={() => setIsNegativeCreditModalVisible(false)}
            />
        </View>
    );
};

export default MyCart;