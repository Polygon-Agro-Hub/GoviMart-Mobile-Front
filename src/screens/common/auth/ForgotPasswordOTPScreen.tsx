import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import authService from "@/services/auth/auth.service";
import { AlertModal } from "@/component/common/AlertModal";
import { getForgotPwdStorageKeys } from "./ForgotPasswordInputScreen";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPasswordOTP"
>;
type ScreenRouteProp = RouteProp<
  RootStackParamList,
  "ForgotPasswordOTP"
>;

interface Props {
  route: ScreenRouteProp;
  navigation: NavigationProp;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 5;

const ForgotPasswordOTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const method = route.params?.method || "email";
  const identifier = route.params?.identifier || "";
  const [referenceId, setReferenceId] = useState(
    route.params?.referenceId || ""
  );
  const [resetToken, setResetToken] = useState(
    route.params?.resetToken || ""
  );

  const { lockoutKeys, attemptsKeys } = getForgotPwdStorageKeys(
    method,
    undefined,
    undefined,
    undefined,
    identifier,
  );
  const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const storageKey = attemptsKeys[0] || `@forgot_pwd_otp_attempts_${cleanIdentifier}`;
  const lockoutKey = lockoutKeys[0] || `@forgot_pwd_lockout_${cleanIdentifier}`;

  // State Management
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(240); // 4:00 countdown for both SMS and Email
  const [isExpired, setIsExpired] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - attemptsCount);

  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");

  // Input Refs
  const ref_1 = useRef<TextInput>(null);
  const ref_2 = useRef<TextInput>(null);
  const ref_3 = useRef<TextInput>(null);
  const ref_4 = useRef<TextInput>(null);
  const ref_5 = useRef<TextInput>(null);

  const refs = [ref_1, ref_2, ref_3, ref_4, ref_5];

  const getRecentAttempts = async (key: string): Promise<number[]> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const timestamps: number[] = JSON.parse(raw);
      const now = Date.now();
      return timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    } catch {
      return [];
    }
  };

  const saveAttempt = async (key: string): Promise<number[]> => {
    try {
      const recent = await getRecentAttempts(key);
      const updated = [...recent, Date.now()];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  };

  const clearAttempts = async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  };

  // Check rate limit on initial mount
  useEffect(() => {
    const checkInitialRateLimit = async () => {
      // 1. Check persistent lockout
      for (const key of lockoutKeys) {
        try {
          const storedLockout = await AsyncStorage.getItem(key);
          if (storedLockout) {
            const lockoutUntil = parseInt(storedLockout, 10);
            const remainingMs = lockoutUntil - Date.now();
            if (remainingMs > 0) {
              const remainingSec = Math.ceil(remainingMs / 1000);
              setTimeLeft(remainingSec);
              setIsRateLimited(true);
              setIsExpired(false);
              setAlertType("error");
              setAlertTitle("Too Many Attempts");
              setAlertMessage(
                "Too many verification attempts. Please try again after 15 minutes."
              );
              setAlertVisible(true);
              return;
            } else {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.log("Error checking stored lockout:", e);
        }
      }

      // 2. Check recent attempts count
      for (const key of attemptsKeys) {
        const attempts = await getRecentAttempts(key);
        if (attempts.length >= MAX_OTP_ATTEMPTS) {
          const oldest = attempts[0];
          const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
          const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 900);
          const lockoutUntil = Date.now() + remainingSec * 1000;
          for (const lockKey of lockoutKeys) {
            await AsyncStorage.setItem(lockKey, String(lockoutUntil));
          }
          setTimeLeft(remainingSec);
          setIsRateLimited(true);
          setIsExpired(false);
          setAlertType("error");
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes."
          );
          setAlertVisible(true);
          return;
        }
      }

      const attempts = await getRecentAttempts(storageKey);
      const lastAttempt = attempts[attempts.length - 1];
      if (!lastAttempt || Date.now() - lastAttempt > 30000) {
        let currentCount = 1;
        for (const attKey of attemptsKeys) {
          const updated = await saveAttempt(attKey);
          currentCount = updated.length;
        }
        setAttemptsCount(Math.min(currentCount, MAX_OTP_ATTEMPTS));
      } else {
        setAttemptsCount(Math.min(attempts.length || 1, MAX_OTP_ATTEMPTS));
      }
    };
    checkInitialRateLimit();
  }, [identifier]);

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (isRateLimited) {
        setIsRateLimited(false);
      }
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isRateLimited]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChangeText = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    if (!cleanText) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText.slice(-1);
    setOtp(newOtp);

    // Auto-focus next box
    if (index < 4) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        refs[index - 1].current?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 5) {
      setAlertType("error");
      setAlertTitle("Invalid Code");
      setAlertMessage("Please enter the full 5-digit verification code.");
      setAlertVisible(true);
      return;
    }

    if (isExpired) {
      setAlertType("error");
      setAlertTitle("Code Expired");
      setAlertMessage(
        "Your verification code has expired. Please request a new code."
      );
      setAlertVisible(true);
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authService.verifyForgotPasswordOtp({
        code,
        referenceId,
        resetToken,
      });

      if (response.data && response.data.status) {
        for (const key of attemptsKeys) {
          await clearAttempts(key);
        }
        for (const key of lockoutKeys) {
          await AsyncStorage.removeItem(key);
        }
        navigation.navigate("ResetPassword", {
          verifiedResetToken: response.data.verifiedResetToken,
        });
      } else {
        const is429 = response.data?.isRateLimited;
        const msg = response.data?.message || "Failed to verify the code.";
        setAlertType("error");
        if (is429 || msg.toLowerCase().includes("too many")) {
          const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
          for (const key of lockoutKeys) {
            await AsyncStorage.setItem(key, String(lockoutUntil));
          }
          setTimeLeft(900);
          setIsRateLimited(true);
          setIsExpired(false);
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes."
          );
        } else {
          setAlertTitle("Verification Failed");
          setAlertMessage(msg);
          setOtp(["", "", "", "", ""]);
          refs[0].current?.focus();
        }
        setAlertVisible(true);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      setAlertType("error");
      if (is429 || msg.toLowerCase().includes("too many")) {
        const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
        for (const key of lockoutKeys) {
          await AsyncStorage.setItem(key, String(lockoutUntil));
        }
        setTimeLeft(900);
        setIsRateLimited(true);
        setIsExpired(false);
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes."
        );
      } else {
        setAlertTitle("Verification Error");
        setAlertMessage(msg);
        setOtp(["", "", "", "", ""]);
        refs[0].current?.focus();
      }
      setAlertVisible(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // 1. Check persistent lockout
    for (const key of lockoutKeys) {
      try {
        const storedLockout = await AsyncStorage.getItem(key);
        if (storedLockout) {
          const lockoutUntil = parseInt(storedLockout, 10);
          const remainingMs = lockoutUntil - Date.now();
          if (remainingMs > 0) {
            const remainingSec = Math.ceil(remainingMs / 1000);
            setTimeLeft(remainingSec);
            setIsRateLimited(true);
            setIsExpired(false);
            setAlertType("error");
            setAlertTitle("Too Many Attempts");
            setAlertMessage(
              "Too many verification attempts. Please try again after 15 minutes."
            );
            setAlertVisible(true);
            return;
          } else {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (e) {}
    }

    for (const key of attemptsKeys) {
      const attempts = await getRecentAttempts(key);
      if (attempts.length >= MAX_OTP_ATTEMPTS) {
        const oldest = attempts[0];
        const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
        const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 900);
        const lockoutUntil = Date.now() + remainingSec * 1000;
        for (const lockKey of lockoutKeys) {
          await AsyncStorage.setItem(lockKey, String(lockoutUntil));
        }
        setTimeLeft(remainingSec);
        setIsRateLimited(true);
        setIsExpired(false);
        setAlertType("error");
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes."
        );
        setAlertVisible(true);
        return;
      }
    }

    setOtp(["", "", "", "", ""]);
    setIsResending(true);
    try {
      const response = await authService.resendForgotPasswordOtp({
        resetToken,
      });

      if (response.data && response.data.status) {
        let updatedLength = 0;
        for (const key of attemptsKeys) {
          const updated = await saveAttempt(key);
          updatedLength = updated.length;
        }
        setAttemptsCount(Math.min(updatedLength, MAX_OTP_ATTEMPTS));
        setReferenceId(response.data.referenceId);
        setResetToken(response.data.resetToken);

        if (updatedLength >= MAX_OTP_ATTEMPTS) {
          const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
          for (const key of lockoutKeys) {
            await AsyncStorage.setItem(key, String(lockoutUntil));
          }
          setTimeLeft(900);
          setIsRateLimited(true);
          setIsExpired(false);
          setAlertType("error");
          setAlertTitle("Code Resent");
          setAlertMessage(
            "A new 5-digit verification code has been sent. You have reached the maximum limit of 5 OTP requests. Next attempt will be available after 15 minutes.",
          );
          setAlertVisible(true);
        } else {
          setTimeLeft(240);
          setIsExpired(false);
          const remaining = MAX_OTP_ATTEMPTS - updatedLength;
          setAlertType("success");
          setAlertTitle("Code Resent");
          setAlertMessage(
            `${response.data.message || (method === "email" ? "Verification code has been resent to your email address." : "Verification code has been resent to your mobile number.")}\n\n(5 OTP resend attempts limit · ${remaining} remaining)`
          );
          setAlertVisible(true);
        }
        refs[0].current?.focus();
      } else {
        const is429 = response.data?.isRateLimited;
        const msg =
          response.data?.message || "Failed to resend verification code.";
        setAlertType("error");
        if (is429 || msg.toLowerCase().includes("too many")) {
          const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
          for (const key of lockoutKeys) {
            await AsyncStorage.setItem(key, String(lockoutUntil));
          }
          setTimeLeft(900);
          setIsRateLimited(true);
          setIsExpired(false);
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes."
          );
        } else {
          setAlertTitle("Resend Failed");
          setAlertMessage(msg);
        }
        setAlertVisible(true);
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message || "Failed to resend verification code.";
      setAlertType("error");
      if (is429 || msg.toLowerCase().includes("too many")) {
        const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
        for (const key of lockoutKeys) {
          await AsyncStorage.setItem(key, String(lockoutUntil));
        }
        setTimeLeft(900);
        setIsRateLimited(true);
        setIsExpired(false);
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes."
        );
      } else {
        setAlertTitle("Resend Error");
        setAlertMessage(msg);
      }
      setAlertVisible(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header with Logo instead of Title, same as Create Account OTP */}
      <CustomHeader
        showLogo={true}
        showBackButton={true}
        navigation={navigation}
      />

      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref as any)}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: 20,
        }}
        className="flex-1 px-4 bg-white"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 0}
        extraHeight={Platform.OS === "ios" ? 40 : 0}
        keyboardOpeningTime={0}
      >
        {/* Verification Content */}
        <View className="w-full py-4">
          <Text className="text-2xl font-bold text-black text-center mb-4">
            {method === "email"
              ? "Verify your email address"
              : "Verify your mobile number"}
          </Text>

          <Text className="text-sm font-semibold text-[#5A5859] text-center mb-2">
            We’ve sent a 5-digit verification code to :
          </Text>

          {/* Phone Number / Email Display with Icon */}
          <View className="flex-row items-center justify-center gap-x-2 mt-4 mb-6 bg-[#F2F2F6] px-4 py-2 rounded-full self-center">
            {method === "email" ? (
              <MaterialIcons name="email" size={14} color="#5A5859" />
            ) : (
              <FontAwesome5 name="phone-alt" size={14} color="#5A5859" />
            )}
            <Text className="text-sm font-bold text-[#5A5859]">
              {identifier}
            </Text>
          </View>

          {/* 5 OTP Digit Input Boxes */}
          <View className="flex-row justify-between my-6 px-2">
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              return (
                <View
                  key={index}
                  className="w-[50px] h-[50px] border rounded-xl justify-center items-center bg-white"
                  style={{
                    borderColor: isFocused ? "#FF9114" : "#000000",
                    borderWidth: isFocused ? 2 : 1,
                  }}
                >
                  <TextInput
                    ref={refs[index]}
                    value={digit}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    keyboardType="number-pad"
                    style={{
                      textAlign: "center",
                      textAlignVertical: "center",
                      fontSize: 20,
                      fontWeight: "bold",
                      color: "#000000",
                      paddingTop: 0,
                      paddingBottom: 0,
                      paddingVertical: 0,
                      paddingHorizontal: 0,
                      margin: 0,
                      width: "100%",
                      height: "100%",
                      ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                    }}
                    maxLength={1}
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </View>

          {/* Rate Limit / Code Expired Banner */}
          {isRateLimited && timeLeft > 0 ? (
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-4 border-0">
              <FontAwesome5
                name="info-circle"
                size={16}
                color="#FF9114"
                style={{ alignSelf: "center" }}
              />
              <View className="flex-1">
                <Text className="text-sm font-bold text-black mb-1">
                  Too Many Attempts!
                </Text>
                <Text className="text-xs text-black leading-relaxed">
                  Too many verification attempts. Please try again after 15 minutes.
                </Text>
              </View>
            </View>
          ) : isExpired ? (
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-4 border-0">
              <FontAwesome5
                name="info-circle"
                size={16}
                color="black"
                style={{ alignSelf: "center" }}
              />
              <View className="flex-1">
                <Text className="text-sm font-bold text-black mb-1">
                  Code Expired!
                </Text>
                <Text className="text-xs text-black leading-relaxed">
                  Your verification code has expired. Please request a new code
                  to continue.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Resend Helper / Countdown Details */}
          <View className="mt-8 w-full">
            {/* Divider lines next to Didn't receive the code */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="text-sm font-semibold text-[#5A5859] mx-4">
                Didn’t receive the code ?
              </Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {timeLeft > 0 ? (
              <View className="flex-row justify-center items-center gap-x-2 mt-2">
                <AntDesign name="reload" size={14} color="#FF9114" />
                <Text className="text-sm font-semibold text-black">
                  Resend OTP in{" "}
                </Text>
                <Text className="text-sm font-semibold text-[#FF9114]">
                  {formatTime(timeLeft)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isVerifying || isResending}
                activeOpacity={0.7}
                className="flex-row justify-center items-center gap-x-2 mt-2"
              >
                <AntDesign name="reload" size={14} color="#FF9114" />
                <Text className="text-sm font-bold text-[#FF9114] underline">
                  {isResending
                    ? "Resending..."
                    : method === "email"
                      ? "Resend Email"
                      : "Resend SMS"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-2 pb-0 pt-4 bg-white">
          {/* Verify Button (Always shown) */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={isVerifying || isResending}
            activeOpacity={0.8}
            className="bg-black rounded-full items-center justify-center h-[50px] w-full"
          >
            <Text className="text-white text-base font-bold">
              {isVerifying ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>
          <View
            className="h-14 mt-4"
            style={{ marginLeft: -16, marginRight: -16 }}
          >
            <Image
              source={require("@/assets/images/auth/bottom-line.webp")}
              style={{ width: "100%", height: "100%", resizeMode: "stretch" }}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
        autoClose={false}
        showOkButton={true}
      />
    </View>
  );
};

export default ForgotPasswordOTPScreen;
