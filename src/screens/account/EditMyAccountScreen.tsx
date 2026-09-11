import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateUserProfileImage } from "@/store/authSlice";

import { RootStackParamList } from "../../types/types";
import { DropdownField, InputField } from "@/component/common/CustomField";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import customerService from "@/services/customer/customer.service";
import CameraAccess from "@/screens/permission/CameraAccess";

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
  const [profileImage, setProfileImage] = useState<string | null>(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
  );
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
  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalMobileCode, setOriginalMobileCode] = useState("");
  const [originalMobileNumber, setOriginalMobileNumber] = useState("");

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

    try {
      setUpdating(true);

      const payload: any = {
        title,
        firstName,
        lastName,
        phoneCode: mobileCode,
        phoneNumber: mobileNumber,
        email,
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
          Alert.alert("Success", "Your account information has been updated.", [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      }
    } catch (error) {
      console.log("failed to update account: ", error);
      Alert.alert("Error", "Failed to update account. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // UPLOAD PROFILE IMAGE TO BACKEND
  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

      const response = await customerService.uploadProfileImage(uri, filename, type);
      if (response.data && response.data.status && response.data.data?.imageUrl) {
        const uploadedUrl = response.data.data.imageUrl;
        setProfileImage(uploadedUrl);
        dispatch(updateUserProfileImage({ image: uploadedUrl }));
        Alert.alert("Success", "Profile photo updated successfully.");
      } else {
        Alert.alert("Upload Failed", response.data?.message || "Failed to upload image.");
      }
    } catch (error) {
      console.log("Error uploading profile image:", error);
      Alert.alert("Error", "Failed to upload profile photo. Please try again.");
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
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error taking photo:", error);
      Alert.alert("Error", "Could not take photo. Please try again.");
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
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is required to choose a profile photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error choosing from gallery:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  // REMOVE PHOTO
  const handleRemovePhoto = () => {
    setImagePickerModalVisible(false);
    setProfileImage(null);
  };

  // DELELE OPTION
  const handleMore = () => {
    console.log("More options");
    setMoreMenuVisible(!moreMenuVisible);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 200,
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
                ) : profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <FontAwesome6 name="user" size={40} color="#8B9DA7" solid />
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
        </ScrollView>
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
    </KeyboardAvoidingView>
  );
};

export default MyAccount;
