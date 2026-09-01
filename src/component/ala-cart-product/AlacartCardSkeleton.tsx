import React from "react";
import {
    View,
    Animated,
} from "react-native";

export const AlacartCardSkeleton: React.FC<{ pulseAnim: Animated.Value }> = ({ pulseAnim }) => (
    <View
        className="flex-1 bg-[#F4F3F3] pt-7 pb-6 px-3 items-center mx-2 relative mb-8"
        style={{
            borderTopLeftRadius: 100,
            borderTopRightRadius: 100,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
        }}
    >
        <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center shadow-sm border border-gray-100"
        >
            <View className="w-12 h-12 rounded-full bg-[#E5E5EA]" />
        </Animated.View>
        <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-20 h-3.5 bg-[#E5E5EA] rounded mt-3"
        />
        <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-12 h-3 bg-[#E5E5EA] rounded mt-2"
        />
        <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-16 h-3.5 bg-[#E5E5EA] rounded mt-2"
        />
        <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-10 h-10 rounded-full bg-[#E5E5EA] absolute -bottom-5"
        />
    </View>
);