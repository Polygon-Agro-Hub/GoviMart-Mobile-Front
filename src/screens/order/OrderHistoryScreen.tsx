import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import DateTimePicker from "@react-native-community/datetimepicker";
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
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
                        console.log("order history:", response.data.orderHistory);
                        const mappedOrders: Order[] = response.data.orderHistory.map((bo: any) => {
                            const totalVal = bo.fullTotal || 0;
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
        }, [])
    );

    const formatAmount = (amount: number) =>
        amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const handleApplyFilter = () => {
        if (!selectedDate) {
            setDatePickerVisible(true);
            return;
        }
        setAppliedFilter(true);
    };

    const handleClearFilter = () => {
        setSelectedDate(null);
        setAppliedFilter(false);
    };

    const handleViewDetails = (order: Order) => {
        console.log("Selected order:", order);
        navigation.navigate("OrderDetails", {
            orderId: order.id,
        });
    };

    const handleDateChange = (
        event: any,
        date?: Date
    ) => {
        setDatePickerVisible(false);

        if (event?.type === "dismissed") {
            return;
        }

        if (date) {
            setSelectedDate(date);
            setAppliedFilter(true);
        }
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}/${month}/${day}`;
    };

    const isSameCalendarDate = (
        dateVal: string | Date | undefined | null,
        targetDate: Date
    ): boolean => {
        if (!dateVal || dateVal === "N/A") return false;

        // 1. Check Date object conversion in device local timezone (handles UTC ISO strings like "2026-08-03T18:30:00.000Z")
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            if (
                d.getFullYear() === targetDate.getFullYear() &&
                d.getMonth() === targetDate.getMonth() &&
                d.getDate() === targetDate.getDate()
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
                    targetDate.getFullYear() === year &&
                    targetDate.getMonth() === month &&
                    targetDate.getDate() === day
                ) {
                    return true;
                }
            }
        }

        return false;
    };

    const getFilteredOrders = () => {
        if (!appliedFilter || !selectedDate) return orders;

        return orders.filter((order) => {
            if (selectedFilter === "Ordered Date") {
                return (
                    isSameCalendarDate(order.rawOrderDate, selectedDate) ||
                    isSameCalendarDate(order.orderDate, selectedDate)
                );
            } else if (selectedFilter === "Scheduled Date") {
                return (
                    isSameCalendarDate(order.rawScheduleDate, selectedDate) ||
                    isSameCalendarDate(order.deliveryDate, selectedDate)
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
            <View
                style={{
                    height: 46,
                    backgroundColor: "#FFFFFF",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                }}
            >
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: "#111111",
                    }}
                >
                    Order History
                </Text>
            </View>

            {loading ? (
                /* LOADING STATE: Show only title + LoadingPage component */
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
                /* FULLY LOADED STATE: Show filter inputs + order list */
                <>
                    {/* FILTER SECTION */}
                    <View
                        style={{
                            paddingHorizontal: 38,
                            paddingTop: 8,
                            paddingBottom: 21,
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
                                    setDateFilterOpen(
                                        !dateFilterOpen
                                    )
                                }
                                style={{
                                    height: 41,

                                    borderWidth: 1,
                                    borderColor: "#D7DDE4",

                                    borderRadius: 24,

                                    flexDirection: "row",
                                    alignItems: "center",

                                    paddingHorizontal: 7,
                                }}
                            >
                                {/* Icon */}

                                <View
                                    style={{
                                        width: 27,
                                        height: 27,

                                        borderRadius: 14,

                                        backgroundColor: "#000000",

                                        justifyContent: "center",
                                        alignItems: "center",

                                        marginRight: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="time"
                                        size={14}
                                        color="#FFFFFF"
                                    />
                                </View>

                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        color: "#222222",
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
                                    size={17}
                                    color="#000000"
                                />
                            </TouchableOpacity>

                            {/* Dropdown Options */}

                            {dateFilterOpen && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 45,
                                        left: 0,
                                        right: 0,

                                        backgroundColor:
                                            "#FFFFFF",

                                        borderWidth: 1,
                                        borderColor:
                                            "#E0E3E8",

                                        borderRadius: 12,

                                        shadowColor: "#000",
                                        shadowOffset: {
                                            width: 0,
                                            height: 3,
                                        },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 5,

                                        elevation: 6,

                                        overflow: "hidden",
                                    }}
                                >
                                    {filterOptions.map(
                                        (option) => (
                                            <TouchableOpacity
                                                key={option}
                                                activeOpacity={
                                                    0.7
                                                }
                                                onPress={() => {
                                                    setSelectedFilter(
                                                        option
                                                    );
                                                    setDateFilterOpen(
                                                        false
                                                    );
                                                }}
                                                style={{
                                                    height: 38,
                                                    justifyContent:
                                                        "center",
                                                    paddingHorizontal: 14,

                                                    borderBottomWidth: 1,
                                                    borderBottomColor:
                                                        "#F0F0F0",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color:
                                                            selectedFilter ===
                                                                option
                                                                ? "#000"
                                                                : "#555",
                                                        fontWeight:
                                                            selectedFilter ===
                                                                option
                                                                ? "700"
                                                                : "400",
                                                    }}
                                                >
                                                    {option}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </View>
                            )}
                        </View>

                        {/* ================================================= */}
                        {/* DATE INPUT */}
                        {/* ================================================= */}

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                setDatePickerVisible(true);
                            }}
                            style={{
                                height: 41,

                                marginTop: 9,

                                borderWidth: 1,
                                borderColor: "#D7DDE4",

                                borderRadius: 24,

                                backgroundColor: "#F2F2F6",

                                flexDirection: "row",
                                alignItems: "center",

                                paddingHorizontal: 7,
                            }}
                        >
                            <View
                                style={{
                                    width: 27,
                                    height: 27,

                                    borderRadius: 14,

                                    backgroundColor: "#000000",

                                    justifyContent: "center",
                                    alignItems: "center",

                                    marginRight: 8,
                                }}
                            >
                                <Ionicons
                                    name="calendar"
                                    size={14}
                                    color="#FFFFFF"
                                />
                            </View>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: selectedDate
                                        ? "#111111"
                                        : "#8E8E93",
                                }}
                            >
                                {selectedDate ? formatDate(selectedDate) : "YYYY/MM/DD"}
                            </Text>
                        </TouchableOpacity>

                        {/* APPLY / CLEAR FILTER BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={appliedFilter ? handleClearFilter : handleApplyFilter}
                            style={{
                                height: 42,

                                marginTop: 15,

                                borderRadius: 23,

                                backgroundColor: "#000000",

                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",

                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 3,
                                },
                                shadowOpacity: 0.16,
                                shadowRadius: 4,

                                elevation: 4,
                            }}
                        >
                            {appliedFilter && (
                                <Ionicons
                                    name="close"
                                    size={16}
                                    color="#FFFFFF"
                                    style={{ marginRight: 6 }}
                                />
                            )}
                            <Text
                                style={{
                                    color: "#FFFFFF",
                                    fontSize: 12,
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

                    {loading ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <LoadingPage message="Loading Orders..." fullScreen={false} />
                        </View>
                    ) : getFilteredOrders().length === 0 ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 30,
                            }}
                        >
                            <Ionicons
                                name="receipt-outline"
                                size={46}
                                color="#A0A5BA"
                            />
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: "#747990",
                                    marginTop: 12,
                                    textAlign: "center",
                                }}
                            >
                                No orders found.
                            </Text>
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
                                <View
                                    key={order.id}
                                    style={{
                                        minHeight: 139,

                                        borderWidth: 1,
                                        borderColor: "#E0E5EA",

                                        borderRadius: 20,

                                        backgroundColor: "#FFFFFF",

                                        marginBottom: 20,

                                        paddingHorizontal: 10,
                                        paddingTop: 9,
                                        paddingBottom: 8,

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
                                                size={8}
                                                color="#111"
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 10,
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
                                                fontSize: 11,
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
                                                fontSize: 10,
                                                color: "#747990",
                                            }}
                                        >
                                            Order ID
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 12,
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
                                                flexDirection:
                                                    "row",
                                                alignItems:
                                                    "center",

                                                paddingRight: 8,
                                            }}
                                        >
                                            <Ionicons
                                                name="location"
                                                size={13}
                                                color="#000"
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    color: "#222",
                                                    marginLeft: 4,
                                                }}
                                            >
                                                {
                                                    order.deliveryDate
                                                }
                                            </Text>
                                        </View>

                                        {/* Divider */}

                                        <View
                                            style={{
                                                width: 1,
                                                height: 22,
                                                backgroundColor:
                                                    "#E1E4E8",
                                            }}
                                        />

                                        {/* Time */}

                                        <View
                                            style={{
                                                flexDirection:
                                                    "row",
                                                alignItems:
                                                    "center",

                                                paddingHorizontal: 8,
                                            }}
                                        >
                                            <Ionicons
                                                name="time"
                                                size={13}
                                                color="#000"
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    color: "#222",
                                                    marginLeft: 4,
                                                }}
                                            >
                                                {order.timeSlot}
                                            </Text>
                                        </View>

                                        {/* Divider */}

                                        <View
                                            style={{
                                                width: 1,
                                                height: 22,
                                                backgroundColor:
                                                    "#E1E4E8",
                                            }}
                                        />

                                        {/* Total */}

                                        <View
                                            style={{
                                                flex: 1,
                                                paddingLeft: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    color: "#747990",
                                                }}
                                            >
                                                Total
                                            </Text>

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#111",
                                                    fontWeight:
                                                        "700",
                                                    marginTop: 1,
                                                }}
                                                numberOfLines={1}
                                            >
                                                {formatAmount(
                                                    order.total
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* VIEW DETAILS */}
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() =>
                                            handleViewDetails(
                                                order
                                            )
                                        }
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
                                                fontSize: 10,
                                                color: "#60647A",
                                            }}
                                        >
                                            View Details
                                        </Text>

                                        <Ionicons
                                            name="chevron-forward"
                                            size={12}
                                            color="#60647A"
                                            style={{
                                                marginLeft: 3,
                                            }}
                                        />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </>
            )}

            {/* DatePicker */}
            {datePickerVisible && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Floating Bottom Navigation Bar */}
            <BottomNavigation activeScreen="OrderHistory" navigation={navigation} />
        </View>
    );
};

export default OrderHistory;