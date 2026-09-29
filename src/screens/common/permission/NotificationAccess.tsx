import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "@/types/types";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import pushNotificationService from "@/services/notification/pushNotification.service";

type NotificationAccessNavigationProp = StackNavigationProp<
  RootStackParamList,
  "NotificationAccess"
>;

interface NotificationAccessProps {
  navigation?: NotificationAccessNavigationProp;
  route?: {
    params?: {
      returnScreen?: keyof RootStackParamList;
      returnParams?: any;
      blockBackNavigation?: boolean;
    };
  };
  onPermissionGranted?: () => void;
  onClose?: () => void;
  onNotNow?: () => void;
  returnScreen?: keyof RootStackParamList;
  returnParams?: any;
  onBackPress?: () => void;
  blockBackNavigation?: boolean;
}

const notificationImage = require("@/assets/images/permission/notification.jpg");

const NotificationAccess: React.FC<NotificationAccessProps> = ({
  navigation,
  route,
  onPermissionGranted,
  onClose,
  onNotNow,
  returnScreen = "Home",
  returnParams,
  onBackPress,
  blockBackNavigation = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const targetReturnScreen = route?.params?.returnScreen || returnScreen;
  const targetReturnParams = route?.params?.returnParams || returnParams;
  const isBackBlocked =
    route?.params?.blockBackNavigation ?? blockBackNavigation;

  const isScreenTooLong =
    scrollViewHeight > 0 &&
    contentHeight > 0 &&
    scrollViewHeight >= contentHeight + 20;

  const navigateForward = () => {
    if (navigation) {
      if (targetReturnParams) {
        navigation.navigate(targetReturnScreen as any, targetReturnParams);
      } else {
        navigation.navigate(targetReturnScreen as any);
      }
    }
  };

  const handleDenyOrClose = async () => {
    try {
      await AsyncStorage.setItem("hasAskedNotificationPermission", "true");
    } catch (e) {
      console.warn("Error saving notification permission flag:", e);
    }

    if (onClose) {
      onClose();
    } else if (onBackPress) {
      onBackPress();
    } else if (navigation) {
      navigateForward();
    }
  };

  const handleNotNowPress = () => {
    if (onNotNow) {
      onNotNow();
    } else {
      handleDenyOrClose();
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const handleHardwareBackPress = () => {
        if (isBackBlocked) {
          return true;
        }
        handleNotNowPress();
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleHardwareBackPress,
      );
      return () => subscription.remove();
    }, [isBackBlocked, navigation, onClose, onBackPress, targetReturnScreen]),
  );

  const requestNotificationAccess = async () => {
    setIsLoading(true);
    try {
      const isGranted = await pushNotificationService.requestPermissions();
      await pushNotificationService.init();

      await AsyncStorage.setItem("hasAskedNotificationPermission", "true");

      if (isGranted) {
        pushNotificationService.registerPushToken().catch(() => {});
        if (onPermissionGranted) {
          onPermissionGranted();
        } else if (navigation) {
          navigateForward();
        }
      } else {
        Alert.alert(
          "Notifications Disabled",
          "You won't receive live alerts for your orders or delivery status. You can turn them on anytime in your device Settings.",
          [
            {
              text: "Continue",
              onPress: handleNotNowPress,
            },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      handleNotNowPress();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      <ScrollView
        className="flex-1 px-5"
        onLayout={(e: LayoutChangeEvent) =>
          setScrollViewHeight(e.nativeEvent.layout.height)
        }
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isScreenTooLong ? "center" : "flex-start",
          paddingBottom: isScreenTooLong
            ? 20
            : Platform.OS === "android"
              ? 75
              : 55,
          paddingTop: isScreenTooLong ? 0 : 20,
        }}
        showsVerticalScrollIndicator={false}
        bounces={!isScreenTooLong}
      >
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setContentHeight(e.nativeEvent.layout.height)
          }
          className="w-full"
        >
          {/* Centered 3D Bell Image */}
          <View className="items-center justify-center mt-2 mb-4">
            <Image
              source={notificationImage}
              className="w-32 h-32 rounded-3xl"
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Never Miss an Order Update
          </Text>

          {/* Intro */}
          <Text className="text-gray-300 text-sm text-center mb-5 leading-5">
            Allow Polygon notifications to stay informed on everything that matters:
          </Text>

          {/* Feature 1: Real-Time Order & Delivery Tracking */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-3 border border-gray-800 flex-row items-start">
            <View className="bg-[#FF9114]/15 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#FF9114]/30">
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={24}
                color="#FF9114"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                Real-Time Order & Delivery Tracking
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                Get instant notifications when your order is confirmed, packed, dispatched, and arriving at your doorstep.
              </Text>
            </View>
          </View>

          {/* Feature 2: Package Availability & Selection */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-3 border border-gray-800 flex-row items-start">
            <View className="bg-[#FF9114]/15 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#FF9114]/30">
              <MaterialCommunityIcons
                name="basket-outline"
                size={24}
                color="#FF9114"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                Package Windows & Customizations
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                Be notified when new farm packages open for customization so you can select your preferred fresh veggies in time.
              </Text>
            </View>
          </View>

          {/* Feature 3: Exclusive Offers & Price Updates */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-4 border border-gray-800 flex-row items-start">
            <View className="bg-[#FF9114]/15 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#FF9114]/30">
              <MaterialCommunityIcons
                name="tag-heart-outline"
                size={24}
                color="#FF9114"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                Discounts & Seasonal Harvests
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                Receive special discounts, coupon drops, and announcements when seasonal farm produce becomes available.
              </Text>
            </View>
          </View>

          {/* Privacy Note */}
          <View className="bg-[#1F1E1A] p-3 rounded-lg mb-6 border border-[#FF9114]/30 flex-row items-start">
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#FF9114"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <Text className="text-gray-300 text-xs flex-1 leading-4">
              Polygon values your privacy. We only send relevant alerts and essential order updates. No spam, ever.
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            className={`items-center w-full mt-4 ${
              isScreenTooLong ? "mb-2" : "mb-8"
            }`}
          >
            <TouchableOpacity
              onPress={requestNotificationAccess}
              activeOpacity={0.8}
              disabled={isLoading}
              className="w-full mb-3"
              style={{ borderRadius: 999, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#FF9114", "#FF7A00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 52,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-extrabold text-base tracking-wide">
                    {isLoading ? "Enabling..." : "Allow Notifications"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNotNowPress}
              activeOpacity={0.7}
              className="py-3 px-6 items-center justify-center"
            >
              <Text className="text-gray-400 font-semibold text-sm">
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default NotificationAccess;
