import React, { useState } from "react";
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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateUserProfileImage } from "@/store/authSlice";

import { RootStackParamList } from "@/types/types";
import { DropdownField, InputField } from "@/component/common/CustomField";

const defaultUserIcon = require("@/assets/images/auth/user-vector-icon.webp");
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import { AlertModal } from "@/component/common/AlertModal";
import customerService from "@/services/customer/customer.service";
import CameraAccess from "@/screens/common/permission/CameraAccess";

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

type MyAccountNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MyAccount"
>;

interface MyAccountProps {
  navigation: MyAccountNavigationProp;
}

const MyAccount: React.FC<MyAccountProps> = ({ navigation }) => {
  const dispatch = useDispatch();
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
  const [compnayMobile, setCompanyMobile] = useState("");
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
  const [profileImageError, setProfileImageError] = useState<string | null>(null);

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" = "error"
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

  const checkImageSize = async (
    asset: ImagePicker.ImagePickerAsset
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
        "error"
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
  } | null>(null);

  const isWholesale =
    (buyerType || reduxBuyerType || "").toLowerCase() === "wholesale";

  useFocusEffect(
    React.useCallback(() => {
      const fetchAcccountDetails = async () => {
        try {
          setIsLoading(true);
          const response = await customerService.getAccountDetails();
          if (response.data && response.data.data) {
            const data = response.data.data;
            if (data.buyerType) setBuyerType(data.buyerType);
            if (data.title) setTitle(data.title);
            if (data.firstName) setFirstName(data.firstName);
            if (data.lastName) setLastName(data.lastName);
            if (data.profileImage || data.image) {
              setProfileImage(data.profileImage || data.image);
            }
            if (data.phoneCode) setMobileCode(data.phoneCode);
            if (data.phoneNumber) setMobileNumber(data.phoneNumber);
            if (data.email) setEmail(data.email);
            if (data.companyName) setCompanyName(data.companyName);
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
              companyMobileCode: (data.companyPhoneCode || data.phoneCode || "+94").trim(),
              companyMobile: (data.companyPhone || "").trim(),
            });
          }
          console.log("acc details fetchihng success: ", response.data.data);
        } catch (error) {
          console.log("error fetching acc details: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAcccountDetails();
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

  const titleOptions = ["Mr", "Mrs", "Ms", "Rev"];

  const handleSelectTitle = (val: string) => {
    setTitle(val);
    setTitleModalOpen(false);
    if (titleError) {
      setTitleError("");
    }
  };

  const mobilecodeOptions = ["+94", "+91", "+65"];
  const companycodeOptions = ["+94", "+91", "+65"];

  // UPDATE ACCOUNT
  const handleUpdate = async () => {
    if (updating) return;

    setFirstNameError("");
    setLastNameError("");
    setMobileNumberError("");
    setEmailError("");
    setTitleError("");
    setCodeError("");
    setCompanyMobileError("");

    let hasError = false;

    if (!title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    }

    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      hasError = true;
    } else if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      setFirstNameError("First name must contain only letters");
      hasError = true;
    }

    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      hasError = true;
    } else if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      setLastNameError("Last name must contain only letters");
      hasError = true;
    }

    if (!mobileCode.trim()) {
      setCodeError("Code is required");
      hasError = true;
    }

    if (!mobileNumber.trim()) {
      setMobileNumberError("Mobile number is required");
      hasError = true;
    } else if (!/^\d{9}$/.test(mobileNumber)) {
      setMobileNumberError("Invalid phone number");
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email address");
      hasError = true;
    }

    if (isWholesale && compnayMobile.trim() && !/^\d{9}$/.test(compnayMobile)) {
      setCompanyMobileError("Invalid phone number");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (originalAccountData) {
      const isUnchanged =
        title.trim() === originalAccountData.title &&
        firstName.trim() === originalAccountData.firstName &&
        lastName.trim() === originalAccountData.lastName &&
        mobileCode.trim() === originalAccountData.mobileCode &&
        mobileNumber.trim() === originalAccountData.mobileNumber &&
        email.trim().toLowerCase() === originalAccountData.email.toLowerCase() &&
        (!isWholesale ||
          (companyName.trim() === originalAccountData.companyName &&
            (companyMobileCode || mobileCode).trim() === originalAccountData.companyMobileCode &&
            compnayMobile.trim() === originalAccountData.companyMobile));

      if (isUnchanged) {
        Alert.alert(
          "No Changes Detected",
          "You haven't made any changes to your account details to update.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    try {
      setUpdating(true);

      const payload: any = {
        title: (title || "Mr").trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneCode: mobileCode.trim(),
        phoneNumber: mobileNumber.trim(),
        email: email.trim(),
      };

      if (isWholesale) {
        payload.companyName = companyName;
        payload.companyPhoneCode = companyMobileCode || mobileCode;
        payload.companyPhone = compnayMobile;
      }

      const phoneChanged =
        mobileNumber.trim() !== originalMobileNumber.trim() ||
        mobileCode !== originalMobileCode;

      if (phoneChanged) {
        const otpResponse = await customerService.sendPhoneChangeOtp({
          phoneCode: mobileCode,
          phoneNumber: mobileNumber,
        });

        const otpData = otpResponse.data;

        if (otpData && otpData.status) {
          navigation.navigate("SignUpOTP", {
            phoneCode: mobileCode,
            phoneNumber: mobileNumber,
            email: email,
            method: otpData.method || "sms",
            referenceId: otpData.referenceId,
            signupToken: otpData.signupToken,
            flow: "changePhone",
            accountDetails: payload,
          });
        } else {
          Alert.alert(
            "Error",
            otpData?.message || "Failed to send verification code.",
          );
        }
      } else {
        const response = await customerService.updateUserDetails(payload);

        if (response.data) {
          setOriginalAccountData({
            title: title.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            mobileCode: mobileCode.trim(),
            mobileNumber: mobileNumber.trim(),
            email: email.trim(),
            companyName: companyName.trim(),
            companyMobileCode: (companyMobileCode || mobileCode).trim(),
            companyMobile: compnayMobile.trim(),
          });

          Alert.alert(
            "Success",
            response.data.message || "Your account information has been updated.",
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
      Alert.alert("Error", errorMessage);
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
      const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const cleanName = filename.includes(".") ? filename : `${filename}.${ext}`;

      const response = await customerService.uploadProfileImage(uri, cleanName, type);
      if (response.data && response.data.status && response.data.data?.imageUrl) {
        const uploadedUrl = response.data.data.imageUrl;
        setProfileImage(uploadedUrl);
        setProfileImageError(null);
        dispatch(updateUserProfileImage({ image: uploadedUrl }));
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
            ]
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

  // DELELE OPTION
  const handleMore = () => {
    console.log("More options");
    setMoreMenuVisible(!moreMenuVisible);
  };

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View
        style={{
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
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
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingPage message="Loading Account..." fullScreen={false} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={120}
          extraHeight={120}
          keyboardOpeningTime={0}
          enableResetScrollToCoords={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 20,
          }}
        >
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
          <View
            style={{
              width: "100%",
            }}
          >
            {/* TITLE + FIRST NAME */}
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                marginBottom: 14,
              }}
            >
              {/* Title */}

              <View
                style={{
                  width: "39%",
                  marginRight: 8,
                }}
              >
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

              <View
                style={{
                  flex: 1,
                }}
              >
                <InputField
                  icon="user"
                  label="First Name"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text.replace(/[^a-zA-Z\s]/g, ""));

                    // Optional: remove error while typing
                    if (firstNameError) {
                      setFirstNameError("");
                    }
                  }}
                  error={firstNameError}
                />
              </View>
            </View>

            {/* LAST NAME */}

            <View
              style={{
                marginBottom: 14,
              }}
            >
              <InputField
                icon="user"
                label="Last Name"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text.replace(/[^a-zA-Z\s]/g, ""));
                  if (lastNameError) {
                    setLastNameError("");
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

              <View
                style={{
                  width: "39%",
                  marginRight: 8,
                }}
              >
                <DropdownField
                  label="Code"
                  value={mobileCode}
                  open={false}
                  setOpen={() => setIsPhoneCodeModalOpen(true)}
                  options={[]}
                  onSelect={() => {}}
                  icon="flag"
                  error={codeError}
                />
              </View>

              {/* Mobile Number */}

              <View
                style={{
                  flex: 1,
                }}
              >
                <InputField
                  icon="phone"
                  label="Mobile Number"
                  value={mobileNumber}
                  onChangeText={(text) => {
                    setMobileNumber(text.replace(/[^0-9]/g, ""));
                    if (mobileNumberError) {
                      setMobileNumberError("");
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={mobileCode === "+94" ? 9 : 10}
                  error={mobileNumberError}
                />
              </View>
            </View>

            {/* EMAIL */}
            <View style={{ marginBottom: isWholesale ? 14 : 0 }}>
              <InputField
                icon="house"
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) {
                    setEmailError("");
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
                    value={companyName}
                    onChangeText={(text) => {
                      setCompanyName(text);
                    }}
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
                  {/* com Code */}
                  <View
                    style={{
                      width: "39%",
                      marginRight: 8,
                    }}
                  >
                    <DropdownField
                      label="Code"
                      value={companyMobileCode || "+94"}
                      open={false}
                      setOpen={() => setIsCompanyPhoneCodeModalOpen(true)}
                      options={[]}
                      onSelect={() => {}}
                      icon="flag"
                    />
                  </View>

                  {/* com Mobile Number */}
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <InputField
                      icon="phone"
                      label="Company"
                      value={compnayMobile}
                      onChangeText={(text) => {
                        setCompanyMobile(text.replace(/[^0-9]/g, ""));
                        if (companyMobileError) {
                          setCompanyMobileError("");
                        }
                      }}
                      keyboardType="phone-pad"
                      maxLength={companyMobileCode === "+94" ? 9 : 10}
                      error={companyMobileError}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </KeyboardAwareScrollView>
      )}

      {updating && (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <LoadingPage message="Updating Account..." fullScreen={false} />
        </View>
      )}

      {/* BOTTOM UPDATE BUTTON */}
      <View
        style={{
          position: "absolute",

          left: 0,
          right: 0,
          bottom: 0,

          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,

          backgroundColor: "#FFFFFF",

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.08,
          shadowRadius: 5,

          elevation: 8,
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

            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.12,
            shadowRadius: 4,

            elevation: 3,
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
        selectedItems={mobileCode ? [mobileCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            setMobileCode(items[0]);
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
        data={countries.map((c) => ({
          label: `${c.name} (${c.dialCode})`,
          value: c.dialCode,
          code: c.code,
          dialCode: c.dialCode,
          name: c.name,
          flag: getFlagUrl(c.code),
        }))}
        selectedItems={companyMobileCode ? [companyMobileCode] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            setCompanyMobileCode(items[0]);
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
        data={titleOptions.map((t) => ({ label: t, value: t }))}
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
        onRequestClose={() => setShowCameraPermission(false)}
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
