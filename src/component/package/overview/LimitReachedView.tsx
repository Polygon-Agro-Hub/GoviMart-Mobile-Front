import React from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LimitReachedViewProps {
  invoiceNo?: string;
  effectiveOrderId: string | number;
  scheduleDateStr: string;
  nextScheduleDateStr: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSendReminderTomorrow: () => void;
  onCancelOrder: () => void;
}

export const LimitReachedView: React.FC<LimitReachedViewProps> = ({
  invoiceNo,
  effectiveOrderId,
  scheduleDateStr,
  nextScheduleDateStr,
  isRefreshing,
  onRefresh,
  onSendReminderTomorrow,
  onCancelOrder,
}) => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    className="flex-1"
    contentContainerStyle={{ paddingBottom: 32 }}
    refreshControl={
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        colors={["#92D01B"]}
        tintColor="#92D01B"
      />
    }
  >
    <View className="items-center mt-2 mb-4">
      <Text className="text-[17px] font-bold text-black">
        Order : #{invoiceNo || effectiveOrderId}
      </Text>
      <Text className="text-[14px] text-[#494A65] mt-1">
        Schedule to : {scheduleDateStr}
      </Text>
    </View>

    <View className="h-[1px] bg-[#ECECEC] mb-6" />

    {/* Green Notice Box */}
    <View className="mx-5 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-5 flex-row items-start">
      <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
        <Ionicons name="time" size={14} color="#FFF" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-black leading-5">
          Sorry, We’re not accepting any orders for Today!
        </Text>
        <Text className="text-[13px] text-[#475467] mt-2 leading-5">
          We accept limited orders for packing, Please try again tomorrow when you
          receive the notification.
        </Text>
      </View>
    </View>

    {/* Section Header */}
    <Text className="text-center text-[18px] font-bold text-black mt-8 mb-2">
      What would you like to do?
    </Text>

    {/* Option 1: Send me the reminder tomorrow */}
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSendReminderTomorrow}
      className="mx-5 mt-4 bg-[#FAF5FF] border border-[#D6BBFB] rounded-3xl p-5 flex-row items-center justify-between"
    >
      <View className="w-14 h-14 rounded-full bg-[#EDE4FF] items-center justify-center mr-4">
        <Text style={{ fontSize: 28 }}>🔔</Text>
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[15px] font-bold text-black">
          Send me the reminder tomorrow
        </Text>
        <Text className="text-[12px] text-[#475467] mt-1 leading-4">
          Your scheduled order date will be extended to{" "}
          <Text className="font-bold text-black">{nextScheduleDateStr}</Text>.
          {"\n"}If that works for you, we’ll remind you again tomorrow at 8:00
          AM.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#000" />
    </TouchableOpacity>

    {/* Divider: or */}
    <View className="flex-row items-center justify-center my-6 mx-10">
      <View className="flex-1 h-[1px] bg-[#D0D5DD]" />
      <Text className="mx-4 text-[14px] text-[#475467] font-medium">or</Text>
      <View className="flex-1 h-[1px] bg-[#D0D5DD]" />
    </View>

    {/* Option 2: Cancel My Order */}
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onCancelOrder}
      className="mx-5 bg-[#FEF3F2] border border-[#FDA29B] rounded-3xl p-5 flex-row items-center justify-between"
    >
      <View className="w-14 h-14 rounded-full bg-[#FEE4E2] items-center justify-center mr-4">
        <Ionicons name="close-circle" size={36} color="#F04438" />
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[15px] font-bold text-black">Cancel My Order</Text>
        <Text className="text-[13px] text-[#475467] mt-1">
          I no longer needed this order.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#000" />
    </TouchableOpacity>
  </ScrollView>
);

