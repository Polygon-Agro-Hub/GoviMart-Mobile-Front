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
import { FontAwesome6, Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
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

const isValidEmail = (emailStr: string): boolean => {
  if (!emailStr) return false;
  const trimmed = emailStr.trim();
  if (
    trimmed.includes(" ") ||
    trimmed.includes("..") ||
    trimmed.startsWith(".") ||
    trimmed.endsWith(".")
  ) {
    return false;
  }
  const emailRegex =
    /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.)*[a-zA-Z0-9][a-zA-Z0-9-]{1,}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
  return emailRegex.test(trimmed);
};

const validateIdentifier = (
  val: string,
): { isValid: boolean; error?: string } => {
  const trimmed = val.trim();
  if (!trimmed) {
    return { isValid: false, error: "Mobile number or email is required" };
  }

  // If input contains '@' or alphabetical letters
  if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) {
    if (!isValidEmail(trimmed)) {
      return { isValid: false, error: "Please enter a valid email address" };
    }
    return { isValid: true };
  }

  // Clean phone number (strip all spaces and hyphens)
  const cleanPhone = trimmed.replace(/[\s-]/g, "");

  // Supported countries:
  // 1. Sri Lanka (+94 / 94): 9 digits starting with 7, or local 07... (10 digits), or 7... (9 digits)
  if (/^(\+94|94)7[0-9]{8}$/.test(cleanPhone)) return { isValid: true };
  if (/^07[0-9]{8}$/.test(cleanPhone) || /^7[0-9]{8}$/.test(cleanPhone)) return { isValid: true };

  // 2. Cambodia (+855 / 855): 8 to 9 digits, or local 0 + 8-9 digits
  if (/^(\+855|855)[0-9]{8,9}$/.test(cleanPhone)) return { isValid: true };

  // 3. Vietnam (+84 / 84): 9 digits, or local 0 + 9 digits (10 digits)
  if (/^(\+84|84)[0-9]{9}$/.test(cleanPhone)) return { isValid: true };

  // 4. Bangladesh (+880 / 880): 10 digits (often starts with 1), or local 01 + 9 digits (11 digits)
  if (/^(\+880|880)[0-9]{10}$/.test(cleanPhone)) return { isValid: true };

  // 5. India (+91 / 91): 10 digits, or local 0 + 10 digits (11 digits)
  if (/^(\+91|91)[0-9]{10}$/.test(cleanPhone)) return { isValid: true };

  // 6. Netherlands (+31 / 31): 9 digits (mobile starts with 6), or local 06 + 8 digits (10 digits)
  if (/^(\+31|31)[0-9]{9}$/.test(cleanPhone)) return { isValid: true };

  // Local numbers with leading 0 (8 to 11 digits)
  if (/^0[0-9]{8,10}$/.test(cleanPhone)) return { isValid: true };

  // Generic 9 or 10 digit number without country code
  if (/^[0-9]{9,10}$/.test(cleanPhone)) return { isValid: true };

  // If user entered '+' followed by an unsupported country code or wrong length
  if (cleanPhone.startsWith("+")) {
    return {
      isValid: false,
      error: "Please enter a valid mobile number for a supported country",
    };
  }

  return {
    isValid: false,
    error: "Please enter a valid mobile number or email address",
  };
};

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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
            setIdentifier(storedIdentifier.replace(/\s/g, ""));
          }
          if (storedPassword) {
            setPassword(storedPassword.replace(/\s/g, ""));
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
    let hasError = false;

    const idRes = validateIdentifier(identifier);
    if (!idRes.isValid) {
      setIdentifierError(
        idRes.error || "Please enter a valid mobile number or email address",
      );
      hasError = true;
    } else {
      setIdentifierError("");
    }

    if (!password.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) return;

    setLoading(true);
    try {
      const response = await authService.login({
        identifier: identifier.replace(/\s/g, "").trim(),
        password: password.replace(/\s/g, ""),
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
                className={`w-full bg-white border rounded-full flex-row items-center px-5 ${
                  identifierError
                    ? "border-red-500 bg-red-50/10"
                    : "border-[#E4EBF2]"
                }`}
              >
                <View className="mr-3">
                  <FontAwesome5
                    name="user-alt"
                    size={20}
                    color={identifierError ? "#EF4444" : "black"}
                  />
                </View>
                <TextInput
                  value={identifier}
                  onChangeText={(text) => {
                    const clean = text.replace(/\s/g, "");
                    setIdentifier(clean);
                    if (identifierError) {
                      const res = validateIdentifier(clean);
                      if (res.isValid || !clean) {
                        setIdentifierError("");
                      }
                    }
                  }}
                  onBlur={() => {
                    if (identifier.trim()) {
                      const res = validateIdentifier(identifier);
                      if (!res.isValid) {
                        setIdentifierError(
                          res.error ||
                            "Please enter a valid mobile number or email address",
                        );
                      } else {
                        setIdentifierError("");
                      }
                    }
                  }}
                  placeholder="Mobile Number / Email"
                  placeholderTextColor="black"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: "#000000",
                    ...(Platform.OS === "android"
                      ? {
                          height: 50,
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }
                      : { alignSelf: "center" }),
                  }}
                  className="flex-1 text-[14px] text-black"
                />
              </View>
              {identifierError ? (
                <View className="flex-row items-center mt-1.5 px-4">
                  <MaterialIcons
                    name="error"
                    size={13}
                    color="#E02424"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className="flex-1 text-red-500 text-xs font-semibold"
                    style={{ lineHeight: 16 }}
                  >
                    {identifierError}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Input 2: Password */}
            <View className="mt-4">
              <View
                style={{ height: 50 }}
                className={`w-full bg-white border rounded-full flex-row items-center px-5 ${
                  passwordError
                    ? "border-red-500 bg-red-50/10"
                    : "border-[#E4EBF2]"
                }`}
              >
                <View className="mr-3 ml-1">
                  <FontAwesome6
                    name="lock"
                    size={18}
                    color={passwordError ? "#EF4444" : "black"}
                  />
                </View>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text.replace(/\s/g, ""));
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Password"
                  placeholderTextColor="black"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: "#000000",
                    ...(Platform.OS === "android"
                      ? {
                          height: 50,
                          textAlignVertical: "center",
                          includeFontPadding: false,
                        }
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
              {passwordError ? (
                <View className="flex-row items-center mt-1.5 px-4">
                  <MaterialIcons
                    name="error"
                    size={13}
                    color="#E02424"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className="flex-1 text-red-500 text-xs font-semibold"
                    style={{ lineHeight: 16 }}
                  >
                    {passwordError}
                  </Text>
                </View>
              ) : null}
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
