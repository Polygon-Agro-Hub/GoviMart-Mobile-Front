import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ReadyToConfirmOrderData {
  orderId: string | number;
  invoiceNo: string;
  timeAgo?: string;
  createdAt?: string;
}

interface ReadyToConfirmBannerProps {
  order: ReadyToConfirmOrderData;
  onPress: () => void;
}

/**
 * Calculates the elapsed time from 8:00 AM of today.
 * Returns e.g. "1s ago", "45s ago", "12m ago", "2h ago".
 */
export const getTimeElapsedFrom8AM = (): string => {
  const now = new Date();
  const today8AM = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    8,
    0,
    0,
    0,
  );
  const diffMs = now.getTime() - today8AM.getTime();

  if (diffMs <= 0) return "1s ago";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
};

/**
 * The Ready To Confirm banner appears between 8:00 AM and 6:00 PM (18:00) only.
 */
export const isWithinConfirmWindow = (): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= 8 && currentHour < 18;
};

const ReadyToConfirmBanner: React.FC<ReadyToConfirmBannerProps> = ({
  order,
  onPress,
}) => {
  const [currentTimeAgo, setCurrentTimeAgo] = useState<string>(() =>
    getTimeElapsedFrom8AM(),
  );

  useEffect(() => {
    setCurrentTimeAgo(getTimeElapsedFrom8AM());
    const interval = setInterval(() => {
      setCurrentTimeAgo(getTimeElapsedFrom8AM());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Appears from 8 AM to 6 PM only
  if (!isWithinConfirmWindow()) {
    return null;
  }

  const displayInvoice = order.invoiceNo
    ? String(order.invoiceNo).replace(/^#/, "")
    : String(order.orderId);

  return (
    <View
      style={{
        backgroundColor: "#1C2430",
        borderRadius: 22,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        marginTop: 6,
        elevation: 3,
      }}
    >
      {/* Top Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        {/* Left: Orange Dot + Title & Order No */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            marginRight: 8,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#FF7A00",
              marginRight: 8,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#FFFFFF",
                letterSpacing: 0.2,
              }}
            >
              Ready To Confirm
            </Text>
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: "500",
                color: "#FFFFFF",
                marginTop: 2,
              }}
            >
              Order : #{displayInvoice}
            </Text>
          </View>
        </View>

        {/* Right: Time Pill Badge (Shows time count from 8 AM) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
            flexShrink: 0,
            alignSelf: "flex-start",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Ionicons
            name="time"
            size={13}
            color="#FF7A00"
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#1E293B",
              includeFontPadding: false,
            }}
          >
            {currentTimeAgo}
          </Text>
        </View>
      </View>

      {/* Middle White Card: Delivery Box + Stepper */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {/* 3D Delivery Box Asset */}
        <Image
          source={require("@/assets/images/home/notification/delivery-box.webp")}
          style={{
            width: 48,
            height: 48,
            marginRight: 12,
          }}
          resizeMode="contain"
        />

        {/* 3-Step Stepper */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          {/* Horizontal Connecting Line */}
          <View
            style={{
              position: "absolute",
              top: 13,
              left: 20,
              right: 20,
              height: 1.5,
              backgroundColor: "#CBD5E1",
              zIndex: 0,
            }}
          />

          {/* Step 1: Ready to Confirm */}
          <View style={{ alignItems: "center", zIndex: 1, width: 62 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#FF7A00",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: "#334155",
                textAlign: "center",
                marginTop: 4,
                lineHeight: 12,
              }}
            >
              Ready to{"\n"}Confirm
            </Text>
          </View>

          {/* Step 2: Processing */}
          <View style={{ alignItems: "center", zIndex: 1, width: 66 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: "#CBD5E1",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="cube" size={13} color="#64748B" />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "500",
                color: "#64748B",
                textAlign: "center",
                marginTop: 4,
                lineHeight: 12,
              }}
            >
              Processing
            </Text>
          </View>

          {/* Step 3: Reached */}
          <View style={{ alignItems: "center", zIndex: 1, width: 60 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: "#CBD5E1",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark" size={14} color="#94A3B8" />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "500",
                color: "#64748B",
                textAlign: "center",
                marginTop: 4,
                lineHeight: 12,
              }}
            >
              Reached
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{
          backgroundColor: "#FF7A00",
          borderRadius: 28,
          height: 52,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#FF7A00",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 5,
          elevation: 2,
        }}
      >
        <Ionicons
          name="bag-handle"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 10 }}
        />
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: "#FFFFFF",
            letterSpacing: 0.2,
          }}
        >
          View My Order
        </Text>
        <Ionicons
          name="arrow-forward"
          size={20}
          color="#FFFFFF"
          style={{ marginLeft: 12 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default ReadyToConfirmBanner;
