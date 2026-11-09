import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../../../utils/reviewPackageUtils";

interface FinalCancelViewProps {
  invoiceNo?: string;
  effectiveOrderId: string | number;
  scheduleDateStr: string;
  isTimeRanOut: boolean;
  isLimitReached: boolean;
  availableSlots: number;
  refundableAmount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const FinalCancelView: React.FC<FinalCancelViewProps> = ({
  invoiceNo,
  effectiveOrderId,
  scheduleDateStr,
  isTimeRanOut,
  isLimitReached,
  availableSlots,
  refundableAmount,
  isRefreshing,
  onRefresh,
}) => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    className="flex-1"
    contentContainerStyle={{ paddingBottom: 32 }}
    refreshControl={
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        colors={["#000000"]}
        tintColor="#000000"
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

    {/* Top Notice Banner: Green (if slot full) or Red (if time expired) */}
    {!isTimeRanOut && (isLimitReached || availableSlots <= 0) ? (
      <View className="mx-5 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-5 flex-row items-start">
        <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
          <Ionicons name="time" size={14} color="#FFF" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-black leading-5">
            Sorry, We’re not accepting any orders for Today!
          </Text>
          <Text className="text-[13px] text-[#475467] mt-2 leading-5">
            You have already used all 3 in-app reminders. This order will be
            automatically canceled.
          </Text>
        </View>
      </View>
    ) : (
      <View className="mx-5 bg-[#FEF3F2] border border-[#FDA29B] rounded-3xl p-5 flex-row items-start">
        <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
          <Ionicons name="time" size={14} color="#FFF" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-black leading-5">
            Time Ran Out!
          </Text>
          <Text className="text-[13px] text-[#475467] mt-2 leading-5">
            You have already used all 3 in-app reminders. This order will be
            automatically canceled.
          </Text>
        </View>
      </View>
    )}

    {/* Credit Refund Card (card paid OR credit balance paid) */}
    {refundableAmount > 0 && (
      <View className="mx-5 mt-6 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-6 items-center">
        <View className="w-10 h-10 rounded-full bg-[#16B364] items-center justify-center mb-3">
          <Ionicons name="wallet" size={20} color="#FFFFFF" />
        </View>
        <Text className="text-[15px] font-bold text-black text-center">
          Amount will be credited to your credit balance.
        </Text>
        <Text className="text-[13px] text-[#475467] text-center mt-2 leading-5">
          After canceling, the full amount of{" "}
          <Text className="font-bold text-black">
            Rs. {formatPrice(refundableAmount)}
          </Text>{" "}
          will be added to your credit balance. You can use it for your next
          purchase.
        </Text>
      </View>
    )}
  </ScrollView>
);

