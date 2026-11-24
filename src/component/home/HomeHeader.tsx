import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import UnstableConnectionBanner from "../common/UnstableConnectionBanner";

const defaultUserIcon = require("@/assets/images/auth/user-vector-icon.webp");

interface HomeHeaderProps {
  onPressProfile: () => void;
  showUnstableBanner?: boolean;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onPressProfile, showUnstableBanner = true }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);
  const token = useSelector((state: RootState) => state.auth.token);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  const hasValidUserImage =
    Boolean(token && !imageError && user?.image && user.image.trim() !== "");

  // Format display name: "Welcome, Guest!" if not logged in, or user name if logged in
  let displayName = "Welcome, Guest!";
  if (token && user) {
    const titlePrefix = user.title ? `${user.title}. ` : "";
    const fullName = `${titlePrefix}${user.firstName || ""} ${user.lastName || ""}`.trim();
    displayName = fullName || "Welcome, Guest!";
  }

  return (
    <View>
      <View className="flex-row items-center px-6 pt-6 pb-2 justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8}>
            <Image
              source={hasValidUserImage && user?.image ? { uri: user.image } : defaultUserIcon}
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
      {showUnstableBanner && <UnstableConnectionBanner />}
    </View>
  );
};

export default HomeHeader;
