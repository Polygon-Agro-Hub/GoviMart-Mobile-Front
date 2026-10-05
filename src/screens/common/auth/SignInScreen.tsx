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
  Platform,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { useDispatch } from "react-redux";
import { loginSuccess, setRememberMeDetails } from "@/store/authSlice";
import { setCartFromBackend } from "@/store/cartSlice";
import authService from "@/services/auth/auth.service";
import cartService from "@/services/cart/cart.service";
import * as SecureStore from "expo-secure-store";
import { tokenStorage } from "@/utils/tokenStorage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import socketService from "@/services/socket/socket.service";
import pushNotificationService from "@/services/notification/pushNotification.service";
import { AlertModal } from "@/component/common/AlertModal";

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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const dispatch = useDispatch();

  const isValid = identifier.trim() !== "" && password.trim() !== "";

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

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
          title,
          email,
          phoneNumber,
          image,
          firstTimeUser,
          buyerType,
          isDashUser,
          isPswUpdated,
          cusId,
        } = response.data.data;
        const loginTime = Date.now();

        await AsyncStorage.setItem("userLoginTime", loginTime.toString());
        await tokenStorage.setToken(token);
        const userProfile = {
          firstName,
          lastName,
          title,
          email,
          phoneNumber,
          image,
          firstTimeUser,
          buyerType,
          cusId,
          id: response.data.data.id,
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));

        dispatch(loginSuccess({ token, userProfile, loginTime }));
        if (userProfile.id) {
          socketService.registerUser(userProfile.id, token);
          pushNotificationService.registerPushToken().catch(() => { });
        }

        // Fetch this logged-in user's cart from backend
        try {
          const dbCartRes = await cartService.getUserCart();
          if (dbCartRes.data?.status && dbCartRes.data?.data) {
            const dbProducts = dbCartRes.data.data.products || [];
            const dbPackages = dbCartRes.data.data.packages || [];
            dispatch(
              setCartFromBackend({
                products: dbProducts,
                packages: dbPackages,
                cartUserId: userProfile.id,
              })
            );
          }
        } catch (cartErr) {
          console.log("Failed to sync cart on login:", cartErr);
        }

        if (rememberMe) {
          await AsyncStorage.setItem("rememberMeEnabled", "true");
          await AsyncStorage.setItem("rememberedIdentifier", identifier.trim());
          if (refreshToken) {
            await tokenStorage.setRefreshToken(refreshToken);
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
            onPress: async () => {
              const isWholesale =
                (buyerType || "").toLowerCase() === "wholesale";

              let targetScreen: keyof RootStackParamList = "Home";
              let targetParams: any = undefined;

              if (isDashUser === 1 && isPswUpdated === 0) {
                targetScreen = "UpdatePassword";
                targetParams = {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  title: title,
                  number: phoneNumber,
                  cusId: cusId,
                  buyerType: buyerType,
                  redirectTo: isWholesale ? "Home" : "ExcludeListAdd",
                };
              } else if (firstTimeUser === 0 && !isWholesale) {
                targetScreen = "ExcludeListAdd";
                targetParams = {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  title: title,
                  number: phoneNumber,
                  cusId: cusId,
                };
              } else {
                targetScreen = "Home";
              }

              try {
                const hasAsked = await AsyncStorage.getItem(
                  "hasAskedNotificationPermission",
                );

                if (hasAsked !== "true") {
                  navigation.navigate("NotificationAccess", {
                    returnScreen: targetScreen,
                    returnParams: targetParams,
                    blockBackNavigation: true,
                  });
                  return;
                }
              } catch (err) {
                console.warn("Error reading notification permission flag:", err);
              }

              if (targetParams) {
                navigation.navigate(targetScreen as any, targetParams);
              } else {
                navigation.navigate(targetScreen as any);
              }
            },
          },
        ]);
      } else {
        const msg = response.data?.message || "An error occurred during login.";
        if (
          msg.toLowerCase().includes("the password you entered is incorrect") ||
          (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("incorrect"))
        ) {
          setAlertTitle("Incorrect Password");
          setAlertMessage(
            "The password you entered is incorrect.\nPlease check and re-enter."
          );
          setAlertVisible(true);
        } else {
          setAlertTitle("Login Failed");
          setAlertMessage(msg);
          setAlertVisible(true);
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to connect to server.";
      if (
        errorMsg.toLowerCase().includes("the password you entered is incorrect") ||
        (errorMsg.toLowerCase().includes("password") && errorMsg.toLowerCase().includes("incorrect"))
      ) {
        setAlertTitle("Incorrect Password");
        setAlertMessage(
          "The password you entered is incorrect.\nPlease check and re-enter."
        );
        setAlertVisible(true);
      } else {
        setAlertTitle("Login Error");
        setAlertMessage(errorMsg);
        setAlertVisible(true);
      }
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
            <Text className="text-2xl  font-bold text-[#001535] mt-2">
              Welcome to Polygon
            </Text>
          </View>

          {/* Form Fields Section */}
          <View className="space-y-4">
            {/* Input 1: Mobile / Email */}
            <View>
              <View
                style={{ height: 50 }}
                className="w-full bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5"
              >
                <View className="mr-3">
                  <FontAwesome5 name="user-alt" size={20} color="black" />
                </View>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Mobile Number / Email"
                  placeholderTextColor="black"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: "#000000",
                    ...(Platform.OS === "android"
                      ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                      : { alignSelf: "center" }),
                  }}
                  className="flex-1 text-[14px] text-black"
                />
              </View>
            </View>

            {/* Input 2: Password */}
            <View className="mt-4">
              <View
                style={{ height: 50 }}
                className="w-full bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5"
              >
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
                  style={{
                    flex: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: "#000000",
                    ...(Platform.OS === "android"
                      ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                      : { alignSelf: "center" }),
                  }}
                  className="flex-1 text-[14px] text-black"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="pl-2 h-full justify-center"
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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text className="text-sm font-bold text-[#094EE8]">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={{ height: 50 }}
            className={`w-full rounded-full items-center justify-center flex-row mt-8 ${isValid ? "bg-black" : "bg-[#7F919C]"}`}
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
          <View className="flex-row items-center justify-center mt-5 mb-2 flex-wrap">
            <Text className="text-sm text-[#6B6B6B]">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ChooseAuth")}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm font-bold text-[#094EE8] underline">
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type="error"
        onClose={() => setAlertVisible(false)}
        autoClose={false}
        showOkButton={true}
      />
    </View>
  );
};

export default Login;
