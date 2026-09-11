import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "PackageConfirmation"
>;

type PackageConfirmationRouteProp = RouteProp<
  RootStackParamList,
  "PackageConfirmation"
>;

interface Props {
  navigation: NavigationProp;
  route: PackageConfirmationRouteProp;
}

const PackageConfirmation: React.FC<Props> = ({ navigation, route }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0); // 0 = Finalize Immediately, 1 = Review
  const orderContext = route.params?.orderContext;

  const handleContinue = () => {
    navigation.navigate("OrderDeliveryMethod", {
      orderContext: {
        ...(orderContext as any),
        isFinalizeImdt: selectedOption === 0 ? 1 : 0,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ─── TOP HEADER: CLOSE BUTTON ON RIGHT ───────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#000000",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ─── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      >
        {/* Title row with vegetable basket */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            marginTop: 8,
            marginBottom: 26,
          }}
        >
          <Image
            source={require("@/assets/images/order/vegetable-basket.webp")}
            style={{ width: 88, height: 88, marginRight: 14 }}
            resizeMode="contain"
          />

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#111111",
                lineHeight: 22,
              }}
            >
              How would you like us to handle the order’s package items?
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#666A7D",
                marginTop: 4,
              }}
            >
              Choose an option that suits you best.
            </Text>
          </View>
        </View>

        {/* ─── OPTION 1: Finalize Immediately ─────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedOption(0)}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedOption === 0 ? "#C9D5E2" : "#EBF0F5",
            backgroundColor: "#FFFFFF",
            padding: 16,
            marginHorizontal: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Card Icon */}
            <View
              style={{
                width: 44,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Image
                source={require("@/assets/images/order/finalize-immediately.webp")}
                style={{ width: 44, height: 34 }}
                resizeMode="contain"
              />
            </View>

            {/* Title & Badge */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: "#111111",
                }}
              >
                Finalize Immediately
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#F3F4F6",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  Card Payment Required
                </Text>
              </View>
            </View>

            {/* Click dot on right side with check icon */}
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: selectedOption === 0 ? "#000000" : "#FFFFFF",
                borderWidth: selectedOption === 0 ? 0 : 2,
                borderColor: "#000000",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {selectedOption === 0 && (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: "#55596D",
              marginTop: 12,
            }}
          >
            Want to secure the delivery slot now? Confirm the order right away
            and we’ll prepare it using the standard package items assigned for
            the selected delivery date. Please note that once confirmed, this
            order cannot be changed or cancelled.
          </Text>
        </TouchableOpacity>

        {/* ─── OPTION 2: Review and confirm before delivery ───────────────── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedOption(1)}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedOption === 1 ? "#C9D5E2" : "#EBF0F5",
            backgroundColor: "#FFFFFF",
            padding: 16,
            marginHorizontal: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Calendar/Review Icon */}
            <View
              style={{
                width: 44,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Image
                source={require("@/assets/images/order/review.webp")}
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: "#111111",
                }}
              >
                Review and confirm before delivery
              </Text>
            </View>

            {/* Click dot on right side with check icon */}
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: selectedOption === 1 ? "#000000" : "#FFFFFF",
                borderWidth: selectedOption === 1 ? 0 : 2,
                borderColor: "#000000",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {selectedOption === 1 && (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: "#55596D",
              marginTop: 12,
            }}
          >
            Two days before the delivery, the customer will receive an in-app
            notification with the exact produce and quantities.{"\n"}
            Confirm the order between 8:00AM and 6:00PM to finalize it for
            dispatch.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── CONFIRM & CONTINUE BUTTON ──────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: Platform.OS === "ios" ? 28 : 20,
          paddingTop: 12,
          backgroundColor: "#FFFFFF",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          style={{
            height: 52,
            backgroundColor: "#000000",
            borderRadius: 26,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Confirm & Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PackageConfirmation;