import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { PHONE_RULES } from "@/utils/phoneValidation";

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

const COUNTRY_DIAL_CODES = [
  { dial: "855", code: "+855", name: "Cambodia", example: "855XXXXXXXX" },
  { dial: "880", code: "+880", name: "Bangladesh", example: "880XXXXXXXXXX" },
  { dial: "94", code: "+94", name: "Sri Lanka", example: "947XXXXXXXX" },
  { dial: "84", code: "+84", name: "Vietnam", example: "84XXXXXXXXX" },
  { dial: "91", code: "+91", name: "India", example: "91XXXXXXXXXX" },
  { dial: "31", code: "+31", name: "Netherlands", example: "316XXXXXXXX" },
];

const validateIdentifier = (
  val: string,
): { isValid: boolean; error?: string } => {
  const trimmed = val.trim();
  if (!trimmed) {
    return { isValid: false, error: "Mobile number or email is required" };
  }

  // If input contains '@' or alphabetical letters, validate as email
  if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) {
    if (!isValidEmail(trimmed)) {
      return { isValid: false, error: "Please enter a valid email address" };
    }
    return { isValid: true };
  }

  // Clean phone number (strip spaces and hyphens)
  const cleanPhone = trimmed.replace(/[\s-]/g, "");
  const numWithoutPlus = cleanPhone.startsWith("+")
    ? cleanPhone.slice(1)
    : cleanPhone;

  // Must contain only digits
  if (!/^\d+$/.test(numWithoutPlus)) {
    return {
      isValid: false,
      error: "Please enter a valid mobile number or email address",
    };
  }

  // If user entered a local number (starting with 0 or 7 without country code)
  if (numWithoutPlus.startsWith("0")) {
    return {
      isValid: false,
      error: "Please enter mobile number with country code without + (e.g. 947XXXXXXXX)",
    };
  }
  if (numWithoutPlus.startsWith("7") && numWithoutPlus.length === 9) {
    return {
      isValid: false,
      error: "Please enter mobile number with country code without + (e.g. 947XXXXXXXX)",
    };
  }

  // Match supported country dial code
  const matched = COUNTRY_DIAL_CODES.find((c) =>
    numWithoutPlus.startsWith(c.dial),
  );

  if (!matched) {
    return {
      isValid: false,
      error: "Please enter mobile number with valid country code without + (e.g. 947XXXXXXXX)",
    };
  }

  const nationalNumber = numWithoutPlus.slice(matched.dial.length);
  const rule = PHONE_RULES[matched.code];

  if (!nationalNumber) {
    return {
      isValid: false,
      error: `Please enter mobile number after country code ${matched.dial} (e.g. ${matched.example})`,
    };
  }

  // Specific check for Sri Lanka (starts with 7 and 9 digits)
  if (matched.dial === "94") {
    if (!nationalNumber.startsWith("7")) {
      return {
        isValid: false,
        error: "Sri Lanka mobile number must start with 7 (e.g. 947XXXXXXXX)",
      };
    }
    if (nationalNumber.length !== 9) {
      return {
        isValid: false,
        error: "Sri Lanka mobile number must be 9 digits after 94 (e.g. 947XXXXXXXX)",
      };
    }
    return { isValid: true };
  }

  // Validate against country rule
  if (rule) {
    if (nationalNumber.length !== rule.maxLength) {
      return {
        isValid: false,
        error: `${matched.name} mobile number must be ${rule.maxLength} digits after ${matched.dial} (e.g. ${matched.example})`,
      };
    }
    if (!rule.regex.test(nationalNumber)) {
      return {
        isValid: false,
        error: rule.error,
      };
    }
    return { isValid: true };
  }

  return { isValid: true };
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
        innerRef={(ref) => (scrollViewRef.current = ref as any)}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={0}
        extraHeight={Platform.select({ ios: 40, android: 70 })}
        keyboardOpeningTime={250}
        enableResetScrollToCoords={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingBottom: 16,
        }}
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
                    color="black"
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
                  placeholder="947XXXXXXXX / youremail@gmail.com"
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
                    className="flex-1 text-red-500 text-xs"
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
                    color="black"
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
                    className="flex-1 text-red-500 text-xs"
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
              onPress={() => navigation.navigate("DeliveryLocation")}
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
