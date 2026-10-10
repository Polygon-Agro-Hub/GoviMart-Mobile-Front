import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
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

type ScheduleOrderRouteProp = RouteProp<RootStackParamList, "ScheduleOrder">;

interface Props {
  navigation: ScheduleOrderNavigationProp;
  route: ScheduleOrderRouteProp;
}

const timeSlotOptions = [
  "08:00 AM - 12:00 PM",
  "12:00 PM - 04:00 PM",
  "04:00 PM - 09:00 PM",
];

const scheduleTypeOptions = ["One Time", "Once a Week", "Twice a Week"];

const weekOptions = [
  { label: "01 Week", value: "01" },
  { label: "02 Weeks", value: "02" },
  { label: "03 Weeks", value: "03" },
  { label: "04 Weeks", value: "04" },
];

const DAYS_OF_WEEK = [
  { id: "Mo", label: "Mo", dayIndex: 1, name: "Monday" },
  { id: "Tu", label: "Tu", dayIndex: 2, name: "Tuesday" },
  { id: "We", label: "We", dayIndex: 3, name: "Wednesday" },
  { id: "Th", label: "Th", dayIndex: 4, name: "Thursday" },
  { id: "Fr", label: "Fr", dayIndex: 5, name: "Friday" },
  { id: "Sa", label: "Sa", dayIndex: 6, name: "Saturday" },
  { id: "Su", label: "Su", dayIndex: 0, name: "Sunday" },
];

const ScheduleOrderScreen: React.FC<Props> = ({ navigation, route }) => {
  const orderContext = route.params?.orderContext;

  const [scheduleType, setScheduleType] = useState<
    "One Time" | "Once a Week" | "Twice a Week"
  >("One Time");

  // One Time
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Recurring
  const [selectedDays, setSelectedDays] = useState<string[]>(["Tu"]);
  const [selectedWeeks, setSelectedWeeks] = useState<string>("04");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [weeksModalVisible, setWeeksModalVisible] = useState(false);
  const [viewOrdersModalVisible, setViewOrdersModalVisible] = useState(false);

  const isDelivery = orderContext?.deliveryMethod === "home";
  const deliveryFee = isDelivery ? Number(orderContext?.deliveryCharge) || 0 : 0;
  const baseTotal =
    (orderContext?.packageTotal || 0) +
    (orderContext?.productTotal || 0) -
    (orderContext?.discount || 0);
  const finalTotal = Math.max(0, baseTotal + deliveryFee);

  // Handle day selection
  const handleDayToggle = (dayId: string) => {
    if (scheduleType === "Once a Week") {
      setSelectedDays([dayId]);
    } else if (scheduleType === "Twice a Week") {
      if (selectedDays.includes(dayId)) {
        if (selectedDays.length > 1) {
          setSelectedDays(selectedDays.filter((id) => id !== dayId));
        }
      } else {
        if (selectedDays.length < 2) {
          setSelectedDays([...selectedDays, dayId]);
        } else {
          setSelectedDays([selectedDays[1], dayId]);
        }
      }
    }
  };

  const cartPackages = useSelector((state: RootState) => state.cart.packages);

  // ─── SEASONAL PACKAGE CUTOFF & BANNER LOGIC ─────────────────────────────
  const seasonalInfo = useMemo(() => {
    // Combine packages from Redux store and route orderContext to guarantee availability
    const allPkgs: any[] = [
      ...(Array.isArray(cartPackages) ? cartPackages : []),
      ...(Array.isArray(orderContext?.packages) ? orderContext.packages : []),
    ];

    // Filter packages that have an endDate and are One Time packages (or have an endDate specified)
    const seasonalPackages = allPkgs.filter((pkg) => {
      if (!pkg?.endDate) return false;
      const type = (pkg.packageType || "").trim().toLowerCase();
      // Match "one time" or if package has an explicit endDate
      return type === "one time" || !pkg.packageType || type.includes("one");
    });

    if (seasonalPackages.length === 0) return null;

    // Helper to parse date string (handles "YYYY-MM-DD", ISO "YYYY-MM-DDTHH:mm:ss", or Date string)
    const parseDateStr = (dateStr: any) => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;
      const str = String(dateStr).trim();
      if (str.includes("-")) {
        const parts = str.split("T")[0].split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Find the package that expires the soonest
    let earliestExpiryDate: Date | null = null;
    seasonalPackages.forEach((pkg) => {
      if (!pkg.endDate) return;
      const d = parseDateStr(pkg.endDate);
      if (d) {
        if (!earliestExpiryDate || d < earliestExpiryDate) {
          earliestExpiryDate = d;
        }
      }
    });

    if (!earliestExpiryDate) return null;

    const expiryDay = (earliestExpiryDate as Date).getDate();

    // Cutoff date is [Expire Date] - 2 days
    const cutoffDate = new Date((earliestExpiryDate as Date).getTime());
    cutoffDate.setDate(cutoffDate.getDate() - 2);
    cutoffDate.setHours(23, 59, 59, 999);

    // Current hour gap check (6:00 PM cutoff)
    const now = new Date();
    const isAfter6PM = now.getHours() >= 18;
    const gapDays = isAfter6PM ? 3 : 2;

    const minAvailDate = getMinDeliveryDate(); // today + (>=18 ? 4 : 3) days
    minAvailDate.setHours(0, 0, 0, 0);

    const MONTH_SHORT = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const startMonth = MONTH_SHORT[minAvailDate.getMonth()];
    const startDay = minAvailDate.getDate();
    const startDayOrdinal = getOrdinal(startDay);

    const endMonth = MONTH_SHORT[cutoffDate.getMonth()];
    const endDay = cutoffDate.getDate();
    const endDayOrdinal = getOrdinal(endDay);

    // Format strings: "Oct 11th - Oct 20th" & "Oct 11 – Oct 20"
    const rangeTextLong = `${startMonth} ${startDayOrdinal} - ${endMonth} ${endDayOrdinal}`;
    const rangeTextShort = `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

    const isAvailableNow = minAvailDate <= cutoffDate;

    return {
      gapDays,
      expiryDay,
      cutoffDate,
      minAvailDate,
      rangeTextLong,
      rangeTextShort,
      startDateFormatted: `${startMonth} ${startDay}`,
      isAvailableNow,
    };
  }, [cartPackages, orderContext]);

  // Calculate recurring order dates respecting min date and seasonal cutoff
  const calculatedOrders = useMemo(() => {
    if (scheduleType === "One Time") return [];

    const numWeeks = parseInt(selectedWeeks, 10) || 4;
    const minDate = getMinDeliveryDate(); // Earliest delivery date: today + 3/4 days

    const dayIndices = selectedDays.map((id) => {
      const found = DAYS_OF_WEEK.find((d) => d.id === id);
      return found !== undefined ? found.dayIndex : 1;
    });

    const allDates: Date[] = [];

    dayIndices.forEach((targetDayIndex) => {
      const firstDate = new Date(minDate);
      while (firstDate.getDay() !== targetDayIndex) {
        firstDate.setDate(firstDate.getDate() + 1);
      }

      for (let w = 0; w < numWeeks; w++) {
        const nextDate = new Date(firstDate);
        nextDate.setDate(firstDate.getDate() + w * 7);
        // If seasonal package exists, restrict dates up to cutoffDate
        if (seasonalInfo?.cutoffDate) {
          if (nextDate <= seasonalInfo.cutoffDate) {
            allDates.push(nextDate);
          }
        } else {
          allDates.push(nextDate);
        }
      }
    });

    // Sort chronologically
    allDates.sort((a, b) => a.getTime() - b.getTime());

    const ALL_MONTHS = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return allDates.map((date, idx) => {
      const month = ALL_MONTHS[date.getMonth()];
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      const formatted = `${month} ${day}, ${year}`;
      const label = `${getOrdinal(idx + 1)} Order`;
      return {
        index: idx + 1,
        label,
        dateStr: formatted,
        dateObj: date,
      };
    });
  }, [scheduleType, selectedDays, selectedWeeks, seasonalInfo]);

  const isReady = useMemo(() => {
    if (scheduleType === "One Time") {
      return selectedDate !== null && selectedTimeSlot !== null;
    }
    if (scheduleType === "Once a Week") {
      return (
        selectedDays.length === 1 &&
        selectedWeeks !== null &&
        selectedTimeSlot !== null
      );
    }
    if (scheduleType === "Twice a Week") {
      return (
        selectedDays.length === 2 &&
        selectedWeeks !== null &&
        selectedTimeSlot !== null
      );
    }
    return false;
  }, [
    scheduleType,
    selectedDate,
    selectedDays,
    selectedWeeks,
    selectedTimeSlot,
  ]);

  const handleProceed = () => {
    if (scheduleType === "One Time") {
      if (!selectedDate) {
        Alert.alert("Required", "Please select a delivery date.");
        return;
      }

      const dateValidation = validateDeliveryDate(selectedDate);
      if (!dateValidation.isValid) {
        Alert.alert("Invalid Date", dateValidation.error);
        return;
      }

      if (seasonalInfo?.cutoffDate) {
        const selected = new Date(selectedDate.replace(/\//g, "-"));
        selected.setHours(0, 0, 0, 0);
        const cutoff = new Date(seasonalInfo.cutoffDate);
        cutoff.setHours(23, 59, 59, 999);
        if (selected > cutoff) {
          Alert.alert(
            "Package Expired",
            `Selected package is not available after ${seasonalInfo.rangeTextShort.split("–")[1]?.trim() || "the cutoff date"}.`
          );
          return;
        }
      }

      if (!selectedTimeSlot) {
        Alert.alert("Required", "Please select a time slot.");
        return;
      }
    } else if (scheduleType === "Once a Week") {
      if (selectedDays.length !== 1) {
        Alert.alert("Required", "Please select 1 delivery day for the week.");
        return;
      }
      if (calculatedOrders.length === 0) {
        Alert.alert(
          "No Available Dates",
          "There are no available delivery dates for the selected package and schedule."
        );
        return;
      }
      if (!selectedTimeSlot) {
        Alert.alert("Required", "Please select a time slot.");
        return;
      }
    } else if (scheduleType === "Twice a Week") {
      if (selectedDays.length !== 2) {
        Alert.alert("Required", "Please select 2 delivery days for the week.");
        return;
      }
      if (calculatedOrders.length === 0) {
        Alert.alert(
          "No Available Dates",
          "There are no available delivery dates for the selected package and schedule."
        );
        return;
      }
      if (!selectedTimeSlot) {
        Alert.alert("Required", "Please select a time slot.");
        return;
      }
    }

    const effectiveFirstDate =
      scheduleType === "One Time"
        ? selectedDate?.replace(/\//g, "-")
        : calculatedOrders[0]?.dateStr || "";

    const updatedContext = {
      ...orderContext,
      grandTotal: finalTotal,
      deliveryCharge: deliveryFee,
      checkoutDetails: {
        ...(orderContext?.checkoutDetails || {
          deliveryMethod: (orderContext?.deliveryMethod || "home") as
            | "home"
            | "pickup",
        }),
        scheduleType,
        deliveryDate: effectiveFirstDate,
        recurringDays: selectedDays,
        validityWeeks: selectedWeeks,
        timeSlot: selectedTimeSlot || undefined,
        calculatedOrders: calculatedOrders.map((o) => ({
          index: o.index,
          label: o.label,
          date: o.dateStr,
        })),
      },
    };

    navigation.navigate("PaymentMethod", {
      total: finalTotal,
      orderContext: updatedContext,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <CustomHeader
        title="Schedule the Order"
        showBackButton
        navigation={navigation}
      />

      {/* ─── CONTENT ─────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 5 }}>
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
              <FontAwesome5 name="bars" size={16} color="#FFFFFF" solid />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#64748B" }}>
                Schedule Type
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#000000",
                  marginTop: 2,
                }}
              >
                {scheduleType}
              </Text>
            </View>

            <Ionicons name="chevron-down" size={18} color="#111111" />
          </TouchableOpacity>

          {/* HR Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "#E1E7EE",
              marginVertical: 14,
            }}
          />

          {/* ─────────────────────────────────────────────────────────────────
                    ONE TIME ORDER FLOW
                ─────────────────────────────────────────────────────────────────── */}
          {scheduleType === "One Time" && (
            <>
              {/* Seasonal Package Info Banner */}
              {seasonalInfo && (
                <View
                  style={{
                    backgroundColor: "#FFF5E9",
                    borderWidth: 1,
                    borderColor: "#FFD8A8",
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#1E293B",
                      lineHeight: 19,
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>Note : </Text>
                    A {seasonalInfo.gapDays}-day gap is required. Packages
                    expiring on the {seasonalInfo.expiryDay}th can be ordered
                    between the {seasonalInfo.rangeTextLong}.
                  </Text>

                  {seasonalInfo.isAvailableNow ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#EA580C",
                          marginRight: 8,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#1E293B",
                        }}
                      >
                        Available schedule dates:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {seasonalInfo.rangeTextShort}
                        </Text>
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#DC2626",
                        fontWeight: "600",
                        marginTop: 8,
                      }}
                    >
                      Scheduling available from {seasonalInfo.startDateFormatted}{" "}
                      onward.
                    </Text>
                  )}
                </View>
              )}

              {/* Schedule Date */}
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
                  <FontAwesome5
                    name="calendar"
                    size={18}
                    color="#FFFFFF"
                    solid
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Schedule Date
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selectedDate ? "600" : "400",
                      color: selectedDate ? "#000000" : "#9CA3AF",
                      marginTop: 2,
                    }}
                  >
                    {selectedDate || "YYYY/MM/DD"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Schedule Time Slot */}
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
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Schedule Time Slot
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selectedTimeSlot ? "600" : "400",
                      color: selectedTimeSlot ? "#000000" : "#9CA3AF",
                      marginTop: 2,
                    }}
                  >
                    {selectedTimeSlot || "Select Time Slot"}
                  </Text>
                </View>

                <Ionicons name="chevron-down" size={18} color="#111111" />
              </TouchableOpacity>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────────
                    ONCE A WEEK / TWICE A WEEK RECURRING FLOW
                ─────────────────────────────────────────────────────────────────── */}
          {scheduleType !== "One Time" && (
            <>
              {/* Day Selector Heading */}
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#111111",
                  marginBottom: 14,
                }}
              >
                {scheduleType === "Once a Week"
                  ? "Select a day"
                  : "Select 2 days"}
              </Text>

              {/* Days Grid */}
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                {/* Row 1: Mo, Tu, We, Th */}
                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
                >
                  {DAYS_OF_WEEK.slice(0, 4).map((day) => {
                    const isSelected = selectedDays.includes(day.id);
                    return (
                      <TouchableOpacity
                        key={day.id}
                        activeOpacity={0.8}
                        onPress={() => handleDayToggle(day.id)}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 10,
                          backgroundColor: isSelected ? "#000000" : "#FFFFFF",
                          borderWidth: 1,
                          borderColor: isSelected ? "#000000" : "#BAC2C7",
                          justifyContent: "center",
                          alignItems: "center",
                          shadowColor: "#000",
                          shadowOpacity: isSelected ? 0.2 : 0.04,
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 2,
                          elevation: isSelected ? 3 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isSelected ? "700" : "500",
                            color: isSelected ? "#FFFFFF" : "#64748B",
                          }}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Row 2: Fr, Sa, Su */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {DAYS_OF_WEEK.slice(4, 7).map((day) => {
                    const isSelected = selectedDays.includes(day.id);
                    return (
                      <TouchableOpacity
                        key={day.id}
                        activeOpacity={0.8}
                        onPress={() => handleDayToggle(day.id)}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 10,
                          backgroundColor: isSelected ? "#000000" : "#FFFFFF",
                          borderWidth: 1,
                          borderColor: isSelected ? "#000000" : "#BAC2C7",
                          justifyContent: "center",
                          alignItems: "center",
                          shadowColor: "#000",
                          shadowOpacity: isSelected ? 0.2 : 0.04,
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 2,
                          elevation: isSelected ? 3 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isSelected ? "700" : "500",
                            color: isSelected ? "#FFFFFF" : "#64748B",
                          }}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Validity Period Label */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#111111",
                  marginBottom: 10,
                  marginLeft: 4,
                }}
              >
                Select Validity Period
              </Text>

              {/* Validity Period Dropdown */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setWeeksModalVisible(true)}
                style={{
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: "#BAC2C7",
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  marginBottom: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Select Weeks
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#000000",
                      marginTop: 2,
                    }}
                  >
                    {selectedWeeks}
                  </Text>
                </View>

                <Ionicons name="chevron-down" size={18} color="#111111" />
              </TouchableOpacity>

              {/* Schedule Time Slot */}
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
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Schedule Time Slot
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selectedTimeSlot ? "600" : "400",
                      color: selectedTimeSlot ? "#000000" : "#9CA3AF",
                      marginTop: 2,
                    }}
                  >
                    {selectedTimeSlot || "Select From Here"}
                  </Text>
                </View>

                <Ionicons name="chevron-down" size={18} color="#111111" />
              </TouchableOpacity>

              {/* View My Orders Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewOrdersModalVisible(true)}
                style={{
                  width: 170,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#000000",
                  alignSelf: "center",
                  justifyContent: "center",
                  alignItems: "center",
                  marginVertical: 14,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  View My Orders
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ─── BOTTOM SUMMARY & BUTTON (docked to bottom when content is short, scrolls naturally when content is long) ──────────────────────────────── */}
        <OrderSummary
          packageTotal={orderContext?.packageTotal || 0}
          productTotal={orderContext?.productTotal || 0}
          discount={orderContext?.discount || 0}
          discountLabel="Received Discount"
          deliveryFee={isDelivery ? deliveryFee : undefined}
          grandTotal={finalTotal}
          buttonText="Proceed to Payment"
          disabled={!isReady}
          onCheckout={handleProceed}
        />
      </ScrollView>

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
            const newType = selectedValues[0] as
              | "One Time"
              | "Once a Week"
              | "Twice a Week";
            setScheduleType(newType);
            if (newType === "Once a Week" && selectedDays.length !== 1) {
              setSelectedDays(["Tu"]);
            } else if (
              newType === "Twice a Week" &&
              selectedDays.length !== 2
            ) {
              setSelectedDays(["Tu", "Sa"]);
            }
          }
        }}
      />

      {/* ─── POPUP: SCHEDULE DATE (Custom Calendar with Web Validation) ── */}
      <CustomCalendarModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        selectedDate={selectedDate}
        maxDate={seasonalInfo?.cutoffDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
        }}
      />

      {/* ─── POPUP: VALIDITY PERIOD (WEEKS) ───────────────────────────── */}
      <GlobalSearchModal
        visible={weeksModalVisible}
        onClose={() => setWeeksModalVisible(false)}
        title="Select Validity Period"
        searchPlaceholder="Search weeks..."
        data={weekOptions}
        selectedItems={[selectedWeeks]}
        onSelect={(selectedValues) => {
          if (selectedValues.length > 0) {
            setSelectedWeeks(selectedValues[0]);
          }
        }}
      />

      {/* ─── POPUP: SCHEDULE TIME SLOT ────────────────────────────────── */}
      <GlobalSearchModal
        visible={slotModalVisible}
        onClose={() => setSlotModalVisible(false)}
        title="Select Time Slot"
        data={timeSlotOptions.map((slot) => ({
          label: slot,
          value: slot,
        }))}
        selectedItems={selectedTimeSlot ? [selectedTimeSlot] : []}
        showSearch={false}
        onSelect={(selectedValues) => {
          if (selectedValues.length > 0) {
            setSelectedTimeSlot(selectedValues[0]);
          }
        }}
      />

      {/* ─── POPUP: VIEW MY ORDERS (CALCULATED DATES MODAL) ─────────────── */}
      <Modal
        visible={viewOrdersModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setViewOrdersModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: "92%",
              maxHeight: Dimensions.get("window").height * 0.72,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            {/* Header matching Global popup modal style */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: "#111111",
                }}
              >
                Total Orders ({String(calculatedOrders.length).padStart(2, "0")}
                )
              </Text>

              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setViewOrdersModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Order Dates List */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{
                maxHeight: Dimensions.get("window").height * 0.58,
              }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 20,
              }}
            >
              {/* Seasonal Package Info Banner in Recurring Modal */}
              {seasonalInfo && (
                <View
                  style={{
                    backgroundColor: "#FFF5E9",
                    borderWidth: 1,
                    borderColor: "#FFD8A8",
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#1E293B",
                      lineHeight: 19,
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>Note : </Text>
                    A {seasonalInfo.gapDays}-day gap is required. Packages
                    expiring on the {seasonalInfo.expiryDay}th can be ordered
                    between the {seasonalInfo.rangeTextLong}.
                  </Text>

                  {seasonalInfo.isAvailableNow ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#EA580C",
                          marginRight: 8,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#1E293B",
                        }}
                      >
                        Available schedule dates:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {seasonalInfo.rangeTextShort}
                        </Text>
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#FF9114",
                        fontWeight: "600",
                        marginTop: 8,
                      }}
                    >
                      Scheduling available from {seasonalInfo.startDateFormatted}{" "}
                      onward.
                    </Text>
                  )}
                </View>
              )}
              {calculatedOrders.map((order) => (
                <View key={order.index} style={{ marginBottom: 12 }}>
                  {/* Order row with increased font size and px */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 6,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "500",
                        color: "#64748B",
                        width: 95,
                      }}
                    >
                      {order.label}
                    </Text>

                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#111111",
                        flex: 1,
                      }}
                    >
                      : {order.dateStr}
                    </Text>
                  </View>

                  {/* Badge for 1st order - full width box */}
                  {order.index === 1 && (
                    <View
                      style={{
                        width: "100%",
                        alignSelf: "stretch",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#818CF8",
                        backgroundColor: "#F5F6FF",
                        alignItems: "center",
                        justifyContent: "center",
                        marginVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "#4F46E5",
                          fontSize: 13,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Only need to pay for this 1st order today.
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScheduleOrderScreen;
