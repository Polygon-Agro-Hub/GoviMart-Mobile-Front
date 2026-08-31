import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { HurryBanner } from "@/component/package/HurryBanner";
import { ProductReviewCard } from "@/component/package/ProductReviewCard";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type ScreenMode = "overview" | "packageReview";

type PackageSummary = {
    id: string;
    name: string;
    icon: string; // emoji placeholder — swap for an <Image> when you have assets
    qty: number;
    unitPrice: number;
};

type ReviewProduct = {
    id: string;
    category: string; // e.g. "Up Country Fruit (1)"
    name: string;
    icon: string;
    price: number;
    quantity: number;
    unit: "kg" | "g";
    step: number;
    excludedWarning?: string;
};

type PackageReview = {
    id: string;
    no: number;
    name: string;
    products: ReviewProduct[];
    originalPackagePrice: number;
    serviceFee: number;
    packingFee: number;
};

/* ---------------------------------------------------------
   Mock data — replace with data from route.params / API
--------------------------------------------------------- */

const MOCK_PACKAGES: PackageSummary[] = [
    { id: "fruity", name: "Fruity Pack (x2)", icon: "🍇", qty: 2, unitPrice: 1000 },
    { id: "veggie", name: "Veggie Pack(x1)", icon: "🥗", qty: 1, unitPrice: 1000 },
];

const MOCK_PACKAGE_REVIEWS: PackageReview[] = [
    {
        id: "fruity",
        no: 1,
        name: "Fruity Pack",
        originalPackagePrice: 900,
        serviceFee: 50,
        packingFee: 50,
        products: [
            {
                id: "strawberry",
                category: "Up Country Fruit (1)",
                name: "Strawberry",
                icon: "🍓",
                price: 500,
                quantity: 0.5,
                unit: "kg",
                step: 0.5,
                excludedWarning:
                    "You marked Strawberry as an exclude product for your packages. Please Change Product if you don't need this.",
            },
            {
                id: "lemon",
                category: "Low Country Fruit (1)",
                name: "Lemon",
                icon: "🍋",
                price: 200,
                quantity: 0.5,
                unit: "kg",
                step: 0.5,
            },
            {
                id: "grapes",
                category: "Low Country Fruit (2)",
                name: "Grapes",
                icon: "🍇",
                price: 200,
                quantity: 0.1,
                unit: "kg",
                step: 0.1,
            },
        ],
    },
    {
        id: "veggie",
        no: 2,
        name: "Veggie Pack",
        originalPackagePrice: 850,
        serviceFee: 50,
        packingFee: 50,
        products: [
            {
                id: "carrot",
                category: "Root Vegetable (1)",
                name: "Carrot",
                icon: "🥕",
                price: 300,
                quantity: 0.5,
                unit: "kg",
                step: 0.5,
            },
        ],
    },
];

const TimeBox: React.FC<{ value: string }> = ({ value }) => (
    <View className="bg-black rounded-md px-3 py-1.5 min-w-[42px] items-center">
        <Text className="text-white text-[16px] font-bold">{value}</Text>
    </View>
);

const ProgressDots: React.FC<{ total: number; current: number }> = ({
    total,
    current,
}) => (
    <View className="flex-row mx-5 mt-6" style={{ gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
            <View
                key={i}
                className="flex-1 rounded-full"
                style={{
                    height: 4,
                    backgroundColor: i === current ? "#000" : "#E4E4E4",
                }}
            />
        ))}
    </View>
);
/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ReviewPackage: React.FC<Props> = ({ navigation, route }) => {
    // const { orderId } = route.params;
    const orderId = 294566666 //for testing

    const [mode, setMode] = useState<ScreenMode>("overview");
    const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
    const [packageReviews, setPackageReviews] = useState(MOCK_PACKAGE_REVIEWS);

    const overviewTotal = MOCK_PACKAGES.reduce(
        (sum, p) => sum + p.qty * p.unitPrice,
        0
    );

    const currentPackage = packageReviews[currentPackageIndex];

    const updateQuantity = (productId: string, delta: number) => {
        setPackageReviews((prev) =>
            prev.map((pkg, idx) => {
                if (idx !== currentPackageIndex) return pkg;
                return {
                    ...pkg,
                    products: pkg.products.map((prod) =>
                        prod.id === productId
                            ? {
                                ...prod,
                                quantity: Math.max(
                                    prod.step,
                                    Number(
                                        (prod.quantity + delta * prod.step).toFixed(2)
                                    )
                                ),
                            }
                            : prod
                    ),
                };
            })
        );
    };

    const onChangeProduct = (productId: string) => {
        navigation.navigate("SetQauntity");
        console.log("Change product", productId);
    };

    const onCancelOrder = async () => {
        // API call to cancel order
        console.log("Order cancelled");
        navigation.navigate("OrderCancelConfirmation")
    };

    const onConfirmPackage = async () => {
        if (currentPackageIndex < packageReviews.length - 1) {
            setCurrentPackageIndex((prev) => prev + 1);
        } else {
            // API call — all packages confirmed
            console.log("All packages confirmed");
        }
    };

    const currentProductTotal =
        currentPackage.originalPackagePrice +
        currentPackage.serviceFee +
        currentPackage.packingFee;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center px-5 pt-3 pb-4">
                <TouchableOpacity
                    onPress={() =>
                        mode === "packageReview"
                            ? setMode("overview")
                            : navigation.goBack()
                    }
                    className="w-11 h-11 rounded-full border border-[#EEEEEE] items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={22} color="#000" />
                </TouchableOpacity>

                <Text className="flex-1 text-center text-[17px] font-semibold text-black mr-11">
                    Review Your Package
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {mode === "overview" && (
                    <>
                        <View className="items-center mt-2">
                            <Text className="text-[20px] font-bold text-black">
                                Order : {orderId}
                            </Text>
                            <Text className="text-[15px] text-[#8A8A8A] mt-1">
                                Schedule to : 14
                                <Text className="text-[10px]">th</Text> August
                            </Text>
                        </View>

                        <View className="h-[1px] bg-[#ECECEC] mt-5" />

                        <Text className="text-center text-[14px] text-[#6B6B6B] mt-4 mx-8 leading-5">
                            Review and customize your package as per your
                            preference.
                        </Text>

                        <View className="mt-5">
                            <HurryBanner ordersLeft={30} date="14th August" />
                        </View>

                        <View className="h-[1px] bg-[#ECECEC] mt-6" />

                        <Text className="text-center text-[14px] text-[#6B6B6B] mt-4 mx-8 leading-5">
                            Here are the packages you purchased. You can review
                            and update them if needed.
                        </Text>

                        {MOCK_PACKAGES.map((pkg) => (
                            <View
                                key={pkg.id}
                                className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl p-4 flex-row items-center"
                            >
                                <View className="w-11 h-11 rounded-full bg-[#F5F5F5] items-center justify-center">
                                    <Text style={{ fontSize: 20 }}>{pkg.icon}</Text>
                                </View>
                                <View className="ml-3">
                                    <Text className="text-[17px] font-bold text-black">
                                        {pkg.name}
                                    </Text>
                                    <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                                        Price :{" "}
                                        <Text className="font-bold text-black">
                                            Rs.{pkg.unitPrice.toFixed(2)} x {pkg.qty} = Rs.
                                            {(pkg.unitPrice * pkg.qty).toFixed(2)}
                                        </Text>
                                    </Text>
                                </View>
                            </View>
                        ))}

                        <Text className="text-center text-[14px] text-[#6B6B6B] mt-5 mx-8 leading-5">
                            Lastly, you may also purchase any additional items
                            you want after reviewing the packages you purchased.
                        </Text>

                        <View className="mx-5 mt-4 bg-[#F5F5F5] rounded-2xl p-4">
                            <Text className="text-[14px] font-bold text-black mb-1">
                                Please Note :
                            </Text>
                            <Text className="text-[13px] text-[#6B6B6B] leading-5">
                                If you update the quantities of products in your
                                packages, or add or replace products, the total
                                amount may change. You'll need to pay any
                                additional amount due.
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between mx-5 mt-5">
                            <Text className="text-[16px] font-bold text-black">
                                Total
                            </Text>
                            <Text className="text-[16px] font-bold text-black">
                                Rs. {overviewTotal.toFixed(2)}
                            </Text>
                        </View>

                        <View className="h-[1px] bg-[#ECECEC] mt-3 mx-5" />

                        <TouchableOpacity
                            onPress={() => setMode("packageReview")}
                            activeOpacity={0.85}
                            className="mx-5 mt-5 mb-8 bg-black rounded-2xl py-4 items-center"
                        >
                            <Text className="text-white text-[16px] font-bold">
                                Review My Packages
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {mode === "packageReview" && currentPackage && (
                    <>
                        <View className="mt-2">
                            <HurryBanner
                                ordersLeft={30}
                                date="14th August"
                                showCancelLink
                                onCancelOrder={onCancelOrder}
                            />
                        </View>

                        <ProgressDots
                            total={packageReviews.length + 2}
                            current={currentPackageIndex}
                        />

                        <Text className="text-[19px] font-bold text-black mx-5 mt-5">
                            Package : {currentPackage.name} (No :{" "}
                            {String(currentPackage.no).padStart(2, "0")})
                        </Text>
                        <Text className="text-[13px] text-[#6B6B6B] mx-5 mt-1">
                            You can change the products and quantity as needed.
                        </Text>

                        {currentPackage.products.map((product) => (
                            <ProductReviewCard
                                key={product.id}
                                product={product}
                                onIncrease={() => updateQuantity(product.id, 1)}
                                onDecrease={() => updateQuantity(product.id, -1)}
                                onChangeProduct={() => onChangeProduct(product.id)}
                            />
                        ))}

                        <View className="mx-5 mt-6">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-[14px] text-[#6B6B6B]">
                                    Original Package
                                </Text>
                                <Text className="text-[14px] text-black">
                                    Rs. {currentPackage.originalPackagePrice.toFixed(2)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-[14px] text-[#6B6B6B]">
                                    Service Fee
                                </Text>
                                <Text className="text-[14px] text-black">
                                    Rs. {currentPackage.serviceFee.toFixed(2)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-[14px] text-[#6B6B6B]">
                                    Packing Fee
                                </Text>
                                <Text className="text-[14px] text-black">
                                    Rs. {currentPackage.packingFee.toFixed(2)}
                                </Text>
                            </View>

                            <View className="h-[1px] bg-[#ECECEC] my-2" />

                            <View className="flex-row justify-between">
                                <Text className="text-[16px] font-bold text-black">
                                    Total
                                </Text>
                                <Text className="text-[16px] font-bold text-black">
                                    Rs. {currentProductTotal.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={onConfirmPackage}
                            activeOpacity={0.85}
                            className="mx-5 mt-6 mb-8 bg-black rounded-2xl py-4 items-center"
                        >
                            <Text className="text-white text-[16px] font-bold">
                                Confirm & Continue ({currentPackageIndex + 1})
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default ReviewPackage;