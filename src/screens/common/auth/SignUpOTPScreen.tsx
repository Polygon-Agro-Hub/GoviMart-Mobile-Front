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
  Linking,
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

const getStorageKey = (
  phoneCode: string,
  phoneNumber: string,
  email?: string,
) => {
  const identifier = phoneNumber
    ? `${phoneCode}_${phoneNumber}`.replace(/[^0-9+]/g, "")
    : (email || "").trim().toLowerCase();
  return `@otp_attempts_${identifier}`;
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
  } catch {}
};

const SignUpOTP: React.FC<SignUpOTPProps> = ({ route, navigation }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const phoneCode = route.params?.phoneCode || "+94";
  const phoneNumber = route.params?.phoneNumber || "771122300";
  const email = route.params?.email || "";
  const method = route.params?.method || "sms";
  const [referenceId, setReferenceId] = useState(
    route.params?.referenceId || "",
  );
  const [signupToken, setSignupToken] = useState(
    route.params?.signupToken || "",
  );
  const flow = route.params?.flow || "signup";
  const accountDetails = route.params?.accountDetails || null;
  const formattedPhone = `${phoneCode} ${phoneNumber}`;
  const storageKey = getStorageKey(phoneCode, phoneNumber, email);

  // State Management
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(240); // 4:00 countdown for both SMS and Email
  const [isExpired, setIsExpired] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Input Refs
  const ref_1 = useRef<TextInput>(null);
  const ref_2 = useRef<TextInput>(null);
  const ref_3 = useRef<TextInput>(null);
  const ref_4 = useRef<TextInput>(null);
  const ref_5 = useRef<TextInput>(null);

  const refs = [ref_1, ref_2, ref_3, ref_4, ref_5];

  // Check rate limit on initial mount and record first signup OTP attempt
  useEffect(() => {
    const checkInitialRateLimit = async () => {
      const attempts = await getRecentAttempts(storageKey);
      if (attempts.length >= MAX_OTP_ATTEMPTS) {
        const oldest = attempts[0];
        const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
        const remainingSec = Math.ceil(remainingMs / 1000);
        if (remainingSec > 0) {
          setTimeLeft(remainingSec);
          setIsRateLimited(true);
          setIsExpired(false);
          Alert.alert(
            "Too Many Attempts",
            "Too many login attempts. Please try again after 15 minutes.",
          );
          return;
        }
      }
      // Record initial OTP send timestamp if not recently added
      const lastAttempt = attempts[attempts.length - 1];
      if (!lastAttempt || Date.now() - lastAttempt > 30000) {
        await saveAttempt(storageKey);
      }
    };
    checkInitialRateLimit();
  }, [storageKey]);

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
          await clearAttempts(storageKey);
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
          Alert.alert(
            "Verification Failed",
            response.data?.message || "Failed to verify the code.",
          );
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
          await clearAttempts(storageKey);
          Alert.alert(
            "Registration Successful",
            "Your Polygon account created successfully.",
            [{ text: "OK", onPress: () => navigation.navigate("Login") }],
          );
        } else {
          Alert.alert(
            "Verification Failed",
            response.data.message || "Failed to verify the code.",
          );
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      Alert.alert("Verification Error", msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // Check rate limit: 5 attempts per 15 minutes
    const attempts = await getRecentAttempts(storageKey);
    if (attempts.length >= MAX_OTP_ATTEMPTS) {
      const oldest = attempts[0];
      const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const waitTime = remainingSec > 0 ? remainingSec : 900;
      setTimeLeft(waitTime);
      setIsRateLimited(true);
      setIsExpired(false);
      Alert.alert(
        "Too Many Attempts",
        "Too many login attempts. Please try again after 15 minutes.",
      );
      return;
    }

    setOtp(["", "", "", "", ""]);
    setIsResending(true);
    try {
      if (flow === "changePhone") {
        const response = await customerService.resendPhoneChangeOtp({
          signupToken,
        });

        if (response.data && response.data.status) {
          const updated = await saveAttempt(storageKey);
          setReferenceId(response.data.referenceId);
          setSignupToken(response.data.signupToken);

          if (updated.length >= MAX_OTP_ATTEMPTS) {
            const oldest = updated[0];
            const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
            const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 900);
            setTimeLeft(remainingSec);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              "A new 5-digit verification code has been sent. You have reached the maximum 5 attempts. Next attempt will be available after 15 minutes.",
            );
          } else {
            setTimeLeft(240);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              response.data.message ||
                "A new 5-digit verification code has been sent.",
            );
          }
        } else {
          Alert.alert(
            "Resend Failed",
            response.data?.message || "Failed to resend the code.",
          );
        }
      } else {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/auth/resend-signup-otp`,
          {
            signupToken,
          },
        );

        if (response.data && response.data.status) {
          const updated = await saveAttempt(storageKey);
          setReferenceId(response.data.referenceId);
          setSignupToken(response.data.signupToken);

          if (updated.length >= MAX_OTP_ATTEMPTS) {
            const oldest = updated[0];
            const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
            const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 900);
            setTimeLeft(remainingSec);
            setIsRateLimited(true);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              "A new 5-digit verification code has been sent. You have reached the maximum 5 attempts. Next attempt will be available after 15 minutes.",
            );
          } else {
            setTimeLeft(240);
            setIsExpired(false);
            Alert.alert(
              "Code Resent",
              response.data.message ||
                "A new 5-digit verification code has been sent.",
            );
          }
        } else {
          Alert.alert(
            "Resend Failed",
            response.data.message || "Failed to resend the code.",
          );
        }
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (
        err.response?.status === 429 ||
        msg.toLowerCase().includes("too many") ||
        msg.toLowerCase().includes("15 minutes")
      ) {
        setTimeLeft(15 * 60);
        setIsRateLimited(true);
        setIsExpired(false);
      }
      Alert.alert("Resend Error", msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 50 })}
      className="flex-1 bg-white"
    >
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header with Logo instead of Title */}
      <CustomHeader
        showLogo={true}
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: 120,
        }}
        className="flex-1 px-4 bg-white"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Verification Content Centered Vertically */}
        <View className="w-full py-8">
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
                    className="text-xl font-bold text-black text-center w-full h-full p-0"
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
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-6 pb-0 pt-2 bg-white">
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
          className="h-14 mt-6"
          style={{ marginLeft: -16, marginRight: -16 }}
        >
          <Image
            source={require("@/assets/images/auth/bottom-line.webp")}
            style={{ width: "100%", height: "100%", resizeMode: "stretch" }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SignUpOTP;
