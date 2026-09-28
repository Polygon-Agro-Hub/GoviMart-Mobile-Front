import React, { useState, useRef } from "react";
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
  ActivityIndicator,
  Modal,
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

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPasswordInput"
>;
type ScreenRouteProp = RouteProp<RootStackParamList, "ForgotPasswordInput">;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

interface PhoneCode {
  code: string;
  dialCode: string;
  name: string;
}

const countries: PhoneCode[] = [
  { code: "LK", dialCode: "+94", name: "Sri Lanka" },
  { code: "VN", dialCode: "+84", name: "Vietnam" },
  { code: "KH", dialCode: "+855", name: "Cambodia" },
  { code: "BD", dialCode: "+880", name: "Bangladesh" },
  { code: "IN", dialCode: "+91", name: "India" },
  { code: "NL", dialCode: "+31", name: "Netherlands" },
];

const getFlagUrl = (countryCode: string): string => {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
};

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
    /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
};

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 5;

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

  // Overseas SMS Error Modal
  const [overseasModalVisible, setOverseasModalVisible] = useState(false);

  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const isEmail = currentMethod === "email";
  const isValid = isEmail
    ? isValidEmail(email)
    : phoneCode.trim() !== "" && phoneNumber.trim().length >= 7;

  const handleContinue = async () => {
    if (!isEmail && phoneCode !== "+94") {
      setOverseasModalVisible(true);
      return;
    }

    if (!isValid) return;

    const cleanId = (isEmail ? email.trim() : `${phoneCode}${phoneNumber.trim()}`)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    const lockoutKey = `@forgot_pwd_lockout_${cleanId}`;
    const storageKey = `@forgot_pwd_otp_attempts_${cleanId}`;

    // Check if this identifier is currently locked out
    try {
      const storedLockout = await AsyncStorage.getItem(lockoutKey);
      if (storedLockout) {
        const lockoutUntil = parseInt(storedLockout, 10);
        const remainingMs = lockoutUntil - Date.now();
        if (remainingMs > 0) {
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes."
          );
          setAlertVisible(true);
          return;
        } else {
          await AsyncStorage.removeItem(lockoutKey);
        }
      }

      // Check recent attempts count
      const attempts = await getRecentAttempts(storageKey);
      if (attempts.length >= MAX_OTP_ATTEMPTS) {
        const oldest = attempts[0];
        const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
        const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 900);
        await AsyncStorage.setItem(
          lockoutKey,
          String(Date.now() + remainingSec * 1000)
        );
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes."
        );
        setAlertVisible(true);
        return;
      }
    } catch (e) {
      console.log("Error checking stored lockout:", e);
    }

    setLoading(true);
    setErrorText("");

    try {
      const response = await authService.requestForgotPasswordOtp({
        type: currentMethod,
        email: isEmail ? email.trim() : undefined,
        phoneCode: !isEmail ? phoneCode : undefined,
        phoneNumber: !isEmail ? phoneNumber.trim() : undefined,
      });

      if (response.data && response.data.status) {
        const updated = await saveAttempt(storageKey);
        const identifierClean = (response.data.identifier || (isEmail ? email.trim() : `${phoneCode} ${phoneNumber.trim()}`))
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
        if (identifierClean !== cleanId) {
          await AsyncStorage.setItem(`@forgot_pwd_otp_attempts_${identifierClean}`, JSON.stringify(updated));
        }

        navigation.navigate("ForgotPasswordOTP", {
          method: currentMethod,
          identifier: response.data.identifier,
          email: isEmail ? email.trim() : undefined,
          phoneCode: !isEmail ? phoneCode : undefined,
          phoneNumber: !isEmail ? phoneNumber.trim() : undefined,
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
          const lockoutUntil = Date.now() + 15 * 60 * 1000;
          await AsyncStorage.setItem(lockoutKey, String(lockoutUntil));
          setAlertTitle("Too Many Attempts");
          setAlertMessage(
            "Too many verification attempts. Please try again after 15 minutes."
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
        const lockoutUntil = Date.now() + 15 * 60 * 1000;
        await AsyncStorage.setItem(lockoutKey, String(lockoutUntil));
        setAlertTitle("Too Many Attempts");
        setAlertMessage(
          "Too many verification attempts. Please try again after 15 minutes."
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
      className={`px-5 py-3.5 flex-row justify-between items-center ${!isLast ? "border-b border-gray-100" : ""
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
        keyboardShouldPersistTaps="handled"
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
              /* Email Input matching Update My Password design with #FF9114 border */
              <View>
                <View className="border border-[#FF9114] px-4 rounded-full flex-row items-center justify-between bg-white">
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
                          setEmail(t);
                          if (errorText) setErrorText("");
                        }}
                        placeholder="Type Here"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
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

                  {/* Mobile Number Input matching Update My Password design with #FF9114 border */}
                  <View className="border border-[#FF9114] px-4 rounded-full flex-row items-center justify-between bg-white flex-1">
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
                            setPhoneNumber(text.replace(/[^0-9]/g, ""));
                            if (errorText) setErrorText("");
                          }}
                          placeholder="Type Here"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="number-pad"
                          maxLength={phoneCode === "+94" ? 9 : 10}
                          className="text-sm text-black font-semibold p-0 h-9"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {errorText ? (
              <View className="flex-row items-center gap-x-1 mt-2 ml-4">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs font-semibold">
                  {errorText}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Continue Button - positioned right after the input fields */}
          <View className="mt-16">
            <TouchableOpacity
              className={`w-full h-[50px] rounded-full items-center justify-center flex-row ${isValid ? "bg-black" : "bg-[#7F919C]"
                }`}
              activeOpacity={isValid ? 0.8 : 1}
              onPress={handleContinue}
              disabled={loading || !isValid}
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
            setPhoneCode(items[0]);
          }
          setIsPhoneCodeModalOpen(false);
        }}
        searchKeys={["name", "dialCode"]}
        renderItem={renderCountryItem}
      />

      {/* Overseas SMS Restriction Alert Modal */}
      <AlertModal
        visible={overseasModalVisible}
        title="SMS OTP Unavailable!"
        message="Since you are an overseas customer, we are unable to send you the OTP code via SMS. Please use the email option to reset your password."
        type="error"
        onClose={() => setOverseasModalVisible(false)}
        autoClose={false}
        showOkButton={true}
        okButtonText="Enter My Email"
        onOkPress={() => {
          setOverseasModalVisible(false);
          setCurrentMethod("email");
        }}
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
