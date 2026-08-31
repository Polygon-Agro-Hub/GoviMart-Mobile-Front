import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ChooseAuthNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChooseAuth"
>;

interface ChooseAuthProps {
  navigation: ChooseAuthNavigationProp;
}

const ChooseAuth: React.FC<ChooseAuthProps> = ({ navigation }) => {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Top Header Section */}
      <View className="relative w-full h-[320px] px-6 pt-12 flex-row justify-between items-center">
        {/* Left side text content */}
        <View className="z-10 w-[55%] items-start justify-center pr-2">
          <Text
            className="text-3xl font-black text-black text-left leading-tight"
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {"Good food,\ndelivered fresh."}
          </Text>
          <Text className="text-xs text-[#5A5859] text-left mt-3 leading-normal">
            {"All your organic buying needs,\nright at your fingertips."}
          </Text>
        </View>

        {/* Right side half-screen image with mist */}
        <View className="absolute top-0 right-0 w-[100%] h-[520px] overflow-hidden">
          <Image
            source={require("@/assets/images/auth/good-food.webp")}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* White mist overlay at the bottom of the image */}
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.7)", "#ffffff"]}
            locations={[0, 0.5, 1]}
            className="absolute bottom-0 left-0 right-0 h-32"
          />
        </View>
      </View>

      {/* Info Features Box */}
      <View className="mx-6 rounded-2xl ">
        {/* Feature 1: Leaf */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-md bg-[#F8F6F4] items-center justify-center mr-4">
            <FontAwesome6 name="leaf" size={18} color="black" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">
              Farm to door step
            </Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">
              Sourced with delivered within 24 hours
            </Text>
          </View>
        </View>

        {/* Border line 1 */}
        <View className="border-b border-[#E4EBF2] my-2 w-[50%]" />

        {/* Feature 2: Lorry */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-md bg-[#F8F6F4] items-center justify-center mr-4">
            <FontAwesome6 name="truck" size={18} color="black" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">
              Fast Delivery
            </Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">
              Right to your door
            </Text>
          </View>
        </View>

        {/* Border line 2 */}
        <View className="border-b border-[#E4EBF2] my-2 w-[50%]" />

        {/* Feature 3: Secure */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-md bg-[#F8F6F4] items-center justify-center mr-4">
            <FontAwesome6 name="shield-halved" size={18} color="black" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">
              Secure & Easy
            </Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">Safe payments</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View className="mt-10 px-6 pb-8">
        {/* Sign Up Button */}
        <TouchableOpacity
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 5,

            elevation: 5,
          }}
          className="w-full bg-black py-4 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => navigation.navigate("DeliveryLocation")}
        >
          <Text className="text-white text-base font-bold">Sign up</Text>
        </TouchableOpacity>

        {/* Text label with side lines */}
        <View className="flex-row items-center my-8 justify-center">
          <View className="flex-1 h-[1px] bg-[#E4EBF2]" />
          <Text className="mx-4 text-xs text-[#5A5859] font-medium">
            If already have an account
          </Text>
          <View className="flex-1 h-[1px] bg-[#E4EBF2]" />
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 5,

            elevation: 5,
          }}
          className="w-full bg-[#FF9114] py-4 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-white text-base font-bold">Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ChooseAuth;
