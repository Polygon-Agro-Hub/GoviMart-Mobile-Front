import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  deviceTime: Date;
  isChecking: boolean;
  onAdjustDate: () => void;
  onCheckAgain: () => void;
}

const formatDate = (date: Date): string => {
  try {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return date.toLocaleString();
  }
};

const DateInaccurateScreen: React.FC<Props> = ({
  deviceTime,
  isChecking,
  onAdjustDate,
  onCheckAgain,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
          paddingLeft: Math.max(insets.left, 24),
          paddingRight: Math.max(insets.right, 24),
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Main Content Area */}
        <View className="items-center justify-center pt-8">
          {/* WhatsApp-style Clock Alert Badge */}
          <View className="w-24 h-24 rounded-full bg-[#FFF5E9] items-center justify-center mb-6">
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={56}
              color="#FF9114"
            />
          </View>

          {/* Heading */}
          <Text className="text-2xl font-bold text-black text-center mb-2">
            Your phone date is inaccurate!
          </Text>

          {/* Subheading */}
          <Text className="text-base font-semibold text-[#5A5859] text-center mb-8">
            Adjust your clock and try again.
          </Text>

          {/* Device Date Card */}
          <View className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl p-5 mb-4">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="calendar-alt" size={16} color="#FF9114" />
              <Text className="text-xs font-bold text-[#5A5859] uppercase tracking-wider ml-2">
                Current Phone Date & Time
              </Text>
            </View>
            <Text className="text-base font-bold text-black mb-3">
              {formatDate(deviceTime)}
            </Text>
            <Text className="text-xs text-[#6C757D] leading-relaxed">
              Your device's date or time does not match real-world time. Please
              update your device's date and time (or enable "Set Automatically")
              in your phone Settings to continue using Polygon.
            </Text>
          </View>
        </View>

        {/* Action Buttons Area */}
        <View className="w-full pt-4">
          {/* Primary: Adjust Date (Opens OS Date & Time Settings) */}
          <TouchableOpacity
            onPress={onAdjustDate}
            activeOpacity={0.8}
            className="bg-black rounded-full items-center justify-center h-[52px] w-full mb-3"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text className="text-white text-base font-bold">
              Adjust Date
            </Text>
          </TouchableOpacity>

          {/* Secondary: Check Again */}
          <TouchableOpacity
            onPress={onCheckAgain}
            disabled={isChecking}
            activeOpacity={0.7}
            className="border border-gray-300 rounded-full items-center justify-center h-[50px] w-full flex-row"
          >
            {isChecking ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#FF9114" />
                <Text className="text-sm font-semibold text-[#FF9114] ml-2">
                  Checking time...
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-[#5A5859]">
                Check Again
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default DateInaccurateScreen;
