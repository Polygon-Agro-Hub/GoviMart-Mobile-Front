import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TimeRanOutBannerProps {
    nextScheduleDateStr: string;
    onSendReminderTomorrow: () => void;
    onCancelOrder: () => void;
}

export const TimeRanOutBanner: React.FC<TimeRanOutBannerProps> = ({
    nextScheduleDateStr,
    onSendReminderTomorrow,
    onCancelOrder,
}) => {
    return (
        <View className="mx-5 mt-2">
            {/* Red Alert Banner: Time Ran Out! */}
            <View
                className="border rounded-3xl p-4"
                style={{
                    backgroundColor: "#FFF5F5",
                    borderColor: "#FFA2A2",
                }}
            >
                <View className="flex-row items-center">
                    <Ionicons name="time" size={20} color="#000000" />
                    <Text className="ml-2 text-[15px] font-bold text-black">
                        Time Ran Out!
                    </Text>
                </View>
                <Text className="text-[13px] text-[#4B5563] mt-2 leading-5">
                    Please try next day, you’ll get another notification by tomorrow 8:00 AM.
                </Text>
            </View>

            {/* Section Header */}
            <Text className="text-[17px] font-bold text-black text-center mt-7 mb-4">
                What would you like to do?
            </Text>

            {/* Option 1: Send me the reminder tomorrow */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSendReminderTomorrow}
                className="border rounded-3xl p-4 flex-row items-center"
                style={{
                    backgroundColor: "#FAF8FF",
                    borderColor: "#BDB4FE",
                }}
            >
                <View className="w-12 h-12 rounded-full bg-[#ECE7FE] items-center justify-center">
                    <Ionicons name="notifications" size={24} color="#EAAA08" />
                </View>

                <View className="flex-1 ml-3 pr-2">
                    <Text className="text-[15px] font-bold text-black">
                        Send me the reminder tomorrow
                    </Text>
                    <Text className="text-[12px] text-[#6B6B6B] mt-1 leading-4">
                        Your scheduled order date will be extended to{" "}
                        <Text className="font-semibold text-black">
                            {nextScheduleDateStr}
                        </Text>
                        . If that works for you, we’ll remind you again tomorrow at 8:00 AM.
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Divider with 'or' */}
            <View className="flex-row items-center my-4 mx-6">
                <View className="flex-1 h-[1px] bg-[#E0E0E0]" />
                <Text className="mx-3 text-[14px] text-[#6B6B6B]">or</Text>
                <View className="flex-1 h-[1px] bg-[#E0E0E0]" />
            </View>

            {/* Option 2: Cancel My Order */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancelOrder}
                className="border rounded-3xl p-4 flex-row items-center"
                style={{
                    backgroundColor: "#FFF5F5",
                    borderColor: "#FFA2A2",
                }}
            >
                <View className="w-12 h-12 rounded-full bg-[#F04438] items-center justify-center">
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </View>

                <View className="flex-1 ml-3 pr-2">
                    <Text className="text-[15px] font-bold text-black">
                        Cancel My Order
                    </Text>
                    <Text className="text-[12px] text-[#6B6B6B] mt-0.5">
                        I no longer needed this order.
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#000000" />
            </TouchableOpacity>
        </View>
    );
};
