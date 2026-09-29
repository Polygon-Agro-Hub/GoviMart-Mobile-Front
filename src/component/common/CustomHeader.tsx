import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";

interface CustomHeaderProps {
  title?: string;
  showBackButton?: boolean;
  navigation?: any;
  onBackPress?: () => void;
  dark?: boolean;
  showLogo?: boolean;
  titleColor?: string;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleLines?: number; // default 1; set 2 for screens that need a 2-line title
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title = "",
  showBackButton = false,
  navigation,
  onBackPress,
  dark = false,
  showLogo = false,
  titleColor,
  rightComponent,
  backgroundColor,
  titleLines = 1,
}) => {
  const isMultiLine = titleLines > 1;

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-4 ${
        dark ? "bg-black" : "bg-white"
      }`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {/* Left section for Back Button */}
      <View className="w-12">
        {showBackButton && navigation && (
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            className={`w-14 h-14 rounded-full items-center justify-center shadow-sm border ${
              dark ? "bg-[#1F1F1F] border-gray-800" : "bg-white border-gray-200"
            }`}
            activeOpacity={0.7}
          >
            <Entypo
              name="chevron-left"
              size={30}
              color={dark ? "white" : "black"}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Middle section for Title or Logo */}
      <View className="flex-1 items-center" style={{ flexShrink: 1 }}>
        {showLogo ? (
          <Image
            source={require("@/assets/images/public/polygon-logo.png")}
            style={{ width: 140, height: 40, resizeMode: "contain" }}
          />
        ) : (
          <Text
            className={`text-xl font-bold text-center ${
              dark ? "text-white" : "text-[#001D4A]"
            }`}
            style={[
              titleColor ? { color: titleColor } : null,
              isMultiLine ? { lineHeight: 26 } : null,
            ]}
            numberOfLines={titleLines}
            // Only shrink-to-fit in single-line mode.
            // In multi-line mode these props are omitted entirely so iOS wraps normally.
            {...(isMultiLine
              ? {}
              : { adjustsFontSizeToFit: true, minimumFontScale: 0.7 })}
          >
            {title}
          </Text>
        )}
      </View>

      {/* Right section (balanced placeholder or custom right component) */}
      <View className="w-12 items-end justify-center">
        {rightComponent || null}
      </View>
    </View>
  );
};

export default CustomHeader;