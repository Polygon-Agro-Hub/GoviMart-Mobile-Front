import React, { useEffect } from "react";
import { View, Image, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import authService from "@/services/auth/auth.service";
import { tokenStorage } from "@/utils/tokenStorage";
import socketService from "@/services/socket/socket.service";

const logo = require("@/assets/images/public/polygon-logo.png");

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

const Splash: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const isRemembered = await AsyncStorage.getItem("rememberMeEnabled");
        const token = await tokenStorage.getToken();
        const profileStr = await AsyncStorage.getItem("userProfile");
        const loginTimeStr = await AsyncStorage.getItem("userLoginTime");

        // Check if there is an active session
        if (token && profileStr && loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          const currentTime = Date.now();
          const elapsed = currentTime - loginTime;
          const eightHours = 8 * 60 * 60 * 1000;

          // If within the 8-hour session window, automatically log in
          if (elapsed < eightHours) {
            const userProfile = JSON.parse(profileStr);
            // Preload to Redux store
            dispatch(loginSuccess({ token, userProfile, loginTime }));
            if (userProfile.id) {
              socketService.registerUser(userProfile.id, token);
            }
            navigation.replace("Home");
            return;
          } else if (isRemembered === "true") {
            // If session expired and user enabled "Remember Me", attempt silent token refresh
            const refreshToken = await tokenStorage.getRefreshToken();
            if (refreshToken) {
              try {
                const response = await authService.refreshToken(refreshToken);
                if (response.data && response.data.success) {
                  const newToken = response.data.data.token;
                  const newLoginTime = Date.now();
                  const userProfile = JSON.parse(profileStr);

                  // Update storage with the new access token and time
                  await tokenStorage.setToken(newToken);
                  await AsyncStorage.setItem("userLoginTime", newLoginTime.toString());

                  // Preload to Redux store and navigate to Home
                  dispatch(loginSuccess({ token: newToken, userProfile, loginTime: newLoginTime }));
                  if (userProfile.id) {
                    socketService.registerUser(userProfile.id, newToken);
                  }
                  navigation.replace("Home");
                  return;
                }
              } catch (refreshError) {
                // Refresh token expired / invalid: clear tokens silently and proceed to sign-in
                await tokenStorage.clearTokens().catch(() => {});
                await AsyncStorage.multiRemove([
                  "userProfile",
                  "userLoginTime",
                  "rememberMeEnabled",
                ]).catch(() => {});
              }
            }
          } else {
            // Session expired (>= 8 hours) and Remember Me not enabled: clear session
            await tokenStorage.clearTokens().catch(() => {});
            await AsyncStorage.multiRemove([
              "userProfile",
              "userLoginTime",
              "rememberMeEnabled",
            ]).catch(() => {});
          }
        }
      } catch (e) {
        // Fallback silently to auth selection
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