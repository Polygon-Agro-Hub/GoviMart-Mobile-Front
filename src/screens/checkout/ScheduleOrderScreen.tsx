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
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import CustomCalendarModal, {
    validateDeliveryDate,
    getMinDeliveryDate,
} from "@/component/common/CustomCalendarModal";

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
            <View
                style={{
                    height: 56,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.goBack()}
                    style={{
                        position: "absolute",
                        left: 16,
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: "#FFFFFF",
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                        elevation: 2,
                    }}
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text
                    style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: "#111111",
                    }}
                >
                    Schedule the Order
                </Text>
            </View>

            {/* ─── CONTENT ─────────────────────────────────────────────────────── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 240,
                }}
            >
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "#6B7280",
                        marginBottom: 24,
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
                        borderColor: "#E5E7EB",
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
                        <Ionicons name="menu" size={18} color="#FFFFFF" />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                            Schedule Type
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: "#111111",
                                marginTop: 2,
                            }}
                        >
                            {scheduleType}
                        </Text>
                    </View>

                    <Ionicons name="chevron-down" size={18} color="#111111" />
                </TouchableOpacity>

                {/* 2. Schedule Date */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setDateModalVisible(true)}
                    style={{
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "#F3F4F6",
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
                        <Ionicons name="calendar" size={18} color="#FFFFFF" />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                            Schedule Date
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: selectedDate ? "700" : "400",
                                color: selectedDate ? "#111111" : "#9CA3AF",
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
                        borderColor: "#E5E7EB",
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
                        <Ionicons name="time" size={18} color="#FFFFFF" />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                            Schedule Time Slot
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: selectedTimeSlot ? "700" : "400",
                                color: selectedTimeSlot ? "#111111" : "#9CA3AF",
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
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingHorizontal: 18,
                    paddingTop: 16,
                    paddingBottom: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 10,
                }}
            >
                {/* For Packages (if any) */}
                {Boolean(orderContext && orderContext.packageTotal > 0) ? (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 8,
                        }}
                    >
                        <Text style={{ fontSize: 13, color: "#333333" }}>
                            For Packages
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#111111" }}>
                            Rs. {formatAmount(orderContext?.packageTotal || 0)}
                        </Text>
                    </View>
                ) : null}

                {/* Ala Carte Items (if any) */}
                {Boolean(orderContext && orderContext.productTotal > 0) ? (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 8,
                        }}
                    >
                        <Text style={{ fontSize: 13, color: "#333333" }}>
                            Ala Carte Items
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#111111" }}>
                            Rs. {formatAmount(orderContext?.productTotal || 0)}
                        </Text>
                    </View>
                ) : null}

                {/* Received Discount (if any) */}
                {Boolean(orderContext && orderContext.discount > 0) ? (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 8,
                        }}
                    >
                        <Text style={{ fontSize: 13, color: "#333333" }}>
                            Received Discount
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#FF383C" }}>
                            - Rs. {formatAmount(orderContext?.discount || 0)}
                        </Text>
                    </View>
                ) : null}

                {/* Delivery Fee */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ fontSize: 13, color: "#333333" }}>
                        Delivery Fee
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#111111" }}>
                        {deliveryFee > 0 ? `+ Rs. ${formatAmount(deliveryFee)}` : "Free"}
                    </Text>
                </View>

                {/* Total */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 16,
                        marginTop: 2,
                    }}
                >
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#111111" }}>
                        Total
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#111111" }}>
                        Rs. {formatAmount(finalTotal)}
                    </Text>
                </View>

                {/* Button */}
                <TouchableOpacity
                    activeOpacity={isReady ? 0.85 : 1}
                    disabled={!isReady}
                    onPress={handleProceed}
                    style={{
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: isReady ? "#000000" : "#8799A3",
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isReady ? 0.2 : 0,
                        shadowRadius: 4,
                        elevation: isReady ? 4 : 0,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "800",
                        }}
                    >
                        Proceed to Payment
                    </Text>
                </TouchableOpacity>
            </View>

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
