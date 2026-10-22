import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
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
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
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

const filterOptions = [
  { label: "Ordered Date", value: "Ordered Date" },
  { label: "Scheduled Date", value: "Scheduled Date" },
];

const OrderHistory: React.FC<Props> = ({ navigation }) => {
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Ordered Date");
  const [appliedFilter, setAppliedFilter] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
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
    type: "success" | "error" = "error",
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const formatOrderDate = (dateString: string) => {
    if (!dateString || dateString === "N/A") return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDeliveryDate = (dateString: string) => {
    if (!dateString || dateString === "N/A") return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const datePickerVisibleRef = React.useRef(datePickerVisible);
  const dateFilterOpenRef = React.useRef(dateFilterOpen);
  const alertVisibleRef = React.useRef(alertVisible);

  React.useEffect(() => {
    datePickerVisibleRef.current = datePickerVisible;
  }, [datePickerVisible]);

  React.useEffect(() => {
    dateFilterOpenRef.current = dateFilterOpen;
  }, [dateFilterOpen]);

  React.useEffect(() => {
    alertVisibleRef.current = alertVisible;
  }, [alertVisible]);

  const handleBackPress = useCallback(() => {
    if (datePickerVisibleRef.current) {
      setDatePickerVisible(false);
      return true;
    }
    if (dateFilterOpenRef.current) {
      setDateFilterOpen(false);
      return true;
    }
    if (alertVisibleRef.current) {
      setAlertVisible(false);
      return true;
    }
    navigation.navigate("Home");
    return true;
  }, [navigation]);

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
            const mappedOrders: Order[] = response.data.orderHistory.map(
              (bo: any) => {
                const rawTotal =
                  bo.fullTotal != null ? bo.fullTotal : bo.total || 0;
                const totalVal =
                  typeof rawTotal === "number"
                    ? rawTotal
                    : parseFloat(
                        String(rawTotal)
                          .replace(/Rs\.?/gi, "")
                          .replace(/LKR/gi, "")
                          .replace(/,/g, "")
                          .trim(),
                      ) || 0;
                const rawStatus = bo.processStatus || "Pending";
                const formattedStatus =
                  rawStatus.toLowerCase() === "return received" ||
                  rawStatus.toLowerCase().includes("return")
                    ? "Return"
                    : rawStatus;
                return {
                  id: bo.orderId ? String(bo.orderId) : "N/A",
                  status: formattedStatus,
                  orderDate: formatOrderDate(bo.createdAt),
                  invoiceNumber: bo.invoiceNo || "N/A",
                  deliveryDate: formatDeliveryDate(
                    bo.scheduleDate || bo.sheduleDate,
                  ),
                  timeSlot: bo.scheduleTime || bo.sheduleTime || "N/A",
                  total: totalVal,
                  rawOrderDate: bo.createdAt,
                  rawScheduleDate: bo.scheduleDate || bo.sheduleDate,
                };
              },
            );
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
        handleBackPress,
      );

      return () => subscription.remove();
    }, [handleBackPress]),
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
              .trim(),
          ) || 0;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isFutureDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const picked = new Date(dateStr.replace(/\//g, "-"));
    return picked > today;
  };

  const handleDateSelect = (dateStr: string) => {
    if (selectedFilter === "Ordered Date" && isFutureDate(dateStr)) {
      showAlert(
        "Invalid Date",
        "Ordered date cannot be in the future. Please select today or an earlier date.",
        "error",
      );
      return;
    }

    setSelectedDateStr(dateStr);
    setAppliedFilter(false);
  };

  const isSameCalendarDate = (
    dateVal: string | Date | undefined | null,
    targetDateStr: string | null,
  ): boolean => {
    if (!dateVal || dateVal === "N/A" || !targetDateStr) return false;

    const targetParts = targetDateStr.replace(/-/g, "/").split("/");
    if (targetParts.length !== 3) return false;
    const targetYear = parseInt(targetParts[0], 10);
    const targetMonth = parseInt(targetParts[1], 10) - 1;
    const targetDay = parseInt(targetParts[2], 10);

    // 1. Date object conversion in device local timezone
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

    // 2. Direct literal match (plain YYYY-MM-DD or YYYY/MM/DD)
    if (typeof dateVal === "string") {
      const match = dateVal.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        if (targetYear === year && targetMonth === month && targetDay === day) {
          return true;
        }
      }
    }

    return false;
  };

  const matchesFilter = (order: Order, dateStr: string) => {
    if (selectedFilter === "Ordered Date") {
      return (
        isSameCalendarDate(order.rawOrderDate, dateStr) ||
        isSameCalendarDate(order.orderDate, dateStr)
      );
    }
    if (selectedFilter === "Scheduled Date") {
      return (
        isSameCalendarDate(order.rawScheduleDate, dateStr) ||
        isSameCalendarDate(order.deliveryDate, dateStr)
      );
    }
    return true;
  };

  const handleApplyFilter = () => {
    if (!selectedDateStr) {
      showAlert(
        "Date Required",
        `Please select a date to filter by ${selectedFilter.toLowerCase()}.`,
        "error",
      );
      return;
    }

    if (selectedFilter === "Ordered Date" && isFutureDate(selectedDateStr)) {
      showAlert(
        "Invalid Date",
        "Ordered date cannot be in the future. Please select today or an earlier date.",
        "error",
      );
      return;
    }

    setAppliedFilter(true);
    setFilterLoading(true);

    const matches = orders.filter((order) =>
      matchesFilter(order, selectedDateStr),
    );

    setTimeout(() => {
      setFilterLoading(false);
      if (matches.length === 0) {
        showAlert(
          "No Orders Found",
          `No orders found matching ${selectedFilter}: ${selectedDateStr}.`,
          "error",
        );
      }
    }, 350);
  };

  const handleClearFilter = () => {
    setFilterLoading(true);
    setSelectedDateStr(null);
    setAppliedFilter(false);
    setTimeout(() => {
      setFilterLoading(false);
    }, 350);
  };

  const handleViewDetails = (order: Order) => {
    navigation.navigate("OrderDetails", {
      orderId: order.id,
    });
  };

  const getFilteredOrders = () => {
    if (!appliedFilter || !selectedDateStr) return orders;
    return orders.filter((order) => matchesFilter(order, selectedDateStr));
  };

  const filteredOrders = getFilteredOrders();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
        <>
          {/* FILTER SECTION */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 6,
              paddingBottom: 16,
            }}
          >
            {/* Filter Type Selector (opens GlobalSearchModal) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDateFilterOpen(true)}
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
                <Ionicons name="time" size={16} color="#FFFFFF" />
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

              <Ionicons name="chevron-down" size={18} color="#000000" />
            </TouchableOpacity>

            {/* DATE INPUT */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDatePickerVisible(true)}
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
                <Ionicons name="calendar" size={16} color="#FFFFFF" />
              </View>

              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "500",
                  color: selectedDateStr ? "#0F172A" : "#94A3B8",
                }}
              >
                {selectedDateStr || "Select Date (YYYY/MM/DD)"}
              </Text>
            </TouchableOpacity>

            {/* APPLY / CLEAR FILTER BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={filterLoading}
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
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {filterLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
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
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* DIVIDER */}
          <View style={{ height: 1, backgroundColor: "#E8E8EA" }} />

          {/* ORDER LIST */}
          {filterLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 30,
              }}
            >
              <LoadingPage message="Loading Orders..." fullScreen={false} />
            </View>
          ) : filteredOrders.length === 0 ? (
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
              {filteredOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.85}
                  onPress={() => handleViewDetails(order)}
                  style={{
                    minHeight: 139,
                    borderWidth: 1,
                    borderColor: "#E0E5EA",
                    borderRadius: 20,
                    backgroundColor: "#FFFFFF",
                    marginBottom: 20,
                    padding: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
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
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Status */}
                    <View
                      style={{
                        backgroundColor: "#F1F1F5",
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="star" size={10} color="#111" />
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
                    <Text style={{ fontSize: 13, color: "#565B70" }}>
                      {order.orderDate}
                    </Text>
                  </View>

                  {/* ORDER ID */}
                  <View style={{ marginTop: 9 }}>
                    <Text style={{ fontSize: 12, color: "#747990" }}>
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
                        <Ionicons name="time" size={8} color="#FFFFFF" />
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
                    <View style={{ flex: 1, paddingLeft: 5 }}>
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
                        Rs. {formatAmount(order.total)}
                      </Text>
                    </View>
                  </View>

                  {/* VIEW DETAILS */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 9,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#60647A" }}>
                      View Details
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#60647A"
                      style={{ marginLeft: 3 }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Filter Type Modal (GlobalSearchModal) */}
      <GlobalSearchModal
        visible={dateFilterOpen}
        onClose={() => setDateFilterOpen(false)}
        title="Filter By"
        data={filterOptions}
        selectedItems={[selectedFilter]}
        multiSelect={false}
        showSearch={false}
        onSelect={(items) => {
          if (items[0]) {
            setSelectedFilter(items[0]);
            setAppliedFilter(false);
            setSelectedDateStr(null);
          }
        }}
      />

      {/* Custom Calendar Modal */}
      <CustomCalendarModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={selectedDateStr}
        onSelectDate={handleDateSelect}
        minDate={new Date(2020, 0, 1)}
        maxDate={
          selectedFilter === "Ordered Date"
            ? new Date()
            : new Date(new Date().getFullYear() + 2, 11, 31)
        }
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
