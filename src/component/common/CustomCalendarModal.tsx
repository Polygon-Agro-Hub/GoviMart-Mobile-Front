import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CustomCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
  showPreparationNotice?: boolean;
  buyerType?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const CUTOFF_HOUR = 18; // 6:00 PM

export const isWholesaleBuyer = (buyerType?: string): boolean =>
  !!buyerType && buyerType.toLowerCase().includes("wholesale");

/**
 * Required gap in days from today:
 *  Wholesale: 2 days (before 6 PM), 3 days (after 6 PM)
 *  Retail:    3 days (before 6 PM), 4 days (after 6 PM)
 *
 * Example (today = Nov 12):
 *  Wholesale before 6 PM -> Nov 14 | after 6 PM -> Nov 15
 *  Retail    before 6 PM -> Nov 15 | after 6 PM -> Nov 16
 */
export const getRequiredDays = (buyerType?: string, now: Date = new Date()): number => {
  const isAfterCutoff = now.getHours() >= CUTOFF_HOUR;
  const baseDays = isWholesaleBuyer(buyerType) ? 2 : 3;
  return isAfterCutoff ? baseDays + 1 : baseDays;
};

export const getMinDeliveryDate = (buyerType?: string): Date => {
  const now = new Date();
  const extraDays = getRequiredDays(buyerType, now);

  const minDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + extraDays
  );
  minDate.setHours(0, 0, 0, 0);
  return minDate;
};

// Parses "YYYY/MM/DD" or "YYYY-MM-DD" as a LOCAL date (avoids UTC day-shift bugs)
const parseLocalDate = (dateStr: string): Date | null => {
  const match = dateStr.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(dateStr);
  if (isNaN(fallback.getTime())) return null;
  fallback.setHours(0, 0, 0, 0);
  return fallback;
};

export const validateDeliveryDate = (
  dateStr?: string | null,
  minDeliveryDate?: Date,
  buyerType?: string
): { isValid: boolean; error: string } => {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: false, error: "Delivery date is required." };
  }

  const selected = parseLocalDate(dateStr);
  if (!selected) {
    return { isValid: false, error: "Invalid delivery date." };
  }

  const minDate = minDeliveryDate
    ? new Date(minDeliveryDate)
    : getMinDeliveryDate(buyerType);
  minDate.setHours(0, 0, 0, 0);

  if (selected < minDate) {
    if (minDeliveryDate) {
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const minFormatted = `${monthNames[minDate.getMonth()]} ${minDate.getDate()}, ${minDate.getFullYear()}`;
      return {
        isValid: false,
        error: `Earliest delivery date available is ${minFormatted}.`,
      };
    }

    const now = new Date();
    const isAfterCutoff = now.getHours() >= CUTOFF_HOUR;
    const requiredDays = getRequiredDays(buyerType, now);

    return {
      isValid: false,
      error: isAfterCutoff
        ? `Please select a date at least ${requiredDays} days from today after 6:00 PM cutoff.`
        : `Please select a date at least ${requiredDays} days from today.`,
    };
  }

  return { isValid: true, error: "" };
};

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
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

const CustomCalendarModal: React.FC<CustomCalendarModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  minDate: customMinDate,
  maxDate: customMaxDate,
  title,
  showPreparationNotice,
  buyerType,
}) => {
  const wholesale = isWholesaleBuyer(buyerType);

  // Recomputed every time the modal opens so the 6 PM cutoff is always current
  const minDate = useMemo(
    () => customMinDate || getMinDeliveryDate(buyerType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customMinDate, buyerType, visible]
  );

  const maxDate = useMemo(() => {
    if (customMaxDate) return customMaxDate;
    const max = new Date();
    max.setDate(max.getDate() + 60); // 60 days in advance
    max.setHours(23, 59, 59, 999);
    return max;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customMaxDate, visible]);

  const shouldShowNotice =
    showPreparationNotice !== undefined ? showPreparationNotice : !customMinDate;

  const noticeText = wholesale
    ? "Orders require 2 days preparation (3 days after 6:00 PM cutoff)."
    : "Orders require 3 days preparation (4 days after 6:00 PM cutoff).";

  const modalTitle = title || "Select Schedule Date";

  // Default display date (selectedDate -> today if valid -> fallback)
  const getDefaultDate = useCallback(() => {
    if (selectedDate) {
      const parsed = parseLocalDate(selectedDate);
      if (parsed) return parsed;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= minDate && today <= maxDate) {
      return today;
    }
    if (today > maxDate) return maxDate;
    return minDate;
  }, [selectedDate, minDate, maxDate]);

  const initialDate = useMemo(() => getDefaultDate(), [getDefaultDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    selectedDate ? parseLocalDate(selectedDate) : null
  );

  useEffect(() => {
    if (visible) {
      if (selectedDate) {
        const d = parseLocalDate(selectedDate);
        if (d) {
          setInternalSelectedDate(d);
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
          return;
        }
      }
      setInternalSelectedDate(null);
      const def = getDefaultDate();
      setCurrentYear(def.getFullYear());
      setCurrentMonth(def.getMonth());
    }
  }, [visible, selectedDate, getDefaultDate]);

  const canGoPrev = useMemo(() => {
    const prevMonthDate = new Date(currentYear, currentMonth, 0);
    return prevMonthDate >= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  }, [currentYear, currentMonth, minDate]);

  const canGoNext = useMemo(() => {
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    return nextMonthDate <= maxDate;
  }, [currentYear, currentMonth, maxDate]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

    const days: Array<{
      day: number;
      date: Date;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        day: 0,
        date: new Date(0),
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: false,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);

      const isDisabled = date < minDate || date > maxDate;
      const isSelected =
        internalSelectedDate !== null &&
        internalSelectedDate.getFullYear() === date.getFullYear() &&
        internalSelectedDate.getMonth() === date.getMonth() &&
        internalSelectedDate.getDate() === date.getDate();

      const isToday =
        today.getFullYear() === date.getFullYear() &&
        today.getMonth() === date.getMonth() &&
        today.getDate() === date.getDate();

      days.push({
        day,
        date,
        isCurrentMonth: true,
        isDisabled,
        isSelected,
        isToday,
      });
    }

    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remainingDays; i++) {
      days.push({
        day: 0,
        date: new Date(0),
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth, minDate, maxDate, internalSelectedDate]);

  const handleDayPress = (dayItem: { date: Date; isDisabled: boolean }) => {
    if (dayItem.isDisabled) return;
    setInternalSelectedDate(dayItem.date);
  };

  const handleConfirm = () => {
    if (!internalSelectedDate) return;
    const yyyy = internalSelectedDate.getFullYear();
    const mm = String(internalSelectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(internalSelectedDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}/${mm}/${dd}`;
    onSelectDate(formatted);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
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
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            width: "100%",
            maxWidth: 380,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>
              {modalTitle}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#F3F4F6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Preparation Notice */}
          {shouldShowNotice && (
            <View
              style={{
                backgroundColor: "#FFF7ED",
                borderColor: "#FFEDD5",
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 7,
                paddingHorizontal: 10,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="information-circle"
                size={17}
                color="#EA580C"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: "#C2410C",
                  flex: 1,
                  lineHeight: 16,
                  fontWeight: "500",
                }}
              >
                {noticeText}
              </Text>
            </View>
          )}

          {/* Month & Year Navigator */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: canGoPrev ? "#F3F4F6" : "#FAFAFA",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canGoPrev ? "#111827" : "#D1D5DB"}
              />
            </TouchableOpacity>

            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {`${MONTH_NAMES[currentMonth]} ${currentYear}`}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={!canGoNext}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: canGoNext ? "#F3F4F6" : "#FAFAFA",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canGoNext ? "#111827" : "#D1D5DB"}
              />
            </TouchableOpacity>
          </View>

          {/* Days of Week Row */}
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {DAYS_OF_WEEK.map((d) => (
              <View
                key={d}
                style={{
                  width: "14.285%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#9CA3AF" }}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {calendarDays.map((item, index) => {
              if (!item.isCurrentMonth) {
                return (
                  <View
                    key={`blank-${index}`}
                    style={{ width: "14.285%", height: 40, marginVertical: 2 }}
                  />
                );
              }

              return (
                <View
                  key={`day-${item.day}`}
                  style={{
                    width: "14.285%",
                    height: 40,
                    marginVertical: 2,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={item.isDisabled ? 1 : 0.7}
                    disabled={item.isDisabled}
                    onPress={() => handleDayPress(item)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: item.isSelected ? "#000000" : "transparent",
                      borderWidth: item.isToday && !item.isSelected ? 1 : 0,
                      borderColor: "#111827",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: item.isSelected ? "700" : "500",
                        color: item.isDisabled
                          ? "#D1D5DB"
                          : item.isSelected
                          ? "#FFFFFF"
                          : "#111827",
                      }}
                    >
                      {String(item.day)}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Confirm Date Button */}
          <TouchableOpacity
            activeOpacity={internalSelectedDate ? 0.85 : 1}
            disabled={!internalSelectedDate}
            onPress={handleConfirm}
            style={{
              height: 48,
              borderRadius: 24,
              backgroundColor: internalSelectedDate ? "#000000" : "#9CA3AF",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 18,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: internalSelectedDate ? 0.15 : 0,
              shadowRadius: 4,
              elevation: internalSelectedDate ? 3 : 0,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
              Confirm Date
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CustomCalendarModal;