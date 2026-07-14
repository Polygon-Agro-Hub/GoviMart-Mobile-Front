import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6 } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/common/CustomHeader";

type DeliveryLocationNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DeliveryLocation"
>;

interface DeliveryLocationProps {
  navigation: DeliveryLocationNavigationProp;
}

const DeliveryLocation: React.FC<DeliveryLocationProps> = ({ navigation }) => {
  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Header Bar */}
      <CustomHeader title="Delivery Location" showBackButton={false} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top small location icon */}
        <View className="items-center mt-6">
          <LottieView
            source={require("@/assets/json/auth/location-icon.json")}
            autoPlay
            loop
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
        </View>

        {/* Info Box */}
        <View className="mx-6 px-4 py-5 rounded-2xl bg-[#F3F3F3] mt-4">
          <View className="flex-row items-center">
            <View className="mr-2">
              <FontAwesome6 name="circle-info" size={14} color="black" />
            </View>
            <Text className="font-bold text-black text-sm">
              Why we need your actual city?
            </Text>
          </View>
          <Text className="text-xs text-[#5A5859] mt-3 leading-relaxed">
            We're expanding islandwide! Please select your current city
            carefully. You won't be able to change it until after your first
            successful delivery. If your city isn't available yet, stay tuned,
            we'll be there soon!
          </Text>
        </View>

        {/* Selection Prompt */}
        <Text className="text-center text-base font-bold text-black mt-8">
          Please select your location
        </Text>

        {/* Select City Input Field */}
        <TouchableOpacity
          className="mx-6 mt-4 border border-[#E4EBF2] bg-white px-5 py-3.5 rounded-full flex-row items-center justify-between"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <View className="mr-3">
              <FontAwesome6 name="location-dot" size={18} color="black" />
            </View>
            <Text className="text-sm text-black font-semibold">
              Select Your City
            </Text>
          </View>
          <FontAwesome6 name="chevron-down" size={16} color="black" />
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          className="mx-6 mt-6 bg-black py-4 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Home")}
        >
          <Text className="text-white text-base font-bold">Continue</Text>
        </TouchableOpacity>

        {/* Need Help link */}
        <TouchableOpacity className="mt-6 self-center" activeOpacity={0.7}>
          <Text className="text-sm font-semibold text-[#0085FF] underline">
            Need Help?
          </Text>
        </TouchableOpacity>

        {/* Already have an account link */}
        <View className="flex-row items-center justify-center mt-6">
          <Text className="text-xs text-[#3F3F3F]">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Login")}
          >
            <Text className="text-xs font-bold text-[#0085FF] underline">
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed Bottom Lottie (city.json) */}
      <View className="w-full h-[180px]">
        <LottieView
          source={require("@/assets/json/auth/city.json")}
          autoPlay
          loop
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

export default DeliveryLocation;
