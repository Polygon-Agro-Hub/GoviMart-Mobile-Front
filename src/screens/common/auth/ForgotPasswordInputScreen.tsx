import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import {
  Entypo,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  MaterialIcons,
} from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import { AlertModal } from "@/component/common/AlertModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authService from "@/services/auth/auth.service";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  countries,
  getFlagUrl,
  getPhoneMaxLength,
  cleanPhoneInput,
  validatePhone,
} from "@/utils/phoneValidation";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPasswordInput"
>;
type ScreenRouteProp = RouteProp<RootStackParamList, "ForgotPasswordInput">;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
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

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// SMS OTP is only available for Sri Lankan numbers
const SRI_LANKA_DIAL_CODE = "+94";
const isSriLankanCode = (code: string) => code.trim() === SRI_LANKA_DIAL_CODE;

export const getForgotPwdStorageKeys = (
  method: "email" | "sms",
  email?: string,
  phoneCode?: string,
  phoneNumber?: string,
  identifier?: string,
): { lockoutKeys: string[]; attemptsKeys: string[] } => {
  const identifiers: string[] = [];

  if (identifier && String(identifier).trim()) {
    const clean = String(identifier)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    if (clean) identifiers.push(clean);
  }

  if (email && String(email).trim()) {
    const cleanEmail = String(email)
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "");
    if (cleanEmail) identifiers.push(cleanEmail);
  }

  if (phoneNumber && String(phoneNumber).trim()) {
    const rawDigits = String(phoneNumber)
      .trim()
      .replace(/[^0-9]/g, "");
    const noZero = rawDigits.replace(/^0+/, "");
    const codeDigits = String(phoneCode || "94").replace(/[^0-9]/g, "");

    if (noZero) {
      identifiers.push(`${codeDigits}${noZero}`);
      identifiers.push(`${codeDigits}${rawDigits}`);
      identifiers.push(noZero);
      identifiers.push(rawDigits);
    }
  }

  const unique = [...new Set(identifiers)];
  return {
    lockoutKeys: unique.map((id) => `@forgot_pwd_lockout_${id}`),
    attemptsKeys: unique.map((id) => `@forgot_pwd_otp_attempts_${id}`),
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

const ForgotPasswordInputScreen: React.FC<Props> = ({ navigation, route }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const initialMethod = route.params?.method || "email";
  const [currentMethod, setCurrentMethod] = useState<"email" | "sms">(
    initialMethod,
  );

  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+94");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneCodeModalOpen, setIsPhoneCodeModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const isEmail = currentMethod === "email";
  // SMS selected + a non Sri Lankan country code
  const isOverseasSms = !isEmail && !isSriLankanCode(phoneCode);
  const hasInput = isEmail
    ? email.trim().length > 0
    : phoneNumber.trim().length > 0;
  const isValid = isEmail
    ? isValidEmail(email)
    : validatePhone(phoneCode, phoneNumber) === "";

  const switchToEmail = () => {
    setErrorText("");
    setPhoneCode("+94");
    setPhoneNumber("");
    setCurrentMethod("email");
  };

  const handleContinue = async () => {
    if (loading) return;

    // Close the keyboard first so it never swallows a tap
    Keyboard.dismiss();

    // SMS OTP is only available for Sri Lankan numbers (+94)
    if (isOverseasSms) return;

    // Validation always runs first – nothing is sent to the backend if invalid
    if (isEmail) {
      if (!email.trim()) {
        setErrorText("Email address is required");
        return;
      }
      if (!isValidEmail(email)) {
        setErrorText("Invalid email address");
        return;
      }
    } else {
      const phoneErr = validatePhone(phoneCode, phoneNumber.trim());
      if (phoneErr) {
        setErrorText(phoneErr);
        return;
      }
    }

    // Send the same value that was validated (leading zeros removed)
    const cleanedPhone = phoneNumber.trim().replace(/^0+/, "");

    const { lockoutKeys, attemptsKeys } = getForgotPwdStorageKeys(
      currentMethod,
      isEmail ? email.trim() : undefined,
      !isEmail ? phoneCode : undefined,
      !isEmail ? cleanedPhone : undefined,
    );

    // 1. Check if any key is currently locked out in AsyncStorage
    for (const key of lockoutKeys) {
      try {
        const storedLockout = await AsyncStorage.getItem(key);
        if (storedLockout) {
          const lockoutUntil = parseInt(storedLockout, 10);
          const remainingMs = lockoutUntil - Date.now();
          if (remainingMs > 0) {
            setAlertTitle("Too Many Attempts");
            setAlertMessage(
              "Too many verification attempts. Please try again after 15 minutes.",
            );
            setAlertVisible(true);
            return;
          } else {
            await AsyncStorage.removeItem(key);
            for (const aKey of attemptsKeys) {
              await AsyncStorage.removeItem(aKey);
            }
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
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        for (const lockKey of lockoutKeys) {
          await AsyncStorage.setItem(lockKey, String(lockoutUntil));
        }
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes.",
        );
        setAlertVisible(true);
        return;
      }
    }

    setLoading(true);
    setErrorText("");

    try {
      const response = await authService.requestForgotPasswordOtp({
        type: currentMethod,
        email: isEmail ? email.trim() : undefined,
        phoneCode: !isEmail ? phoneCode : undefined,
        phoneNumber: !isEmail ? cleanedPhone : undefined,
      });

      if (response.data && response.data.status) {
        const primaryAttemptsKey = attemptsKeys[0];
        if (primaryAttemptsKey) {
          const updated = await saveAttempt(primaryAttemptsKey);
          for (const aKey of attemptsKeys) {
            await AsyncStorage.setItem(aKey, JSON.stringify(updated));
          }
        }

        navigation.navigate("ForgotPasswordOTP", {
          method: currentMethod,
          identifier: response.data.identifier,
          email: isEmail ? email.trim() : undefined,
          phoneCode: !isEmail ? phoneCode : undefined,
          phoneNumber: !isEmail ? cleanedPhone : undefined,
          referenceId: response.data.referenceId,
          resetToken: response.data.resetToken,
        });
      } else {
        const msg =
          response.data?.message ||
          "Failed to request verification code. Please check your details.";
        if (
          response.data?.isRateLimited ||
          msg.toLowerCase().includes("too many")
        ) {
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          for (const lockKey of lockoutKeys) {
            await AsyncStorage.setItem(lockKey, String(lockoutUntil));
          }
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes.",
          );
        } else {
          setAlertTitle("Request Failed");
          setAlertMessage(msg);
        }
        setAlertVisible(true);
      }
    } catch (err: any) {
      console.error("Forgot password request error:", err);
      const is429 = err.response?.status === 429;
      const msg =
        err.response?.data?.message ||
        "An unexpected error occurred. Please try again.";
      if (is429 || msg.toLowerCase().includes("too many")) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        for (const lockKey of lockoutKeys) {
          await AsyncStorage.setItem(lockKey, String(lockoutUntil));
        }
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes.",
        );
      } else {
        setAlertTitle("Error");
        setAlertMessage(msg);
      }
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const renderCountryItem = (
    item: any,
    isSelected: boolean,
    index: number,
    isLast: boolean,
    onPress: (value: string) => void,
  ) => (
    <TouchableOpacity
      onPress={() => onPress(item.value)}
      activeOpacity={0.7}
      className={`px-5 py-3.5 flex-row justify-between items-center ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View className="flex-row items-center gap-x-3">
        <Image
          source={{ uri: item.flag }}
          style={{ width: 24, height: 18, borderRadius: 2 }}
        />
        <Text className="text-base text-gray-800 font-semibold">
          {item.name}
        </Text>
      </View>
      <View className="flex-row items-center gap-x-2">
        <Text className="text-base text-gray-500 font-bold">
          {item.dialCode}
        </Text>
        {isSelected && <FontAwesome6 name="check" size={16} color="#094EE8" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header */}
      <CustomHeader
        title={isEmail ? "Enter Your Email" : "Enter Your Mobile Number"}
        showBackButton={true}
        navigation={navigation}
      />

      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref as any)}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        enableOnAndroid={true}
        extraScrollHeight={0}
        extraHeight={0}
        keyboardOpeningTime={0}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <View className="flex-1 justify-start">
          {/* Top Illustration Card Image */}
          <View className="items-center mt-6">
            <View className="w-40 h-40 items-center justify-center">
              <Image
                source={
                  isEmail
                    ? require("@/assets/images/forgot-password/mail.webp")
                    : require("@/assets/images/forgot-password/sms.webp")
                }
                style={{ width: 100, height: 100, resizeMode: "contain" }}
              />
            </View>
          </View>

          {/* Heading */}
          <Text className="text-xl font-bold text-center text-black mt-6">
            {isEmail
              ? "Please Enter your Email Address"
              : "Please Enter your Mobile Number"}
          </Text>

          {/* Subtitle */}
          <Text className="text-[13px] text-[#777A7D] text-center px-4 mt-2 leading-relaxed">
            {isEmail
              ? "Make sure the email address you enter is the same one you used to create the account."
              : "Make sure the mobile number you enter is the same one you used to create the account."}
          </Text>

          {/* Form Fields Section */}
          <View className="mt-8">
            {isEmail ? (
              /* Email Input */
              <View>
                <View
                  className={`border ${
                    errorText ? "border-red-500" : "border-[#FF9114]"
                  } px-4 rounded-full flex-row items-center justify-between bg-white`}
                >
                  <View className="flex-row items-center flex-1 gap-x-3 h-20">
                    <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                      <Entypo name="mail" size={16} color="black" />
                    </View>
                    <View className="flex-1 justify-center">
                      <Text className="text-[12px] text-black mb-[1px]">
                        Email Address
                      </Text>
                      <TextInput
                        value={email}
                        onChangeText={(t) => {
                          const clean = t.replace(/\s/g, "");
                          setEmail(clean);
                          if (errorText && isValidEmail(clean)) {
                            setErrorText("");
                          }
                        }}
                        onBlur={() => {
                          if (email.trim() && !isValidEmail(email)) {
                            setErrorText("Invalid email address");
                          }
                        }}
                        placeholder="Type Here"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        className="text-sm text-black font-semibold p-0 h-9"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              /* Mobile Number Input with Country Code Picker */
              <View>
                <View className="flex-row gap-x-3">
                  {/* Country Code Picker */}
                  <View className="w-[38%]">
                    <TouchableOpacity
                      onPress={() => setIsPhoneCodeModalOpen(true)}
                      activeOpacity={0.8}
                      className="border border-[#FF9114] px-3 rounded-full flex-row items-center justify-between bg-white h-20"
                    >
                      <View className="flex-row items-center flex-1 gap-x-2">
                        <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                          <FontAwesome name="flag" size={14} color="black" />
                        </View>
                        <View className="flex-1 justify-center">
                          <Text className="text-[12px] text-black mb-[1px]">
                            Code
                          </Text>
                          <Text
                            className="text-sm text-black font-semibold p-0"
                            numberOfLines={1}
                          >
                            {phoneCode || "+94"}
                          </Text>
                        </View>
                      </View>
                      <FontAwesome5
                        name="chevron-down"
                        size={10}
                        color="black"
                        className="ml-1"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Mobile Number Input */}
                  <View
                    className={`border ${
                      errorText && !isOverseasSms
                        ? "border-red-500"
                        : "border-[#FF9114]"
                    } px-4 rounded-full flex-row items-center justify-between bg-white flex-1`}
                  >
                    <View className="flex-row items-center flex-1 gap-x-3 h-20">
                      <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                        <FontAwesome5
                          name="phone-alt"
                          size={14}
                          color="black"
                        />
                      </View>
                      <View className="flex-1 justify-center">
                        <Text className="text-[12px] text-black mb-[1px]">
                          Mobile Number
                        </Text>
                        <TextInput
                          value={phoneNumber}
                          onChangeText={(text) => {
                            // digits only, no leading 0, max length per country
                            const clean = cleanPhoneInput(text, phoneCode);
                            setPhoneNumber(clean);
                            if (
                              errorText &&
                              (!clean || !validatePhone(phoneCode, clean))
                            ) {
                              setErrorText("");
                            }
                          }}
                          onBlur={() => {
                            if (phoneNumber.trim()) {
                              setErrorText(
                                validatePhone(phoneCode, phoneNumber),
                              );
                            }
                          }}
                          placeholder="Type Here"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="number-pad"
                          maxLength={getPhoneMaxLength(phoneCode)}
                          className="text-sm text-black font-semibold p-0 h-9"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Field validation error (hidden when the overseas message is shown) */}
            {errorText && !isOverseasSms ? (
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
                  {errorText}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Continue Button */}
          <View className="mt-16">
            <TouchableOpacity
              className={`w-full h-[50px] rounded-full items-center justify-center flex-row ${
                isOverseasSms
                  ? "bg-[#7F919C]"
                  : isValid || hasInput
                    ? "bg-black"
                    : "bg-[#7F919C]"
              }`}
              activeOpacity={0.8}
              onPress={handleContinue}
              disabled={loading || isOverseasSms}
            >
              {loading && (
                <ActivityIndicator
                  color="white"
                  size="small"
                  className="mr-2"
                />
              )}
              <Text className="text-white text-base font-bold">Continue</Text>
            </TouchableOpacity>

            {/* Overseas SMS message under the Continue button */}
            {isOverseasSms && (
              <View className="flex-row items-start mt-4 px-2">
                <MaterialIcons
                  name="error"
                  size={14}
                  color="#E02424"
                  style={{ marginRight: 6, marginTop: 2 }}
                />
                <Text
                  className="flex-1 text-red-500 text-xs font-semibold"
                  style={{ lineHeight: 18 }}
                >
                  SMS OTP is available only for Sri Lankan phone numbers (+94).
                  For overseas phone numbers, please use the{" "}
                  <Text className="underline font-bold" onPress={switchToEmail}>
                    "Reset via Email"
                  </Text>{" "}
                  option to receive your OTP.
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Country Code Modal */}
      <GlobalSearchModal
        visible={isPhoneCodeModalOpen}
        onClose={() => setIsPhoneCodeModalOpen(false)}
        title="Select Country Code"
        searchPlaceholder="Search country..."
        noResultsText="No results found"
        data={countries.map((c) => ({
          label: `${c.name} (${c.dialCode})`,
          value: c.dialCode,
          code: c.code,
          dialCode: c.dialCode,
          name: c.name,
          flag: getFlagUrl(c.code),
        }))}
        selectedItems={phoneCode ? [phoneCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            const newCode = items[0];
            // trim to the new country's max length, then re-check
            const trimmed = phoneNumber.slice(0, getPhoneMaxLength(newCode));
            setPhoneCode(newCode);
            setPhoneNumber(trimmed);
            setErrorText(trimmed ? validatePhone(newCode, trimmed) : "");
          }
          setIsPhoneCodeModalOpen(false);
        }}
        searchKeys={["name", "dialCode"]}
        renderItem={renderCountryItem}
      />

      {/* General Alert Modal */}
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

export default ForgotPasswordInputScreen;