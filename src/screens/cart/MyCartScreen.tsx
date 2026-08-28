import React, { useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
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
} from "@/store/cartSlice";
import PackageCartCard from "@/component/my-cart/PackageCartCard";
import ProductCartCard from "@/component/my-cart/ProductCartCard";
import OrderSummary from "@/component/my-cart/OrderSummary";
import CustomHeader from "@/component/common/CustomHeader";
import productService from "@/services/product/product.service";
import { RootStackParamList } from "@/types/types";

type NavigationProp = StackNavigationProp<
    RootStackParamList,
    "MyCart"
>;

interface Props {
    navigation: NavigationProp;
}

const MyCart: React.FC<Props> = ({ navigation }) => {
    const dispatch = useDispatch();
    const { packages, products } = useSelector((state: RootState) => state.cart);

    // ─── CHECK AVAILABILITY FROM BACKEND ON FOCUS ─────────────────────────────
    useFocusEffect(
        useCallback(() => {
            const checkItemAvailability = async () => {
                const productIds = products.map((p) => p.id);
                const packageIds = packages.map((p) => p.id);

                if (productIds.length === 0 && packageIds.length === 0) return;

                try {
                    const response = await productService.checkAvailability(productIds, packageIds);
                    if (response.data && response.data.status) {
                        dispatch(
                            updateAvailabilityMap({
                                products: response.data.products || {},
                                packages: response.data.packages || {},
                            })
                        );
                    }
                } catch (error) {
                    console.error("Failed to check cart items availability:", error);
                }
            };

            checkItemAvailability();
        }, [dispatch, products.length, packages.length])
    );

    // ─── HANDLERS ─────────────────────────────────────────────────────────────
    const increaseWeight = (id: number) => {
        dispatch(increaseProductWeight(id));
    };

    const decreaseWeight = (id: number) => {
        dispatch(decreaseProductWeight(id));
    };

    const deleteProduct = (id: number) => {
        dispatch(removeProduct(id));
    };

    const changeProductUnitHandler = (id: number, newUnit: "g" | "kg") => {
        dispatch(changeProductUnit({ id, newUnit }));
    };

    const increasePackage = (id: number) => {
        dispatch(increasePackageQuantity(id));
    };

    const decreasePackage = (id: number) => {
        dispatch(decreasePackageQuantity(id));
    };

    const deletePackage = (id: number) => {
        dispatch(removePackage(id));
    };

    // ─── TOTAL CALCULATIONS (Excludes unavailable items) ─────────────────────
    const productTotal = products.reduce((total, product) => {
        if (product.isUnavailable) return total;
        const weightMultiplier = product.weight / product.minimumWeight;
        return total + product.price * weightMultiplier;
    }, 0);

    const packageTotal = packages.reduce((total, pkg) => {
        if (pkg.isUnavailable) return total;
        return total + pkg.price * pkg.quantity;
    }, 0);

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

            <View style={{ flex: 1 }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 14,
                        paddingBottom: 300,
                    }}
                >
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
                                    marginTop: 24,
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
                </ScrollView>
            </View>

            {/* Order Summary */}
            <OrderSummary
                packageTotal={packageTotal}
                productTotal={productTotal}
                discount={100}
                onCheckout={() => navigation.navigate("OrderHistory")}
            />
        </View>
    );
};

export default MyCart;