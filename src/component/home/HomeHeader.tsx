import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

const defaultUserIcon = require("@/assets/images/auth/user-vector-icon.webp");

interface HomeHeaderProps {
  onPressProfile: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onPressProfile }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  const hasValidUserImage =
    !imageError && user?.image && user.image.trim() !== "";

  // Format display name with title, e.g. "Mr. Pasan"
  let displayName = "Guest User";
  if (user) {
    const titlePrefix = user.title ? `${user.title}. ` : "";
    displayName = `${titlePrefix}${user.firstName || ""} ${user.lastName || ""}`.trim() || "Guest User";
  }

  return (
    <View className="flex-row items-center px-6 pt-6 pb-2 justify-between">
      <View className="flex-row items-center flex-1 mr-2">
        <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8}>
          <Image
            source={hasValidUserImage ? { uri: user.image } : defaultUserIcon}
            onError={() => setImageError(true)}
            className="w-14 h-14 rounded-full border-2 border-gray-200 bg-[#EAEFF5]"
          />
        </TouchableOpacity>
        <View className="flex-1 ml-4 justify-center">
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            className="text-black text-xl font-bold leading-6"
          >
            {displayName}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default HomeHeader;
