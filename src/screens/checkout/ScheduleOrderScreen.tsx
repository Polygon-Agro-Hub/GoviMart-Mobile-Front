import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Platform,
    Alert,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import CustomCalendarModal, {
    validateDeliveryDate,
    getMinDeliveryDate,
} from "@/component/common/CustomCalendarModal";
import CustomHeader from "@/component/common/CustomHeader";
import OrderSummary from "@/component/common/OrderSummary";

type ScheduleOrderNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ScheduleOrder"
>;

type ScheduleOrderRouteProp = RouteProp<
    RootStackParamList,
    "ScheduleOrder"
>;

interface Props {
    navigation: ScheduleOrderNavigationProp;
    route: ScheduleOrderRouteProp;
}

const timeSlotOptions = [
    "08:00 AM - 12:00 PM",
    "12:00 PM - 04:00 PM",
    "04:00 PM - 09:00 PM",
];

const scheduleTypeOptions = [
    "One Time",
];

const ScheduleOrderScreen: React.FC<Props> = ({ navigation, route }) => {
    const orderContext = route.params?.orderContext;

    const [scheduleType, setScheduleType] = useState("One Time");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

    const [typeModalVisible, setTypeModalVisible] = useState(false);
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [slotModalVisible, setSlotModalVisible] = useState(false);

    const formatAmount = (amount: number) => {
        return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const isDelivery = orderContext?.deliveryMethod === "home";
    const deliveryFee = isDelivery ? (orderContext?.deliveryCharge || 300) : 0;
    const baseTotal = (orderContext?.packageTotal || 0) + (orderContext?.productTotal || 0) - (orderContext?.discount || 0);
    const finalTotal = Math.max(0, baseTotal + deliveryFee);

    const isReady = selectedDate !== null && selectedTimeSlot !== null;

    const handleProceed = () => {
        if (!selectedDate) {
            Alert.alert("Required", "Please select a delivery date.");
            return;
        }

        const dateValidation = validateDeliveryDate(selectedDate);
        if (!dateValidation.isValid) {
            Alert.alert("Invalid Date", dateValidation.error);
            return;
        }

        if (!selectedTimeSlot) {
            Alert.alert("Required", "Please select a time slot.");
            return;
        }

        const updatedContext = {
            ...orderContext,
            grandTotal: finalTotal,
            deliveryCharge: deliveryFee,
            checkoutDetails: {
                ...(orderContext?.checkoutDetails || {
                    deliveryMethod: (orderContext?.deliveryMethod || "home") as "home" | "pickup",
                }),
                scheduleType,
                deliveryDate: selectedDate.replace(/\//g, "-"),
                timeSlot: selectedTimeSlot,
            },
        };

        navigation.navigate("PaymentMethod", {
            total: finalTotal,
            orderContext: updatedContext,
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            {/* ─── HEADER ──────────────────────────────────────────────────────── */}
            <CustomHeader title="Schedule the Order" showBackButton navigation={navigation} />

            {/* ─── CONTENT ─────────────────────────────────────────────────────── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop:5,
                    paddingBottom: 340,
                }}
            >
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "#6B7280",
                        marginBottom: 30,
                    }}
                >
                    We'll deliver your order within this time slot.
                </Text>

                {/* 1. Schedule Type */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setTypeModalVisible(true)}
                    style={{
                        height: 64,
                        borderRadius: 32,
                        borderWidth: 1,
                        borderColor: "#BAC2C7",
                        backgroundColor: "#FFFFFF",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 14,
                    }}
                >
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                        }}
                    >
                        <FontAwesome5 name="bars" size={18} color="#FFFFFF" solid/>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: "#000000" }}>
                            Schedule Type
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: "500",
                                color: "#000000",
                                marginTop: 2,
                            }}
                        >
                            {scheduleType}
                        </Text>
                    </View>

                    <Ionicons name="chevron-down" size={18} color="#111111" />
                </TouchableOpacity>
                 {/* HR  */}
                <View
                    style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 20,
                    }}
                />

                {/* 2. Schedule Date */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setDateModalVisible(true)}
                    style={{
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "#F2F2F6",
                        borderColor: "#BAC2C7",
                        borderWidth: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 14,
                        marginBottom: 20,
                    }}
                >
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                        }}
                    >
                        <FontAwesome5 name="calendar" size={18} color="#FFFFFF" solid />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: "#000000" }}>
                            Schedule Date
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: selectedDate ? "500" : "400",
                                color: selectedDate ? "#000000" : "#9CA3AF",
                                marginTop: 2,
                            }}
                        >
                            {selectedDate || "YYYY/MM/DD"}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* 3. Schedule Time Slot */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSlotModalVisible(true)}
                    style={{
                        height: 64,
                        borderRadius: 32,
                        borderWidth: 1,
                        borderColor: "#BAC2C7",
                        backgroundColor: "#FFFFFF",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 14,
                        marginBottom: 16,
                    }}
                >
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                        }}
                    >
                        <FontAwesome5 name="clock" size={18} color="#FFFFFF" solid />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: "#000000" }}>
                            Schedule Time Slot
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: selectedTimeSlot ? "500" : "400",
                                color: selectedTimeSlot ? "#000000" : "#000000",
                                marginTop: 2,
                            }}
                        >
                            {selectedTimeSlot || "Select From Here"}
                        </Text>
                    </View>

                    <Ionicons name="chevron-down" size={18} color="#111111" />
                </TouchableOpacity>
            </ScrollView>

            {/* ─── FIXED BOTTOM SUMMARY & BUTTON ──────────────────────────────── */}
            <OrderSummary
                packageTotal={orderContext?.packageTotal || 0}
                productTotal={orderContext?.productTotal || 0}
                discount={orderContext?.discount || 0}
                deliveryFee={deliveryFee}
                grandTotal={finalTotal}
                buttonText="Proceed to Payment"
                disabled={!isReady}
                onCheckout={handleProceed}
                containerStyle={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    marginBottom: 0,
                }}
            />

            {/* ─── POPUP: SCHEDULE TYPE ─────────────────────────────────────── */}
            <GlobalSearchModal
                visible={typeModalVisible}
                onClose={() => setTypeModalVisible(false)}
                title="Select Schedule Type"
                searchPlaceholder="Search schedule type..."
                data={scheduleTypeOptions.map((type) => ({
                    label: type,
                    value: type,
                }))}
                selectedItems={[scheduleType]}
                onSelect={(selectedValues) => {
                    if (selectedValues.length > 0) {
                        setScheduleType(selectedValues[0]);
                    }
                }}
            />

            {/* ─── POPUP: SCHEDULE DATE (Custom Calendar with Web Validation) ── */}
            <CustomCalendarModal
                visible={dateModalVisible}
                onClose={() => setDateModalVisible(false)}
                selectedDate={selectedDate}
                onSelectDate={(newDate) => {
                    setSelectedDate(newDate);
                }}
            />

            {/* ─── POPUP: SCHEDULE TIME SLOT ────────────────────────────────── */}
            <GlobalSearchModal
                visible={slotModalVisible}
                onClose={() => setSlotModalVisible(false)}
                title="Select Time Slot"
                searchPlaceholder="Search time slot..."
                data={timeSlotOptions.map((slot) => ({
                    label: slot,
                    value: slot,
                }))}
                selectedItems={selectedTimeSlot ? [selectedTimeSlot] : []}
                onSelect={(selectedValues) => {
                    if (selectedValues.length > 0) {
                        setSelectedTimeSlot(selectedValues[0]);
                    }
                }}
            />
        </SafeAreaView>
    );
};

export default ScheduleOrderScreen;
