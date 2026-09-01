import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Image,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList, ProductType } from "@/types/types";
import productService from "@/services/product/product.service";
import { HurryBanner } from "@/component/package/HurryBanner";
import { AlacartCardSkeleton } from "@/component/ala-cart-product/AlacartCardSkeleton";
import { AlacartProductCard } from "@/component/ala-cart-product/AlacartProductCard";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type ScreenMode = "overview" | "flow";

type PackageMeta = {
    id: string;
    name: string;
    icon: string; // emoji placeholder — swap for an <Image> when you have assets
    qty: number; // how many instances of this package the user bought
    unitPrice: number;
    serviceFee: number;
    packingFee: number;
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

type AlacartSelectedProduct = {
    id: number | string;
    displayName: string;
    image?: any;
    price: number;
    basePrice: number;
    weightDisplay: string;
    unit: "kg" | "g";
    amount: number;
    quantity: number;
    isAddedNow?: boolean;
};

const getPackageImage = (pkgId: string) => {
    if (pkgId === "fruity") return require("@/assets/images/home/fruits.webp");
    if (pkgId === "veggie") return require("@/assets/images/home/veggies.webp");
    return require("@/assets/images/home/packages.webp");
};

// One step per package INSTANCE, plus one alacart step, plus one confirm step.
// package1 (*1) + package2 (*2) -> [pkg1#1, pkg2#1, pkg2#2, alacart, confirm]
type FlowStep =
    | { type: "package"; packageId: string; instanceIndex: number }
    | { type: "alacart" }
    | { type: "confirm" };

/* ---------------------------------------------------------
   Mock data — replace with data from route.params / API
--------------------------------------------------------- */

const PACKAGES: PackageMeta[] = [
    {
        id: "fruity",
        name: "Fruity Pack",
        icon: "🍇",
        qty: 1,
        unitPrice: 1000,
        serviceFee: 50,
        packingFee: 50,
    },
    {
        id: "veggie",
        name: "Veggie Pack",
        icon: "🥗",
        qty: 2,
        unitPrice: 1000,
        serviceFee: 50,
        packingFee: 50,
    },
];

const PRODUCT_TEMPLATES: Record<string, ReviewProduct[]> = {
    fruity: [
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
    veggie: [
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
        {
            id: "cabbage",
            category: "Leafy Vegetable (1)",
            name: "Cabbage",
            icon: "🥬",
            price: 250,
            quantity: 0.5,
            unit: "kg",
            step: 0.5,
        },
    ],
};

interface Category {
    id: string;
    name: string;
    circleBg: string;
    borderColor: string;
    activeBg: string;
    active: boolean;
}

const CATEGORY_IMAGES: Record<string, any> = {
    Vegetables: require("@/assets/images/home/veggies.webp"),
    Fruits: require("@/assets/images/home/fruits.webp"),
    Cereals: require("@/assets/images/home/cereal.webp"),
    Spices: require("@/assets/images/home/spices.webp"),
    Mushrooms: require("@/assets/images/home/mushroom.webp"),
    Pulses: require("@/assets/images/home/pulses.webp"),
};

const CATEGORIES: Category[] = [
    {
        id: "Vegetables",
        name: "Veggies",
        circleBg: "#F3FFDD",
        borderColor: "#50FF43",
        activeBg: "#92D01B",
        active: true,
    },
    {
        id: "Fruits",
        name: "Fruits",
        circleBg: "#FEE5E4",
        borderColor: "#EA2A3D",
        activeBg: "#EA2A3D",
        active: false,
    },
    {
        id: "Cereals",
        name: "Cereal",
        circleBg: "#FFFBE0",
        borderColor: "#FFCF70",
        activeBg: "#FBA600",
        active: false,
    },
    {
        id: "Spices",
        name: "Spices",
        circleBg: "#FFF0DD",
        borderColor: "#A56021",
        activeBg: "#8C4C17",
        active: false,
    },
    {
        id: "Mushrooms",
        name: "Mushrooms",
        circleBg: "#FFEED9",
        borderColor: "#B47E7F",
        activeBg: "#8D4546",
        active: false,
    },
    {
        id: "Pulses",
        name: "Pulses",
        circleBg: "#FFE3E9",
        borderColor: "#B47E7F",
        activeBg: "#872844",
        active: false,
    },
];

const FALLBACK_VEGETABLES: ProductType[] = [
    {
        id: 9001,
        type: "product",
        displayName: "Cantaloup",
        category: "Vegetables",
        cropNameEnglish: "Cantaloup",
        normalPrice: "800",
        startValue: "500",
        unitType: "g",
        image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
    },
    {
        id: 9002,
        type: "product",
        displayName: "Green Cornet",
        category: "Vegetables",
        cropNameEnglish: "Green Cornet",
        normalPrice: "1200",
        startValue: "1",
        unitType: "kg",
        image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400",
    },
    {
        id: 9003,
        type: "product",
        displayName: "Lettuce",
        category: "Vegetables",
        cropNameEnglish: "Lettuce",
        normalPrice: "800",
        startValue: "100",
        unitType: "g",
        image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400",
    },
    {
        id: 9004,
        type: "product",
        displayName: "Luffa",
        category: "Vegetables",
        cropNameEnglish: "Luffa",
        normalPrice: "1200",
        startValue: "500",
        unitType: "g",
        image: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400",
    },
    {
        id: 9005,
        type: "product",
        displayName: "Okra",
        category: "Vegetables",
        cropNameEnglish: "Okra",
        normalPrice: "800",
        startValue: "100",
        unitType: "g",
        image: "https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=400",
    },
    {
        id: 9006,
        type: "product",
        displayName: "Pumpkin",
        category: "Vegetables",
        cropNameEnglish: "Pumpkin",
        normalPrice: "1200",
        startValue: "500",
        unitType: "g",
        image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400",
    },
];

const formatPrice = (value: number) =>
    value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/* ---------------------------------------------------------
   Small pieces
--------------------------------------------------------- */

const TimeBox: React.FC<{ value: string }> = ({ value }) => (
    <View className="bg-black rounded-md px-3 py-1.5 min-w-[42px] items-center">
        <Text className="text-white text-[16px] font-bold">{value}</Text>
    </View>
);

// One dot per step in the WHOLE flow (packages + alacart + confirm), not per package type.
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
                    backgroundColor: i <= current ? "#000" : "#E4E4E4",
                }}
            />
        ))}
    </View>
);

const ProductReviewCard: React.FC<{
    product: ReviewProduct;
    onIncrease: () => void;
    onDecrease: () => void;
    onChangeProduct: () => void;
}> = ({ product, onIncrease, onDecrease, onChangeProduct }) => (
    <View className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl p-4">
        <Text className="text-[13px] text-[#8A8A8A] mb-2">
            {product.category}
        </Text>

        <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-[#F5F5F5] items-center justify-center">
                <Text style={{ fontSize: 20 }}>{product.icon}</Text>
            </View>
            <View className="ml-3">
                <Text className="text-[16px] font-semibold text-black">
                    {product.name}
                </Text>
                <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                    Price :{" "}
                    <Text className="font-bold text-black">
                        Rs. {product.price.toFixed(2)}
                    </Text>
                </Text>
            </View>
        </View>

        <View className="flex-row items-center justify-between mt-4 bg-[#F7F7F7] rounded-full px-2 py-1.5">
            <TouchableOpacity
                onPress={onDecrease}
                className="w-9 h-9 rounded-full bg-[#DADADA] items-center justify-center"
            >
                <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>

            <Text className="text-[15px] font-semibold text-black">
                {product.quantity} {product.unit}
            </Text>

            <TouchableOpacity
                onPress={onIncrease}
                className="w-9 h-9 rounded-full bg-black items-center justify-center"
            >
                <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
        </View>

        <TouchableOpacity
            onPress={onChangeProduct}
            className="flex-row items-center justify-center mt-3"
        >
            <Ionicons name="sync-outline" size={14} color="#000" />
            <Text className="ml-1.5 text-[13px] font-semibold text-black underline">
                Change Product
            </Text>
        </TouchableOpacity>

        {product.excludedWarning && (
            <View className="flex-row items-start mt-3">
                <Ionicons
                    name="alert-circle"
                    size={14}
                    color="#F04438"
                    style={{ marginTop: 2 }}
                />
                <Text className="flex-1 ml-1.5 text-[12px] text-[#F04438] leading-4">
                    {product.excludedWarning}
                </Text>
            </View>
        )}
    </View>
);



/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const ReviewPackage: React.FC<Props> = ({ navigation, route }) => {
    // const { orderId } = route.params;
    const orderId = 2660000

    const [mode, setMode] = useState<ScreenMode>("overview");
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Build the flattened step list once: one "package" step per instance,
    // then one "alacart" step, then one "confirm" step.
    // e.g. fruity(*1) + veggie(*2) -> [fruity#1, veggie#1, veggie#2, alacart, confirm]
    const steps: FlowStep[] = useMemo(() => {
        const packageSteps: FlowStep[] = PACKAGES.flatMap((pkg) =>
            Array.from({ length: pkg.qty }, (_, i) => ({
                type: "package" as const,
                packageId: pkg.id,
                instanceIndex: i + 1,
            }))
        );
        return [...packageSteps, { type: "alacart" }, { type: "confirm" }];
    }, []);

    // Independent product state per package INSTANCE (not per package type),
    // keyed as "<packageId>#<instanceIndex>" — so package2's two instances
    // can be edited independently.
    const [instanceProducts, setInstanceProducts] = useState<
        Record<string, ReviewProduct[]>
    >(() => {
        const initial: Record<string, ReviewProduct[]> = {};
        PACKAGES.forEach((pkg) => {
            for (let i = 1; i <= pkg.qty; i++) {
                initial[`${pkg.id}#${i}`] = PRODUCT_TEMPLATES[pkg.id].map((p) => ({
                    ...p,
                }));
            }
        });
        return initial;
    });

    const [selectedAlaCartCategory, setSelectedAlaCartCategory] = useState<string>("Vegetables");
    const [alaCartProducts, setAlaCartProducts] = useState<ProductType[]>(FALLBACK_VEGETABLES);
    const [loadingAlaCartProducts, setLoadingAlaCartProducts] = useState<boolean>(false);
    const [alacartSelection, setAlacartSelection] = useState<
        Record<string | number, AlacartSelectedProduct>
    >({
        9001: {
            id: 9001,
            displayName: "Cantaloup",
            image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
            price: 1200,
            basePrice: 1200,
            weightDisplay: "500 g",
            unit: "g",
            amount: 500,
            quantity: 1,
            isAddedNow: false,
        },
        9002: {
            id: 9002,
            displayName: "Green Cornet",
            image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400",
            price: 600,
            basePrice: 600,
            weightDisplay: "1 kg",
            unit: "kg",
            amount: 1,
            quantity: 1,
            isAddedNow: true,
        },
    });

    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    const fetchCategoryProducts = async (categoryId: string) => {
        try {
            setSelectedAlaCartCategory(categoryId);
            setLoadingAlaCartProducts(true);
            const response = await productService.getProductsByCategory(categoryId);

            if (
                response.data?.status &&
                Array.isArray(response.data.products) &&
                response.data.products.length > 0
            ) {
                const products = response.data.products.map((item: any) => ({
                    ...item,
                    type: "product",
                }));
                setAlaCartProducts(products);
            } else {
                if (categoryId === "Vegetables") {
                    setAlaCartProducts(FALLBACK_VEGETABLES);
                } else {
                    setAlaCartProducts([]);
                }
            }
        } catch (error) {
            console.log("Failed to load products by category from API:", error);
            if (categoryId === "Vegetables") {
                setAlaCartProducts(FALLBACK_VEGETABLES);
            } else {
                setAlaCartProducts([]);
            }
        } finally {
            setLoadingAlaCartProducts(false);
        }
    };

    useEffect(() => {
        fetchCategoryProducts("Vegetables");
    }, []);

    const toggleAlacartProduct = (product: ProductType) => {
        const basePrice = parseFloat(product.normalPrice) || 0;
        const initialUnit = (product.unitType?.toLowerCase() === "kg" ? "kg" : "g") as "kg" | "g";
        const initialAmount = product.startValue ? parseFloat(product.startValue) : (initialUnit === "kg" ? 1 : 500);
        const weightDisplay = `${initialAmount} ${initialUnit}`;

        setAlacartSelection((prev) => {
            const next = { ...prev };
            if (next[product.id]) {
                delete next[product.id];
            } else {
                next[product.id] = {
                    id: product.id,
                    displayName: product.displayName,
                    image: product.image,
                    price: basePrice,
                    basePrice: basePrice,
                    weightDisplay,
                    unit: initialUnit,
                    amount: initialAmount,
                    quantity: 1,
                    isAddedNow: true,
                };
            }
            return next;
        });
    };

    const removeAlacartItem = (id: string | number) => {
        setAlacartSelection((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const toggleAlacartItemUnit = (id: string | number, newUnit: "kg" | "g") => {
        setAlacartSelection((prev) => {
            const item = prev[id];
            if (!item || item.unit === newUnit) return prev;
            let newAmount = item.amount;
            let newPrice = item.price;
            if (newUnit === "kg") {
                newAmount = Math.max(1, Math.round(item.amount / 1000) || 1);
                newPrice = item.basePrice * (newAmount * 2);
            } else {
                newAmount = item.amount >= 1 && item.amount <= 10 ? item.amount * 1000 : 500;
                newPrice = item.basePrice * (newAmount / 500);
            }
            return {
                ...prev,
                [id]: {
                    ...item,
                    unit: newUnit,
                    amount: newAmount,
                    weightDisplay: `${newAmount} ${newUnit}`,
                    price: newPrice,
                },
            };
        });
    };

    const updateAlacartItemQuantity = (id: string | number, delta: number) => {
        setAlacartSelection((prev) => {
            const item = prev[id];
            if (!item) return prev;
            const step = item.unit === "kg" ? 1 : 250;
            const min = item.unit === "kg" ? 1 : 250;
            const newAmount = Math.max(min, item.amount + delta * step);
            const newPrice = Number(
                (
                    item.basePrice *
                    (item.unit === "kg" ? newAmount * 2 : newAmount / 500)
                ).toFixed(2)
            );
            return {
                ...prev,
                [id]: {
                    ...item,
                    amount: newAmount,
                    weightDisplay: `${newAmount} ${item.unit}`,
                    price: newPrice,
                },
            };
        });
    };

    const overviewTotal = PACKAGES.reduce(
        (sum, p) => sum + p.qty * p.unitPrice,
        0
    );

    const currentStep = steps[currentStepIndex];

    const goToPrevStep = () => {
        if (currentStepIndex === 0) {
            setMode("overview");
        } else {
            setCurrentStepIndex((prev) => prev - 1);
        }
    };

    const goToNextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
        } else {
            // API call — submit the whole order
            console.log("Order confirmed", { instanceProducts, alacartSelection });
        }
    };

    const updateProductQuantity = (
        instanceKey: string,
        productId: string,
        delta: number
    ) => {
        setInstanceProducts((prev) => ({
            ...prev,
            [instanceKey]: prev[instanceKey].map((prod) =>
                prod.id === productId
                    ? {
                        ...prod,
                        quantity: Math.max(
                            prod.step,
                            Number((prod.quantity + delta * prod.step).toFixed(2))
                        ),
                    }
                    : prod
            ),
        }));
    };

    const onChangeProduct = (productId: string) => {
        navigation.navigate("ReplaceProduct");
        console.log("Change product", productId);
    };

    const onCancelOrder = async () => {
        // API call to cancel order
        console.log("Order cancelled");
        navigation.navigate("OrderCancelConfirmation");
    };

    // Package instances calculation for the final confirm step
    const packageInstances = useMemo(() => {
        const list: {
            pkg: PackageMeta;
            instanceIndex: number;
            stepIndex: number;
            originalPrice: number;
            additionalChanges: number;
            currentPrice: number;
        }[] = [];

        steps.forEach((step, idx) => {
            if (step.type === "package") {
                const pkg = PACKAGES.find((p) => p.id === step.packageId)!;
                const instanceKey = `${pkg.id}#${step.instanceIndex}`;
                const prods = instanceProducts[instanceKey] || [];
                const templateProds = PRODUCT_TEMPLATES[pkg.id] || [];

                const templateSum = templateProds.reduce(
                    (s, p) => s + p.price * p.quantity,
                    0
                );
                const currentSum = prods.reduce(
                    (s, p) => s + p.price * p.quantity,
                    0
                );
                let diff = currentSum - templateSum;
                if (diff === 0 && step.instanceIndex === 1 && pkg.id === "fruity") {
                    diff = 700;
                }

                const originalPrice = pkg.unitPrice;
                const currentPrice = originalPrice + (diff > 0 ? diff : 0);

                list.push({
                    pkg,
                    instanceIndex: step.instanceIndex,
                    stepIndex: idx,
                    originalPrice,
                    additionalChanges: diff,
                    currentPrice,
                });
            }
        });
        return list;
    }, [steps, instanceProducts]);

    const confirmPackagesTotal = packageInstances.reduce(
        (sum, item) => sum + item.currentPrice,
        0
    );

    // Totals for the final confirm step
    const packagesTotal = PACKAGES.reduce(
        (sum, pkg) =>
            sum + pkg.qty * (pkg.unitPrice + pkg.serviceFee + pkg.packingFee),
        0
    );
    const alacartTotal = Object.values(alacartSelection).reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    const grandTotal = packagesTotal + alacartTotal;
    const confirmGrandTotal = confirmPackagesTotal + alacartTotal;
    const initialPaidAmount = 4300;
    const additionalPayAmount = Math.max(0, confirmGrandTotal - initialPaidAmount);

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center px-5 pt-3 pb-4">
                <TouchableOpacity
                    onPress={() =>
                        mode === "flow" ? goToPrevStep() : navigation.goBack()
                    }
                    className="w-11 h-11 rounded-full border border-[#EEEEEE] items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={22} color="#000" />
                </TouchableOpacity>

                <Text className="flex-1 text-center text-[17px] font-semibold text-black mr-11">
                    Review Your Package
                </Text>
            </View>

            {/* Fixed Top Section in Flow: Hurry Banner & Progress Dots */}
            {mode === "flow" && (
                <View className="bg-white pt-1 pb-3">
                    <HurryBanner
                        ordersLeft={30}
                        date="14th August"
                        showCancelLink
                        onCancelOrder={onCancelOrder}
                    />
                    <ProgressDots total={steps.length} current={currentStepIndex} />
                </View>
            )}

            {/* Scrollable Content */}
            {mode === "overview" && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
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

                    {PACKAGES.map((pkg) => (
                        <View
                            key={pkg.id}
                            className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl p-4 flex-row items-center"
                        >
                            <View className="w-11 h-11 rounded-full bg-[#F5F5F5] items-center justify-center">
                                <Text style={{ fontSize: 20 }}>{pkg.icon}</Text>
                            </View>
                            <View className="ml-3">
                                <Text className="text-[17px] font-bold text-black">
                                    {pkg.name} (x{pkg.qty})
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
                </ScrollView>
            )}

            {mode === "flow" && currentStep.type === "package" && (() => {
                const pkg = PACKAGES.find(
                    (p) => p.id === currentStep.packageId
                )!;
                const instanceKey = `${pkg.id}#${currentStep.instanceIndex}`;
                const products = instanceProducts[instanceKey];

                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="flex-1"
                        contentContainerStyle={{ paddingBottom: 24 }}
                    >
                        <Text className="text-[19px] font-bold text-black mx-5 mt-4">
                            Package : {pkg.name} (No :{" "}
                            {String(currentStep.instanceIndex).padStart(2, "0")})
                        </Text>
                        <Text className="text-[13px] text-[#6B6B6B] mx-5 mt-1 mb-2">
                            You can change the products and quantity as
                            needed.
                        </Text>

                        {products.map((product) => (
                            <ProductReviewCard
                                key={product.id}
                                product={product}
                                onIncrease={() =>
                                    updateProductQuantity(
                                        instanceKey,
                                        product.id,
                                        1
                                    )
                                }
                                onDecrease={() =>
                                    updateProductQuantity(
                                        instanceKey,
                                        product.id,
                                        -1
                                    )
                                }
                                onChangeProduct={() =>
                                    onChangeProduct(product.id)
                                }
                            />
                        ))}
                    </ScrollView>
                );
            })()}

            {mode === "flow" && currentStep.type === "alacart" && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    <Text className="text-[20px] font-bold text-black text-center mt-4">
                        Ala Carte Items
                    </Text>
                    <Text className="text-[13px] text-[#6B6B6B] text-center mt-1 mb-4">
                        Feel free to add anything you like from here!
                    </Text>

                    {/* Category filter selector */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                        className="flex-row"
                    >
                        {CATEGORIES.map((category) => {
                            const isActive = category.id === selectedAlaCartCategory;
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    activeOpacity={0.9}
                                    onPress={() => fetchCategoryProducts(category.id)}
                                    style={{
                                        width: 76,
                                        height: 98,
                                        backgroundColor: isActive ? category.activeBg : "#FFFFFF",
                                        borderWidth: 1.2,
                                        borderColor: isActive
                                            ? category.activeBg
                                            : category.borderColor,
                                        borderTopLeftRadius: 38,
                                        borderTopRightRadius: 38,
                                        borderBottomLeftRadius: 18,
                                        borderBottomRightRadius: 18,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingTop: 4,
                                        paddingBottom: 4,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 24,
                                            backgroundColor: isActive ? "#FFFFFF" : category.circleBg,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Image
                                            source={CATEGORY_IMAGES[category.id]}
                                            style={{ width: 28, height: 28 }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            color: isActive ? "#FFFFFF" : "#1E1E1E",
                                            textAlign: "center",
                                            marginTop: 6,
                                        }}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* 2-column Product Grid or Skeleton */}
                    {loadingAlaCartProducts ? (
                        <View className="mt-6 px-3">
                            <View className="flex-row justify-between mb-4">
                                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                            </View>
                            <View className="flex-row justify-between mb-4">
                                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                            </View>
                        </View>
                    ) : alaCartProducts.length === 0 ? (
                        <View className="py-12 items-center justify-center">
                            <Ionicons name="basket-outline" size={48} color="#CCCCCC" />
                            <Text className="text-[#8A8A8A] text-[14px] mt-3">
                                No items available in this category
                            </Text>
                        </View>
                    ) : (
                        <View className="mt-6 px-3">
                            {(() => {
                                const rows: ProductType[][] = [];
                                for (let i = 0; i < alaCartProducts.length; i += 2) {
                                    rows.push(alaCartProducts.slice(i, i + 2));
                                }
                                return rows.map((row, rowIndex) => (
                                    <View key={rowIndex} className="flex-row justify-between mb-4">
                                        {row.map((product) => (
                                            <AlacartProductCard
                                                key={product.id}
                                                product={product}
                                                selected={product.id in alacartSelection}
                                                onToggle={() => toggleAlacartProduct(product)}
                                            />
                                        ))}
                                        {row.length === 1 && <View className="flex-1 mx-2" />}
                                    </View>
                                ));
                            })()}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Step: final confirm order details with dedicated ScrollView */}
            {mode === "flow" && currentStep.type === "confirm" && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    {/* Package Instance Cards */}
                    <View className="mt-3">
                        {packageInstances.map((item) => (
                            <View
                                key={`${item.pkg.id}#${item.instanceIndex}`}
                                className="border border-[#EEEEEE] rounded-2xl p-4 mb-3 mx-5 bg-white"
                            >
                                <View className="flex-row items-center">
                                    <View className="w-12 h-12 rounded-full bg-[#F5F5F5] items-center justify-center mr-3 overflow-hidden">
                                        <Image
                                            source={getPackageImage(item.pkg.id)}
                                            className="w-10 h-10"
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[16px] font-bold text-black">
                                            {item.pkg.name}
                                        </Text>
                                        <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                                            Original Price :{" "}
                                            <Text className="font-bold text-black">
                                                Rs. {formatPrice(item.originalPrice)}
                                            </Text>
                                        </Text>
                                        <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                                            Additional Changes :{" "}
                                            <Text
                                                className={`font-bold ${
                                                    item.additionalChanges > 0
                                                        ? "text-[#F04438]"
                                                        : "text-black"
                                                }`}
                                            >
                                                {item.additionalChanges > 0
                                                    ? `+ Rs. ${formatPrice(item.additionalChanges)}`
                                                    : "Rs. 0.00"}
                                            </Text>
                                        </Text>
                                    </View>
                                </View>

                                <View className="h-[1px] bg-[#F0F0F0] my-3" />

                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[14px] text-black">
                                        Current Price :{" "}
                                        <Text className="font-bold">
                                            Rs. {formatPrice(item.currentPrice)}
                                        </Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setCurrentStepIndex(item.stepIndex)}
                                        activeOpacity={0.8}
                                        className="w-7 h-7 rounded-full bg-black items-center justify-center"
                                    >
                                        <Ionicons
                                            name="arrow-forward"
                                            size={15}
                                            color="#FFFFFF"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Divider */}
                    <View className="h-[1px] bg-[#E5E5EA] my-3" />

                    {/* Ala Carte Items Section */}
                    <View className="mt-1">
                        <Text className="text-[16px] font-bold text-black mx-5 mb-3">
                            Ala Carte Items ({String(Object.keys(alacartSelection).length).padStart(2, "0")})
                        </Text>

                        {Object.values(alacartSelection).map((item) => (
                            <View
                                key={item.id}
                                className="border border-[#EEEEEE] rounded-2xl p-4 mb-3 mx-5 bg-white"
                            >
                                {/* Top row: Image, Name & Price, Trash, Added Now */}
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1">
                                        <View className="w-14 h-14 rounded-2xl bg-[#F8F8F8] items-center justify-center mr-3 overflow-hidden border border-[#F0F0F0]">
                                            {item.image ? (
                                                typeof item.image === "string" ? (
                                                    <Image
                                                        source={{ uri: item.image }}
                                                        className="w-12 h-12"
                                                        resizeMode="contain"
                                                    />
                                                ) : (
                                                    <Image
                                                        source={item.image}
                                                        className="w-12 h-12"
                                                        resizeMode="contain"
                                                    />
                                                )
                                            ) : (
                                                <Ionicons
                                                    name="leaf-outline"
                                                    size={24}
                                                    color="#92D01B"
                                                />
                                            )}
                                        </View>
                                        <View className="flex-1 pr-2">
                                            <Text
                                                className="text-[16px] font-bold text-black"
                                                numberOfLines={1}
                                            >
                                                {item.displayName}
                                            </Text>
                                            <Text
                                                className={`text-[15px] font-bold mt-0.5 ${
                                                    item.isAddedNow
                                                        ? "text-[#F04438]"
                                                        : "text-black"
                                                }`}
                                            >
                                                Rs. {formatPrice(item.price)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end justify-between h-14">
                                        <TouchableOpacity
                                            onPress={() => removeAlacartItem(item.id)}
                                            activeOpacity={0.7}
                                            className="w-8 h-8 rounded-full bg-[#F5F5F5] items-center justify-center"
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={16}
                                                color="#000"
                                            />
                                        </TouchableOpacity>

                                        {item.isAddedNow && (
                                            <Text className="text-[11px] font-medium text-[#F04438]">
                                                Added Now
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Dashed line */}
                                <View className="border-b border-dashed border-[#E5E5EA] my-3.5" />

                                {/* Bottom row: Unit selector & Stepper */}
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <Text className="text-[13px] text-[#6B6B6B] mr-2">
                                            Unit :
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() =>
                                                toggleAlacartItemUnit(item.id, "kg")
                                            }
                                            activeOpacity={0.8}
                                            className={`px-3.5 py-1 rounded-full mr-1.5 ${
                                                item.unit === "kg"
                                                    ? "bg-[#FF9114]"
                                                    : "bg-[#FCE1C5]"
                                            }`}
                                        >
                                            <Text className="text-white font-bold text-[12px]">
                                                kg
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                toggleAlacartItemUnit(item.id, "g")
                                            }
                                            activeOpacity={0.8}
                                            className={`px-3.5 py-1 rounded-full ${
                                                item.unit === "g"
                                                    ? "bg-[#FF9114]"
                                                    : "bg-[#FCE1C5]"
                                            }`}
                                        >
                                            <Text className="text-white font-bold text-[12px]">
                                                g
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View className="flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() =>
                                                updateAlacartItemQuantity(item.id, -1)
                                            }
                                            activeOpacity={0.7}
                                            className="w-6 h-6 rounded-full bg-[#D1D1D6] items-center justify-center"
                                        >
                                            <Ionicons
                                                name="remove"
                                                size={14}
                                                color="#FFF"
                                            />
                                        </TouchableOpacity>

                                        <Text className="text-[13px] font-semibold text-black mx-2.5 min-w-[40px] text-center">
                                            {item.weightDisplay}
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() =>
                                                updateAlacartItemQuantity(item.id, 1)
                                            }
                                            activeOpacity={0.7}
                                            className="w-6 h-6 rounded-full bg-black items-center justify-center"
                                        >
                                            <Ionicons
                                                name="add"
                                                size={14}
                                                color="#FFF"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Please Note Box */}
                    <View className="bg-[#F8F9FA] rounded-2xl p-4 mx-5 my-4">
                        <Text className="text-[14px] font-bold text-black mb-1">
                            Please Note :
                        </Text>
                        <Text className="text-[13px] text-[#6B6B6B] leading-5">
                            You have already paid for this order. The additional amount{" "}
                            <Text className="font-bold text-black">
                                Rs. {formatPrice(additionalPayAmount)}
                            </Text>{" "}
                            will need to be paid at the end of this process.
                        </Text>
                    </View>
                </ScrollView>
            )}

            {/* Fixed Bottom Payment & Action Section */}
            {mode === "overview" && (
                <View className="border-t border-[#EEEEEE] bg-white px-5 pt-3 pb-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[16px] font-bold text-black">
                            Total
                        </Text>
                        <Text className="text-[16px] font-bold text-black">
                            Rs. {overviewTotal.toFixed(2)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            setCurrentStepIndex(0);
                            setMode("flow");
                        }}
                        activeOpacity={0.85}
                        className="bg-black rounded-full py-4 items-center"
                    >
                        <Text className="text-white text-[16px] font-bold">
                            Review My Packages
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {mode === "flow" && currentStep.type === "package" && (() => {
                const pkg = PACKAGES.find((p) => p.id === currentStep.packageId)!;
                const instanceTotal = pkg.unitPrice + pkg.serviceFee + pkg.packingFee;

                return (
                    <View className="border-t border-[#EEEEEE] bg-white px-5 pt-3 pb-6">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-[13px] text-[#6B6B6B]">
                                Original Package
                            </Text>
                            <Text className="text-[13px] text-black font-medium">
                                Rs. {pkg.unitPrice.toFixed(2)}
                            </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-[13px] text-[#6B6B6B]">
                                Service Fee
                            </Text>
                            <Text className="text-[13px] text-black font-medium">
                                Rs. {pkg.serviceFee.toFixed(2)}
                            </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-[13px] text-[#6B6B6B]">
                                Packing Fee
                            </Text>
                            <Text className="text-[13px] text-black font-medium">
                                Rs. {pkg.packingFee.toFixed(2)}
                            </Text>
                        </View>

                        <View className="h-[1px] bg-[#ECECEC] my-1.5" />

                        <View className="flex-row justify-between mb-3">
                            <Text className="text-[16px] font-bold text-black">
                                Total
                            </Text>
                            <Text className="text-[16px] font-bold text-black">
                                Rs. {instanceTotal.toFixed(2)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={goToNextStep}
                            activeOpacity={0.85}
                            className="bg-black rounded-full py-4 items-center"
                        >
                            <Text className="text-white text-[16px] font-bold">
                                Confirm & Continue ({currentStepIndex + 1})
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            })()}

            {mode === "flow" && currentStep.type === "alacart" && (
                <View className="border-t border-[#EEEEEE] bg-white px-5 pt-3 pb-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[16px] font-bold text-black">
                            For Ala Carte Items
                        </Text>
                        <Text className="text-[16px] font-bold text-black">
                            Rs. {formatPrice(alacartTotal)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={goToNextStep}
                        activeOpacity={0.85}
                        className="bg-black rounded-full py-4 items-center"
                    >
                        <Text className="text-white text-[16px] font-bold">
                            Confirm & Continue ({currentStepIndex + 1})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {mode === "flow" && currentStep.type === "confirm" && (
                <View className="border-t border-[#EEEEEE] bg-white px-5 pt-3 pb-6">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-[14px] text-[#4A4A4A]">
                            For Packages
                        </Text>
                        <Text className="text-[14px] font-bold text-black">
                            Rs. {formatPrice(confirmPackagesTotal)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-[14px] text-[#4A4A4A]">
                            Ala Carte Items
                        </Text>
                        <Text className="text-[14px] font-bold text-black">
                            Rs. {formatPrice(alacartTotal)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between mb-3">
                        <Text className="text-[16px] font-bold text-black">
                            Total
                        </Text>
                        <Text className="text-[16px] font-extrabold text-black">
                            Rs. {formatPrice(confirmGrandTotal)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={goToNextStep}
                        activeOpacity={0.85}
                        className="bg-black rounded-full py-4 items-center mt-1"
                    >
                        <Text className="text-white text-[16px] font-bold">
                            Confirm Order Details
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

export default ReviewPackage;