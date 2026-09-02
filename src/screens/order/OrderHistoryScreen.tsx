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
}

const OrderHistory: React.FC<Props> = ({ navigation }) => {
    const [dateFilterOpen, setDateFilterOpen] = useState(false);

    const [selectedFilter, setSelectedFilter] = useState("Ordered Date");

    const [appliedFilter, setAppliedFilter] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const filterOptions = [
        "Ordered Date",
        "Delivery Date",
        "Completed Date",
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
                                deliveryDate: formatDeliveryDate(bo.scheduleDate),
                                timeSlot: bo.scheduleTime || 'N/A',
                                total: totalVal,
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
        setAppliedFilter(true);

        console.log({
            filter: selectedFilter,
            date: selectedDate,
        });
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

        if (date) {
            setSelectedDate(date);
            setAppliedFilter(false);
        }
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}/${month}/${day}`;
    };

    const getFilteredOrders = () => {
        if (!appliedFilter) return orders;

        return orders.filter((order) => {
            let orderDateToCompare: Date;
            if (selectedFilter === "Ordered Date") {
                orderDateToCompare = new Date(order.orderDate);
            } else if (selectedFilter === "Delivery Date") {
                orderDateToCompare = new Date(order.deliveryDate);
            } else {
                // "Completed Date"
                orderDateToCompare = new Date(order.deliveryDate);
            }

            if (isNaN(orderDateToCompare.getTime())) return true;

            return (
                orderDateToCompare.getFullYear() === selectedDate.getFullYear() &&
                orderDateToCompare.getMonth() === selectedDate.getMonth() &&
                orderDateToCompare.getDate() === selectedDate.getDate()
            );
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
                            backgroundColor: "#FFFFFF",
                            paddingHorizontal: 38,
                            paddingTop: 4,
                            paddingBottom: 16,
                            zIndex: 20,
                        }}
                    >
                        {/* Dropdown Filter */}
                        <View
                            style={{
                                position: "relative",
                                zIndex: 20,
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setDateFilterOpen(!dateFilterOpen)}
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
                                    name={dateFilterOpen ? "chevron-up" : "chevron-down"}
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
                                        backgroundColor: "#FFFFFF",
                                        borderWidth: 1,
                                        borderColor: "#E0E3E8",
                                        borderRadius: 12,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 3 },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 5,
                                        elevation: 6,
                                        overflow: "hidden",
                                    }}
                                >
                                    {filterOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setSelectedFilter(option);
                                                setDateFilterOpen(false);
                                                setAppliedFilter(false);
                                            }}
                                            style={{
                                                height: 38,
                                                justifyContent: "center",
                                                paddingHorizontal: 14,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#F0F0F0",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: selectedFilter === option ? "#000" : "#555",
                                                    fontWeight: selectedFilter === option ? "700" : "400",
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
                            onPress={() => setDatePickerVisible(!datePickerVisible)}
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
                                    color: selectedDate ? "#222" : "#7B8090",
                                }}
                            >
                                {formatDate(selectedDate)}
                            </Text>
                        </TouchableOpacity>

                        {/* APPLY FILTER */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleApplyFilter}
                            style={{
                                height: 42,
                                marginTop: 15,
                                borderRadius: 23,
                                backgroundColor: "#000000",
                                justifyContent: "center",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.16,
                                shadowRadius: 4,
                                elevation: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: "600",
                                }}
                            >
                                Apply Filter
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

                    {/* ORDER LIST / EMPTY STATE */}
                    {getFilteredOrders().length === 0 ? (
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
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    {/* Order Item Card Details */}
                                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <View
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 16,
                                                    backgroundColor: "#F2F4F7",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    marginRight: 8,
                                                }}
                                            >
                                                <Ionicons name="receipt" size={16} color="#111" />
                                            </View>
                                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111" }}>
                                                Order #{order.id}
                                            </Text>
                                        </View>

                                        <View
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 12,
                                                backgroundColor:
                                                    order.status.toLowerCase() === "delivered" || order.status.toLowerCase() === "picked up"
                                                        ? "#E6F4EA"
                                                        : order.status.toLowerCase() === "cancelled"
                                                        ? "#FCE8E6"
                                                        : "#FEF7E0",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: "700",
                                                    color:
                                                        order.status.toLowerCase() === "delivered" || order.status.toLowerCase() === "picked up"
                                                            ? "#137333"
                                                            : order.status.toLowerCase() === "cancelled"
                                                            ? "#C5221F"
                                                            : "#B06000",
                                                }}
                                            >
                                                {order.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ height: 1, backgroundColor: "#F0F0F0", marginVertical: 8 }} />

                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, color: "#666" }}>Order Date:</Text>
                                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#222" }}>{order.orderDate}</Text>
                                    </View>

                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, color: "#666" }}>Delivery Date:</Text>
                                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#222" }}>{order.deliveryDate}</Text>
                                    </View>

                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                        <Text style={{ fontSize: 12, color: "#666" }}>Total Amount:</Text>
                                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#000" }}>
                                            Rs. {typeof order.total === "number" ? formatAmount(order.total) : order.total}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => handleViewDetails(order)}
                                        style={{
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: "#000",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            marginTop: 4,
                                        }}
                                    >
                                        <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
                                            View Details
                                        </Text>
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
                    value={selectedDate}
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