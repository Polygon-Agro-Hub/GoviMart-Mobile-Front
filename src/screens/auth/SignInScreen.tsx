import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6,  Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { useDispatch } from "react-redux";
import { loginSuccess, setRememberMeDetails } from "@/store/authSlice";
import authService from "@/services/auth/auth.service";
import * as SecureStore from "expo-secure-store";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.4;

type LoginNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginProps {
  navigation: LoginNavigationProp;
}

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const isValid = identifier.trim() !== "" && password.trim() !== "";

  // Disable Android hardware back button on this screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // returning true marks the event as handled, blocking default back behavior
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  // Load remembered identifier and encrypted password if remember me is enabled
  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const isRemembered = await AsyncStorage.getItem("rememberMeEnabled");
        if (isRemembered === "true") {
          const storedIdentifier = await AsyncStorage.getItem(
            "rememberedIdentifier",
          );
          const storedPassword =
            await SecureStore.getItemAsync("rememberedPassword");
          if (storedIdentifier) {
            setIdentifier(storedIdentifier);
          }
          if (storedPassword) {
            setPassword(storedPassword);
          }
          setRememberMe(true);
          dispatch(
            setRememberMeDetails({
              rememberMe: true,
              rememberedDetails: { identifier: storedIdentifier || "" },
            }),
          );
        }
      } catch (e) {
        console.error("Failed to load remembered credentials:", e);
      }
    };
    loadRemembered();
  }, [dispatch]);

  const handleSignIn = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await authService.login({
        identifier: identifier.trim(),
        password: password.trim(),
      });
      if (response.data && response.data.success) {
        const {
          token,
          refreshToken,
          firstName,
          lastName,
          email,
          phoneNumber,
          image,
          firstTimeUser,
          buyerType,
          isDashUser,
          isPswUpdated,
        } = response.data.data;
        const loginTime = Date.now();

        // Save session details to AsyncStorage
        await AsyncStorage.setItem("userLoginTime", loginTime.toString());
        await AsyncStorage.setItem("userToken", token);
        const userProfile = {
          firstName,
          lastName,
          email,
          phoneNumber,
          image,
          firstTimeUser,
          buyerType,
          id: response.data.data.id,
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));

        // Dispatch login to Redux
        dispatch(loginSuccess({ token, userProfile, loginTime }));

        // Handle Remember Me — store identifier, refreshToken and encrypted password
        if (rememberMe) {
          await AsyncStorage.setItem("rememberMeEnabled", "true");
          await AsyncStorage.setItem("rememberedIdentifier", identifier.trim());
          if (refreshToken) {
            await AsyncStorage.setItem("userRefreshToken", refreshToken);
          }
          await SecureStore.setItemAsync("rememberedPassword", password.trim());
          dispatch(
            setRememberMeDetails({
              rememberMe: true,
              rememberedDetails: { identifier: identifier.trim() },
            }),
          );
        } else {
          await AsyncStorage.removeItem("rememberMeEnabled");
          await AsyncStorage.removeItem("rememberedIdentifier");
          await AsyncStorage.removeItem("userRefreshToken");
          await SecureStore.deleteItemAsync("rememberedPassword");
          dispatch(
            setRememberMeDetails({
              rememberMe: false,
              rememberedDetails: null,
            }),
          );
        }

        Alert.alert("Success", "Login successful!", [
          {
            text: "OK",
            onPress: () => {
              if (isDashUser === 1 && isPswUpdated === 0) {
                navigation.navigate("UpdatePassword", {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  number: phoneNumber,
                  redirectTo: "ExcludeListAdd",
                });
              } else if (buyerType === "Retail" && firstTimeUser === 0) {
                navigation.navigate("ExcludeListAdd", {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  number: phoneNumber,
                });
              } else {
                navigation.navigate("Home");
              }
            },
          },
        ]);
      } else {
        Alert.alert(
          "Login Failed",
          response.data.message || "An error occurred during login.",
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to connect to server.";
      Alert.alert("Login Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref)}
        className="flex-1 "
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={0}
        extraHeight={0}
        keyboardOpeningTime={0}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Top image section: now scrolls with the rest of the content */}
        <View style={{ width: "100%", height: IMAGE_HEIGHT }}>
          <Image
            source={require("@/assets/images/auth/sign-in.webp")}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* White container overlapping the image with rounded top-right */}
        <View
          className="flex-1 bg-white mt-[-40px] rounded-tr-[60px] px-6 pt-6"
          style={{ justifyContent: "center" }}
        >
          {/* Logo centered */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/public/polygon-logo.png")}
              className="w-48 h-12"
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-black mt-2">
              Welcome to Polygon
            </Text>
          </View>

          {/* Form Fields Section */}
          <View className="space-y-4">
            {/* Input 1: Mobile / Email */}
            <View>
              <View className="w-full h-[50px] bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5">
                <View className="mr-3">
                  <FontAwesome5 name="user-alt" size={20} color="black" />
                </View>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Mobile Number (7XXXXXXXX) / Email"
                  placeholderTextColor="black"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-sm text-black font-semibold p-0"
                />
              </View>
            </View>

            {/* Input 2: Password */}
            <View className="mt-4">
              <View className="w-full h-[50px] bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5">
                <View className="mr-3 ml-1">
                  <FontAwesome6 name="lock" size={18} color="black" />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="black"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-sm text-black font-semibold p-0"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="pl-2"
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Checkbox & Forgot Password Row */}
          <View className="flex-row items-center justify-between mt-5 px-1">
            <View className="flex-row items-center">
              <Checkbox
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? "#094EE8" : undefined}
                className="w-5 h-5 rounded-md"
              />
              <Text className="text-sm font-semibold text-[#777A7D] ml-2">
                Remember me
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm font-bold text-[#094EE8]">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            className={`w-full h-[50px] rounded-full items-center justify-center flex-row mt-8 ${isValid ? "bg-black" : "bg-[#7F919C]"}`}
            activeOpacity={isValid ? 0.8 : 1}
            onPress={handleSignIn}
            disabled={loading || !isValid}
          >
            {loading && (
              <ActivityIndicator color="white" size="small" className="mr-2" />
            )}
            <Text className="text-white text-base font-bold">Sign in</Text>
          </TouchableOpacity>

          {/* Redirect / Register Section */}
          <View className="items-center mt-4">
            <Text className="text-sm text-[#6B6B6B]">
              Don't have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ChooseAuth")}
              className="mt-1"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-bold text-[#094EE8] underline">
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default Login;