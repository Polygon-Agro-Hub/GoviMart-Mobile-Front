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
  Modal,
  Linking,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import { setCartFromBackend } from "@/store/cartSlice";
import socketService from "@/services/socket/socket.service";
import cartService from "@/services/cart/cart.service";

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

const NAME_ALLOWED_REGEX = /^[a-zA-Z'-]*$/;

const capitalizeName = (text: string): string => {
  if (!text) return "";
  return text
    .trim()
    .replace(/(?:^|\s|-)([a-z])/g, (_, c) => c.toUpperCase());
};

const sanitizeNameLive = (text: string, prevText: string = ""): string => {
  let cleaned = text.replace(/[^a-zA-Z'-]/g, "");

  if (!cleaned) return "";

  // If previous text was a single letter (e.g. "A" or "") and IME buffer sent duplicate (e.g. "Aas" or "Aa"), strip ghost duplicate
  if (
    prevText.length <= 1 &&
    cleaned.length >= 2 &&
    cleaned[0].toLowerCase() === cleaned[1].toLowerCase()
  ) {
    cleaned = cleaned[0] + cleaned.slice(2);
  }

  // Capitalize first character live
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const sanitizeNIC = (text: string): string => {
  // Allow only digits (0-9) and 'v'/'V'
  let cleaned = text.replace(/[^0-9vV]/g, "").toUpperCase();

  // Allow at most one 'V'
  const vIndex = cleaned.indexOf("V");
  if (vIndex !== -1) {
    cleaned =
      cleaned.slice(0, vIndex + 1) +
      cleaned.slice(vIndex + 1).replace(/V/g, "");
  }

  return cleaned;
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

const SignUp: React.FC<SignUpProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tab, setTab] = useState<"home" | "business">("home");

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  // Help / Support Modal State
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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

  // Deleted Account Link & Restore States
  const [isNicLinked, setIsNicLinked] = useState(false);
  const [showDeletedAccountModal, setShowDeletedAccountModal] = useState(false);
  const [deletedAccountData, setDeletedAccountData] = useState<{
    nic?: string;
    pastOrdersCount?: number;
    memberSince?: string;
    deletedOn?: string;
    userId?: number;
  } | null>(null);
  const [allowRestore, setAllowRestore] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const titles = ["Mr", "Mrs", "Ms", "Rev"];

  const isValidSriLankanMobile = (num: string): boolean =>
    /^7[0-9]{8}$/.test(num);

  const isValidGenericMobile = (num: string): boolean =>
    /^[0-9]{9}$/.test(num);

  // Validate fields helper
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title) newErrors.title = "Title is required";

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (/\s/.test(firstName)) {
      newErrors.firstName = "First name cannot contain spaces";
    } else if (!NAME_ALLOWED_REGEX.test(firstName.trim())) {
      newErrors.firstName = "First name must contain only letters";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (/\s/.test(lastName)) {
      newErrors.lastName = "Last name cannot contain spaces";
    } else if (!NAME_ALLOWED_REGEX.test(lastName.trim())) {
      newErrors.lastName = "Last name must contain only letters";
    }

    // User Mobile Phone Validate (Separated)
    if (!phoneCode) {
      newErrors.phoneCode = "Country code is required";
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Mobile number is required";
    } else if (/\s/.test(phoneNumber)) {
      newErrors.phoneNumber = "Mobile number cannot contain spaces";
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

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (/\s/.test(email)) {
      newErrors.email = "Email cannot contain spaces";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!nic.trim()) {
      newErrors.nic = "NIC number is required";
    } else if (/\s/.test(nic)) {
      newErrors.nic = "NIC number cannot contain spaces";
    } else if (
      !/^[0-9]{9}[vV]$/.test(nic.trim()) &&
      !/^[0-9]{12}$/.test(nic.trim())
    ) {
      newErrors.nic = "Invalid NIC format";
    }

    if (tab === "business") {
      if (!companyName.trim()) {
        newErrors.companyName = "Company name is required";
      } else if (/\s/.test(companyName)) {
        newErrors.companyName = "Company name cannot contain spaces";
      }

      // Company Mobile Phone Validate (Separated)
      if (!companyPhoneCode) {
        newErrors.companyPhoneCode = "Country code is required";
      }
      if (!companyNumber.trim()) {
        newErrors.companyNumber = "Company number is required";
      } else if (/\s/.test(companyNumber)) {
        newErrors.companyNumber = "Company number cannot contain spaces";
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
      }
    }

    // Password validations
    if (!password) {
      newErrors.password = "Password is required";
    } else if (/\s/.test(password)) {
      newErrors.password = "Password cannot contain spaces";
    } else {
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar =
        /[@#$%&*\-=()?\/;:'"!~±×÷•°`´{}\]\[+_¥®\^€£©¡<>¢|\\¿,.]/.test(password);

      if (password.length < 8) {
        newErrors.password = "Must be at least 8 characters";
      } else if (!hasUppercase && !hasNumber && !hasSpecialChar) {
        newErrors.password =
          "Must have 1 uppercase letter, 1 number & 1 special character";
      } else if (!hasUppercase && !hasSpecialChar) {
        newErrors.password = "Must have 1 uppercase letter & 1 special character";
      } else if (!hasUppercase && !hasNumber) {
        newErrors.password = "Must have 1 uppercase letter & 1 number";
      } else if (!hasNumber && !hasSpecialChar) {
        newErrors.password = "Must have 1 number & 1 special character";
      } else if (!hasUppercase) {
        newErrors.password = "Must have 1 uppercase letter";
      } else if (!hasNumber) {
        newErrors.password = "Must have 1 number";
      } else if (!hasSpecialChar) {
        newErrors.password = "Must have 1 special character";
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (/\s/.test(confirmPassword)) {
      newErrors.confirmPassword = "Confirm password cannot contain spaces";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (tab === "home" && !agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    try {
      const cleanedPhone =
        phoneCode === "+94"
          ? phoneNumber.trim().replace(/^0+/, "")
          : phoneNumber.trim();

      const payload = {
        title,
        firstName: capitalizeName(firstName.trim()),
        lastName: capitalizeName(lastName.trim()),
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
        allowRestore: allowRestore ? true : undefined,
      };

      setIsLoading(true);
      const response = await authService.signUp(payload);

      if (response.data && response.data.isDeletedAccount) {
        setIsNicLinked(true);
        setDeletedAccountData(response.data.data || {
          nic: nic.trim().toUpperCase(),
          pastOrdersCount: 0,
          memberSince: "N/A",
          deletedOn: "N/A",
        });
        setShowDeletedAccountModal(true);
        setIsLoading(false);
        return;
      }

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
        }
      } else {
        const data = response.data;
        const msg = data?.message || "Failed to register.";
        const allErrorsList: string[] = Array.isArray(data?.errors) ? data.errors : [];
        const combined = `${msg} ${allErrorsList.join(" ")}`.toLowerCase();

        const fieldErrorsToSet: Record<string, string> = {};

        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          if (data.fieldErrors.companyNumber || data.fieldErrors.companyPhoneNumber) {
            fieldErrorsToSet.companyNumber =
              data.fieldErrors.companyNumber || data.fieldErrors.companyPhoneNumber;
          }
          if (data.fieldErrors.phoneNumber) {
            fieldErrorsToSet.phoneNumber = data.fieldErrors.phoneNumber;
          }
          if (data.fieldErrors.email) {
            fieldErrorsToSet.email = data.fieldErrors.email;
          }
          if (data.fieldErrors.nic) {
            fieldErrorsToSet.nic = data.fieldErrors.nic;
          }
        }

        if (
          !fieldErrorsToSet.companyNumber &&
          (combined.includes("company phone") || combined.includes("company number"))
        ) {
          fieldErrorsToSet.companyNumber = "Company Phone Number already exists";
        }

        if (
          !fieldErrorsToSet.phoneNumber &&
          (combined.includes("mobile number already") ||
            (combined.includes("mobile") && combined.includes("already")) ||
            (combined.includes("phone") && combined.includes("already") && !combined.includes("company")))
        ) {
          fieldErrorsToSet.phoneNumber = "Mobile Number already exists";
        }

        if (
          !fieldErrorsToSet.email &&
          (combined.includes("email already") ||
            combined.includes("email in use") ||
            (combined.includes("email") && combined.includes("exists")))
        ) {
          fieldErrorsToSet.email = "Email already exists.";
        }

        if (!fieldErrorsToSet.nic && combined.includes("nic")) {
          fieldErrorsToSet.nic = "NIC number already exists";
        }

        if (Object.keys(fieldErrorsToSet).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrorsToSet }));
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
          showAlert("Signup Failed", msg);
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const data = err.response?.data;

      if (data?.isDeletedAccount) {
        setIsNicLinked(true);
        setDeletedAccountData(data.data || {
          nic: nic.trim().toUpperCase(),
          pastOrdersCount: 0,
          memberSince: "N/A",
          deletedOn: "N/A",
        });
        setShowDeletedAccountModal(true);
        setIsLoading(false);
        return;
      }

      const msg = data?.message || "An unexpected error occurred.";
      const allErrorsList: string[] = Array.isArray(data?.errors) ? data.errors : [];
      const combined = `${msg} ${allErrorsList.join(" ")}`.toLowerCase();

      const fieldErrorsToSet: Record<string, string> = {};

      if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        if (data.fieldErrors.companyNumber || data.fieldErrors.companyPhoneNumber) {
          fieldErrorsToSet.companyNumber =
            data.fieldErrors.companyNumber || data.fieldErrors.companyPhoneNumber;
        }
        if (data.fieldErrors.phoneNumber) {
          fieldErrorsToSet.phoneNumber = data.fieldErrors.phoneNumber;
        }
        if (data.fieldErrors.email) {
          fieldErrorsToSet.email = data.fieldErrors.email;
        }
        if (data.fieldErrors.nic) {
          fieldErrorsToSet.nic = data.fieldErrors.nic;
        }
      }

      if (
        !fieldErrorsToSet.companyNumber &&
        (combined.includes("company phone") || combined.includes("company number"))
      ) {
        fieldErrorsToSet.companyNumber = "Company Phone Number already exists";
      }

      if (
        !fieldErrorsToSet.phoneNumber &&
        (combined.includes("mobile number already") ||
          (combined.includes("mobile") && combined.includes("already")) ||
          (combined.includes("phone") && combined.includes("already") && !combined.includes("company")))
      ) {
        fieldErrorsToSet.phoneNumber = "Mobile Number already exists";
      }

      if (
        !fieldErrorsToSet.email &&
        (combined.includes("email already") ||
          combined.includes("email in use") ||
          (combined.includes("email") && combined.includes("exists")))
      ) {
        fieldErrorsToSet.email = "Email already in use.";
      }

      if (!fieldErrorsToSet.nic && combined.includes("nic")) {
        fieldErrorsToSet.nic = "NIC number already exists";
      }

      if (Object.keys(fieldErrorsToSet).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrorsToSet }));
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        showAlert("Signup Error", msg);
      }
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
              className={`text-sm ${tab === "home"
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
              className={`text-sm ${tab === "business"
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
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="gap-y-4 flex-1">
          {/* Title & First Name Row */}
          <View className="flex-row gap-x-3">
            {/* Title Selection */}
            <View className="w-[35%]">
              <TouchableOpacity
                onPress={() => setIsTitleModalOpen(true)}
                activeOpacity={0.8}
                style={{ height: 50 }}
                className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between ${errors.title
                  ? "border-red-500 bg-red-50/10"
                  : "border-black bg-white"
                  }`}
              >
                <View className="flex-row items-center gap-x-2">
                  <FontAwesome6 name="user-large" size={14} color="black" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#000000",
                      ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                    }}
                    className="text-[14px] text-black"
                  >
                    {title || "Title"}
                  </Text>
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
                style={{ height: 50 }}
                className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.firstName
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
                    setFirstName((prev) => sanitizeNameLive(text, prev));
                    if (errors.firstName)
                      setErrors((prev) => ({ ...prev, firstName: "" }));
                  }}
                  onBlur={() => setFirstName((prev) => capitalizeName(prev))}
                  autoCapitalize="words"
                  autoCorrect={false}
                  spellCheck={false}
                  maxLength={50}
                  style={{
                    flex: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: "#000000",
                    ...(Platform.OS === "android"
                      ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                      : { alignSelf: "center" }),
                  }}
                  className="flex-1 text-[14px] text-black"
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
              style={{ height: 50 }}
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.lastName
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
                  setLastName((prev) => sanitizeNameLive(text, prev));
                  if (errors.lastName)
                    setErrors((prev) => ({ ...prev, lastName: "" }));
                }}
                onBlur={() => setLastName((prev) => capitalizeName(prev))}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                maxLength={50}
                style={{
                  flex: 1,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: "#000000",
                  ...(Platform.OS === "android"
                    ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                    : { alignSelf: "center" }),
                }}
                className="flex-1 text-[14px] text-black"
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
                  style={{ height: 50 }}
                  className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between bg-white ${errors.phoneCode
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
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#000000",
                            ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                          }}
                          className="text-[14px] text-black"
                        >
                          {phoneCode}
                        </Text>
                      </>
                    ) : (
                      <>
                        <FontAwesome name="flag" size={14} color="black" />
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#000000",
                            ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                          }}
                          className="text-[14px] text-black"
                        >
                          Code
                        </Text>
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
                  style={{ height: 50 }}
                  className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.phoneNumber
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
                      const clean = text.replace(/[^0-9]/g, "").slice(0, 9);
                      setPhoneNumber(clean);
                      if (errors.phoneNumber)
                        setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                    }}
                    maxLength={9}
                    style={{
                      flex: 1,
                      paddingTop: 0,
                      paddingBottom: 0,
                      paddingVertical: 0,
                      fontSize: 14,
                      color: "#000000",
                      ...(Platform.OS === "android"
                        ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                        : { alignSelf: "center" }),
                    }}
                    className="flex-1 text-[14px] text-black"
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
              style={{ height: 50 }}
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.email
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
                  const clean = text.replace(/\s/g, "");
                  setEmail(clean);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: "" }));
                }}
                textContentType="emailAddress"
                autoComplete="email"
                style={{
                  flex: 1,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: "#000000",
                  ...(Platform.OS === "android"
                    ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                    : { alignSelf: "center" }),
                }}
                className="flex-1 text-[14px] text-black"
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
              style={{
                height: 50,
                ...(isNicLinked
                  ? { backgroundColor: "#FFF5E9", borderColor: "#FF9114" }
                  : errors.nic
                  ? {}
                  : { backgroundColor: "#FFFFFF", borderColor: "#000000" }),
              }}
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${
                isNicLinked
                  ? "border-[#FF9114] bg-[#FFF5E9]"
                  : errors.nic
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
                  const sanitized = sanitizeNIC(text);
                  setNic(sanitized);
                  if (isNicLinked) {
                    setIsNicLinked(false);
                    setAllowRestore(false);
                  }
                  if (errors.nic) setErrors((prev) => ({ ...prev, nic: "" }));
                }}
                maxLength={12}
                style={{
                  flex: 1,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: "#000000",
                  ...(Platform.OS === "android"
                    ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                    : { alignSelf: "center" }),
                }}
                className="flex-1 text-[14px] text-black"
              />
              {isNicLinked && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#000000",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginLeft: 6,
                  }}
                >
                  <FontAwesome6
                    name="circle-exclamation"
                    size={11}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Linked
                  </Text>
                </View>
              )}
            </View>
            {errors.nic && !isNicLinked && (
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
                  style={{ height: 50 }}
                  className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.companyName
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
                      const clean = text.replace(/\s/g, "");
                      setCompanyName(clean);
                      if (errors.companyName)
                        setErrors((prev) => ({ ...prev, companyName: "" }));
                    }}
                    style={{
                      flex: 1,
                      paddingTop: 0,
                      paddingBottom: 0,
                      paddingVertical: 0,
                      fontSize: 14,
                      color: "#000000",
                      ...(Platform.OS === "android"
                        ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                        : { alignSelf: "center" }),
                    }}
                    className="flex-1 text-[14px] text-black"
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
                      style={{ height: 50 }}
                      className={`h-[50px] border px-4 rounded-full flex-row items-center justify-between bg-white ${errors.companyPhoneCode
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
                            <Text
                              style={{
                                fontSize: 14,
                                color: "#000000",
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              }}
                              className="text-[14px] text-black"
                            >
                              {companyPhoneCode}
                            </Text>
                          </>
                        ) : (
                          <>
                            <FontAwesome name="flag" size={14} color="black" />
                            <Text
                              style={{
                                fontSize: 14,
                                color: "#000000",
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              }}
                              className="text-[14px] text-black"
                            >
                              Code
                            </Text>
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
                      style={{ height: 50 }}
                      className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.companyNumber
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
                          const clean = text.replace(/\s/g, "").replace(/[^0-9]/g, "").slice(0, 9);
                          setCompanyNumber(clean);
                          if (errors.companyNumber)
                            setErrors((prev) => ({
                              ...prev,
                              companyNumber: "",
                            }));
                        }}
                        maxLength={9}
                        style={{
                          flex: 1,
                          paddingTop: 0,
                          paddingBottom: 0,
                          paddingVertical: 0,
                          fontSize: 14,
                          color: "#000000",
                          ...(Platform.OS === "android"
                            ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                            : { alignSelf: "center" }),
                        }}
                        className="flex-1 text-[14px] text-black"
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
              style={{ height: 50 }}
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.password
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
                  const clean = text.replace(/\s/g, "");
                  setPassword(clean);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: "" }));
                }}
                textContentType="oneTimeCode"
                autoComplete="off"
                importantForAutofill="no"
                style={{
                  flex: 1,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: "#000000",
                  ...(Platform.OS === "android"
                    ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                    : { alignSelf: "center" }),
                }}
                className="flex-1 text-[14px] text-black"
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
                • At least 8 characters{"\n"}• 1 uppercase letter{"\n"}• 1
                number & 1 special character
              </Text>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View>
            <View
              style={{ height: 50 }}
              className={`h-[50px] border px-4 rounded-full flex-row items-center gap-x-2 ${errors.confirmPassword
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
                  const clean = text.replace(/\s/g, "");
                  setConfirmPassword(clean);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                textContentType="oneTimeCode"
                autoComplete="off"
                importantForAutofill="no"
                style={{
                  flex: 1,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: "#000000",
                  ...(Platform.OS === "android"
                    ? { height: 50, textAlignVertical: "center", includeFontPadding: false }
                    : { alignSelf: "center" }),
                }}
                className="flex-1 text-[14px] text-black"
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
                  className={`w-5 h-5 rounded border items-center justify-center ${agreeToTerms
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
                  <Text
                    className="font-bold underline"
                    onPress={() => navigation.navigate("PrivacyPolicy")}
                  >
                    Privacy Policy
                  </Text>
                  .
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

          {/* Action Button Section */}
          <View className="pb-0 pt-2">
            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
              className="bg-black rounded-full items-center justify-center mt-4 shadow-sm"
              style={{
                height: 50,
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
              <Text className="text-[14px] text-gray-500">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Login")}
              >
                <Text className="text-[12px] font-bold text-[#0085FF] underline">
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
        </View>
      </KeyboardAwareScrollView>

      {/* Title GlobalSearchModal */}
      <GlobalSearchModal
        visible={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        title="Select Title"
        showSearch={false}
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
            setPhoneNumber((prev) => prev.slice(0, 9));
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
            setCompanyNumber((prev) => prev.slice(0, 9));
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

      {/* Deleted Account Restore Bottom Modal */}
      <Modal
        visible={showDeletedAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeletedAccountModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "transparent",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 8,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Platform.OS === "ios" ? 36 : 24,
            }}
          >
            {/* Top Drag Handle */}
            <View
              style={{
                alignSelf: "center",
                width: 44,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#CBD5E1",
                marginBottom: 16,
              }}
            />

            {/* Header with circular orange icon */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "#FFF5E9",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                  marginTop: 2,
                }}
              >
                <FontAwesome6
                  name="circle-exclamation"
                  size={12}
                  color="#FF9114"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#000000",
                    lineHeight: 20,
                  }}
                >
                  Account Found with Previous Order History
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "400",
                    color: "#494A65",
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  An existing profile registered under NIC{" "}
                  {deletedAccountData?.nic || nic} was located. You can restore
                  this account to keep your order history.
                </Text>
              </View>
            </View>

            {/* 3 Summary Info Cards */}
            <View
              style={{
                backgroundColor: "#F4F7FB",
                borderRadius: 16,
                padding: 10,
                flexDirection: "row",
                marginVertical: 18,
                gap: 8,
              }}
            >
              {/* Card 1: Past Orders */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#000000",
                  }}
                >
                  {deletedAccountData?.pastOrdersCount ?? 0}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "400",
                    color: "#494A65",
                    marginTop: 3,
                  }}
                >
                  Past Orders
                </Text>
              </View>

              {/* Card 2: Member Since */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#000000",
                  }}
                >
                  {deletedAccountData?.memberSince || "N/A"}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "400",
                    color: "#494A65",
                    marginTop: 3,
                  }}
                >
                  Member Since
                </Text>
              </View>

              {/* Card 3: Deleted On */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#000000",
                  }}
                >
                  {deletedAccountData?.deletedOn || "N/A"}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "400",
                    color: "#494A65",
                    marginTop: 3,
                  }}
                >
                  Deleted On
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Go back & Edit NIC */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setNic("");
                  setIsNicLinked(false);
                  setAllowRestore(false);
                  setShowDeletedAccountModal(false);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#DDE2E7",
                  backgroundColor: "#FFFFFF",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#000000",
                  }}
                >
                  Go back & Edit NIC
                </Text>
              </TouchableOpacity>

              {/* Continue with Account */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setAllowRestore(true);
                  setShowDeletedAccountModal(false);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#000000",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Continue with Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer Support Link */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: "#494A65",
                }}
              >
                Not your account?{" "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowDeletedAccountModal(false);
                  setIsHelpModalOpen(true);
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#0088FF",
                    textDecorationLine: "underline",
                    fontWeight: "500",
                  }}
                >
                  Contact Support
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help / Contact Support Popup Modal */}
      <Modal
        visible={isHelpModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsHelpModalOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="p-6 rounded-3xl items-center shadow-lg w-full max-w-sm"
            style={{
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Phone Icon */}
            <View className="w-12 h-12 rounded-full bg-[#0085FF]/10 items-center justify-center mb-4">
              <MaterialIcons name="phone" size={24} color="#0085FF" />
            </View>

            {/* Title & description */}
            <Text className="font-bold text-lg text-black text-center mb-2">
              Need Assistance?
            </Text>
            <Text className="text-sm text-[#4E4E4E] text-center mb-6 leading-relaxed">
              Our customer support hotline is available 24/7. Tap below to place a direct call.
            </Text>

            {/* Action Buttons */}
            <View className="w-full gap-y-3">
              {/* Call Button */}
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL("tel:+94114313433");
                  setIsHelpModalOpen(false);
                }}
                activeOpacity={0.8}
                className="py-3.5 rounded-full items-center justify-center shadow-sm"
                style={{ backgroundColor: "#0085FF" }}
              >
                <Text className="text-white font-bold text-base">
                  Call (+94) 114313433
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setIsHelpModalOpen(false)}
                activeOpacity={0.8}
                className="py-3.5 rounded-full items-center justify-center"
                style={{ backgroundColor: "#9599A2" }}
              >
                <Text className="font-bold text-base" style={{ color: "#000000" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SignUp;
