import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

interface HomeHeaderProps {
  onPressProfile: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onPressProfile }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);

  const placeholderImage = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
  const userImage = user?.image || placeholderImage;

  // Format display name with title, e.g. "Mr. Pasan"
  let displayName = "Ms. Samantha";
  if (user) {
    const titlePrefix = user.title ? `${user.title}. ` : "";
    displayName = `${titlePrefix}${user.firstName} ${user.lastName}`.trim();
  }

  return (
    <View className="flex-row items-center px-6 pt-6 pb-2 justify-between">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8}>
          <Image
            source={{ uri: userImage }}
            className="w-16 h-16 rounded-full border-2 border-gray-200"
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
