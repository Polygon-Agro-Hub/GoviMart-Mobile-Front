import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  navigation?: any;
  onBackPress?: () => void;
  dark?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = false,
  navigation,
  onBackPress,
  dark = false,
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
            className="items-start"
          >
            <Entypo
              name="chevron-left"
              size={30}
              color={dark ? "white" : "black"}
              className={`rounded-full p-2 ${dark ? "bg-[#1F1F1F]" : "bg-[#F7FAFF]"}`}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Middle section for Title */}
      <View className="flex-1 items-center">
        <Text
          className={`text-2xl font-bold text-center ${dark ? "text-white" : "text-black"}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title}
        </Text>
      </View>

      {/* Right section (balanced placeholder) */}
      <View className="w-12 items-end" />
    </View>
  );
};

export default CustomHeader;
