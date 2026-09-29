import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
  Image,
  Keyboard,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import {
  FontAwesome5,
  Ionicons,
  MaterialIcons,
  AntDesign,
} from "@expo/vector-icons";
import authService from "@/services/auth/auth.service";
import { AlertModal } from "@/component/common/AlertModal";
import CustomHeader from "@/component/common/CustomHeader";
import { useDispatch } from "react-redux";
import { logoutSuccess } from "@/store/authSlice";
import { clearCart } from "@/store/cartSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenStorage } from "@/utils/tokenStorage";
import LottieView from "lottie-react-native";

type UpdatePasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UpdatePassword"
>;
type UpdatePasswordRouteProp = RouteProp<RootStackParamList, "UpdatePassword">;

interface UpdatePasswordProps {
  navigation: UpdatePasswordNavigationProp;
  route: UpdatePasswordRouteProp;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({
  navigation,
  route,
}) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const { customerId, name, number, redirectTo } = route.params || {};

  useFocusEffect(
    useCallback(() => {
      const handleBack = () => {
        if (redirectTo === "Profile") {
          navigation.navigate("Profile");
        } else {
          navigation.navigate("Login");
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBack,
      );

      return () => subscription.remove();
    }, [navigation, redirectTo]),
  );

  // Form Fields State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Input Field Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isValid =
    currentPassword.trim() !== "" &&
    newPassword.trim() !== "" &&
    confirmNewPassword.trim() !== "";

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const currentPasswordPlaceholder =
    redirectTo === "Profile" ? "Type Here" : "Type Your NIC Number Here";

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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    } else if (/\s/.test(currentPassword)) {
      newErrors.currentPassword = "Password cannot contain spaces";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (/\s/.test(newPassword)) {
      newErrors.newPassword = "Password cannot contain spaces";
    } else if (
      currentPassword.trim() &&
      newPassword === currentPassword.trim()
    ) {
      newErrors.newPassword =
        "New password cannot be the same as your current password";
      showAlert(
        "Update Failed",
        "New password cannot be the same as your current password.",
        "error",
      );
    } else {
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecialChar =
        /[@#$%&*\-=()?\/;:'"!~±×÷•°`´{}\]\[+_¥®\^€£©¡<>¢|\\¿,.]/.test(
          newPassword,
        );

      if (newPassword.length < 8) {
        newErrors.newPassword = "Must be at least 8 characters";
      } else if (!hasUppercase && !hasNumber && !hasSpecialChar) {
        newErrors.newPassword =
          "Must have 1 uppercase letter, 1 number & 1 special character";
      } else if (!hasUppercase && !hasSpecialChar) {
        newErrors.newPassword =
          "Must have 1 uppercase letter & 1 special character";
      } else if (!hasUppercase && !hasNumber) {
        newErrors.newPassword = "Must have 1 uppercase letter & 1 number";
      } else if (!hasNumber && !hasSpecialChar) {
        newErrors.newPassword = "Must have 1 number & 1 special character";
      } else if (!hasUppercase) {
        newErrors.newPassword = "Must have 1 uppercase letter";
      } else if (!hasNumber) {
        newErrors.newPassword = "Must have 1 number";
      } else if (!hasSpecialChar) {
        newErrors.newPassword = "Must have 1 special character";
      }
    }

    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = "Confirm password is required";
    } else if (/\s/.test(confirmNewPassword)) {
      newErrors.confirmNewPassword = "Password cannot contain spaces";
    } else if (confirmNewPassword !== newPassword) {
      newErrors.confirmNewPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.updatePassword({
        currentPassword: currentPassword.trim(),
        newPassword,
        confirmNewPassword,
      });

      if (response.data && response.data.status) {
        Alert.alert(
          "Success",
          "Password updated successfully! Please log in again with your new password.",
          [
            {
              text: "OK",
              onPress: async () => {
                if (redirectTo === "ExcludeListAdd") {
                  navigation.navigate("ExcludeListAdd", {
                    customerId: customerId || 0,
                    name: name,
                    number: number,
                  });
                } else {
                  // Automatically log out and redirect to login screen
                  try {
                    await authService.logout().catch((err) => {
                      console.log(
                        "Server logout failed, proceeding with local logout:",
                        err,
                      );
                    });
                  } catch (e) {
                    console.log("Logout API call error:", e);
                  } finally {
                    try {
                      await tokenStorage.clearTokens();
                      await AsyncStorage.removeItem("userToken");
                      await AsyncStorage.removeItem("userProfile");
                      await AsyncStorage.removeItem("userLoginTime");

                      dispatch(clearCart());
                      dispatch(logoutSuccess());

                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    } catch (e) {
                      console.error("Logout error:", e);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    }
                  }
                }
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        const msg = response.data?.message || "Failed to update password.";
        if (msg.toLowerCase().includes("same as")) {
          setErrors((prev) => ({
            ...prev,
            newPassword:
              "New password cannot be the same as your current password",
          }));
        }
        showAlert("Update Failed", msg, "error");
      }
    } catch (err: any) {
      console.error("Password update error:", err);
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      if (msg.toLowerCase().includes("same as")) {
        setErrors((prev) => ({
          ...prev,
          newPassword:
            "New password cannot be the same as your current password",
        }));
      }
      showAlert("Update Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header Layout */}
      <CustomHeader
        title="Update My Password"
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => {
          if (redirectTo === "Profile") {
            navigation.navigate("Profile");
          } else {
            navigation.navigate("Login");
          }
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: 24,
        }}
      >
        <View className="flex-1 justify-start">
          {/* Lock Illustration Area */}
          <View className="items-center mt-6">
            <LottieView
              source={require("@/assets/json/auth/change-passwords.json")}
              autoPlay
              loop
              style={{ width: 140, height: 140 }}
            />
          </View>

          {/* Prompt Message */}
          <Text className="text-[#5A5859] text-[15px] font-semibold text-center px-6 mt-6 leading-relaxed">
            For your security, please choose{"\n"}a strong password.
          </Text>

          {/* Form Fields Section */}
          <View className="mt-8 gap-y-4">
            {/* Current Password Field */}
            <View>
              <View
                className={`border px-4 rounded-full flex-row items-center justify-between bg-white ${
                  errors.currentPassword
                    ? "border-red-500 bg-red-50/10"
                    : "border-[#C5D2DB]"
                }`}
              >
                <View className="flex-row items-center flex-1 gap-x-3 h-20">
                  <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                    <FontAwesome5 name="lock" size={14} color="black" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-[12px] text-black mb-[1px]">
                      Current Password
                    </Text>
                    <TextInput
                      placeholder={currentPasswordPlaceholder}
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={(t) => {
                        const clean = t.replace(/\s/g, "");
                        setCurrentPassword(clean);
                        if (errors.currentPassword)
                          setErrors((prev) => ({
                            ...prev,
                            currentPassword: "",
                          }));
                      }}
                      autoCapitalize="none"
                      style={{
                        fontSize: 14,
                        color: "#000",
                        fontWeight: "600",
                        padding: 0,
                        height: 36,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="px-2"
                >
                  <Ionicons
                    name={showCurrentPassword ? "eye" : "eye-off"}
                    size={18}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && (
                <View className="flex-row items-center gap-x-1 mt-1 ml-4">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs font-semibold">
                    {errors.currentPassword}
                  </Text>
                </View>
              )}
            </View>

            {/* New Password Field */}
            <View>
              <View
                className={`border px-4 rounded-full flex-row items-center justify-between bg-white ${
                  errors.newPassword
                    ? "border-red-500 bg-red-50/10"
                    : "border-[#C5D2DB]"
                }`}
              >
                <View className="flex-row items-center flex-1 gap-x-3 h-20">
                  <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                    <FontAwesome5 name="lock" size={14} color="black" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-[12px] text-black mb-[1px]">
                      New Password
                    </Text>
                    <TextInput
                      placeholder="Type Here"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={(t) => {
                        const clean = t.replace(/\s/g, "");
                        setNewPassword(clean);
                        if (errors.newPassword)
                          setErrors((prev) => ({ ...prev, newPassword: "" }));
                      }}
                      autoCapitalize="none"
                      style={{
                        fontSize: 14,
                        color: "#000",
                        fontWeight: "600",
                        padding: 0,
                        height: 36,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  className="px-2"
                >
                  <Ionicons
                    name={showNewPassword ? "eye" : "eye-off"}
                    size={18}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword && (
                <View className="flex-row items-center gap-x-1 mt-1 ml-4">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs font-semibold">
                    {errors.newPassword}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm New Password Field */}
            <View>
              <View
                className={`border px-4 rounded-full flex-row items-center justify-between bg-white ${
                  errors.confirmNewPassword
                    ? "border-red-500 bg-red-50/10"
                    : "border-[#C5D2DB]"
                }`}
              >
                <View className="flex-row items-center flex-1 gap-x-3 h-20">
                  <View className="w-10 h-10 rounded-full bg-[#E4EBF2] items-center justify-center">
                    <FontAwesome5 name="lock" size={14} color="black" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-[12px] text-black mb-[1px]">
                      Confirm New Password
                    </Text>
                    <TextInput
                      placeholder="Type Here"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmNewPassword}
                      value={confirmNewPassword}
                      onChangeText={(t) => {
                        const clean = t.replace(/\s/g, "");
                        setConfirmNewPassword(clean);
                        if (errors.confirmNewPassword)
                          setErrors((prev) => ({
                            ...prev,
                            confirmNewPassword: "",
                          }));
                      }}
                      autoCapitalize="none"
                      style={{
                        fontSize: 14,
                        color: "#000",
                        fontWeight: "600",
                        padding: 0,
                        height: 36,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmNewPassword(!showConfirmNewPassword)
                  }
                  className="px-2"
                >
                  <Ionicons
                    name={showConfirmNewPassword ? "eye" : "eye-off"}
                    size={18}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmNewPassword && (
                <View className="flex-row items-center gap-x-1 mt-1 ml-4">
                  <MaterialIcons name="error" size={12} color="#E02424" />
                  <Text className="text-red-500 text-xs font-semibold">
                    {errors.confirmNewPassword}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Strength Guidelines Advice Info Box */}
          <View className="bg-[#F2F2F6] rounded-3xl p-4 flex-row items-center mt-6">
            <View className="flex-row items-center flex-1">
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-x-2">
                  <FontAwesome5 name="shield-alt" size={14} color="black" />
                  <Text className="font-bold text-[13px] text-black">
                    Create a strong password
                  </Text>
                </View>

                <Text className="text-[11px] text-[#494A65] leading-relaxed mt-1">
                  Use at least 8 characters, including 1 uppercase letter, 1
                  number, and 1 special character.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Update Password Submission Button */}
        <View className="pb-6 pt-6">
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={loading || !isValid}
            activeOpacity={isValid ? 0.8 : 1}
            className={`rounded-full items-center justify-center h-[50px] shadow-sm ${
              isValid ? "bg-black" : "bg-[#7F919C]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-base font-bold">
                Update Password
              </Text>
            )}
          </TouchableOpacity>
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
    </KeyboardAvoidingView>
  );
};

export default UpdatePassword;
