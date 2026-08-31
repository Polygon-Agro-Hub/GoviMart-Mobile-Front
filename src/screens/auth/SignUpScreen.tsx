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
  Alert,
  Image,
  Keyboard,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import {
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Ionicons,
  MaterialIcons,
  Entypo,
  AntDesign,
} from "@expo/vector-icons";
import axios from "axios";
import { environment } from "@/environment/environment";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import CustomHeader from "@/component/common/CustomHeader";
import { AlertModal } from "@/component/common/AlertModal";
import authService from "@/services/auth/auth.service";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type SignUpNavigationProp = StackNavigationProp<RootStackParamList, "SignUp">;
type SignUpRouteProp = RouteProp<RootStackParamList, "SignUp">;

interface SignUpProps {
  navigation: SignUpNavigationProp;
  route: SignUpRouteProp;
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

// --- Name validation helpers (shared by input filter + validate()) ---
// Allows letters, spaces, apostrophes, and hyphens (e.g. O'Brien, Anne-Marie).
// Change to /^[a-zA-Z\s]*$/ if you want to disallow apostrophes/hyphens entirely.
const NAME_ALLOWED_REGEX = /^[a-zA-Z\s'-]*$/;

const sanitizeName = (text: string): string => {
  return text
    .replace(/[^a-zA-Z\s'-]/g, "") // strip anything not a letter/space/apostrophe/hyphen
    .replace(/^[\s'-]+/, "") // no leading space/apostrophe/hyphen
    .replace(/\s{2,}/g, " "); // collapse repeated spaces
};

const SignUp: React.FC<SignUpProps> = ({ navigation, route }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [tab, setTab] = useState<"home" | "business">("home");

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" = "error",
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Form Fields
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCode, setPhoneCode] = useState(""); // empty default
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhoneCode, setCompanyPhoneCode] = useState(""); // empty default
  const [companyNumber, setCompanyNumber] = useState(""); // maps to companyPhone
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Visibility and Modal States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isPhoneCodeModalOpen, setIsPhoneCodeModalOpen] = useState(false);
  const [isCompanyPhoneCodeModalOpen, setIsCompanyPhoneCodeModalOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const titles = ["Mr", "Mrs", "Ms", "Rev"];

  const isValidSriLankanMobile = (num: string): boolean =>
    /^7[0-9]{8}$/.test(num);

  const isValidGenericMobile = (num: string): boolean =>
    /^[0-9]{9,10}$/.test(num);

  // Validate fields helper
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title) newErrors.title = "Title is required";

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!NAME_ALLOWED_REGEX.test(firstName.trim())) {
      newErrors.firstName = "First name must contain only letters";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!NAME_ALLOWED_REGEX.test(lastName.trim())) {
      newErrors.lastName = "Last name must contain only letters";
    }

    // User Mobile Phone Validate (Separated)
    // User Mobile Phone Validate (Separated)
    if (!phoneCode) {
      newErrors.phoneCode = "Country code is required";
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Mobile number is required";
    } else {
      const cleanedPhone = phoneNumber.trim().replace(/^0+/, ""); // strip ALL leading zeros, not just one
      if (phoneCode === "+94") {
        if (!isValidSriLankanMobile(cleanedPhone)) {
          newErrors.phoneNumber =
            "Enter a valid 9-digit mobile number starting with 7";
        }
      } else if (!isValidGenericMobile(cleanedPhone)) {
        newErrors.phoneNumber = "Invalid number";
      }
    }

    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email address";
    }

    if (!nic.trim()) {
      newErrors.nic = "NIC Number is required";
    } else if (
      !/^[0-9]{9}[vV]$/.test(nic.trim()) &&
      !/^[0-9]{12}$/.test(nic.trim())
    ) {
      newErrors.nic = "Invalid NIC format";
    }

    if (tab === "business") {
      if (!companyName.trim())
        newErrors.companyName = "Company name is required";

      // Company Mobile Phone Validate (Separated)
      if (!companyPhoneCode) {
        newErrors.companyPhoneCode = "Country code is required";
      }
      if (!companyNumber.trim()) {
        newErrors.companyNumber = "Company number is required";
      } else {
        const cleanedCompanyPhone = companyNumber.trim().replace(/^0+/, "");
        if (companyPhoneCode === "+94") {
          if (!isValidSriLankanMobile(cleanedCompanyPhone)) {
            newErrors.companyNumber =
              "Enter a valid 9-digit mobile number starting with 7";
          }
        } else if (!isValidGenericMobile(cleanedCompanyPhone)) {
          newErrors.companyNumber = "Invalid number";
        }

        const cleanedPersonalPhone = phoneNumber.trim().replace(/^0+/, "");
        if (
          cleanedPersonalPhone &&
          cleanedCompanyPhone &&
          phoneCode === companyPhoneCode &&
          cleanedPersonalPhone === cleanedCompanyPhone
        ) {
          newErrors.companyNumber =
            "Company number and personal mobile number cannot be the same";
        }
      }
    }

    // Password validations
    if (!password) newErrors.password = "Password is required";
    else {
      if (password.length < 6) {
        newErrors.password = "Must be at least 6 characters";
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = "Must have 1 uppercase letter";
      } else if (
        !/[0-9]/.test(password) ||
        !/[!@#$%^&*(),.?":{}|<>]/.test(password)
      ) {
        newErrors.password = "Must have 1 number & 1 special character";
      }
    }

    if (!confirmPassword)
      newErrors.confirmPassword = "Confirm password is required";
    else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (tab === "home" && !agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    try {
      const cleanedPhone =
        phoneCode === "+94"
          ? phoneNumber.trim().replace(/^0+/, "")
          : phoneNumber.trim();

      const payload = {
        title,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneCode,
        phoneNumber: cleanedPhone,
        buyerType: tab === "home" ? "Retail" : "Wholesale",
        email: email.trim().toLowerCase(),
        nic: nic.trim().toUpperCase(),
        password,
        confirmPassword,
        agreeToMarketing: true,
        agreeToTerms: tab === "home" ? agreeToTerms : true,
        companyName: tab === "business" ? companyName.trim() : null,
        companyPhoneCode: tab === "business" ? companyPhoneCode : null,
        companyPhoneNumber: tab === "business" ? companyNumber.trim() : null,
        city: route.params?.nearestCity || null,
        cityId: route.params?.cityId || null,
      };

      setIsLoading(true);
      const response = await authService.signUp(payload);

      if (response.data && response.data.status) {
        if (response.data.verificationRequired) {
          navigation.navigate("SignUpOTP", {
            phoneCode,
            phoneNumber: cleanedPhone,
            email,
            method: response.data.method,
            referenceId: response.data.referenceId,
            signupToken: response.data.signupToken,
            flow: "signup",
          });
        } else {
          Alert.alert(
            "Registration Successful",
            "Your account has been created. Please sign in.",
            [{ text: "OK", onPress: () => navigation.navigate("Login") }],
          );
        }
      } else {
        const msg = response.data?.message || "Failed to register.";
        if (
          msg.toLowerCase().includes("company phone") ||
          msg.toLowerCase().includes("company number")
        ) {
          setErrors((prev) => ({ ...prev, companyNumber: msg }));
        } else if (
          msg.toLowerCase().includes("mobile") ||
          msg.toLowerCase().includes("phone")
        ) {
          setErrors((prev) => ({ ...prev, phoneNumber: msg }));
        } else if (msg.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, email: msg }));
        } else if (msg.toLowerCase().includes("nic")) {
          setErrors((prev) => ({ ...prev, nic: msg }));
        }
        showAlert("Signup Failed", msg);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (
        msg.toLowerCase().includes("company phone") ||
        msg.toLowerCase().includes("company number")
      ) {
        setErrors((prev) => ({ ...prev, companyNumber: msg }));
      } else if (
        msg.toLowerCase().includes("mobile") ||
        msg.toLowerCase().includes("phone")
      ) {
        setErrors((prev) => ({ ...prev, phoneNumber: msg }));
      } else if (msg.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: msg }));
      } else if (msg.toLowerCase().includes("nic")) {
        setErrors((prev) => ({ ...prev, nic: msg }));
      }
      showAlert("Signup Error", msg);
    } finally {
      setIsLoading(false);
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
        {isSelected && <MaterialIcons name="check" size={20} color="#21202B" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title="Create Your Account"
        showBackButton={true}
        navigation={navigation}
      />

      {/* Tab Selectors */}
      <View className="flex-row px-4">
        <TouchableOpacity
          onPress={() => {
            setTab("home");
            setErrors({});
          }}
          activeOpacity={0.8}
          className="flex-1 pb-3 items-center justify-center"
          style={{
            borderBottomWidth: 4,
            borderBottomColor: tab === "home" ? "#000000" : "#D9D9D9",
          }}
        >
          <View className="flex-row items-center gap-x-2">
            {tab === "home" && (
              <Ionicons name="checkmark-circle" size={18} color="black" />
            )}
            <Text
              className={`text-sm ${
                tab === "home"
                  ? "font-bold text-black"
                  : "font-semibold text-gray-400"
              }`}
            >
              I'm Buying for Home
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setTab("business");
            setErrors({});
          }}
          activeOpacity={0.8}
          className="flex-1 pb-3 items-center justify-center"
          style={{
            borderBottomWidth: 4,
            borderBottomColor: tab === "business" ? "#000000" : "#D9D9D9",
          }}
        >
          <View className="flex-row items-center gap-x-2">
            {tab === "business" && (
              <Ionicons name="checkmark-circle" size={18} color="black" />
            )}
            <Text
              className={`text-sm ${
                tab === "business"
                  ? "font-bold text-black"
                  : "font-semibold text-gray-400"
              }`}
            >
              I'm Buying for Business
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref)}
        className="flex-1 px-4 mt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={0}
        extraHeight={0}
        keyboardOpeningTime={0}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="gap-y-4 flex-1">
          {/* Title & First Name Row */}
          <View className="flex-row gap-x-3">
            {/* Title Selection */}
            <View className="w-[35%]">
              <TouchableOpacity
                onPress={() => setIsTitleModalOpen(true)}
                activeOpacity={0.8}
                className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between ${
                  errors.title
                    ? "border-red-500 bg-red-50/10"
                    : "border-black bg-white"
                }`}
              >
                <View className="flex-row items-center gap-x-2">
                  <FontAwesome6 name="user-large" size={14} color="black" />
                  <Text className="text-sm text-black">{title || "Title"}</Text>
                </View>
                <FontAwesome5 name="chevron-down" size={10} color="black" />
              </TouchableOpacity>
              {errors.title && (
                <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs">{errors.title}</Text>
                </View>
              )}
            </View>

            {/* First Name Input */}
            <View className="flex-1">
              <View
                className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                  errors.firstName
                    ? "border-red-500 bg-red-50/10"
                    : "border-black bg-white"
                }`}
              >
                <FontAwesome6 name="user-large" size={14} color="black" />
                <TextInput
                  placeholder="First Name"
                  placeholderTextColor="#000000"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(sanitizeName(text));
                    if (errors.firstName)
                      setErrors((prev) => ({ ...prev, firstName: "" }));
                  }}
                  autoCorrect={false}
                  maxLength={50}
                  className="flex-1 text-sm text-black p-0"
                />
              </View>
              {errors.firstName && (
                <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs">
                    {errors.firstName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Last Name Input */}
          <View>
            <View
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                errors.lastName
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
              }`}
            >
              <FontAwesome6 name="user-large" size={14} color="black" />
              <TextInput
                placeholder="Last Name"
                placeholderTextColor="#000000"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(sanitizeName(text));
                  if (errors.lastName)
                    setErrors((prev) => ({ ...prev, lastName: "" }));
                }}
                autoCorrect={false}
                maxLength={50}
                className="flex-1 text-sm text-black p-0"
              />
            </View>
            {errors.lastName && (
              <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs">{errors.lastName}</Text>
              </View>
            )}
          </View>

          {/* Mobile Country Code & Number Row */}
          <View>
            <View className="flex-row gap-x-3">
              {/* Country Code Picker */}
              <View className="w-[35%]">
                <TouchableOpacity
                  onPress={() => setIsPhoneCodeModalOpen(true)}
                  activeOpacity={0.8}
                  className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between bg-white ${
                    errors.phoneCode
                      ? "border-red-500 bg-red-50/10"
                      : "border-black"
                  }`}
                >
                  <View className="flex-row items-center gap-x-2">
                    {phoneCode ? (
                      <>
                        <Image
                          source={{
                            uri: getFlagUrl(
                              countries.find((c) => c.dialCode === phoneCode)
                                ?.code || "LK",
                            ),
                          }}
                          style={{ width: 22, height: 16, borderRadius: 2 }}
                        />
                        <Text className="text-sm text-black">{phoneCode}</Text>
                      </>
                    ) : (
                      <>
                        <FontAwesome name="flag" size={14} color="black" />
                        <Text className="text-sm text-black">Code</Text>
                      </>
                    )}
                  </View>
                  <FontAwesome5 name="chevron-down" size={10} color="black" />
                </TouchableOpacity>
                {errors.phoneCode && (
                  <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                    <MaterialIcons name="error" size={12} color="#E02424" />
                    <Text className="text-red-500 text-xs">
                      {errors.phoneCode}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mobile Number Input */}
              <View className="flex-1">
                <View
                  className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                    errors.phoneNumber
                      ? "border-red-500 bg-red-50/10"
                      : "border-black bg-white"
                  }`}
                >
                  <FontAwesome5 name="phone-alt" size={14} color="black" />
                  <TextInput
                    placeholder="Mobile Number"
                    placeholderTextColor="#000000"
                    keyboardType="number-pad"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text.replace(/[^0-9]/g, ""));
                      if (errors.phoneNumber)
                        setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                    }}
                    maxLength={phoneCode === "+94" ? 9 : 10}
                    className="flex-1 text-sm text-black p-0"
                  />
                </View>
                {errors.phoneNumber && (
                  <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                    <MaterialIcons name="error" size={12} color="#E02424" />
                    <Text className="text-red-500 text-xs">
                      {errors.phoneNumber}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Non-Sri Lankan Country Warning Banner */}
            {phoneCode !== "" && phoneCode !== "+94" && (
              <View className="bg-[#FFF5E9] p-3 rounded-2xl flex-row items-center gap-x-3 mt-2 border-0">
                <FontAwesome6 name="circle-info" size={16} color="#FF9114" />
                <Text className="text-xs text-[#FF9114] flex-1 leading-relaxed">
                  Delivery is limited to Sri Lankan addresses. Overseas
                  customers may place orders for recipients in Sri Lanka.
                </Text>
              </View>
            )}
          </View>

          {/* Email Address Input */}
          <View>
            <View
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                errors.email
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
              }`}
            >
              <Entypo name="mail" size={16} color="black" />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#000000"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: "" }));
                }}
                textContentType="emailAddress"
                autoComplete="email"
                className="flex-1 text-sm text-black p-0"
              />
            </View>
            {errors.email && (
              <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs">{errors.email}</Text>
              </View>
            )}
          </View>

          {/* NIC Number Input */}
          <View>
            <View
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                errors.nic
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
              }`}
            >
              <FontAwesome name="id-card" size={16} color="black" />
              <TextInput
                placeholder="NIC Number"
                placeholderTextColor="#000000"
                autoCapitalize="characters"
                value={nic}
                onChangeText={(text) => {
                  setNic(text);
                  if (errors.nic) setErrors((prev) => ({ ...prev, nic: "" }));
                }}
                maxLength={12}
                className="flex-1 text-sm text-black p-0"
              />
            </View>
            {errors.nic && (
              <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs">{errors.nic}</Text>
              </View>
            )}
          </View>

          {/* Business-Only Fields */}
          {tab === "business" && (
            <>
              {/* Company Name */}
              <View>
                <View
                  className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                    errors.companyName
                      ? "border-red-500 bg-red-50/10"
                      : "border-black bg-white"
                  }`}
                >
                  <FontAwesome name="building" size={16} color="black" />
                  <TextInput
                    placeholder="Company Name"
                    placeholderTextColor="#000000"
                    value={companyName}
                    onChangeText={(text) => {
                      setCompanyName(text);
                      if (errors.companyName)
                        setErrors((prev) => ({ ...prev, companyName: "" }));
                    }}
                    className="flex-1 text-sm text-black p-0"
                  />
                </View>
                {errors.companyName && (
                  <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                    <MaterialIcons name="error" size={12} color="#E02424" />
                    <Text className="text-red-500 text-xs">
                      {errors.companyName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Company Number Row (Mobile country code + input) */}
              <View>
                <View className="flex-row gap-x-3">
                  {/* Company Phone Code Picker */}
                  <View className="w-[35%]">
                    <TouchableOpacity
                      onPress={() => setIsCompanyPhoneCodeModalOpen(true)}
                      activeOpacity={0.8}
                      className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between bg-white ${
                        errors.companyPhoneCode
                          ? "border-red-500 bg-red-50/10"
                          : "border-black"
                      }`}
                    >
                      <View className="flex-row items-center gap-x-2">
                        {companyPhoneCode ? (
                          <>
                            <Image
                              source={{
                                uri: getFlagUrl(
                                  countries.find(
                                    (c) => c.dialCode === companyPhoneCode,
                                  )?.code || "LK",
                                ),
                              }}
                              style={{ width: 22, height: 16, borderRadius: 2 }}
                            />
                            <Text className="text-sm text-black">
                              {companyPhoneCode}
                            </Text>
                          </>
                        ) : (
                          <>
                            <FontAwesome name="flag" size={14} color="black" />
                            <Text className="text-sm text-black">Code</Text>
                          </>
                        )}
                      </View>
                      <FontAwesome5
                        name="chevron-down"
                        size={10}
                        color="black"
                      />
                    </TouchableOpacity>
                    {errors.companyPhoneCode && (
                      <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                        <MaterialIcons name="error" size={12} color="#E02424" />
                        <Text className="text-red-500 text-xs">
                          {errors.companyPhoneCode}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Company Number Input */}
                  <View className="flex-1">
                    <View
                      className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                        errors.companyNumber
                          ? "border-red-500 bg-red-50/10"
                          : "border-black bg-white"
                      }`}
                    >
                      <FontAwesome5 name="phone-alt" size={14} color="black" />
                      <TextInput
                        placeholder="Company Number"
                        placeholderTextColor="#000000"
                        keyboardType="number-pad"
                        value={companyNumber}
                        onChangeText={(text) => {
                          setCompanyNumber(text.replace(/[^0-9]/g, ""));
                          if (errors.companyNumber)
                            setErrors((prev) => ({
                              ...prev,
                              companyNumber: "",
                            }));
                        }}
                        maxLength={10}
                        className="flex-1 text-sm text-black p-0"
                      />
                    </View>
                    {errors.companyNumber && (
                      <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                        <MaterialIcons name="error" size={12} color="#E02424" />
                        <Text className="text-red-500 text-xs">
                          {errors.companyNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Non-Sri Lankan Country Warning Banner (Company Phone) */}
                {companyPhoneCode !== "" && companyPhoneCode !== "+94" && (
                  <View className="bg-[#FFF5E9] p-3 rounded-2xl flex-row items-center gap-x-3 mt-2 border-0">
                    <FontAwesome6
                      name="circle-info"
                      size={16}
                      color="#FF9114"
                    />
                    <Text className="text-xs font-semibold text-[#FF9114] flex-1 leading-relaxed">
                      Delivery is limited to Sri Lankan addresses. Overseas
                      customers may place orders for recipients in Sri Lanka.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Password Input */}
          <View>
            <View
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                errors.password
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
              }`}
            >
              <FontAwesome5 name="lock" size={14} color="black" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#000000"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: "" }));
                }}
                textContentType="oneTimeCode"
                autoComplete="off"
                importantForAutofill="no"
                className="flex-1 text-sm text-black p-0"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome5
                  name={showPassword ? "eye-slash" : "eye"}
                  size={16}
                  color="black"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs">{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Password Requirement Box */}
          <View className="bg-[#F3F3F3] rounded-xl p-4 flex-row items-center gap-x-3">
            <View className="w-10 h-10 rounded-full bg-black items-center justify-center">
              <FontAwesome6 name="shield-halved" size={18} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-xs text-black mb-1">
                Your password must have:
              </Text>
              <Text className="text-xs text-[#5A5859] leading-relaxed">
                • At least 6 characters{"\n"}• 1 uppercase letter{"\n"}• 1
                number & 1 special character
              </Text>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View>
            <View
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                errors.confirmPassword
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
              }`}
            >
              <FontAwesome5 name="lock" size={14} color="black" />
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#000000"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                textContentType="oneTimeCode"
                autoComplete="off"
                importantForAutofill="no"
                className="flex-1 text-sm text-black p-0"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <FontAwesome5
                  name={showConfirmPassword ? "eye-slash" : "eye"}
                  size={16}
                  color="black"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <View className="flex-row items-center gap-x-1 mt-1 ml-3">
                <MaterialIcons name="error" size={12} color="#E02424" />
                <Text className="text-red-500 text-xs">
                  {errors.confirmPassword}
                </Text>
              </View>
            )}
          </View>

          {/* Checkbox (Home tab only) */}
          {tab === "home" && (
            <View>
              <TouchableOpacity
                onPress={() => setAgreeToTerms(!agreeToTerms)}
                activeOpacity={0.8}
                className="flex-row items-start gap-x-3 mt-2 px-1"
              >
                <View
                  className={`w-5 h-5 rounded border items-center justify-center ${
                    agreeToTerms
                      ? "bg-black border-black"
                      : "border-black bg-white"
                  }`}
                >
                  {agreeToTerms && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-xs text-black leading-relaxed flex-1">
                  I agree to the{" "}
                  <Text className="font-bold underline">
                    Terms & Conditions
                  </Text>{" "}
                  and{" "}
                  <Text className="font-bold underline">Privacy Policy</Text>.
                </Text>
              </TouchableOpacity>
              {errors.agreeToTerms && (
                <View className="flex-row items-center gap-x-1 mt-2 ml-3">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs">
                    {errors.agreeToTerms}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Action Button Section */}
      <View className="px-4 pb-0 pt-2 bg-white">
        {/* Sign Up Button */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={isLoading}
          activeOpacity={0.8}
          className="bg-black rounded-full items-center justify-center mt-4 shadow-sm h-[50px]"
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            elevation: 5,
          }}
        >
          <Text className="text-white text-base font-bold">
            {isLoading ? "Signing up..." : "Sign up"}
          </Text>
        </TouchableOpacity>

        {/* Sign In Redirect Link */}
        <View className="flex-row items-center justify-center mt-3">
          <Text className="text-xs text-gray-500">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Login")}
          >
            <Text className="text-xs font-bold text-[#0085FF] underline">
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Line Image decoration */}
      <View className="h-14" style={{ marginLeft: -16, marginRight: -16 }}>
        <Image
          source={require("@/assets/images/auth/bottom-line.webp")}
          style={{ width: "100%", height: "100%", resizeMode: "stretch" }}
        />
      </View>

      {/* Title GlobalSearchModal */}
      <GlobalSearchModal
        visible={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        title="Select Title"
        searchPlaceholder="Search title..."
        noResultsText="No results found"
        data={titles.map((t) => ({ label: t, value: t }))}
        selectedItems={title ? [title] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            setTitle(items[0]);
            setErrors((prev) => ({ ...prev, title: "" }));
          }
          setIsTitleModalOpen(false);
        }}
        searchKeys={["label"]}
      />

      {/* Phone Code GlobalSearchModal */}
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
            setErrors((prev) => ({ ...prev, phoneCode: "" }));
          }
          setIsPhoneCodeModalOpen(false);
        }}
        searchKeys={["name", "dialCode"]}
        renderItem={renderCountryItem}
      />

      {/* Company Phone Code GlobalSearchModal */}
      <GlobalSearchModal
        visible={isCompanyPhoneCodeModalOpen}
        onClose={() => setIsCompanyPhoneCodeModalOpen(false)}
        title="Select Company Country Code"
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
        selectedItems={companyPhoneCode ? [companyPhoneCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            setCompanyPhoneCode(items[0]);
            setErrors((prev) => ({ ...prev, companyPhoneCode: "" }));
          }
          setIsCompanyPhoneCodeModalOpen(false);
        }}
        searchKeys={["name", "dialCode"]}
        renderItem={renderCountryItem}
      />

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

export default SignUp;
