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
import { RootStackParamList } from "@/types/types";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

type LocationAccessNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LocationAccess"
>;

interface LocationAccessProps {
  navigation?: LocationAccessNavigationProp;
  route?: {
    params?: {
      returnScreen?: keyof RootStackParamList;
      blockBackNavigation?: boolean;
    };
  };
  onPermissionGranted?: () => void;
  onClose?: () => void;
  onNotNow?: () => void;
  returnScreen?: keyof RootStackParamList;
  onBackPress?: () => void;
  blockBackNavigation?: boolean;
}

const locationImage = require("@/assets/images/permission/location.webp");

const LocationAccess: React.FC<LocationAccessProps> = ({
  navigation,
  route,
  onPermissionGranted,
  onClose,
  onNotNow,
  returnScreen = "Home",
  onBackPress,
  blockBackNavigation = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const targetReturnScreen = route?.params?.returnScreen || returnScreen;
  const isBackBlocked =
    route?.params?.blockBackNavigation ?? blockBackNavigation;

  const isScreenTooLong =
    scrollViewHeight > 0 &&
    contentHeight > 0 &&
    scrollViewHeight >= contentHeight + 20;

  const handleDenyOrClose = () => {
    if (onClose) {
      onClose();
    } else if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation) {
      navigation.navigate(targetReturnScreen as any);
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

  const requestLocationPermission = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        if (onPermissionGranted) {
          onPermissionGranted();
        } else if (navigation) {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate(targetReturnScreen as any);
          }
        }
      } else {
        Alert.alert(
          "Permission Denied",
          "Location access is required for this feature. Please enable it in settings.",
          [
            {
              text: "Not Now",
              style: "cancel",
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
      console.error("Error requesting location permission:", error);
      Alert.alert(
        "Error",
        "Unable to request location permission. Please try again.",
        [
          {
            text: "Not Now",
            onPress: handleNotNowPress,
          },
          { text: "OK" },
        ],
      );
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
          {/* Centered Image */}
          <View className="items-center justify-center mt-2 mb-4">
            <Image
              source={locationImage}
              className="w-32 h-32"
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Why Polygon Uses Location
          </Text>

          {/* Intro */}
          <Text className="text-gray-300 text-sm text-center mb-5 leading-5">
            Polygon requires location access to enable the following features:
          </Text>

          {/* Feature 1: Accurate Delivery Location */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-3 border border-gray-800 flex-row items-start">
            <View className="bg-[#FF9114]/15 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#FF9114]/30">
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={24}
                color="#FF9114"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                Accurate Delivery Pinpoint
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                Pin your home, office, or shop drop-off point directly on the
                map to ensure orders arrive right at your doorstep.
              </Text>
            </View>
          </View>

          {/* Feature 2: Nearby Centers & Availability */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-4 border border-gray-800 flex-row items-start">
            <View className="bg-[#FF9114]/15 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#FF9114]/30">
              <MaterialCommunityIcons
                name="storefront-outline"
                size={24}
                color="#FF9114"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                Nearby Centres & Delivery Coverage
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                Verify delivery service in your area and find the closest
                Polygon pickup centres for fast self-pickup.
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
              Location access is only requested in the foreground while
              detecting or setting your delivery address. Background location is
              never tracked.
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            className={`items-center w-full mt-4 ${
              isScreenTooLong ? "mb-2" : "mb-8"
            }`}
          >
            <TouchableOpacity
              onPress={requestLocationPermission}
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
                    name="location-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-extrabold text-base tracking-wide">
                    {isLoading ? "Requesting..." : "Agree & Continue"}
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
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default LocationAccess;
