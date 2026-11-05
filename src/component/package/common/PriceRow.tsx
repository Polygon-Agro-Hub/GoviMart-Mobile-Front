import React from "react";
import { View, Text } from "react-native";

export const PriceRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  strong?: boolean;
  big?: boolean;
  marginBottom?: number;
}> = ({ label, value, valueColor = "#000000", strong, big, marginBottom }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
      marginBottom,
    }}
  >
    <Text
      style={{
        fontSize: big ? 18 : 16,
        fontWeight: strong ? "700" : "400",
        color: "#000000",
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: big ? 18 : 16,
        fontWeight: strong ? "700" : "600",
        color: valueColor,
      }}
    >
      {value}
    </Text>
  </View>
);

