import React from "react";
import { View, Text } from "react-native";

export const TimeBox: React.FC<{ value: string }> = ({ value }) => (
  <View className="bg-black rounded-md px-3 py-1.5 min-w-[42px] items-center">
    <Text className="text-white text-[16px] font-bold">{value}</Text>
  </View>
);

