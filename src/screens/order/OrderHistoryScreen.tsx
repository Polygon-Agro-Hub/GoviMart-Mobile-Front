import React, { useState } from "react";
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

type OrderHistoryNavigationProp = StackNavigationProp<
    RootStackParamList,
    "OrderHistory"
>;

interface Props {
    navigation: OrderHistoryNavigationProp;
}

interface Order {
    id: number;
    status: "Confirmed" | "Processing" | "Out For Delivery";
    orderDate: string;
    invoiceNumber: string;
    deliveryDate: string;
    timeSlot: string;
    total: number;
}

const OrderHistory: React.FC<Props> = ({ navigation }) => {
    const [dateFilterOpen, setDateFilterOpen] =
        useState(false);

    const [selectedFilter, setSelectedFilter] =
        useState("Ordered Date");

    const [appliedFilter, setAppliedFilter] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const filterOptions = [
        "Ordered Date",
        "Delivery Date",
        "Completed Date",
    ];

    const orders: Order[] = [
        {
            id: 1,
            status: "Confirmed",
            orderDate: "August 02, 2026",
            invoiceNumber: "Invoice Number",
            deliveryDate: "Aug 05, 2026",
            timeSlot: "08:00 AM - 12:00 PM",
            total: 120000,
        },
        {
            id: 2,
            status: "Processing",
            orderDate: "August 01, 2026",
            invoiceNumber: "Invoice Number",
            deliveryDate: "Aug 05, 2026",
            timeSlot: "08:00 AM - 12:00 PM",
            total: 120000,
        },
        {
            id: 3,
            status: "Out For Delivery",
            orderDate: "July 31, 2026",
            invoiceNumber: "Invoice Number",
            deliveryDate: "Aug 05, 2026",
            timeSlot: "08:00 AM - 12:00 PM",
            total: 120000,
        },
    ];

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

        // Example:
        // navigation.navigate("OrderDetails", {
        //     orderId: order.id,
        // });
        navigation.navigate("OrderDetails")
    };
    const handleDateChange = (
        event: any,
        date?: Date
    ) => {
        setDatePickerVisible(false);

        if (date) {
            setSelectedDate(date);
        }
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}/${month}/${day}`;
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
                    height: 50,
                    justifyContent: "center",
                    alignItems: "center",
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
                        // Open DateTimePicker here
                        setDatePickerVisible(!datePickerVisible)
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
                                ? "#222"
                                : "#7B8090",
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
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
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

            {/* ORDER LIST */}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 12,
                    paddingTop: 24,
                    paddingBottom: 30,
                }}
            >
                {orders.map((order) => (
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
                                    fontSize: 14,
                                    color: "#111111",
                                    fontWeight: "600",
                                    marginTop: 2,
                                }}
                            >
                                [{order.invoiceNumber}]
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
                                    Rs.{" "}
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
            {datePickerVisible && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
            {/* Floating Bottom Navigation Bar */}
            <BottomNavigation activeScreen="MyCart" navigation={navigation} />
        </View>
    );
};

export default OrderHistory;