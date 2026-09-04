import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

interface HomeHeaderProps {
  onPressProfile: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onPressProfile }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  const placeholderImage =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";

  const userImage =
    !imageError && user?.image && user.image.trim() !== ""
      ? user.image
      : placeholderImage;

  // Format display name with title, e.g. "Mr. Pasan"
  let displayName = "Guest User";
  if (user) {
    const titlePrefix = user.title ? `${user.title}. ` : "";
    displayName = `${titlePrefix}${user.firstName || ""} ${user.lastName || ""}`.trim() || "Guest User";
  }

  return (
    <View className="flex-row items-center px-6 pt-6 pb-2 justify-between">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8}>
          <Image
            source={{ uri: userImage }}
            onError={() => setImageError(true)}
            className="w-16 h-16 rounded-full border-2 border-gray-200 bg-[#EAEFF5]"
          />
        </TouchableOpacity>
        <Text className="text-black text-lg font-bold ml-4">
          {displayName}
        </Text>
      </View>
    </View>
  );
};

export default HomeHeader;
