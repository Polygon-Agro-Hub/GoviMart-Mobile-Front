import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
} from "react-native";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { CountdownTimer } from "./CountDownTimer";

export const HurryBanner: React.FC<{
    ordersLeft: number;
    date: string;
    showCancelLink?: boolean;
    onCancelOrder?: () => void;
}> = ({ ordersLeft, date, showCancelLink, onCancelOrder }) => (
    <View className="mx-5 border border-[#EEEEEE] rounded-2xl p-4 flex-row justify-between items-start">
        <View className="flex-1 pr-3">
            <View className="flex-row items-center">
                <Octicons name="clock-fill" size={16} color="#000" />
                <Text className="ml-1.5 text-[15px] font-semibold text-black">
                    Hurry up please,
                </Text>
            </View>
            <Text className="text-[13px] text-[#6B6B6B] mt-1 leading-5">
                We are accepting {ordersLeft} more orders for{" "}
                <Text className="font-bold text-black">{date}</Text>.
            </Text>

            {showCancelLink && (
                <TouchableOpacity
                    onPress={onCancelOrder}
                    className="flex-row items-center mt-2"
                >
                    <View className="w-4 h-4 rounded-sm bg-[#F04438] items-center justify-center mr-1.5">
                        <Ionicons name="close" size={11} color="#fff" />
                    </View>
                    <Text className="text-[13px] text-[#F04438] underline font-medium">
                        Cancel Order
                    </Text>
                </TouchableOpacity>
            )}
        </View>

        <CountdownTimer startHour={8} endHour={18} endMinute={0} />
    </View>
);
