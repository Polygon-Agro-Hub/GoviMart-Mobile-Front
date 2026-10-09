import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import authService from "@/services/auth/auth.service";
import { AlertModal } from "@/component/common/AlertModal";
import { getForgotPwdStorageKeys } from "./ForgotPasswordInputScreen";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPasswordOTP"
>;
type ScreenRouteProp = RouteProp<RootStackParamList, "ForgotPasswordOTP">;

interface Props {
  route: ScreenRouteProp;
  navigation: NavigationProp;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 60 minutes window to count attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout duration
const MAX_OTP_ATTEMPTS = 5;
const OTP_TIMER_SECONDS = 240; // 4 minutes
const LOCKOUT_SECONDS = LOCKOUT_DURATION_MS / 1000; // 900 seconds (15 minutes)

// Space (px) to keep between the Verify button and the top of the keyboard.
const VERIFY_EXTRA_SPACE = 16;

const ForgotPasswordOTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const method = route.params?.method || "email";
  const identifier = route.params?.identifier || "";
  const emailParam = route.params?.email;
  const phoneCodeParam = route.params?.phoneCode;
  const phoneNumberParam = route.params?.phoneNumber;
  const [referenceId, setReferenceId] = useState(
    route.params?.referenceId || ""
  );
  const [resetToken, setResetToken] = useState(route.params?.resetToken || "");

  const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  const { lockoutKeys, attemptsKeys } = getForgotPwdStorageKeys(
    method,
    emailParam,
    phoneCodeParam,
    phoneNumberParam,
    identifier
  );
  const storageKey = attemptsKeys[0] || `@forgot_pwd_otp_attempts_${cleanIdentifier}`;

  // State Management
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // Synchronous lock to block double-tap on Resend (state updates too late)
  const resendLockRef = useRef(false);

  // ---------- Keyboard / scroll handling ----------
  const scrollRef = useRef<ScrollView>(null);
  const rootRef = useRef<View>(null);
  const verifyWrapRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);

  // Scroll only as much as needed so the Verify button sits just above
  // the keyboard.
  const ensureVisible = useCallback(() => {
    verifyWrapRef.current?.measureInWindow((_x, y, _w, h) => {
      const limit = keyboardTopRef.current - VERIFY_EXTRA_SPACE;
      const overflow = y + h - limit;
      if (overflow > 0) {
        scrollRef.current?.scrollTo({
          y: scrollYRef.current + overflow,
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      setIsKeyboardVisible(true);

      // Measure how much the keyboard REALLY covers the screen. If the OS
      // already resized the window, the overlap is 0 and no extra padding
      // is added.
      const kbTop = e.endCoordinates.screenY;
      setTimeout(() => {
        rootRef.current?.measureInWindow((_rx, ry, _rw, rh) => {
          setKeyboardHeight(Math.max(0, ry + rh - kbTop));
        });
      }, 100);

      // wait for bottom padding to render, then scroll
      setTimeout(ensureVisible, 300);
    });

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [ensureVisible]);

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

  const showRateLimitAlert = () => {
    setAlertType("error");
    setAlertTitle("Too Many Attempts");
    setAlertMessage(
      "Too many verification attempts. Please try again after 15 minutes."
    );
    setAlertVisible(true);
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
              setAttemptsCount(MAX_OTP_ATTEMPTS);
              showRateLimitAlert();
              return;
            } else {
              await AsyncStorage.removeItem(key);
              for (const attKey of attemptsKeys) {
                await AsyncStorage.removeItem(attKey);
              }
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
          await applyRateLimitLockout();
          return;
        }
      }

      // 3. Count the initial OTP send as an attempt (once per 30s window)
      const attempts = await getRecentAttempts(storageKey);
      const lastAttempt = attempts[attempts.length - 1];
      if (!lastAttempt || Date.now() - lastAttempt > 30000) {
        let currentCount = 1;
        for (const attKey of attemptsKeys) {
          const updated = await saveAttempt(attKey);
          currentCount = Math.max(currentCount, updated.length);
        }
        setAttemptsCount(Math.min(currentCount, MAX_OTP_ATTEMPTS));
      } else {
        setAttemptsCount(Math.min(attempts.length || 1, MAX_OTP_ATTEMPTS));
      }
    };
    checkInitialRateLimit();
  }, [identifier, method]);

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (isRateLimited) {
        setIsRateLimited(false);
        (async () => {
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          setAttemptsCount(0);
        })();
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

  const applyRateLimitLockout = async () => {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    for (const key of lockoutKeys) {
      await AsyncStorage.setItem(key, String(lockoutUntil));
    }
    setTimeLeft(LOCKOUT_SECONDS);
    setIsRateLimited(true);
    setIsExpired(false);
    setAttemptsCount(MAX_OTP_ATTEMPTS);
    showRateLimitAlert();
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
        if (is429 || msg.toLowerCase().includes("too many")) {
          await applyRateLimitLockout();
        } else {
          setAlertType("error");
          setAlertTitle("Verification Failed");
          setAlertMessage(msg);
          setAlertVisible(true);
          setOtp(["", "", "", "", ""]);
          refs[0].current?.focus();
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (is429 || msg.toLowerCase().includes("too many")) {
        await applyRateLimitLockout();
      } else {
        setAlertType("error");
        setAlertTitle("Verification Error");
        setAlertMessage(msg);
        setAlertVisible(true);
        setOtp(["", "", "", "", ""]);
        refs[0].current?.focus();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // Block double taps (ref updates synchronously, state does not)
    if (resendLockRef.current) return;
    resendLockRef.current = true;

    try {
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
              setAttemptsCount(MAX_OTP_ATTEMPTS);
              showRateLimitAlert();
              return;
            } else {
              await AsyncStorage.removeItem(key);
              for (const attKey of attemptsKeys) {
                await AsyncStorage.removeItem(attKey);
              }
            }
          }
        } catch (e) {}
      }

      // 2. Check attempts count BEFORE sending
      for (const key of attemptsKeys) {
        const attempts = await getRecentAttempts(key);
        if (attempts.length >= MAX_OTP_ATTEMPTS) {
          await applyRateLimitLockout();
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
            updatedLength = Math.max(updatedLength, updated.length);
          }
          setAttemptsCount(Math.min(updatedLength, MAX_OTP_ATTEMPTS));
          setReferenceId(response.data.referenceId);
          setResetToken(response.data.resetToken);

          if (updatedLength >= MAX_OTP_ATTEMPTS) {
            const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
            for (const key of lockoutKeys) {
              await AsyncStorage.setItem(key, String(lockoutUntil));
            }
            setTimeLeft(LOCKOUT_SECONDS);
            setIsRateLimited(true);
            setIsExpired(false);
            setAlertType("error");
            setAlertTitle("Code Resent");
            setAlertMessage(
              `${
                method === "email"
                  ? "A new 5-digit verification code has been sent to your email address."
                  : "A new 5-digit verification code has been sent to your mobile number."
              } You have reached the maximum limit of 5 OTP requests. Next attempt will be available after 15 minutes.`
            );
            setAlertVisible(true);
          } else {
            setTimeLeft(OTP_TIMER_SECONDS);
            setIsExpired(false);
            const remaining = Math.max(0, MAX_OTP_ATTEMPTS - updatedLength);
            setAlertType("success");
            setAlertTitle("Code Resent");
            setAlertMessage(
              `${
                response.data.message ||
                (method === "email"
                  ? "Verification code has been resent to your email address."
                  : "Verification code has been resent to your mobile number.")
              }\n\n(5 OTP resend attempts limit · ${remaining} remaining)`
            );
            setAlertVisible(true);
          }
          refs[0].current?.focus();
        } else {
          const is429 = response.data?.isRateLimited;
          const msg =
            response.data?.message || "Failed to resend verification code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            await applyRateLimitLockout();
          } else {
            setAlertType("error");
            setAlertTitle("Resend Failed");
            setAlertMessage(msg);
            setAlertVisible(true);
          }
        }
      } catch (err: any) {
        console.error("Resend error:", err);
        const is429 = err.response?.status === 429;
        const msg =
          err.response?.data?.message || "Failed to resend verification code.";
        if (is429 || msg.toLowerCase().includes("too many")) {
          await applyRateLimitLockout();
        } else {
          setAlertType("error");
          setAlertTitle("Resend Error");
          setAlertMessage(msg);
          setAlertVisible(true);
        }
      } finally {
        setIsResending(false);
      }
    } finally {
      resendLockRef.current = false;
    }
  };

  return (
    <View ref={rootRef} collapsable={false} className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header with Logo */}
      <CustomHeader
        showLogo={true}
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-white"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: keyboardHeight,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Verification Content */}
        <View className="w-full px-4 py-8 justify-center">
          <Text className="text-2xl font-bold text-black text-center mb-4">
            {method === "email"
              ? "Verify your email address"
              : "Verify your mobile number"}
          </Text>

          <Text className="text-sm font-semibold text-[#5A5859] text-center mb-2">
            We’ve sent a 5-digit verification code to :
          </Text>

          {/* Phone Number / Email Display with Icon */}
          <View className="flex-row items-center justify-center gap-x-2 mt-6 mb-8 bg-[#F2F2F6] px-4 py-2 rounded-full self-center">
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
          <View className="flex-row justify-between my-8 px-2">
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
                      ...(Platform.OS === "android"
                        ? { includeFontPadding: false }
                        : {}),
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
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-6 border-0">
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
                  Too many verification attempts. Please try again after 15
                  minutes.
                </Text>
              </View>
            </View>
          ) : isExpired ? (
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-6 border-0">
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
          <View className="mt-12 w-full">
            <View className="flex-row items-center my-6">
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

            {!isRateLimited && remainingAttempts > 0 && (
              <Text className="text-xs text-[#5A5859] text-center mt-2 font-medium">
                ({remainingAttempts} {remainingAttempts === 1 ? "attempt" : "attempts"} remaining)
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons (inside the ScrollView so it scrolls above the keyboard) */}
        <View className="bg-white">
          <View
            ref={verifyWrapRef}
            collapsable={false}
            className="px-6 pt-2 pb-3"
          >
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
          </View>

          {/* Bottom image: hidden while the keyboard is open */}
          {!isKeyboardVisible && (
            <View className="h-14 mt-3 w-full">
              <Image
                source={require("@/assets/images/auth/bottom-line.webp")}
                style={{ width: "100%", height: "100%", resizeMode: "stretch" }}
              />
            </View>
          )}
        </View>
      </ScrollView>

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