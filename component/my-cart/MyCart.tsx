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
    quantity: number;
    weight: number;
    unit: "g" | "kg";
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
            quantity: 1,
            weight: 500,
            unit: "g",
        },
        {
            id: 2,
            name: "Sweet Potato",
            image:
                "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=800",
            price: 600,
            quantity: 1,
            weight: 1,
            unit: "kg",
        },
    ]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#F7F7F7",
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
                        />
                    ))}

                    {/* Product Section */}

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
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Part 3 */}

            <OrderSummary
                packageTotal={1200}
                productTotal={1200}
                discount={100}
            //   onCheckout={() => navigation.navigate("Checkout")}
            />
        </View>
    );
};

export default MyCart;