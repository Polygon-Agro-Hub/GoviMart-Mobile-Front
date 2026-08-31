import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

const ReviewPackage: React.FC<Props> = ({ navigation }) => {
    // const { orderId, scheduleDate } = route.params;

    const onSendReminder = async () => {
        // API call to set reminder for tomorrow
        console.log("Reminder scheduled");
    };

    const onCancelOrder = async () => {
        // API call to cancel order
        console.log("Order cancelled");
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <CustomHeader navigation={navigation} showBackButton title="Review Your Package"/>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Order Info */}
                <View className="items-center mt-2">
                    <Text className="text-[20px] font-bold text-black">
                        Order : 260830001
                    </Text>
                    <Text className="text-[15px] text-[#8A8A8A] mt-1">
                        Schedule to : 14<Text className="text-[10px]">th</Text> August
                    </Text>
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-[#ECECEC] mt-5" />

                {/* Info Banner */}
                <View className="mx-5 mt-5 bg-[#EDFBEA] border border-[#CFF0C6] rounded-2xl p-4">
                    <View className="flex-row items-start">
                        <View className="w-6 h-6 rounded-full bg-black items-center justify-center mt-[2px]">
                            <Ionicons name="time-outline" size={14} color="#fff" />
                        </View>
                        <Text className="flex-1 ml-3 text-[15px] font-semibold text-black leading-5">
                            Sorry, We're not accepting any orders for Today!
                        </Text>
                    </View>

                    <Text className="text-[13px] text-[#6B6B6B] mt-2 leading-5">
                        We accept limited orders for packing, Please try again
                        tomorrow when you receive the notification.
                    </Text>
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-[#ECECEC] mt-6" />

                {/* Prompt */}
                <Text className="text-center text-[17px] font-semibold text-black mt-6">
                    What would you like to do?
                </Text>

                {/* Send Reminder Option */}
                <TouchableOpacity
                    onPress={onSendReminder}
                    activeOpacity={0.8}
                    className="mx-5 mt-5 bg-[#F1EEFF] border border-[#D9D2FF] rounded-2xl p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-full bg-[#FFE9C2] items-center justify-center">
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                    </View>

                    <View className="flex-1 ml-3">
                        <Text className="text-[15px] font-semibold text-black">
                            Send me the reminder tomorrow
                        </Text>
                        <Text className="text-[13px] text-[#5B5B5B] mt-1 leading-5 underline">
                            Your scheduled order date will be extended to 15
                            <Text className="text-[9px]">th</Text> August. If that
                            works for you, we'll remind you again tomorrow at 8:00
                            A.M.
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#000" />
                </TouchableOpacity>

                {/* Or Divider */}
                <View className="flex-row items-center mt-5 mx-14">
                    <View className="flex-1 h-[1px] bg-[#DADADA]" />
                    <Text className="mx-3 text-[13px] text-[#8A8A8A]">or</Text>
                    <View className="flex-1 h-[1px] bg-[#DADADA]" />
                </View>

                {/* Cancel Option */}
                <TouchableOpacity
                    onPress={onCancelOrder}
                    activeOpacity={0.8}
                    className="mx-5 mt-5 mb-8 bg-[#FDEDED] border border-[#F7CFCF] rounded-2xl p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-full bg-[#F04438] items-center justify-center">
                        <Ionicons name="close" size={22} color="#fff" />
                    </View>

                    <View className="flex-1 ml-3">
                        <Text className="text-[15px] font-semibold text-black">
                            Cancel My Order
                        </Text>
                        <Text className="text-[13px] text-[#5B5B5B] mt-1">
                            I no longer needed this order.
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#000" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ReviewPackage;