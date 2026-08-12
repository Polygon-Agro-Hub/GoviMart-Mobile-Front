import React, { useEffect } from "react";
import { View, Image, StatusBar, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";

const logo = require("@/assets/images/public/polygon-logo.png");

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

const Splash: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const profileStr = await AsyncStorage.getItem("userProfile");
        const loginTimeStr = await AsyncStorage.getItem("userLoginTime");

        if (token && profileStr && loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          const currentTime = Date.now();
          const elapsed = currentTime - loginTime;
          const eightHours = 8 * 60 * 60 * 1000;

          if (elapsed < eightHours) {
            const userProfile = JSON.parse(profileStr);
            // Preload to Redux store
            dispatch(loginSuccess({ token, userProfile, loginTime }));
            navigation.replace("Home");
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check login status:", e);
      }
      navigation.replace("ChooseAuth");
    };

    const timer = setTimeout(() => {
      checkLoginStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, dispatch]);

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View className="items-center">
        <Image source={logo} className="w-96 h-full" resizeMode="contain" />
      </View>
      <View className="absolute bottom-6 left-0 right-0 items-center">
        <Text className="text-base text-black opacity-60 font-normal tracking-widest">
          Powered By Polygon
        </Text>
      </View>
    </View>
  );
};

export default Splash;