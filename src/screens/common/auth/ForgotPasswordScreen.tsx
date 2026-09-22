import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import LottieView from "lottie-react-native";

type ForgotPasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPassword"
>;

interface Props {
  navigation: ForgotPasswordNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const handleCallSupport = () => {
    Linking.openURL("tel:+94770171988").catch((err) =>
      console.error("Failed to open dialer:", err),
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header */}
      <CustomHeader
        title="Forgot Password"
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <View className="flex-1 justify-start">
          {/* Lottie Animation */}
          <View className="items-center mt-6">
            <LottieView
              source={require("@/assets/json/forgot-password/forgot-password.json")}
              autoPlay
              loop
              style={{ width: 140, height: 140 }}
            />
          </View>

          {/* Subtitle */}
          <Text className="text-xl font-bold text-center text-black mt-4">
            No worries, we've got you.
          </Text>

          {/* Action Cards */}
          <View className="mt-8 space-y-4">
            {/* Reset via Email Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("ForgotPasswordInput", { method: "email" })
              }
              className="w-full bg-white border border-[#E4EBF2] rounded-3xl p-4 flex-row items-center justify-between"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3">
                  <Image
                    source={require("@/assets/images/forgot-password/mail.webp")}
                    style={{ width: 32, height: 32, resizeMode: "contain" }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-black">
                    Reset via Email
                  </Text>
                  <Text className="text-xs text-[#747990] mt-1">
                    We'll send a reset link to{" "}
                    <Text className="font-bold text-black">email address</Text>
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#000000" />
            </TouchableOpacity>

            {/* Reset via SMS Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("ForgotPasswordInput", { method: "sms" })
              }
              className="w-full bg-white border border-[#E4EBF2] rounded-3xl p-4 flex-row items-center justify-between mt-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3">
                  <Image
                    source={require("@/assets/images/forgot-password/sms.webp")}
                    style={{ width: 32, height: 32, resizeMode: "contain" }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-black">
                    Reset via SMS
                  </Text>
                  <Text className="text-xs text-[#747990] mt-1">
                    We'll send a code to{" "}
                    <Text className="font-bold text-black">
                      your mobile number
                    </Text>
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Support Section */}
        <View className="mt-8 pt-4 bg-[#F2F2F6] rounded-3xl px-5">
          <Text className="text-sm font-bold text-black">Need Help?</Text>
          <Text className="text-xs text-[#494A65] mt-1 mb-4 leading-relaxed">
            Contact our support team if you're having trouble resetting your
            password.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCallSupport}
          className="self-start bg-black rounded-full px-5 py-2.5 flex-row items-center mx-auto mt-4"
        >
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold ml-2">
            Call (+94) 770171988
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ForgotPasswordScreen;
