import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/common/CustomHeader";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "OrderDeliveryMethod"
>;

type OrderDeliveryMethodRouteProp = RouteProp<
  RootStackParamList,
  "OrderDeliveryMethod"
>;

interface Props {
  navigation: NavigationProp;
  route: OrderDeliveryMethodRouteProp;
}

type DeliveryMethod = "pickup" | "delivery";

const OrderDeliveryMethod: React.FC<Props> = ({ navigation, route }) => {
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("pickup");

  const handleContinue = () => {
    const currentContext = route.params?.orderContext || {
      grandTotal: 0,
      packageTotal: 0,
      productTotal: 0,
      discount: 0,
    };

    if (deliveryMethod === "pickup") {
      navigation.navigate("ChoosePickupCentre", {
        orderContext: {
          ...currentContext,
          deliveryMethod: "pickup",
        },
      });
    } else {
      navigation.navigate("CheckoutScreen", {
        orderContext: {
          ...currentContext,
          deliveryMethod: "home",
        },
      });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* ─── CUSTOM HEADER WITH BACK BUTTON ONLY ─────────────────────── */}
      <CustomHeader title="" showBackButton={true} navigation={navigation} />

      {/* ─── CONTENT ────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
        }}
      >
        {/* ─── TITLE ──────────────────────────────────────────────── */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 22,
            lineHeight: 28,
            fontWeight: "700",
            color: "#0F172A",
            marginTop: 4,
          }}
        >
          How would you like to receive{"\n"}your order?
        </Text>

        {/* ─── DESCRIPTION ────────────────────────────────────────── */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 14,
            lineHeight: 20,
            color: "#64748B",
            marginTop: 10,
            marginHorizontal: 16,
          }}
        >
          Choose the option that works best for you. You can pick it up from our
          centre or get it delivered to your location.
        </Text>

        {/* ─── PICKUP CARD ────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setDeliveryMethod("pickup")}
          style={{
            marginTop: 26,
            borderWidth: 1.5,
            borderColor: deliveryMethod === "pickup" ? "#FF8A00" : "#E2E8F0",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 14,
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: deliveryMethod === "pickup" ? 0.08 : 0.03,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: deliveryMethod === "pickup" ? 3 : 1,
          }}
        >
          {/* Radio Checkmark */}
          <View
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: deliveryMethod === "pickup" ? "#000" : "#FFFFFF",
              borderWidth: deliveryMethod === "pickup" ? 0 : 2,
              borderColor: "#CBD5E1",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {deliveryMethod === "pickup" && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Lottie Illustration — Made bigger */}
            <View
              style={{
                width: 75,
                height: 75,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <LottieView
                source={require("@/assets/json/pickup.json")}
                autoPlay
                loop={true}
                style={{ width: 75, height: 75 }}
              />
            </View>

            {/* Content */}
            <View
              style={{
                flex: 1,
                paddingRight: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                Pick up from Centre
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: "#64748B",
                  marginTop: 4,
                }}
              >
                Pick your order on the delivery date from our centre.
              </Text>

              {/* Tags */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FEF9EF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="calendar-outline" size={13} color="#000000" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#000000",
                      marginLeft: 4,
                    }}
                  >
                    On Delivery Date
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FEF9EF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="location" size={13} color="#000000" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#000000",
                      marginLeft: 4,
                    }}
                  >
                    From Our Centre
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── DELIVERY CARD ──────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setDeliveryMethod("delivery")}
          style={{
            marginTop: 18,
            borderWidth: 1.5,
            borderColor: deliveryMethod === "delivery" ? "#FF8A00" : "#E2E8F0",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 14,
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: deliveryMethod === "delivery" ? 0.08 : 0.03,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: deliveryMethod === "delivery" ? 3 : 1,
          }}
        >
          {/* Radio Checkmark */}
          <View
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor:
                deliveryMethod === "delivery" ? "#000" : "#FFFFFF",
              borderWidth: deliveryMethod === "delivery" ? 0 : 2,
              borderColor: "#CBD5E1",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {deliveryMethod === "delivery" && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Lottie Illustration — Made bigger */}
            <View
              style={{
                width: 75,
                height: 75,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <LottieView
                source={require("@/assets/json/delivery.json")}
                autoPlay
                loop={true}
                style={{ width: 75, height: 75 }}
              />
            </View>

            {/* Content */}
            <View
              style={{
                flex: 1,
                paddingRight: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                Deliver to My Location
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: "#64748B",
                  marginTop: 4,
                }}
              >
                We'll deliver your order to your selected delivery address.
              </Text>

              {/* Tags */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FEF9EF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="calendar-outline" size={13} color="#000000" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#000000",
                      marginLeft: 4,
                    }}
                  >
                    On Delivery Date
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FEF9EF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="location" size={13} color="#000000" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#000000",
                      marginLeft: 4,
                    }}
                  >
                    To your Location
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── SAFE & RELIABLE BANNER ─────────────────────────────── */}
        <View
          style={{
            marginTop: 28,
            borderRadius: 18,
            backgroundColor: "#FEF9EF",
            paddingHorizontal: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#FEF9EF",
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "#FEF0D2",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <FontAwesome5 name="shield-alt" size={22} color="black" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#020319",
              }}
            >
              Safe & Reliable
            </Text>
            <Text
              style={{
                fontSize: 12,
                lineHeight: 17,
                color: "#494A65",
                marginTop: 2,
              }}
            >
              Your order is packed fresh and handled with care.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── CONTINUE BUTTON ────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderColor: "#F1F5F9",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          style={{
            height: 54,
            backgroundColor: "#000000",
            borderRadius: 27,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
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
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderDeliveryMethod;
