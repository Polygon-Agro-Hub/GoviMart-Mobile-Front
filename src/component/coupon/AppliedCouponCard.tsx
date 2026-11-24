import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { getCouponTheme } from "@/constants/coupon.constants";

interface AppliedCouponCardProps {
  code: string;
  type?: string;
  discount: number;
  isFreeDelivery?: boolean;
  deliveryCharge?: number;
  onRemove: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AppliedCouponCard: React.FC<AppliedCouponCardProps> = ({
  code,
  type,
  discount,
  isFreeDelivery,
  deliveryCharge = 0,
  onRemove,
  style,
}) => {
  const theme = getCouponTheme(type);
  const savedAmount = isFreeDelivery ? deliveryCharge : discount;

  const formatAmount = (num: number) => {
    return (parseFloat(String(num)) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View
      style={[
        {
          borderRadius: 34,
          borderWidth: 1.5,
          borderColor: theme.cardBorder || theme.border,
          backgroundColor: theme.background,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 1,
          marginHorizontal: 16,
        },
        style,
      ]}
    >
      {/* Left Colored Circle Badge */}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: theme.primary,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <FontAwesome6 name="ticket" size={20} color="#FFFFFF" />
      </View>

      {/* Center Details */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: "#0F172A",
          }}
          numberOfLines={1}
        >
          {code}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: "#475569",
            marginTop: 3,
          }}
          numberOfLines={1}
        >
          {isFreeDelivery
            ? "You Saved Free Delivery"
            : `You Saved Rs. ${formatAmount(savedAmount)}`}
        </Text>
      </View>

      {/* Right Circular Close Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onRemove}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Ionicons name="close" size={18} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};

export default AppliedCouponCard;
