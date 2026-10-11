import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

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

const ReadyToConfirmBanner: React.FC<ReadyToConfirmBannerProps> = ({
  order,
  onPress,
}) => {
  const displayInvoice = order.invoiceNo
    ? String(order.invoiceNo).replace(/^#/, "")
    : String(order.orderId);

  return (
    <View
      style={{
        backgroundColor: "#FFF8F0",
        borderRadius: 24,
        padding: 16,
        marginHorizontal: 24,
        marginBottom: 16,
      }}
    >
      {/* Top Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left Pill Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#FF8A00",
              marginRight: 8,
            }}
          />
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: "700",
              color: "#0F172A",
            }}
          >
            Ready To Confirm • #{displayInvoice}
          </Text>
        </View>

        {/* Right Time Ago */}
        {Boolean(order.timeAgo) && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#1E293B",
              marginLeft: 8,
            }}
          >
            {order.timeAgo}
          </Text>
        )}
      </View>

      {/* Bottom Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{
          backgroundColor: "#FF8A00",
          borderRadius: 28,
          height: 50,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 14,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#000000",
          }}
        >
          View My Order
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ReadyToConfirmBanner;
