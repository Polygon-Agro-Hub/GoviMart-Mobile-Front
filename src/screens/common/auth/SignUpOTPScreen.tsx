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
  Alert,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import axios from "axios";
import { environment } from "@/environment/environment";
import customerService from "@/services/customer/customer.service";
import socketService from "@/services/socket/socket.service";
import cartService from "@/services/cart/cart.service";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import { setCartFromBackend } from "@/store/cartSlice";

type SignUpOTPRouteProp = RouteProp<RootStackParamList, "SignUpOTP">;
type SignUpOTPNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SignUpOTP"
>;

interface SignUpOTPProps {
  route: SignUpOTPRouteProp;
  navigation: SignUpOTPNavigationProp;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 5;

// Space (px) to keep between the Verify button and the top of the keyboard.
const VERIFY_EXTRA_SPACE = 16;

export const getSignUpStorageKeys = (
  phoneCode?: string,
  phoneNumber?: string,
  email?: string,
  method: "email" | "sms" = "sms",
): { lockoutKeys: string[]; attemptsKeys: string[] } => {
  const identifiers: string[] = [];

  if (method === "email" && email && String(email).trim()) {
    const cleanEmail = String(email).trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
    if (cleanEmail) identifiers.push(`email_${cleanEmail}`);
  }

  if (method === "sms" && phoneNumber && String(phoneNumber).trim()) {
    const rawDigits = String(phoneNumber).trim().replace(/[^0-9]/g, "");
    const noZero = rawDigits.replace(/^0+/, "");
    const codeDigits = String(phoneCode || "94").replace(/[^0-9]/g, "");

    if (noZero) {
      identifiers.push(`sms_${codeDigits}${noZero}`);
      identifiers.push(`sms_${codeDigits}${rawDigits}`);
      identifiers.push(`sms_${noZero}`);
      identifiers.push(`sms_${rawDigits}`);
    }
  }

  if (identifiers.length === 0) {
    if (email) {
      identifiers.push(`email_${String(email).trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "")}`);
    } else if (phoneNumber) {
      identifiers.push(`sms_${String(phoneNumber).replace(/[^0-9]/g, "")}`);
    }
  }

  const unique = [...new Set(identifiers)];
  return {
    lockoutKeys: unique.map((id) => `@signup_lockout_${id}`),
    attemptsKeys: unique.map((id) => `@otp_attempts_${id}`),
  };
};

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
  } catch { }
};

const SignUpOTP: React.FC<SignUpOTPProps> = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const phoneCode = route.params?.phoneCode || "+94";
  const phoneNumber = route.params?.phoneNumber || "771122300";
  const email = route.params?.email || "";
  const method = (route.params?.method as "email" | "sms") || "sms";
  const [referenceId, setReferenceId] = useState(
    route.params?.referenceId || "",
  );
  const [signupToken, setSignupToken] = useState(
    route.params?.signupToken || "",
  );
  const flow = route.params?.flow || "signup";
  const accountDetails = route.params?.accountDetails || null;
  const formattedPhone = `${phoneCode} ${phoneNumber}`;

  const { lockoutKeys, attemptsKeys } = getSignUpStorageKeys(
    phoneCode,
    phoneNumber,
    email,
    method,
  );
  const primaryAttemptKey = attemptsKeys[0] || (method === "email" ? `@otp_attempts_email_${email}` : `@otp_attempts_sms_${phoneNumber}`);

  // State Management
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(240); // 4:00 countdown for both SMS and Email
  const [isExpired, setIsExpired] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - attemptsCount);

  // Input Refs
  const ref_1 = useRef<TextInput>(null);
  const ref_2 = useRef<TextInput>(null);
  const ref_3 = useRef<TextInput>(null);
  const ref_4 = useRef<TextInput>(null);
  const ref_5 = useRef<TextInput>(null);

  const refs = [ref_1, ref_2, ref_3, ref_4, ref_5];

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

  // Check rate limit on initial mount and record first signup OTP attempt
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
              Alert.alert(
                "Too Many Attempts",
                "Too many verification attempts. Please try again after 15 minutes.",
              );
              return;
            } else {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.log("Error checking stored lockout:", e);
        }
      }

      // 2. Check recent attempts count across attempts keys
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
          Alert.alert(
            "Too Many Attempts",
            "Too many verification attempts. Please try again after 15 minutes.",
          );
          return;
        }
      }

      // Sync attempts count
      const attempts = await getRecentAttempts(primaryAttemptKey);
      if (attempts.length === 0) {
        let currentCount = 1;
        for (const attKey of attemptsKeys) {
          const updated = await saveAttempt(attKey);
          currentCount = updated.length;
        }
        setAttemptsCount(Math.min(currentCount, MAX_OTP_ATTEMPTS));
      } else {
        setAttemptsCount(Math.min(attempts.length, MAX_OTP_ATTEMPTS));
      }
    };
    checkInitialRateLimit();
  }, [phoneCode, phoneNumber, email, method]);

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
    // Keep only numeric inputs
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
    // Check persistent lockout before verifying
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
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
            return;
          } else {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.log("Error checking stored lockout:", e);
      }
    }

    const code = otp.join("");
    if (code.length < 5) {
      Alert.alert(
        "Invalid Code",
        "Please enter the full 5-digit verification code.",
      );
      return;
    }

    if (isExpired) {
      Alert.alert(
        "Code Expired",
        "Your verification code has expired. Please request a new code.",
      );
      return;
    }

    setIsVerifying(true);
    try {
      if (flow === "changePhone") {
        const response = await customerService.verifyPhoneChange({
          code,
          referenceId,
          signupToken,
          accountDetails,
        });

        if (response.data && response.data.status) {
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }
          Alert.alert(
            "Phone Number Updated",
            response.data.message ||
            "Your mobile number has been successfully updated.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("MyAccount"),
              },
            ],
          );
        } else {
          const is429 = response.data?.isRateLimited;
          const msg = response.data?.message || "Failed to verify the code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const key of lockoutKeys) {
              await AsyncStorage.setItem(key, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
          } else {
            Alert.alert("Verification Failed", msg);
          }
        }
      } else {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/auth/verify-signup`,
          {
            code,
            referenceId,
            signupToken,
          },
        );

        if (response.data && response.data.status) {
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }

          const userData = response.data.data;
          const token = userData?.token;

          if (token && userData) {
            dispatch(
              loginSuccess({
                token: token,
                userProfile: userData,
                loginTime: Date.now(),
              })
            );
            await AsyncStorage.setItem("userToken", token);
            await AsyncStorage.setItem("userProfile", JSON.stringify(userData));
            await AsyncStorage.setItem("loginTime", String(Date.now()));

            if (userData.id) {
              socketService.registerUser(userData.id, token);
            }

            try {
              const cartRes = await cartService.getUserCart();
              if (cartRes.data && cartRes.data.status && cartRes.data.data) {
                const dbProducts = cartRes.data.data.products || [];
                const dbPackages = cartRes.data.data.packages || [];
                dispatch(
                  setCartFromBackend({
                    products: dbProducts,
                    packages: dbPackages,
                    cartUserId: userData.id,
                  })
                );
              }
            } catch (cartErr) {
              console.warn("Failed to load user cart on signup:", cartErr);
            }

            const isWholesale =
              (userData.buyerType || "").toLowerCase() === "wholesale";

            const targetScreen: keyof RootStackParamList = isWholesale
              ? "Home"
              : "ExcludeListAdd";
            const targetParams = !isWholesale
              ? {
                  customerId: userData.id,
                  name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
                  title: userData.title,
                  number: userData.phoneNumber,
                  cusId: userData.cusId,
                }
              : undefined;

            Alert.alert(
              "Registration Successful",
              "Your Polygon account created successfully.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    try {
                      const hasAsked = await AsyncStorage.getItem(
                        "hasAskedNotificationPermission"
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
                      console.warn(
                        "Error reading notification permission flag:",
                        err
                      );
                    }

                    if (targetParams) {
                      navigation.navigate(targetScreen as any, targetParams);
                    } else {
                      navigation.navigate(targetScreen as any);
                    }
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              "Registration Successful",
              "Your Polygon account created successfully.",
              [{ text: "OK", onPress: () => navigation.navigate("Login") }]
            );
          }
        } else {
          const is429 = response.data?.isRateLimited;
          const msg = response.data?.message || "Failed to verify the code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const key of lockoutKeys) {
              await AsyncStorage.setItem(key, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
          } else {
            Alert.alert("Verification Failed", msg);
          }
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (
        is429 ||
        msg.toLowerCase().includes("too many") ||
        msg.toLowerCase().includes("15 minutes")
      ) {
        const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
        for (const key of lockoutKeys) {
          await AsyncStorage.setItem(key, String(lockoutUntil));
        }
        setTimeLeft(900);
        setIsRateLimited(true);
        setIsExpired(false);
        Alert.alert(
          "Too Many Attempts",
          "Too many verification attempts. Please try again after 15 minutes.",
        );
      } else {
        Alert.alert("Verification Error", msg);
      }
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
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
            return;
          } else {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.log("Error checking stored lockout:", e);
      }
    }

    // 2. Check rate limit: 5 attempts per 15 minutes
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
        Alert.alert(
          "Too Many Attempts",
          "Too many verification attempts. Please try again after 15 minutes.",
        );
        return;
      }
    }

    setOtp(["", "", "", "", ""]);
    setIsResending(true);
    try {
      if (flow === "changePhone") {
        const response = await customerService.resendPhoneChangeOtp({
          signupToken,
        });

        if (response.data && response.data.status) {
          let updatedLength = 0;
          for (const key of attemptsKeys) {
            const updated = await saveAttempt(key);
            updatedLength = updated.length;
          }
          setAttemptsCount(Math.min(updatedLength, MAX_OTP_ATTEMPTS));
          setReferenceId(response.data.referenceId);
          setSignupToken(response.data.signupToken);

          if (updatedLength >= MAX_OTP_ATTEMPTS) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const lockKey of lockoutKeys) {
              await AsyncStorage.setItem(lockKey, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              "A new 5-digit verification code has been sent. You have reached the maximum limit of 5 OTP requests. Next attempt will be available after 15 minutes.",
            );
          } else {
            setTimeLeft(240);
            setIsExpired(false);
            const remaining = MAX_OTP_ATTEMPTS - updatedLength;
            Alert.alert(
              "Code Resent",
              `${response.data.message || "A new 5-digit verification code has been sent."}\n\n(5 OTP resend attempts limit · ${remaining} remaining)`,
            );
          }
        } else {
          const is429 = response.data?.isRateLimited;
          const msg = response.data?.message || "Failed to resend the code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const key of lockoutKeys) {
              await AsyncStorage.setItem(key, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
          } else {
            Alert.alert("Resend Failed", msg);
          }
        }
      } else {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/auth/resend-signup-otp`,
          {
            signupToken,
          },
        );

        if (response.data && response.data.status) {
          let updatedLength = 0;
          for (const key of attemptsKeys) {
            const updated = await saveAttempt(key);
            updatedLength = updated.length;
          }
          setAttemptsCount(Math.min(updatedLength, MAX_OTP_ATTEMPTS));
          setReferenceId(response.data.referenceId);
          setSignupToken(response.data.signupToken);

          if (updatedLength >= MAX_OTP_ATTEMPTS) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const lockKey of lockoutKeys) {
              await AsyncStorage.setItem(lockKey, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              "A new 5-digit verification code has been sent. You have reached the maximum limit of 5 OTP requests. Next attempt will be available after 15 minutes.",
            );
          } else {
            setTimeLeft(240);
            setIsExpired(false);
            const remaining = MAX_OTP_ATTEMPTS - updatedLength;
            Alert.alert(
              "Code Resent",
              `${response.data.message || "A new 5-digit verification code has been sent."}\n\n(5 OTP resend attempts limit · ${remaining} remaining)`,
            );
          }
        } else {
          const is429 = response.data?.isRateLimited;
          const msg = response.data?.message || "Failed to resend the code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const key of lockoutKeys) {
              await AsyncStorage.setItem(key, String(lockoutUntil));
            }
            setTimeLeft(900);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
          } else {
            Alert.alert("Resend Failed", msg);
          }
        }
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (
        is429 ||
        msg.toLowerCase().includes("too many") ||
        msg.toLowerCase().includes("15 minutes")
      ) {
        const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
        for (const key of lockoutKeys) {
          await AsyncStorage.setItem(key, String(lockoutUntil));
        }
        setTimeLeft(900);
        setIsRateLimited(true);
        setIsExpired(false);
        Alert.alert(
          "Too Many Attempts",
          "Too many verification attempts. Please try again after 15 minutes.",
        );
      } else {
        Alert.alert("Resend Error", msg);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View ref={rootRef} collapsable={false} className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header with Logo instead of Title */}
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
          // Manually lift content above the keyboard (works on iOS and
          // Android, including edge-to-edge production builds).
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
              {method === "email" ? email : formattedPhone}
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
                  Too many login attempts. Please try again after 15 minutes.
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
            {/* Divider lines next to Didn't receive the code */}
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
    </View>
  );
};

export default SignUpOTP;