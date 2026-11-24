import React from "react";
import { View } from "react-native";

export const ProgressDots: React.FC<{ total: number; current: number }> = ({
  total,
  current,
}) => (
  <View className="flex-row mx-5 mt-6" style={{ gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className="flex-1 rounded-full"
        style={{
          height: 4,
          backgroundColor: i <= current ? "#000" : "#E4E4E4",
        }}
      />
    ))}
  </View>
);

export default ProgressDots;
