import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  BackHandler,
  Linking,
  Keyboard,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateUserProfileImage, updateUserProfile } from "@/store/authSlice";

import { RootStackParamList } from "@/types/types";
import { getSignUpStorageKeys } from "@/screens/common/auth/SignUpOTPScreen";
import { DropdownField, InputField } from "@/component/common/CustomField";

const defaultUserIcon = require("@/assets/images/auth/user-vector-icon.webp");
import CustomHeader from "@/component/common/CustomHeader";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import { AlertModal } from "@/component/common/AlertModal";
import customerService from "@/services/customer/customer.service";
import CameraAccess from "@/screens/common/permission/CameraAccess";
import {
  countries,
  getFlagUrl,
  getPhoneMaxLength,
  cleanPhoneInput,
  validatePhone,
} from "@/utils/phoneValidation";
import { TITLES } from "@/constants/titles";

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
    style={{
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: !isLast ? 1 : 0,
      borderBottomColor: "#F3F4F6",
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Image
        source={{ uri: item.flag }}
        style={{ width: 24, height: 18, borderRadius: 2 }}
      />
      <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "600" }}>
        {item.name}
      </Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 16, color: "#6B7280", fontWeight: "700" }}>
        {item.dialCode}
      </Text>
      {isSelected && <MaterialIcons name="check" size={20} color="#21202B" />}
    </View>
  </TouchableOpacity>
);

const capitalizeName = (text: string): string => {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(?:^|\s|-)([a-z])/g, (_, c) => c.toUpperCase());
};

const sanitizeFirstNameLive = (text: string): string => {
  // Disallow ALL spaces, allow only letters, apostrophes, hyphens
  let cleaned = text.replace(/\s/g, "").replace(/[^a-zA-Z'-]/g, "");
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const sanitizeLastNameLive = (text: string): string => {
  // Allow letters, apostrophes, hyphens, and spaces
  let cleaned = text.replace(/[^a-zA-Z' -]/g, "");
  // Prevent leading spaces
  cleaned = cleaned.replace(/^\s+/, "");
  // Prevent multiple consecutive spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const sanitizeCompanyNameLive = (text: string): string => {
  // Prevent leading spaces
  let cleaned = text.replace(/^\s+/, "");
  // Prevent multiple consecutive spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const capitalizeFirst = (text: string): string => {
  const trimmed = text.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
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
    /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.)*[a-zA-Z0-9][a-zA-Z0-9-]{1,}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
  return emailRegex.test(trimmed);
};

type MyAccountNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MyAccount"
>;

interface MyAccountProps {
  navigation: MyAccountNavigationProp;
}

const MyAccount: React.FC<MyAccountProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef<any>(null);
  const scrollToTop = () =>
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  const reduxBuyerType = useSelector(
    (state: RootState) => state.auth.userProfile?.buyerType,
  );
  const [buyerType, setBuyerType] = useState("");

  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [showCameraPermission, setShowCameraPermission] = useState(false);
  const [mobileCode, setMobileCode] = useState("+94");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyMobile, setCompanyMobile] = useState("");
  const [companyMobileCode, setCompanyMobileCode] = useState("+94");
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [isPhoneCodeModalOpen, setIsPhoneCodeModalOpen] = useState(false);
  const [isCompanyPhoneCodeModalOpen, setIsCompanyPhoneCodeModalOpen] =
    useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [mobileNumberError, setMobileNumberError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [companyMobileError, setCompanyMobileError] = useState("");
  const [companyNameError, setCompanyNameError] = useState("");
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null,
  );

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

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

  const checkImageSize = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<boolean> => {
    let size = asset.fileSize || 0;
    if (!size) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && typeof (fileInfo as any).size === "number") {
          size = (fileInfo as any).size;
        }
      } catch (e) {
        console.log("Failed to get image file size:", e);
      }
    }

    if (size > MAX_IMAGE_SIZE) {
      setProfileImageError("Image size must not exceed 5MB");
      showAlert(
        "Image Too Large",
        "Image size must not exceed 5MB. Please choose a smaller image.",
        "error",
      );
      return false;
    }

    setProfileImageError(null);
    return true;
  };

  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalMobileCode, setOriginalMobileCode] = useState("");
  const [originalMobileNumber, setOriginalMobileNumber] = useState("");
  const [originalAccountData, setOriginalAccountData] = useState<{
    title: string;
    firstName: string;
    lastName: string;
    mobileCode: string;
    mobileNumber: string;
    email: string;
    companyName: string;
    companyMobileCode: string;
    companyMobile: string;
    image: string;
  } | null>(null);

  const isWholesale =
    (buyerType || reduxBuyerType || "").toString().trim().toLowerCase() ===
    "wholesale";

  useFocusEffect(
    React.useCallback(() => {
      const fetchAccountDetails = async () => {
        try {
          setIsLoading(true);
          const response = await customerService.getAccountDetails();
          if (response.data && response.data.data) {
            const data = response.data.data;
            if (data.buyerType || (data as any).buyer_type) {
              setBuyerType(data.buyerType || (data as any).buyer_type);
            }
            if (data.title) setTitle(data.title);
            if (data.firstName) {
              const f = data.firstName.trim().replace(/\s/g, "");
              setFirstName(f ? f.charAt(0).toUpperCase() + f.slice(1) : "");
            }
            if (data.lastName)
              setLastName(capitalizeName(data.lastName.trim()));
            const fetchedImage = (data.profileImage || data.image || "").trim();
            if (fetchedImage) {
              setProfileImage(fetchedImage);
            } else {
              setProfileImage(null);
            }
            if (data.phoneCode) setMobileCode(data.phoneCode);
            if (data.phoneNumber) setMobileNumber(data.phoneNumber);
            if (data.email) setEmail(data.email);
            if (data.companyName) {
              setCompanyName(capitalizeFirst(data.companyName));
            }
            if (data.companyPhoneCode)
              setCompanyMobileCode(data.companyPhoneCode);
            if (data.companyPhone) setCompanyMobile(data.companyPhone);

            setOriginalMobileCode(data.phoneCode || "");
            setOriginalMobileNumber(data.phoneNumber || "");

            setOriginalAccountData({
              title: (data.title || "").trim(),
              firstName: (data.firstName || "").trim(),
              lastName: (data.lastName || "").trim(),
              mobileCode: (data.phoneCode || "+94").trim(),
              mobileNumber: (data.phoneNumber || "").trim(),
              email: (data.email || "").trim(),
              companyName: (data.companyName || "").trim(),
              companyMobileCode: (
                data.companyPhoneCode ||
                data.phoneCode ||
                "+94"
              ).trim(),
              companyMobile: (data.companyPhone || "").trim(),
              image: fetchedImage,
            });
          }
          console.log("acc details fetching success: ", response.data.data);
        } catch (error) {
          console.log("error fetching acc details: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAccountDetails();
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Profile");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const handleSelectTitle = (val: string) => {
    setTitle(val);
    setTitleModalOpen(false);
    if (titleError) {
      setTitleError("");
    }
  };

  const countryModalData = countries.map((c) => ({
    label: `${c.name} (${c.dialCode})`,
    value: c.dialCode,
    code: c.code,
    dialCode: c.dialCode,
    name: c.name,
    flag: getFlagUrl(c.code),
  }));

  const delayedAlert = (...args: Parameters<typeof Alert.alert>) => {
    setTimeout(() => Alert.alert(...args), Platform.OS === "ios" ? 400 : 0);
  };

  // UPDATE ACCOUNT
  const handleUpdate = async () => {
    if (updating) return;

    // Validate EXACTLY what the user typed (no truncation), then send the same
    // value with leading zeros removed. Nothing is cut down to "look" valid.
    const rawMobile = mobileNumber.trim();
    const cleanedMobile = rawMobile.replace(/^0+/, "");
    const effectiveCompanyCode = companyMobileCode || mobileCode;
    const rawCompanyMobile = companyMobile.trim();
    const cleanedCompanyMobile = rawCompanyMobile.replace(/^0+/, "");

    // 1) Always close the keyboard first so it never swallows a tap
    Keyboard.dismiss();

    // 2) PHONE CHECK RUNS FIRST ON EVERY CLICK – stop here if invalid
    const phoneGateErr = validatePhone(mobileCode, rawMobile);
    if (phoneGateErr) {
      setMobileNumberError(phoneGateErr);
      scrollToTop(); // make sure the error is visible
      return;
    }

    setFirstNameError("");
    setLastNameError("");
    setMobileNumberError("");
    setEmailError("");
    setTitleError("");
    setCodeError("");
    setCompanyMobileError("");
    setCompanyNameError("");

    let hasError = false;

    if (!title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    }

    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      hasError = true;
    } else if (/\s/.test(firstName)) {
      setFirstNameError("First name cannot contain spaces");
      hasError = true;
    } else if (!/^[a-zA-Z'-]+$/.test(firstName.trim())) {
      setFirstNameError("First name must contain only letters");
      hasError = true;
    }

    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      hasError = true;
    } else if (!/^[a-zA-Z' -]+$/.test(lastName.trim())) {
      setLastNameError("Last name must contain only letters");
      hasError = true;
    }

    if (!mobileCode.trim()) {
      setCodeError("Code is required");
      hasError = true;
    }

    // Personal mobile (retail + wholesale) – country specific
    const mobileErr = validatePhone(mobileCode, rawMobile);
    if (mobileErr) {
      setMobileNumberError(mobileErr);
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (/\s/.test(email)) {
      setEmailError("Email cannot contain spaces");
      hasError = true;
    } else if (!isValidEmail(email)) {
      setEmailError("Invalid email address");
      hasError = true;
    }

    // Company name & number (wholesale only, required) – country specific
    if (isWholesale) {
      if (!companyName.trim()) {
        setCompanyNameError("Company name is required");
        hasError = true;
      }

      const companyErr = validatePhone(effectiveCompanyCode, rawCompanyMobile, {
        required: true,
        emptyMessage: "Company number is required",
      });
      if (companyErr) {
        setCompanyMobileError(companyErr);
        hasError = true;
      }
    }

    if (hasError) {
      scrollToTop();
      return;
    }

    if (originalAccountData) {
      const currentImage = (profileImage || "").trim();
      const origImage = (originalAccountData.image || "").trim();
      const isImageChanged = currentImage !== origImage;

      const isUnchanged =
        !isImageChanged &&
        title.trim() === originalAccountData.title &&
        firstName.trim() === originalAccountData.firstName &&
        lastName.trim() === originalAccountData.lastName &&
        mobileCode.trim() === originalAccountData.mobileCode &&
        cleanedMobile ===
          cleanPhoneInput(
            originalAccountData.mobileNumber,
            originalAccountData.mobileCode,
          ) &&
        email.trim().toLowerCase() ===
          originalAccountData.email.toLowerCase() &&
        (!isWholesale ||
          (companyName.trim() === originalAccountData.companyName &&
            (companyMobileCode || mobileCode).trim() ===
              originalAccountData.companyMobileCode &&
            cleanedCompanyMobile ===
              cleanPhoneInput(
                originalAccountData.companyMobile,
                originalAccountData.companyMobileCode,
              )));

      if (isUnchanged) {
        // Popup is not open yet here, so a normal Alert is fine
        Alert.alert(
          "No Changes Detected",
          "You haven't made any changes to your account details to update.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    try {
      setUpdating(true);

      const finalImage = profileImage ? profileImage.trim() : null;
      const formattedFirstName = capitalizeName(
        firstName.trim().replace(/\s/g, ""),
      );
      const formattedLastName = capitalizeName(lastName.trim());
      const formattedCompanyName = capitalizeFirst(companyName);

      const payload: any = {
        title: (title || "Mr").trim(),
        firstName: formattedFirstName,
        lastName: formattedLastName,
        phoneCode: mobileCode.trim(),
        phoneNumber: cleanedMobile,
        email: email.trim(),
        image: finalImage,
      };

      if (isWholesale) {
        payload.companyName = formattedCompanyName;
        payload.companyPhoneCode = companyMobileCode || mobileCode;
        payload.companyPhone = cleanedCompanyMobile;
      }

      const phoneChanged =
        cleanedMobile !==
          cleanPhoneInput(originalMobileNumber, originalMobileCode) ||
        mobileCode !== originalMobileCode;

      if (phoneChanged) {
        // Last-line guard: never request an OTP for an invalid number
        const guardErr = validatePhone(mobileCode, rawMobile);
        if (guardErr) {
          setMobileNumberError(guardErr);
          return;
        }

        const method = mobileCode === "+94" ? "sms" : "email";
        const { lockoutKeys, attemptsKeys } = getSignUpStorageKeys(
          mobileCode,
          cleanedMobile,
          email,
          method,
        );

        // 1. Check persistent lockout
        for (const key of lockoutKeys) {
          try {
            const storedLockout = await AsyncStorage.getItem(key);
            if (storedLockout) {
              const lockoutUntil = parseInt(storedLockout, 10);
              const remainingMs = lockoutUntil - Date.now();
              if (remainingMs > 0) {
                delayedAlert(
                  "Too Many Attempts",
                  "Too many verification attempts. Please try again after 15 minutes.",
                );
                return;
              } else {
                await AsyncStorage.removeItem(key);
              }
            }
          } catch (e) {
            console.log("Error checking lockout:", e);
          }
        }

        // 2. Check recent attempts count
        const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
        for (const key of attemptsKeys) {
          try {
            const raw = await AsyncStorage.getItem(key);
            if (raw) {
              const timestamps: number[] = JSON.parse(raw);
              const now = Date.now();
              const valid = timestamps.filter(
                (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
              );
              if (valid.length >= 5) {
                const oldest = valid[0];
                const remainingMs =
                  RATE_LIMIT_WINDOW_MS - (Date.now() - oldest);
                const remainingSec = Math.max(
                  Math.ceil(remainingMs / 1000),
                  900,
                );
                const lockoutUntil = Date.now() + remainingSec * 1000;
                for (const lockKey of lockoutKeys) {
                  await AsyncStorage.setItem(lockKey, String(lockoutUntil));
                }
                delayedAlert(
                  "Too Many Attempts",
                  "Too many verification attempts. Please try again after 15 minutes.",
                );
                return;
              }
            }
          } catch (e) {
            console.log("Error checking attempts:", e);
          }
        }

        const otpResponse = await customerService.sendPhoneChangeOtp({
          phoneCode: mobileCode,
          phoneNumber: cleanedMobile,
          email: email.trim(),
        });

        const otpData = otpResponse.data;

        if (otpData && otpData.status) {
          const now = Date.now();
          for (const key of attemptsKeys) {
            try {
              const raw = await AsyncStorage.getItem(key);
              const existing = raw
                ? JSON.parse(raw).filter(
                    (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS,
                  )
                : [];
              const updated = [...existing, now];
              await AsyncStorage.setItem(key, JSON.stringify(updated));
            } catch (e) {
              console.log("Error recording attempt:", e);
            }
          }

          delayedAlert(
            "Verification Code Sent",
            `A 5-digit verification code has been sent to your ${otpData.method === "email" ? "email address" : "mobile number"}.\n\n(5 OTP resend attempts limit)`,
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.navigate("SignUpOTP", {
                    phoneCode: mobileCode,
                    phoneNumber: cleanedMobile,
                    email: email,
                    method: otpData.method || "sms",
                    referenceId: otpData.referenceId,
                    signupToken: otpData.signupToken,
                    flow: "changePhone",
                    accountDetails: payload,
                  });
                },
              },
            ],
          );
        } else {
          const is429 = otpData?.isRateLimited;
          const msg = otpData?.message || "Failed to send verification code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            const lockoutUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
            for (const lockKey of lockoutKeys) {
              await AsyncStorage.setItem(lockKey, String(lockoutUntil));
            }
            delayedAlert(
              "Too Many Attempts",
              "Too many verification attempts. Please try again after 15 minutes.",
            );
          } else {
            if (msg.toLowerCase().includes("email")) {
              setEmailError(msg);
            }
            delayedAlert("Error", msg);
          }
        }
      } else {
        const response = await customerService.updateUserDetails(payload);

        if (response.data) {
          setMobileNumber(cleanedMobile);
          setCompanyMobile(cleanedCompanyMobile);
          const updatedImageStr = profileImage ? profileImage.trim() : "";
          setOriginalAccountData({
            title: title.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            mobileCode: mobileCode.trim(),
            mobileNumber: cleanedMobile,
            email: email.trim(),
            companyName: companyName.trim(),
            companyMobileCode: (companyMobileCode || mobileCode).trim(),
            companyMobile: cleanedCompanyMobile,
            image: updatedImageStr,
          });

          dispatch(updateUserProfileImage({ image: updatedImageStr }));
          dispatch(
            updateUserProfile({
              title: title.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phoneNumber: cleanedMobile,
              phoneCode: mobileCode.trim(),
              image: updatedImageStr,
              companyName: isWholesale ? companyName.trim() : undefined,
            }),
          );

          try {
            const stored = await AsyncStorage.getItem("userProfile");
            if (stored) {
              const parsed = JSON.parse(stored);
              const merged = {
                ...parsed,
                title: title.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                phoneNumber: cleanedMobile,
                phoneCode: mobileCode.trim(),
                image: updatedImageStr,
                companyName: isWholesale
                  ? companyName.trim()
                  : parsed.companyName,
              };
              await AsyncStorage.setItem("userProfile", JSON.stringify(merged));
            }
          } catch (e) {
            console.log("Error updating AsyncStorage userProfile:", e);
          }

          delayedAlert(
            "Success",
            response.data.message ||
              "Your account information has been updated.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("Profile"),
              },
            ],
          );
        }
      }
    } catch (error: any) {
      console.log("failed to update account: ", error);
      const errorMessage =
        error?.response?.data?.message ||
        "Failed to update account. Please try again.";
      const lower = errorMessage.toLowerCase();
      if (lower.includes("email")) {
        setEmailError(errorMessage);
      } else if (lower.includes("phone") || lower.includes("mobile")) {
        setMobileNumberError(errorMessage);
      }
      delayedAlert("Error", errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  // UPLOAD PROFILE IMAGE TO BACKEND
  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      setProfileImageError(null);
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : "jpg";
      const type =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
      const cleanName = filename.includes(".")
        ? filename
        : `${filename}.${ext}`;

      const response = await customerService.uploadProfileImage(
        uri,
        cleanName,
        type,
      );
      if (
        response.data &&
        response.data.status &&
        response.data.data?.imageUrl
      ) {
        const uploadedUrl = response.data.data.imageUrl;
        setProfileImage(uploadedUrl);
        setProfileImageError(null);
        setOriginalAccountData((prev) =>
          prev ? { ...prev, image: uploadedUrl } : null,
        );
        dispatch(updateUserProfileImage({ image: uploadedUrl }));
        dispatch(updateUserProfile({ image: uploadedUrl }));
        try {
          const stored = await AsyncStorage.getItem("userProfile");
          if (stored) {
            const parsed = JSON.parse(stored);
            await AsyncStorage.setItem(
              "userProfile",
              JSON.stringify({ ...parsed, image: uploadedUrl }),
            );
          }
        } catch (e) {
          console.log("Error updating AsyncStorage userProfile:", e);
        }
        showAlert("Success", "Profile photo updated successfully.", "success");
      } else {
        const msg = response.data?.message || "Failed to upload image.";
        setProfileImageError(msg);
        showAlert("Upload Failed", msg, "error");
      }
    } catch (error: any) {
      console.log("Error uploading profile image:", error);
      const errorMsg =
        error?.response?.data?.message ||
        "Failed to upload profile photo. Please try again.";
      setProfileImageError(errorMsg);
      showAlert("Upload Failed", errorMsg, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  // CHANGE PROFILE IMAGE
  const handleChangeProfileImage = () => {
    setImagePickerModalVisible(true);
  };

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const isValid = await checkImageSize(result.assets[0]);
        if (isValid) {
          await uploadImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.log("Error taking photo:", error);
      showAlert("Error", "Could not take photo. Please try again.", "error");
    }
  };

  // TAKE PHOTO
  const handleTakePhoto = async () => {
    try {
      setImagePickerModalVisible(false);
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== "granted") {
        setShowCameraPermission(true);
        return;
      }

      await launchCamera();
    } catch (error) {
      console.log("Error checking camera permission:", error);
      setShowCameraPermission(true);
    }
  };

  // CHOOSE FROM GALLERY
  const handleChooseFromGallery = async () => {
    try {
      setImagePickerModalVisible(false);

      if (Platform.OS === "ios") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Photo library access is required to choose a profile photo.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const isValid = await checkImageSize(result.assets[0]);
        if (isValid) {
          await uploadImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.log("Error choosing from gallery:", error);
      showAlert("Error", "Could not select image. Please try again.", "error");
    }
  };

  // REMOVE PHOTO
  const handleRemovePhoto = () => {
    setImagePickerModalVisible(false);
    setProfileImage(null);
    setProfileImageError(null);
  };

  // DELETE OPTION
  const handleMore = () => {
    setMoreMenuVisible(!moreMenuVisible);
  };

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}

      <CustomHeader
        navigation={navigation}
        title="My Account"
        showBackButton={true}
        onBackPress={() => navigation.navigate("Profile")}
      />

      {/* Delete ellipsis */}

      {!isWholesale && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleMore}
          style={{
            position: "absolute",
            right: 10,
            top: 9,
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#000" />
        </TouchableOpacity>
      )}

      {/* Dropdown */}

      {moreMenuVisible && (
        <View
          style={{
            position: "absolute",
            top: 38,
            right: 5,
            width: 130,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingVertical: 1,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: "#EEEEEE",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate("DeleteAccount");
              setMoreMenuVisible(false);
            }}
            style={{
              height: 24,
              paddingHorizontal: 5,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                marginLeft: 10,
                fontSize: 13,
                fontWeight: "500",
                color: "#000000",
              }}
            >
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <ActivityIndicator size="large" color="#000000" />
          <Text
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: "600",
              color: "#000000",
              textAlign: "center",
            }}
          >
            Loading Account...
          </Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          innerRef={(ref) => (scrollRef.current = ref)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          keyboardOpeningTime={0}
          enableResetScrollToCoords={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 20,
            flexGrow: 1,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            {/* PROFILE IMAGE */}
            <View
              style={{
                alignItems: "center",
                marginTop: 5,
                marginBottom: 40,
              }}
            >
              <View
                style={{
                  width: 93,
                  height: 93,
                  position: "relative",
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleChangeProfileImage}
                  disabled={uploadingImage}
                  style={{
                    width: 93,
                    height: 93,
                    borderRadius: 999,
                    backgroundColor: "#EAEFF5",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "#F0F0F0",
                  }}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : profileImage && profileImage.trim() !== "" ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={defaultUserIcon}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>

                {/* Edit Image */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleChangeProfileImage}
                  disabled={uploadingImage}
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#000000",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                    elevation: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                  }}
                >
                  <FontAwesome6 name="pen" size={13} color="#FFFFFF" solid />
                </TouchableOpacity>
              </View>

              {profileImageError ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 10,
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color="#FF3B30"
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#FF3B30",
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    {profileImageError}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* FORM */}
            <View style={{ width: "100%" }}>
              {/* TITLE + FIRST NAME */}
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  marginBottom: 14,
                }}
              >
                {/* Title */}
                <View style={{ width: "40%", marginRight: 8 }}>
                  <DropdownField
                    label="Title"
                    value={title}
                    open={false}
                    setOpen={() => setTitleModalOpen(true)}
                    options={[]}
                    onSelect={() => {}}
                    icon="user"
                    error={titleError}
                  />
                </View>

                {/* First Name */}
                <View style={{ flex: 1 }}>
                  <InputField
                    icon="user"
                    label="First Name"
                    placeholder="First Name"
                    value={firstName}
                    autoCapitalize="words"
                    onChangeText={(text) => {
                      const sanitized = sanitizeFirstNameLive(text);
                      setFirstName(sanitized);
                      if (firstNameError && sanitized.trim()) {
                        setFirstNameError("");
                      }
                    }}
                    onBlur={() => {
                      const cap = capitalizeName(firstName);
                      setFirstName(cap);
                      if (!cap.trim()) {
                        setFirstNameError("First name is required");
                      } else if (!/^[a-zA-Z'-]+$/.test(cap.trim())) {
                        setFirstNameError(
                          "First name must contain only letters",
                        );
                      }
                    }}
                    error={firstNameError}
                  />
                </View>
              </View>

              {/* LAST NAME */}
              <View style={{ marginBottom: 14 }}>
                <InputField
                  icon="user"
                  label="Last Name"
                  placeholder="Last Name"
                  value={lastName}
                  autoCapitalize="words"
                  onChangeText={(text) => {
                    const sanitized = sanitizeLastNameLive(text);
                    setLastName(sanitized);
                    if (lastNameError && sanitized.trim()) {
                      setLastNameError("");
                    }
                  }}
                  onBlur={() => {
                    const cap = capitalizeName(lastName);
                    setLastName(cap);
                    if (!cap.trim()) {
                      setLastNameError("Last name is required");
                    } else if (!/^[a-zA-Z' -]+$/.test(cap.trim())) {
                      setLastNameError("Last name must contain only letters");
                    }
                  }}
                  error={lastNameError}
                />
              </View>

              {/* CODE + MOBILE */}
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  marginBottom: 14,
                }}
              >
                {/* Code */}
                <View style={{ width: "32%", marginRight: 8 }}>
                  <DropdownField
                    label="Code"
                    value={mobileCode}
                    open={false}
                    setOpen={() => setIsPhoneCodeModalOpen(true)}
                    options={[]}
                    onSelect={() => {}}
                    icon="flag"
                    circleSize={30}
                    iconSize={14}
                    paddingHorizontal={8}
                    marginLeft={6}
                    arrowSize={16}
                    error={codeError}
                  />
                </View>

                {/* Mobile Number */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <InputField
                    icon="phone"
                    label="Mobile Number"
                    placeholder="Mobile Number"
                    circleSize={30}
                    iconSize={14}
                    paddingHorizontal={8}
                    marginLeft={6}
                    value={mobileNumber}
                    onChangeText={(text) => {
                      const clean = cleanPhoneInput(text, mobileCode);
                      setMobileNumber(clean);
                      if (
                        mobileNumberError &&
                        !validatePhone(mobileCode, clean)
                      ) {
                        setMobileNumberError("");
                      }
                    }}
                    onBlur={() =>
                      setMobileNumberError(
                        validatePhone(mobileCode, mobileNumber),
                      )
                    }
                    keyboardType="phone-pad"
                    maxLength={getPhoneMaxLength(mobileCode)}
                    error={mobileNumberError}
                  />
                </View>
              </View>

              {/* EMAIL */}
              <View style={{ marginBottom: isWholesale ? 14 : 0 }}>
                <InputField
                  icon="house"
                  label="Email"
                  placeholder="Email Address"
                  value={email}
                  autoCapitalize="none"
                  onChangeText={(text) => {
                    const clean = text.replace(/\s/g, "");
                    setEmail(clean);
                    if (emailError && isValidEmail(clean)) {
                      setEmailError("");
                    }
                  }}
                  onBlur={() => {
                    if (!email.trim()) {
                      setEmailError("Email is required");
                    } else if (!isValidEmail(email)) {
                      setEmailError("Invalid email address");
                    }
                  }}
                  keyboardType="email-address"
                  error={emailError}
                />
              </View>

              {/* WHOLESALE ONLY FIELDS */}
              {isWholesale && (
                <>
                  {/* Company name */}
                  <View style={{ marginBottom: 14 }}>
                    <InputField
                      icon="building"
                      label="Company Name"
                      placeholder="Company Name"
                      value={companyName}
                      autoCapitalize="words"
                      onChangeText={(text) => {
                        const sanitized = sanitizeCompanyNameLive(text);
                        setCompanyName(sanitized);
                        if (companyNameError && sanitized.trim()) {
                          setCompanyNameError("");
                        }
                      }}
                      onBlur={() => {
                        const cap = capitalizeFirst(companyName);
                        setCompanyName(cap);
                        if (!cap.trim()) {
                          setCompanyNameError("Company name is required");
                        }
                      }}
                      error={companyNameError}
                    />
                  </View>

                  {/* COM CODE + Company MOBILE */}
                  <View
                    style={{
                      flexDirection: "row",
                      width: "100%",
                      marginBottom: 14,
                    }}
                  >
                    {/* Company Code */}
                    <View style={{ width: "32%", marginRight: 8 }}>
                      <DropdownField
                        label="Code"
                        value={companyMobileCode || "+94"}
                        open={false}
                        setOpen={() => setIsCompanyPhoneCodeModalOpen(true)}
                        options={[]}
                        onSelect={() => {}}
                        icon="flag"
                        circleSize={30}
                        iconSize={14}
                        paddingHorizontal={8}
                        marginLeft={6}
                        arrowSize={16}
                      />
                    </View>

                    {/* Company Mobile Number */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <InputField
                        icon="phone"
                        label="Company Mobile"
                        placeholder="Company Mobile"
                        circleSize={30}
                        iconSize={14}
                        paddingHorizontal={8}
                        marginLeft={6}
                        value={companyMobile}
                        onChangeText={(text) => {
                          const clean = cleanPhoneInput(
                            text,
                            companyMobileCode || mobileCode,
                          );
                          setCompanyMobile(clean);
                          if (
                            companyMobileError &&
                            !validatePhone(
                              companyMobileCode || mobileCode,
                              clean,
                              {
                                required: true,
                                emptyMessage: "Company number is required",
                              },
                            )
                          ) {
                            setCompanyMobileError("");
                          }
                        }}
                        onBlur={() =>
                          setCompanyMobileError(
                            validatePhone(
                              companyMobileCode || mobileCode,
                              companyMobile,
                              {
                                required: true,
                                emptyMessage: "Company number is required",
                              },
                            ),
                          )
                        }
                        keyboardType="phone-pad"
                        maxLength={getPhoneMaxLength(
                          companyMobileCode || mobileCode,
                        )}
                        error={companyMobileError}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* BOTTOM UPDATE BUTTON */}
          <View
            style={{
              marginTop: 24,
              marginBottom: Platform.OS === "ios" ? 16 : 8,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleUpdate}
              disabled={updating}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 27,
                backgroundColor: updating ? "#8B9DA7" : "#000",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "700",
                  letterSpacing: 0.2,
                }}
              >
                {updating ? "Updating..." : "Update Account Info"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      )}

      {/* Updating popup: shown only while the account is being updated */}
      <Modal
        visible={updating}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}} // block Android back button while updating
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              paddingVertical: 36,
              paddingHorizontal: 40,
              alignItems: "center",
              minWidth: 220,
            }}
          >
            <ActivityIndicator size="large" color="#000000" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                fontWeight: "600",
                color: "#000000",
                textAlign: "center",
              }}
            >
              Updating account...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Phone Code GlobalSearchModal */}
      <GlobalSearchModal
        visible={isPhoneCodeModalOpen}
        onClose={() => setIsPhoneCodeModalOpen(false)}
        title="Select Country Code"
        searchPlaceholder="Search country..."
        noResultsText="No results found"
        data={countryModalData}
        selectedItems={mobileCode ? [mobileCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            const code = items[0];
            setMobileCode(code);
            // trim to the new country's max length and clear stale error
            setMobileNumber((prev) => prev.slice(0, getPhoneMaxLength(code)));
            setMobileNumberError("");
            if (codeError) setCodeError("");
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
        data={countryModalData}
        selectedItems={companyMobileCode ? [companyMobileCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            const code = items[0];
            setCompanyMobileCode(code);
            setCompanyMobile((prev) => prev.slice(0, getPhoneMaxLength(code)));
            setCompanyMobileError("");
          }
          setIsCompanyPhoneCodeModalOpen(false);
        }}
        searchKeys={["name", "dialCode"]}
        renderItem={renderCountryItem}
      />

      {/* Title GlobalSearchModal */}
      <GlobalSearchModal
        visible={titleModalOpen}
        onClose={() => setTitleModalOpen(false)}
        title="Select Title"
        data={TITLES.map((t) => ({ label: t, value: t }))}
        selectedItems={title ? [title] : []}
        onSelect={(items) => {
          if (items && items[0]) {
            handleSelectTitle(items[0]);
          }
        }}
        searchPlaceholder="Search title..."
        noResultsText="No titles found"
        multiSelect={false}
        searchKeys={["label"]}
      />

      {/* Profile Image Picker Modal */}
      <Modal
        visible={imagePickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setImagePickerModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Platform.OS === "ios" ? 36 : 24,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E0E0E0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#1F2937",
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              Profile Photo
            </Text>

            {/* Options */}
            <View style={{ gap: 8 }}>
              {/* Take Photo */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleTakePhoto}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#EEF2F6",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="camera-outline" size={22} color="#1F2937" />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  Take Photo
                </Text>
              </TouchableOpacity>

              {/* Choose from Gallery */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleChooseFromGallery}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#EEF2F6",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="images-outline" size={22} color="#1F2937" />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  Choose from Gallery
                </Text>
              </TouchableOpacity>

              {/* Remove Photo (if image exists) */}
              {profileImage && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRemovePhoto}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    backgroundColor: "#FEECEC",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#FCD8D8",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#D32F2F",
                    }}
                  >
                    Remove Current Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setImagePickerModalVisible(false)}
              style={{
                marginTop: 14,
                marginBottom: Platform.OS === "ios" ? 33 : 26,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#4B5563",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* CAMERA PERMISSION MODAL */}
      <Modal
        visible={showCameraPermission}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <CameraAccess
          onRequestPermission={ImagePicker.requestCameraPermissionsAsync}
          onPermissionGranted={() => {
            setShowCameraPermission(false);
            setTimeout(() => {
              launchCamera();
            }, 300);
          }}
          onClose={() => setShowCameraPermission(false)}
        />
      </Modal>

      {/* ALERT MODAL */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

export default MyAccount;
