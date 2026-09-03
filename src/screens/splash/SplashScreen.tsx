import React, { useEffect } from "react";
import { View, Image, StatusBar, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import authService from "@/services/auth/auth.service";

const logo = require("@/assets/images/public/app-icon-android.png");

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

const Splash: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const isRemembered = await AsyncStorage.getItem("rememberMeEnabled");
        const token = await AsyncStorage.getItem("userToken");
        const profileStr = await AsyncStorage.getItem("userProfile");
        const loginTimeStr = await AsyncStorage.getItem("userLoginTime");

        // Only auto-login if the user clicked "Remember Me"
        if (isRemembered === "true" && token && profileStr && loginTimeStr) {
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
          } else {
            // Access token expired, attempt to refresh it silently using the Refresh Token
            const refreshToken = await AsyncStorage.getItem("userRefreshToken");
            if (refreshToken) {
              try {
                const response = await authService.refreshToken(refreshToken);
                if (response.data && response.data.success) {
                  const newToken = response.data.data.token;
                  const newLoginTime = Date.now();
                  const userProfile = JSON.parse(profileStr);

                  // Update storage with the new access token and time
                  await AsyncStorage.setItem("userToken", newToken);
                  await AsyncStorage.setItem("userLoginTime", newLoginTime.toString());

                  // Preload to Redux store and navigate to Home
                  dispatch(loginSuccess({ token: newToken, userProfile, loginTime: newLoginTime }));
                  navigation.replace("Home");
                  return;
                }
              } catch (refreshError) {
                console.warn("Silent token refresh failed, user must sign in:", refreshError);
              }
            }
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
      <View className="items-center justify-center">
        <Image
          source={logo}
          style={{ width: 180, height: 180 }}
          resizeMode="contain"
        />
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