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
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title = "",
  showBackButton = false,
  navigation,
  onBackPress,
  dark = false,
  showLogo = false,
  titleColor,
}) => {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-4 ${
        dark ? "bg-black" : "bg-white"
      }`}
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
      <View className="flex-1 items-center">
        {showLogo ? (
          <Image
            source={require("@/assets/images/public/polygon-logo.png")}
            style={{ width: 140, height: 40, resizeMode: "contain" }}
          />
        ) : (
          <Text
            className={`text-xl font-bold text-center ${dark ? "text-white" : "text-[#001D4A]"}`}
            style={titleColor ? { color: titleColor } : undefined}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
        )}
      </View>

      {/* Right section (balanced placeholder) */}
      <View className="w-12" />
    </View>
  );
};

export default CustomHeader;
