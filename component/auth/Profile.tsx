import React from "react";
import { View, Text, Image, TouchableOpacity, Alert, StatusBar } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logoutSuccess } from "../../store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "../common/CustomHeader";

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, "Profile">;

interface ProfileProps {
  navigation: ProfileNavigationProp;
}

const Profile: React.FC<ProfileProps> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);
  const dispatch = useDispatch();

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("userProfile");
            await AsyncStorage.removeItem("userLoginTime");
            dispatch(logoutSuccess());
            navigation.reset({
              index: 0,
              routes: [{ name: "ChooseAuth" }],
            });
          } catch (e) {
            console.error("Logout error:", e);
          }
        },
      },
    ]);
  };

  const placeholderImage = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
  const userImage = user?.image || placeholderImage;
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Guest User";

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Header */}
      <CustomHeader
        title="My Profile"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      <View className="flex-1 justify-between px-6 pt-6 pb-12 mx-auto w-full max-w-[500px]">
        {/* Upper profile content */}
        <View className="items-center mt-4">
          <View className="relative shadow-md">
            <Image
              source={{ uri: userImage }}
              className="w-32 h-32 rounded-full border-4 border-gray-100"
            />
          </View>

          <Text className="text-black font-extrabold text-2xl mt-4">
            {fullName}
          </Text>
          <Text className="text-gray-400 text-sm font-semibold mt-1">
            {user?.buyerType || "Retail"} Member
          </Text>

          {/* Details list card */}
          <View className="w-full mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-500 font-bold text-sm">Email Address</Text>
              <Text className="text-black font-bold text-sm">{user?.email || "Not Provided"}</Text>
            </View>

            <View className="flex-row justify-between items-center mt-3">
              <Text className="text-gray-500 font-bold text-sm">Mobile Number</Text>
              <Text className="text-black font-bold text-sm">{user?.phoneNumber || "Not Provided"}</Text>
            </View>

            <View className="flex-row justify-between items-center mt-3">
              <Text className="text-gray-500 font-bold text-sm">Buyer Class</Text>
              <Text className="text-black font-bold text-sm">{user?.buyerType || "Retail"}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-red-500 rounded-full h-[52px] w-full items-center justify-center shadow-sm"
        >
          <Text className="text-white text-base font-extrabold">Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Profile;
