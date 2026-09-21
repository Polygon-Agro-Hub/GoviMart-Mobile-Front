import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    BackHandler,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import CustomCalendarModal from "@/component/common/CustomCalendarModal";
import CustomHeader from "@/component/common/CustomHeader";
import { AlertModal } from "@/component/common/AlertModal";
import NoDataFound from "@/component/common/NoDataFound";
import { useFocusEffect } from "@react-navigation/native";
import LoadingPage from "@/component/common/LoadingPage";
import orderService from "@/services/order/order.service";

type OrderHistoryNavigationProp = StackNavigationProp<
    RootStackParamList,
    "OrderHistory"
>;

interface Props {
    navigation: OrderHistoryNavigationProp;
}

interface Order {
    id: string;
    status: string;
    orderDate: string;
    invoiceNumber: string;
    deliveryDate: string;
    timeSlot: string;
    total: number;
    rawOrderDate?: string;
    rawScheduleDate?: string;
}


const OrderHistory: React.FC<Props> = ({ navigation }) => {
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState("Ordered Date");
    const [appliedFilter, setAppliedFilter] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

    // AlertModal States
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [alertType, setAlertType] = useState<"success" | "error">("error");

    const showAlert = (
        title: string,
        message: string,
        type: "success" | "error" = "error"
    ) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertType(type);
        setAlertVisible(true);
    };

    const filterOptions = [
        "Ordered Date",
        "Scheduled Date",
    ];

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const formatOrderDate = (dateString: string) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatDeliveryDate = (dateString: string) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleBackPress = useCallback(() => {
        if (datePickerVisible) {
            setDatePickerVisible(false);
            return true;
        }
        if (dateFilterOpen) {
            setDateFilterOpen(false);
            return true;
        }
        if (alertVisible) {
            setAlertVisible(false);
            return true;
        }
        navigation.navigate("Home");
        return true;
    }, [datePickerVisible, dateFilterOpen, alertVisible, navigation]);

    useFocusEffect(
        useCallback(() => {
            const fetchOrderHistory = async () => {
                try {
                    setLoading(true);
                    const response = await orderService.getOrderHistory();
                    if (
                        response.data &&
                        response.data.status &&
                        response.data.orderHistory
                    ) {
                        const mappedOrders: Order[] = response.data.orderHistory.map((bo: any) => {
                            const rawTotal = bo.fullTotal != null ? bo.fullTotal : (bo.total || 0);
                            const totalVal =
                                typeof rawTotal === "number"
                                    ? rawTotal
                                    : parseFloat(
                                        String(rawTotal)
                                            .replace(/Rs\.?/gi, "")
                                            .replace(/LKR/gi, "")
                                            .replace(/,/g, "")
                                            .trim()
                                    ) || 0;
                            return {
                                id: bo.orderId ? String(bo.orderId) : 'N/A',
                                status: bo.processStatus || 'Pending',
                                orderDate: formatOrderDate(bo.createdAt),
                                invoiceNumber: bo.invoiceNo || 'N/A',
                                deliveryDate: formatDeliveryDate(bo.scheduleDate || bo.sheduleDate),
                                timeSlot: bo.scheduleTime || bo.sheduleTime || 'N/A',
                                total: totalVal,
                                rawOrderDate: bo.createdAt,
                                rawScheduleDate: bo.scheduleDate || bo.sheduleDate,
                            };
                        });
                        setOrders(mappedOrders);
                    } else {
                        setOrders([]);
                    }
                } catch (error) {
                    console.log("Failed to fetch order history: ", error);
                    setOrders([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchOrderHistory();

            const subscription = BackHandler.addEventListener(
                "hardwareBackPress",
                handleBackPress
            );

            return () => subscription.remove();
        }, [handleBackPress])
    );

    const formatAmount = (amount: number | string) => {
        const num =
            typeof amount === "number"
                ? amount
                : parseFloat(
                    String(amount || "")
                        .replace(/Rs\.?/gi, "")
                        .replace(/LKR/gi, "")
                        .replace(/,/g, "")
                        .trim()
                ) || 0;
        return num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleDateSelect = (dateStr: string) => {
        if (selectedFilter === "Ordered Date") {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const picked = new Date(dateStr.replace(/\//g, "-"));
            if (picked > today) {
                showAlert(
                    "Invalid Date",
                    "Ordered date cannot be in the future. Please select today or an earlier date.",
                    "error"
                );
                return;
            }
        }

        setSelectedDateStr(dateStr);
        setAppliedFilter(true);

        const matches = orders.filter((order) => {
            if (selectedFilter === "Ordered Date") {
                return (
                    isSameCalendarDate(order.rawOrderDate, dateStr) ||
                    isSameCalendarDate(order.orderDate, dateStr)
                );
            } else if (selectedFilter === "Scheduled Date") {
                return (
                    isSameCalendarDate(order.rawScheduleDate, dateStr) ||
                    isSameCalendarDate(order.deliveryDate, dateStr)
                );
            }
            return true;
        });

        if (matches.length === 0) {
            showAlert(
                "No Orders Found",
                `No orders found matching ${selectedFilter}: ${dateStr}.`,
                "error"
            );
        }
    };

    const handleApplyFilter = () => {
        if (!selectedDateStr) {
            showAlert(
                "Date Required",
                `Please select a date to filter by ${selectedFilter.toLowerCase()}.`,
                "error"
            );
            return;
        }
        setAppliedFilter(true);

        const matches = getFilteredOrders();
        if (matches.length === 0) {
            showAlert(
                "No Orders Found",
                `No orders found matching ${selectedFilter}: ${selectedDateStr}.`,
                "error"
            );
        }
    };

    const handleClearFilter = () => {
        setSelectedDateStr(null);
        setAppliedFilter(false);
    };

    const handleViewDetails = (order: Order) => {
        navigation.navigate("OrderDetails", {
            orderId: order.id,
        });
    };

    const isSameCalendarDate = (
        dateVal: string | Date | undefined | null,
        targetDateStr: string | null
    ): boolean => {
        if (!dateVal || dateVal === "N/A" || !targetDateStr) return false;

        const targetParts = targetDateStr.replace(/-/g, "/").split("/");
        if (targetParts.length !== 3) return false;
        const targetYear = parseInt(targetParts[0], 10);
        const targetMonth = parseInt(targetParts[1], 10) - 1;
        const targetDay = parseInt(targetParts[2], 10);

        // 1. Check Date object conversion in device local timezone
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            if (
                d.getFullYear() === targetYear &&
                d.getMonth() === targetMonth &&
                d.getDate() === targetDay
            ) {
                return true;
            }
        }

        // 2. Also check direct literal match (for plain YYYY-MM-DD or YYYY/MM/DD)
        if (typeof dateVal === "string") {
            const match = dateVal.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
            if (match) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1;
                const day = parseInt(match[3], 10);
                if (
                    targetYear === year &&
                    targetMonth === month &&
                    targetDay === day
                ) {
                    return true;
                }
            }
        }

        return false;
    };

    const getFilteredOrders = () => {
        if (!appliedFilter || !selectedDateStr) return orders;

        return orders.filter((order) => {
            if (selectedFilter === "Ordered Date") {
                return (
                    isSameCalendarDate(order.rawOrderDate, selectedDateStr) ||
                    isSameCalendarDate(order.orderDate, selectedDateStr)
                );
            } else if (selectedFilter === "Scheduled Date") {
                return (
                    isSameCalendarDate(order.rawScheduleDate, selectedDateStr) ||
                    isSameCalendarDate(order.deliveryDate, selectedDateStr)
                );
            }
            return true;
        });
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* HEADER */}
            <CustomHeader
                title="Order History"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
                onBackPress={handleBackPress}
            />

            {loading ? (
                /* LOADING STATE */
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <LoadingPage message="Loading Orders..." fullScreen={false} />
                </View>
            ) : (
                /* FULLY LOADED STATE */
                <>
                    {/* FILTER SECTION */}
                    <View
                        style={{
                            paddingHorizontal: 16,
                            paddingTop: 6,
                            paddingBottom: 16,
                        }}
                    >
                        {/* Ordered Date Dropdown */}
                        <View
                            style={{
                                position: "relative",
                                zIndex: 20,
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    setDateFilterOpen(!dateFilterOpen)
                                }
                                style={{
                                    height: 50,
                                    borderWidth: 1,
                                    borderColor: "#D7DDE4",
                                    borderRadius: 25,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingHorizontal: 12,
                                    backgroundColor: "#FFFFFF",
                                }}
                            >
                                {/* Icon */}
                                <View
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: "#000000",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        marginRight: 10,
                                    }}
                                >
                                    <Ionicons
                                        name="time"
                                        size={16}
                                        color="#FFFFFF"
                                    />
                                </View>

                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 15,
                                        fontWeight: "500",
                                        color: "#1E293B",
                                    }}
                                >
                                    {selectedFilter}
                                </Text>

                                <Ionicons
                                    name={
                                        dateFilterOpen
                                            ? "chevron-up"
                                            : "chevron-down"
                                    }
                                    size={18}
                                    color="#000000"
                                />
                            </TouchableOpacity>

                            {/* Dropdown Options */}
                            {dateFilterOpen && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 56,
                                        left: 0,
                                        right: 0,
                                        backgroundColor: "#FFFFFF",
                                        borderWidth: 1,
                                        borderColor: "#E2E8F0",
                                        borderRadius: 16,
                                        shadowColor: "#000",
                                        shadowOffset: {
                                            width: 0,
                                            height: 4,
                                        },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 8,
                                        elevation: 6,
                                        overflow: "hidden",
                                        zIndex: 30,
                                    }}
                                >
                                    {filterOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setSelectedFilter(option);
                                                setDateFilterOpen(false);
                                                if (selectedDateStr) {
                                                    if (option === "Ordered Date") {
                                                        const today = new Date();
                                                        today.setHours(23, 59, 59, 999);
                                                        const picked = new Date(selectedDateStr.replace(/\//g, "-"));
                                                        if (picked > today) {
                                                            showAlert(
                                                                "Invalid Date",
                                                                "Ordered date cannot be in the future. Please select today or an earlier date.",
                                                                "error"
                                                            );
                                                            return;
                                                        }
                                                    }
                                                    const matches = orders.filter((order) => {
                                                        if (option === "Ordered Date") {
                                                            return (
                                                                isSameCalendarDate(order.rawOrderDate, selectedDateStr) ||
                                                                isSameCalendarDate(order.orderDate, selectedDateStr)
                                                            );
                                                        } else if (option === "Scheduled Date") {
                                                            return (
                                                                isSameCalendarDate(order.rawScheduleDate, selectedDateStr) ||
                                                                isSameCalendarDate(order.deliveryDate, selectedDateStr)
                                                            );
                                                        }
                                                        return true;
                                                    });
                                                    if (matches.length === 0) {
                                                        showAlert(
                                                            "No Orders Found",
                                                            `No orders found matching ${option}: ${selectedDateStr}.`,
                                                            "error"
                                                        );
                                                    }
                                                }
                                            }}
                                            style={{
                                                height: 48,
                                                justifyContent: "center",
                                                paddingHorizontal: 16,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#F1F5F9",
                                                backgroundColor:
                                                    selectedFilter === option
                                                        ? "#F8FAFC"
                                                        : "#FFFFFF",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    color:
                                                        selectedFilter === option
                                                            ? "#000000"
                                                            : "#475569",
                                                    fontWeight:
                                                        selectedFilter === option
                                                            ? "700"
                                                            : "500",
                                                }}
                                            >
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* DATE INPUT */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                setDatePickerVisible(true);
                            }}
                            style={{
                                height: 50,
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: "#D7DDE4",
                                borderRadius: 25,
                                backgroundColor: "#F8FAFC",
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: "#000000",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginRight: 10,
                                }}
                            >
                                <Ionicons
                                    name="calendar"
                                    size={16}
                                    color="#FFFFFF"
                                />
                            </View>

                            <Text
                                style={{
                                    flex: 1,
                                    fontSize: 15,
                                    fontWeight: "500",
                                    color: selectedDateStr
                                        ? "#0F172A"
                                        : "#94A3B8",
                                }}
                            >
                                {selectedDateStr || "Select Date (YYYY/MM/DD)"}
                            </Text>

                            {selectedDateStr && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleClearFilter();
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* APPLY / CLEAR FILTER BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={appliedFilter ? handleClearFilter : handleApplyFilter}
                            style={{
                                height: 50,
                                marginTop: 12,
                                borderRadius: 25,
                                backgroundColor: "#000000",
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.12,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            {appliedFilter && (
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color="#FFFFFF"
                                    style={{ marginRight: 6 }}
                                />
                            )}
                            <Text
                                style={{
                                    color: "#FFFFFF",
                                    fontSize: 15,
                                    fontWeight: "600",
                                }}
                            >
                                {appliedFilter ? "Clear Filter" : "Apply Filter"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* DIVIDER */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "#E8E8EA",
                        }}
                    />

                    {/* ORDER LIST */}
                    {getFilteredOrders().length == 0 ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 30,
                            }}
                        >
                            <NoDataFound
                                message={
                                    appliedFilter
                                        ? "No orders found for the selected date"
                                        : "No orders found"
                                }
                            />
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 12,
                                paddingTop: 24,
                                paddingBottom: 130,
                            }}
                        >
                            {getFilteredOrders().map((order) => (
                                <TouchableOpacity
                                    key={order.id}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        handleViewDetails(
                                            order
                                        )
                                    }
                                    style={{
                                        minHeight: 139,
                                        borderWidth: 1,
                                        borderColor: "#E0E5EA",
                                        borderRadius: 20,
                                        backgroundColor: "#FFFFFF",
                                        marginBottom: 20,
                                        padding: 14,
                                        shadowColor: "#000",
                                        shadowOffset: {
                                            width: 0,
                                            height: 2,
                                        },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    {/* TOP ROW */}
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent:
                                                "space-between",
                                        }}
                                    >
                                        {/* Status */}
                                        <View
                                            style={{
                                                backgroundColor:
                                                    "#F1F1F5",
                                                borderRadius: 12,
                                                paddingHorizontal: 6,
                                                paddingVertical: 3,
                                                flexDirection:
                                                    "row",
                                                alignItems:
                                                    "center",
                                            }}
                                        >
                                            <Ionicons
                                                name="star"
                                                size={10}
                                                color="#111"
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: "#333",
                                                    marginLeft: 3,
                                                }}
                                            >
                                                {order.status}
                                            </Text>
                                        </View>

                                        {/* Order Date */}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: "#565B70",
                                            }}
                                        >
                                            {order.orderDate}
                                        </Text>
                                    </View>

                                    {/* ORDER ID */}
                                    <View
                                        style={{
                                            marginTop: 9,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#747990",
                                            }}
                                        >
                                            Order ID
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 15,
                                                color: "#111111",
                                                fontWeight: "600",
                                                marginTop: 2,
                                            }}
                                        >
                                            #{order.invoiceNumber}
                                        </Text>
                                    </View>

                                    {/* DELIVERY + TOTAL */}
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            marginTop: 12,
                                        }}
                                    >
                                        {/* Delivery Date */}
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                paddingRight: 5,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 99,
                                                    backgroundColor: "#000000",
                                                    justifyContent: "center",
                                                    alignItems: "center",

                                                }}
                                            >
                                                <Ionicons
                                                    name="time"
                                                    size={8}
                                                    color="#FFFFFF"
                                                />
                                            </View>
                                            <Text
                                                style={{
                                                    fontSize: 9.5,
                                                    color: "#334155",
                                                    fontWeight: "500",
                                                    marginLeft: 3,
                                                }}
                                            >
                                                {order.deliveryDate}
                                            </Text>
                                        </View>

                                        {/* Divider */}
                                        <View
                                            style={{
                                                width: 1,
                                                height: 14,
                                                backgroundColor: "#E1E4E8",
                                            }}
                                        />

                                        {/* Time Slot */}
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                paddingHorizontal: 5,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 99,
                                                    backgroundColor: "#000000",
                                                    justifyContent: "center",
                                                    alignItems: "center",

                                                }}
                                            >
                                                <FontAwesome6
                                                    name="calendar"
                                                    size={6}
                                                    color="#FFFFFF"
                                                    solid
                                                />
                                            </View>
                                            <Text
                                                style={{
                                                    fontSize: 9.5,
                                                    color: "#334155",
                                                    fontWeight: "500",
                                                    marginLeft: 3,
                                                }}
                                            >
                                                {order.timeSlot}
                                            </Text>
                                        </View>

                                        {/* Divider */}
                                        <View
                                            style={{
                                                width: 1,
                                                height: 14,
                                                backgroundColor: "#E1E4E8",
                                            }}
                                        />

                                        {/* Total */}
                                        <View
                                            style={{
                                                flex: 1,
                                                paddingLeft: 5,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 8.5,
                                                    color: "#747990",
                                                    fontWeight: "500",
                                                }}
                                            >
                                                Total
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 10.5,
                                                    color: "#111827",
                                                    fontWeight: "700",
                                                    marginTop: 1,
                                                }}
                                                numberOfLines={1}
                                            >
                                                Rs. {formatAmount(
                                                    order.total
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* VIEW DETAILS */}
                                    <View
                                        style={{
                                            flexDirection:
                                                "row",
                                            alignItems:
                                                "center",
                                            marginTop: 9,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: "#60647A",
                                            }}
                                        >
                                            View Details
                                        </Text>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={14}
                                            color="#60647A"
                                            style={{
                                                marginLeft: 3,
                                            }}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </>
            )}

            {/* Custom Calendar Modal */}
            <CustomCalendarModal
                visible={datePickerVisible}
                onClose={() => setDatePickerVisible(false)}
                selectedDate={selectedDateStr}
                onSelectDate={handleDateSelect}
                minDate={new Date(2020, 0, 1)}
                maxDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                title={`Select ${selectedFilter}`}
                showPreparationNotice={false}
            />

            {/* Alert Modal */}
            <AlertModal
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                onClose={() => setAlertVisible(false)}
                autoClose={false}
                showOkButton={true}
            />

            {/* Floating Bottom Navigation Bar */}
            <BottomNavigation activeScreen="OrderHistory" navigation={navigation} />
        </View>
    );
};

export default OrderHistory;