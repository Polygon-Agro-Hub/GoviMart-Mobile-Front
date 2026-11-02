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
  Modal,
} from "react-native";
import LottieView from "lottie-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import Svg, { Path } from "react-native-svg";

/**
 * Wholesale verification pending hourglass icon matching design
 */
const PendingHourglassIcon: React.FC<{
  width?: number;
  height?: number;
  color?: string;
}> = ({ width = 28, height = 42, color = "#D97706" }) => (
  <Svg width={width} height={height} viewBox="0 0 41 62" fill="none">
    <Path
      fill={color}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 0H41V12C41 18 30.5 22 30.5 26V31C30.5 35 41 39 41 45V57Q41 62 36 62H5Q0 62 0 57V45C0 39 10.5 35 10.5 31V26C10.5 22 0 18 0 12ZM6.5 6H34.5V12C34.5 17 27 25 20.5 25C14 25 6.5 17 6.5 12ZM6.5 56H34.5V50C34.5 45 27 37 20.5 37C14 37 6.5 45 6.5 50Z"
    />
  </Svg>
);

/**
 * Wholesale verification pending mini shield checkmark icon matching design
 */
const PendingShieldCheckIcon: React.FC<{
  size?: number;
  color?: string;
}> = ({ size = 16, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
    <Path
      fill="none"
      stroke={color}
      strokeWidth={42}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48 175.29 84.45 138.32 96.33 48.9 112.37 32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z"
    />
    <Path
      fill="none"
      stroke={color}
      strokeWidth={44}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m160 256 64 64 128-128"
    />
  </Svg>
);
import {
  FontAwesome6,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
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

const formatSubmittedDate = (dateStr?: string | null) => {
  if (!dateStr) return "Today, 10:42 AM";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today, ${time}`;
    }

    const day = d.getDate();
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[d.getMonth()];

    return `${time}, ${ordinal(day)} ${month}`;
  } catch {
    return dateStr;
  }
};

const extractDocName = (url?: string | null) => {
  if (!url) return "BR_Certificate_Scan.jpg";
  try {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || "BR_Certificate_Scan.jpg";
  } catch {
    return "BR_Certificate_Scan.jpg";
  }
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
  const [wholesalePendingModalVisible, setWholesalePendingModalVisible] = useState(false);
  const [wholesalePendingData, setWholesalePendingData] = useState<{
    userId?: number;
    approveStatus?: string;
    brImg?: string;
    submittedDate?: string;
    approvedAt?: string;
  } | null>(null);
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
      } else if (response.data?.wholesaleStatus === "To Review") {
        setWholesalePendingData(response.data.data);
        setWholesalePendingModalVisible(true);
        return;
      } else if (response.data?.wholesaleStatus === "Rejected") {
        navigation.navigate("VerificationUnsuccessful", {
          userId: response.data.data?.userId,
          approveStatus: response.data.data?.approveStatus,
          brImg: response.data.data?.brImg,
          submittedDate: response.data.data?.submittedDate,
          approvedAt: response.data.data?.approvedAt,
        });
        return;
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
      const wholesaleStatus = error.response?.data?.wholesaleStatus;
      const wholesaleData = error.response?.data?.data;
      if (wholesaleStatus === "To Review") {
        setWholesalePendingData(wholesaleData);
        setWholesalePendingModalVisible(true);
        return;
      }
      if (wholesaleStatus === "Rejected") {
        navigation.navigate("VerificationUnsuccessful", {
          userId: wholesaleData?.userId,
          approveStatus: wholesaleData?.approveStatus,
          brImg: wholesaleData?.brImg,
          submittedDate: wholesaleData?.submittedDate,
          approvedAt: wholesaleData?.approvedAt,
        });
        return;
      }

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

              {/* Username Tip Component */}
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={16}
                  color="#64748B"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "600",
                    color: "#475569",
                    marginRight: 6,
                  }}
                >
                  Username :
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: "#64748B",
                      lineHeight: 14.5,
                    }}
                  >
                    Mobile number requires country code{"\n"}
                    (e.g. 947XXXXXXXX) or use email address
                  </Text>
                </View>
              </View>
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

      {/* Wholesale Verification Pending Modal */}
      <Modal
        visible={wholesalePendingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWholesalePendingModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: Platform.OS === "ios" ? 40 : 28,
            }}
          >
            {/* Top Icon with Hourglass & Overlapping Mini Shield */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  backgroundColor: "#FFF8E6",
                  borderWidth: 1.5,
                  borderColor: "#FDE8AF",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <PendingHourglassIcon width={28} height={42} color="#D97706" />

                {/* Overlapping Mini Shield Verification Badge */}
                <View
                  style={{
                    position: "absolute",
                    bottom: -5,
                    right: -5,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#281E4B",
                    borderWidth: 2.5,
                    borderColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.16,
                    shadowRadius: 3,
                    elevation: 4,
                  }}
                >
                  <PendingShieldCheckIcon size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#0F172A",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Wholesale Verification Pending
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 22,
                paddingHorizontal: 8,
              }}
            >
              Your wholesale account registration and business documents are currently being verified by our team. This process typically takes 24–48 hours to ensure all trade compliance standards are met.
            </Text>

            {/* Status Card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: 18,
                padding: 16,
                marginBottom: 24,
              }}
            >
              {/* Row 1: Review Status */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
                  Review Status
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFF5E9",
                    borderWidth: 1,
                    borderColor: "#FF9114",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#FF9114",
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      color: "#FF9114",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Pending Approval
                  </Text>
                </View>
              </View>

              {/* Row 2: Submitted Date */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
                  Submitted Date
                </Text>
                <Text
                  style={{
                    color: "#0F172A",
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {formatSubmittedDate(wholesalePendingData?.submittedDate)}
                </Text>
              </View>

              {/* Row 3: Submitted Document */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
                  Submitted Document
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#00C8B3",
                    fontSize: 13,
                    fontWeight: "600",
                    maxWidth: "55%",
                    textDecorationLine: "underline",
                    textDecorationColor: "#A7F3D0",
                  }}
                >
                  {extractDocName(wholesalePendingData?.brImg)}
                </Text>
              </View>
            </View>

            {/* Bottom Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setWholesalePendingModalVisible(false)}
              style={{
                backgroundColor: "#000000",
                borderRadius: 999,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Got it, check back later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Login;
