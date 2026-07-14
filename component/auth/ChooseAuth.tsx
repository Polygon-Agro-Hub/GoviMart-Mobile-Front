import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { Feather, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";

type ChooseAuthNavigationProp = StackNavigationProp<RootStackParamList, "ChooseAuth">;

interface ChooseAuthProps {
  navigation: ChooseAuthNavigationProp;
}

const ChooseAuth: React.FC<ChooseAuthProps> = ({ navigation }) => {
  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Top Header Section */}
      <View className="relative w-full h-[280px] pt-12 px-6">
        {/* Right Top Image */}
        <Image
          source={require("@/assets/images/auth/good-food.webp")}
          className="absolute top-0 right-0 w-[240px] h-[240px]"
          resizeMode="contain"
        />
        
        {/* Text overlaid on the left/foreground, aligned right */}
        <View className="z-10 w-full items-end mt-16">
          <Text className="text-3xl font-black text-black text-right leading-tight">
            {"Good food,\ndelivered fresh."}
          </Text>
          <Text className="text-sm text-[#5A5859] text-right mt-3 leading-normal">
            {"All your organic buying needs,\nright at your fingertips."}
          </Text>
        </View>
      </View>

      {/* Info Features Box */}
      <View className="mx-6 p-5 rounded-2xl bg-[#F8F6F4] mt-4">
        {/* Feature 1: Leaf */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-4">
            <FontAwesome name="leaf" size={20} color="#FF9114" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">Farm to door step</Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">Sourced with delivered within 24 hours</Text>
          </View>
        </View>
        
        {/* Border line 1 */}
        <View className="border-b border-[#E4EBF2] my-2" />

        {/* Feature 2: Lorry */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-4">
            <MaterialCommunityIcons name="truck-delivery" size={20} color="#FF9114" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">Fast Delivery</Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">Right to your door</Text>
          </View>
        </View>

        {/* Border line 2 */}
        <View className="border-b border-[#E4EBF2] my-2" />

        {/* Feature 3: Secure */}
        <View className="flex-row items-center py-2">
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-4">
            <Feather name="shield" size={20} color="#FF9114" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">Secure & Easy</Text>
            <Text className="text-xs text-[#5A5859] mt-0.5">Safe payments</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View className="mt-8 px-6 pb-8">
        {/* Sign Up Button */}
        <TouchableOpacity 
          className="w-full bg-black py-4 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Home")}
        >
          <Text className="text-white text-base font-bold">Sign up</Text>
        </TouchableOpacity>

        {/* Text label */}
        <Text className="text-center text-sm text-[#5A5859] my-4">
          If already have an account
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity 
          className="w-full bg-[#FF9114] py-4 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Home")}
        >
          <Text className="text-white text-base font-bold">Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ChooseAuth;
