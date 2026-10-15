import React from "react";
import {
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

export interface InfoNoticeCardProps {
  message?: string;
  children?: React.ReactNode;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
  textColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const InfoNoticeCard: React.FC<InfoNoticeCardProps> = ({
  message,
  children,
  iconName = "circle-info",
  iconSize = 14,
  iconColor = "#333333",
  backgroundColor = "#FFF5E9",
  textColor = "#333333",
  containerStyle,
  textStyle,
}) => {
  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "flex-start",
        },
        containerStyle,
      ]}
    >
      <FontAwesome6
        name={iconName}
        size={iconSize}
        color={iconColor}
        style={{
          marginTop: 2.5,
          marginRight: 8,
        }}
      />

      <View style={{ flex: 1 }}>
        {children ? (
          children
        ) : (
          <Text
            style={[
              {
                fontSize: 13,
                lineHeight: 19,
                color: textColor,
                fontWeight: "400",
              },
              textStyle,
            ]}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

export default InfoNoticeCard;
