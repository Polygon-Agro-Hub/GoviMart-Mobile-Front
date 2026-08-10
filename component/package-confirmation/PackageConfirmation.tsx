import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "PackageConfirmation"
>;
interface Props {
  navigation: NavigationProp;
}
const PackageConfirmation: React.FC<Props> = ({ navigation }) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="px-5 pt-4">
        <TouchableOpacity className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center">
          <MaterialIcons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Title row */}
        <View className="flex-row items-center mt-2 mb-5">
          <View className="w-15 h-15 items-center justify-center mr-3">
            <Image
              source={require("@/assets/images/order/vegetable-basket.webp")}
              className="w-14 h-14"
              resizeMode="contain"
            />
          </View>

          <Text className="flex-1 text-lg font-bold text-gray-900 leading-6">
            How would you like us to handle the order's package items?
          </Text>
        </View>

        {/* Option 1 */}
        <View className="rounded-2xl p-4 mb-4 border bg-[#F7F1FF] border-[#B186EF]">
          <View className="flex-row items-start">
            {/* Selected Radio */}
            <View className="w-5 h-5 rounded-full border-2 border-[#3E206D] items-center justify-center mt-1 mr-3">
              <View className="w-2.5 h-2.5 rounded-full bg-[#3E206D]" />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 items-center justify-center mr-2">
                  <Image
                    source={require("@/assets/images/order/finalize-immediately.webp")}
                    className="w-10 h-10"
                    resizeMode="contain"
                  />
                </View>

                <Text className="text-base font-bold text-[#431289]">
                  Finalize Immediately
                </Text>
              </View>

              <View className="self-start bg-violet-200 rounded-full px-3 py-1 mb-2">
                <Text className="text-xs font-semibold text-violet-800">
                  Card Payment Required
                </Text>
              </View>

              <Text className="text-sm text-[#484A4C] leading-5">
                Want to secure the delivery slot now? Confirm the order right
                away and we'll prepare it using the standard package items
                assigned for selected delivery date. Please note that once
                confirmed, this order cannot be changed or canceled.
              </Text>
            </View>
          </View>
        </View>

        {/* Option 2 */}
        <View className="rounded-2xl p-4 mb-4 border bg-white border-gray-200">
          <View className="flex-row items-start">
            {/* Unselected Radio */}
            <View className="w-5 h-5 rounded-full border-2 border-gray-300 items-center justify-center mt-1 mr-3" />

            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 items-center justify-center mr-2">
                  <Image
                    source={require("@/assets/images/order/review.webp")}
                    className="w-10 h-10"
                    resizeMode="contain"
                  />
                </View>

                <Text className="flex-1 text-base font-bold text-gray-900">
                  Review and confirm before delivery
                </Text>
              </View>

              <Text className="text-sm text-[#484A4C] leading-5 mb-3">
                Two days before the delivery, the customer will receive an
                in-app notification with the exact produce and quantities.
                Confirm the order between 8:00 AM and 6:00 PM to finalize it
                for dispatch.
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View className="bg-[#FFF9F5] border border-[#EE7719] rounded-xl p-3 flex-row mt-3">
            <MaterialIcons
              name="warning-amber"
              size={16}
              color="#F97316"
              style={{ marginRight: 6, marginTop: 1 }}
            />

            <Text className="flex-1 text-xs text-[#EE7719] leading-4">
              This facility is available on a first-come, first-served basis
              and is limited to a certain number of customers. If we do not
              receive your customer's confirmation on time and all slots for
              the preferred delivery date are filled, we will be unable to
              process this order. Your customer may check again later for any
              available slots.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View className="px-10 pb-6 pt-2 items-center">
        <View
          style={{
            width: "68%",
            borderRadius: 999,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              borderRadius: 999,
              overflow: "hidden",
              height: 50,
            }}
          >
            <LinearGradient
              colors={["#6839CF", "#874DDB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flex: 1,
                borderRadius: 999,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text className="text-white text-base font-bold">
                Continue
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default PackageConfirmation;