import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";

type Props = StackScreenProps<RootStackParamList, "OrderCancelConfirmation">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type PackageItem = {
    id: string;
    name: string;
    icon?: string;
    image?: string;
    qty: number;
    unitPrice: number;
};

type AlaCarteItem = {
    id: string;
    name: string;
    icon?: string;
    image?: string;
    weight: string; // e.g. "500 g", "2 kg"
    price: number;
    originalPrice?: number; // shown struck-through if discounted
};

/* ---------------------------------------------------------
   Mock data — replace with route.params values
--------------------------------------------------------- */

const MOCK_PACKAGES: PackageItem[] = [
    { id: "health", name: "Health Pack", icon: "❤️", qty: 2, unitPrice: 1000 },
    { id: "veggie", name: "Veggie Pack", icon: "🥗", qty: 1, unitPrice: 1000 },
];

const MOCK_ALA_CARTE: AlaCarteItem[] = [
    { id: "lemon", name: "Lemon", icon: "🍋", weight: "500 g", price: 100 },
    {
        id: "strawberry",
        name: "Strawberry",
        icon: "🍓",
        weight: "2 kg",
        price: 2000,
        originalPrice: 2100,
    },
];

const TOTAL_PAID = 5000;

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */

const ItemAvatar: React.FC<{ icon?: string; image?: string }> = ({
    icon,
    image,
}) =>
    image ? (
        <Image
            source={{ uri: image }}
            className="w-12 h-12 rounded-full bg-[#F5F5F5]"
        />
    ) : (
        <View className="w-12 h-12 rounded-full bg-[#F5F5F5] items-center justify-center">
            <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
    );

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
}) => (
    <View className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl px-4 pt-4 pb-1">
        <Text className="text-[13px] font-bold text-black mb-2">{title}</Text>
        {children}
    </View>
);

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const OrderCancelConfirmation: React.FC<Props> = ({ navigation, route }) => {
    // const { orderId, packages, alaCarteItems, totalPaid } = route.params;
    const packages = MOCK_PACKAGES; // for testing
    const alaCarteItems = MOCK_ALA_CARTE; // for testing
    const totalPaid = TOTAL_PAID; // for testing

    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);

    const isConfirmed = useMemo(
        () => confirmText.trim().toUpperCase() === "CANCEL",
        [confirmText]
    );

    const packagesTotal = packages.reduce(
        (sum, p) => sum + p.qty * p.unitPrice,
        0
    );
    const alaCarteTotal = alaCarteItems.reduce((sum, i) => sum + i.price, 0);
    const grandTotal = packagesTotal + alaCarteTotal;

    const onCancelOrder = async () => {
        if (!isConfirmed || loading) return;
        setLoading(true);
        try {
            // API call to cancel the order
            console.log("Order cancelled");
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center px-5 pt-3 pb-2">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-11 h-11 rounded-full border border-[#EEEEEE] items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={22} color="#000" />
                </TouchableOpacity>

                <Text className="flex-1 text-center text-[17px] font-semibold text-black mr-11">
                    Order Cancel Confirmation
                </Text>
            </View>

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={90}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    {/* Warning banner */}
                    <View className="mx-5 mt-2 bg-[#FDECEC] rounded-2xl p-4 flex-row">
                        <Ionicons
                            name="warning"
                            size={18}
                            color="#E11D48"
                            style={{ marginTop: 2 }}
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-[14px] font-bold text-[#E11D48]">
                                You are about to cancel this order.
                            </Text>
                            <Text className="text-[13px] text-[#E11D48] mt-0.5">
                                This order has already been paid.
                            </Text>
                        </View>
                    </View>

                    {/* Packages */}
                    <SectionCard
                        title={`Packages (${String(packages.length).padStart(
                            2,
                            "0"
                        )})`}
                    >
                        {packages.map((pkg, idx) => (
                            <View key={pkg.id}>
                                {idx > 0 && (
                                    <View className="h-[1px] bg-[#ECECEC] my-3" />
                                )}
                                <View className="flex-row items-center pb-3">
                                    <ItemAvatar icon={pkg.icon} image={pkg.image} />
                                    <View className="ml-3">
                                        <Text className="text-[15px] font-bold text-black">
                                            {pkg.name}{" "}
                                            <Text className="text-[13px] font-normal text-[#8A8A8A]">
                                                (x{pkg.qty})
                                            </Text>
                                        </Text>
                                        <Text className="text-[13px] text-black mt-0.5">
                                            Rs. {pkg.unitPrice.toFixed(2)}
                                            {pkg.qty > 1
                                                ? ` x ${pkg.qty} = Rs. ${(
                                                    pkg.unitPrice * pkg.qty
                                                ).toFixed(2)}`
                                                : ""}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </SectionCard>

                    {/* Ala Carte Items */}
                    <SectionCard
                        title={`Ala Carte Items (${String(
                            alaCarteItems.length
                        ).padStart(2, "0")})`}
                    >
                        {alaCarteItems.map((item, idx) => (
                            <View key={item.id}>
                                {idx > 0 && (
                                    <View className="h-[1px] bg-[#ECECEC] my-3" />
                                )}
                                <View className="flex-row items-center pb-3">
                                    <ItemAvatar icon={item.icon} image={item.image} />
                                    <View className="ml-3">
                                        <Text className="text-[15px] font-bold text-black">
                                            {item.name}
                                        </Text>
                                        <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                                            {item.weight}
                                        </Text>
                                        <View className="flex-row items-center mt-0.5">
                                            <Text className="text-[13px] font-bold text-black">
                                                Rs. {item.price.toFixed(2)}
                                            </Text>
                                            {item.originalPrice && (
                                                <Text className="text-[12px] text-[#B0B0B0] line-through ml-2">
                                                    Rs. {item.originalPrice.toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </SectionCard>

                    {/* Totals */}
                    <View className="mx-5 mt-6">
                        <View className="flex-row justify-between pb-3">
                            <Text className="text-[15px] font-bold text-black">
                                Total Paid with Card
                            </Text>
                            <Text className="text-[15px] font-bold text-black">
                                Rs. {totalPaid.toFixed(2)}
                            </Text>
                        </View>
                        <View className="h-[1px] bg-[#ECECEC]" />
                        <View className="flex-row justify-between pt-3">
                            <Text className="text-[15px] font-bold text-black">
                                Total
                            </Text>
                            <Text className="text-[15px] font-bold text-black">
                                Rs. {grandTotal.toFixed(2)}
                            </Text>
                        </View>
                        <View className="h-[1px] bg-[#ECECEC] mt-3" />
                    </View>

                    {/* Credit info */}
                    <View className="mx-5 mt-6 bg-[#EAF9EE] rounded-2xl p-5 items-center">
                        <View className="w-11 h-11 rounded-full bg-[#22C55E] items-center justify-center">
                            <Ionicons name="wallet" size={20} color="#fff" />
                        </View>
                        <Text className="text-[15px] font-bold text-[#15803D] mt-3">
                            Amount will be credited to your credit balance
                        </Text>
                        <Text className="text-[13px] text-[#3F7A50] text-center mt-2 leading-5">
                            After canceling, the full amount of{" "}
                            <Text className="font-bold">
                                Rs. {totalPaid.toFixed(2)}
                            </Text>{" "}
                            will be added to your credit balance. You can use it
                            for your next purchase.
                        </Text>
                    </View>

                    {/* Confirm input */}
                    <View className="mx-5 mt-6 border border-black rounded-2xl p-4">
                        <View className="flex-row">
                            <Ionicons name="lock-closed" size={18} color="#000" />
                            <View className="ml-2 flex-1">
                                <Text className="text-[14px] font-bold text-black">
                                    To cancel this order
                                </Text>
                                <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                                    Type <Text className="font-bold text-black">CANCEL</Text> in
                                    the box below to confirm.
                                </Text>
                            </View>
                        </View>

                        <TextInput
                            value={confirmText}
                            onChangeText={setConfirmText}
                            placeholder="CANCEL"
                            placeholderTextColor="#B0B0B0"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            className={`mt-4 border rounded-full px-4 py-3 text-[14px] text-center font-semibold ${isConfirmed
                                    ? "border-[#22C55E] text-[#15803D]"
                                    : "border-[#E11D48] text-black"
                                }`}
                        />
                    </View>
                </ScrollView>

                {/* Fixed bottom action */}
                <View className="px-5 pb-5 pt-3 bg-white border-t border-[#F0F0F0]">
                    <TouchableOpacity
                        onPress={onCancelOrder}
                        disabled={!isConfirmed || loading}
                        activeOpacity={0.85}
                        className={`rounded-2xl py-4 items-center ${isConfirmed ? "bg-[#E11D48]" : "bg-[#F3A9B4]"
                            }`}
                    >
                        <Text className="text-white text-[16px] font-bold">
                            {loading ? "Cancelling..." : "Cancel Order"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default OrderCancelConfirmation;