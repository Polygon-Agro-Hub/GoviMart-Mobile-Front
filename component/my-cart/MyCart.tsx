import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import PackageCartCard from "./PackageCartCard";
import ProductCartCard from "./ProductCartCard";
import OrderSummary from "./OrderSummary";

type NavigationProp = StackNavigationProp<
    RootStackParamList,
    "MyCart"
>;

interface PackageItem {
    id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    totalItems: number;
}

interface ProductItem {
    id: number;
    name: string;
    image: string;
    price: number;
    weight: number;
    unit: "g" | "kg";
    minimumWeight: number;
    step: number;
}

interface Props {
    navigation: NavigationProp;
}

const MyCart: React.FC<Props> = ({ navigation }) => {
    const [packages, setPackages] = useState<PackageItem[]>([
        {
            id: 1,
            name: "Veggie Pack",
            image:
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
            price: 1200,
            quantity: 1,
            totalItems: 10,
        },
    ]);

    const [products, setProducts] = useState<ProductItem[]>([
        {
            id: 1,
            name: "Cantaloup",
            image:
                "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=800",
            price: 1200,
            weight: 500,
            unit: "g",
            minimumWeight: 500,
            step: 100,
        },

        {
            id: 2,
            name: "Sweet Potato",
            image:
                "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=800",
            price: 600,
            weight: 1,
            unit: "kg",
            minimumWeight: 1,
            step: 1,
        },
    ]);

    const increaseWeight = (id: number) => {
        setProducts((currentProducts) =>
            currentProducts.map((product) => {

                if (product.id !== id) {
                    return product;
                }

                return {
                    ...product,
                    weight: product.weight + product.step!,
                };
            })
        );
    };

    const decreaseWeight = (id: number) => {
        setProducts((currentProducts) =>
            currentProducts.map((product) => {
                if (product.id !== id) {
                    return product;
                }

                const newWeight =
                    product.weight - product.step!;

                if (newWeight < product.minimumWeight) {
                    return product;
                }

                return {
                    ...product,
                    weight: newWeight,
                };
            })
        );
    };

    const deleteProduct = (id: number) => {
        setProducts((currentProducts) =>
            currentProducts.filter(
                (product) => product.id !== id
            )
        );
    };

    const productTotal = products.reduce(
        (total, product) => {
            const weightMultiplier =
                product.unit === "kg"
                    ? product.weight / product.minimumWeight
                    : product.weight / product.minimumWeight;

            return total + product.price * weightMultiplier;
        },
        0
    );

    const changeProductUnit = (
        id: number,
        newUnit: "g" | "kg"
    ) => {
        setProducts((currentProducts) =>
            currentProducts.map((product) => {
                if (product.id !== id) {
                    return product;
                }

                // Already selected
                if (product.unit === newUnit) {
                    return product;
                }

                if (newUnit === "kg") {
                    // g → kg
                    return {
                        ...product,
                        weight: product.weight / 1000,
                        minimumWeight:
                            product.minimumWeight / 1000,
                        step: product.step / 1000,
                        unit: "kg",
                    };
                }

                // kg → g
                return {
                    ...product,
                    weight: product.weight * 1000,
                    minimumWeight:
                        product.minimumWeight * 1000,
                    step: product.step * 1000,
                    unit: "g",
                };
            })
        );
    };
    const increasePackage = (id: number) => {
        setPackages((currentPackages) =>
            currentPackages.map((pkg) => {
                if (pkg.id !== id) {
                    return pkg;
                }

                return {
                    ...pkg,
                    quantity: pkg.quantity + 1,
                };
            })
        );
    };

    const decreasePackage = (id: number) => {
        setPackages((currentPackages) =>
            currentPackages.map((pkg) => {
                if (pkg.id !== id) {
                    return pkg;
                }

                if (pkg.quantity <= 1) {
                    return pkg;
                }

                return {
                    ...pkg,
                    quantity: pkg.quantity - 1,
                };
            })
        );
    };

    const deletePackage = (id: number) => {
        setPackages((currentPackages) =>
            currentPackages.filter(
                (pkg) => pkg.id !== id
            )
        );
    };

    const packageTotal = packages.reduce(
        (total, pkg) =>
            total + pkg.price * pkg.quantity,
        0
    );
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFF",
            }}
        >
            {/* Header */}

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 60,
                }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        position: "absolute",
                        left: 16,
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#FFF",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Ionicons
                        name="chevron-back"
                        size={22}
                    />
                </TouchableOpacity>

                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "700",
                    }}
                >
                    My Cart
                </Text>
            </View>

            <View style={{ flex: 1 }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 14,
                        paddingBottom: 300,
                    }}
                >
                    {/* Package Section */}
                    {packages.length > 0 && <>
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
                    </>}

                    {/* Product Section */}
                    {products.length > 0 && <>
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
                                onChangeUnit={changeProductUnit}
                            />
                        ))}
                    </>}
                </ScrollView>
            </View>

            {/* Part 3 */}

            <OrderSummary
                packageTotal={packageTotal}
                productTotal={productTotal}
                discount={100}
            //   onCheckout={() => navigation.navigate("Checkout")}
            />
        </View>
    );
};

export default MyCart;