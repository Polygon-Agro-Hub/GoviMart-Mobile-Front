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
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import authService from "@/services/auth/auth.service";
import { AlertModal } from "@/component/common/AlertModal";
import CustomHeader from "@/component/common/CustomHeader";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "ResetPassword"
>;
type ScreenRouteProp = RouteProp<
  RootStackParamList,
  "ResetPassword"
>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const verifiedResetToken = route.params?.verifiedResetToken || "";

  // Form Fields State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Visibility Toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const isValid =
    newPassword.trim() !== "" && confirmNewPassword.trim() !== "";

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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

      if (newPassword.length < 8) {
        newErrors.newPassword =
          "Use at least 8 characters, including 1 uppercase letter, 1 number, and 1 special character.";
      } else if (!hasUppercase) {
        newErrors.newPassword = "Must contain at least 1 uppercase letter";
      } else if (!hasNumber) {
        newErrors.newPassword = "Must contain at least 1 number";
      } else if (!hasSpecialChar) {
        newErrors.newPassword = "Must contain at least 1 special character";
      }
    }

    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = "Confirm password is required";
    } else if (confirmNewPassword !== newPassword) {
      newErrors.confirmNewPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.resetForgotPassword({
        verifiedResetToken,
        newPassword,
        confirmNewPassword,
      });

      if (response.data && response.data.status) {
        Alert.alert(
          "Success",
          "Your password has been successfully reset. Please sign in with your new password.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        showAlert(
          "Reset Failed",
          response.data?.message || "Failed to reset password."
        );
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";
      showAlert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({ ios: 100, android: 80 })}
      className="flex-1 bg-white"
    >
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header */}
      <CustomHeader
        title="Reset My Password"
        showBackButton={true}
        navigation={navigation}
      />

      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref as any)}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: 40,
        }}
      >
        <View className="flex-1 justify-start">
          {/* Lock Illustration */}
          <View className="items-center mt-6">
            <Image
              source={require("@/assets/images/auth/update-password.webp")}
              style={{ width: 130, height: 130, resizeMode: "contain" }}
            />
          </View>

          {/* Prompt Message */}
          <Text className="text-[#5A5859] text-[15px] font-semibold text-center px-6 mt-6 leading-relaxed">
            For your security, please choose{"\n"}a strong password.
          </Text>

          {/* Form Fields Section */}
          <View className="mt-8 gap-y-4">
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
                        setNewPassword(t);
                        if (errors.newPassword)
                          setErrors((prev) => ({ ...prev, newPassword: "" }));
                      }}
                      autoCapitalize="none"
                      className="text-sm text-black font-semibold p-0 h-9"
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
                        setConfirmNewPassword(t);
                        if (errors.confirmNewPassword)
                          setErrors((prev) => ({
                            ...prev,
                            confirmNewPassword: "",
                          }));
                      }}
                      autoCapitalize="none"
                      className="text-sm text-black font-semibold p-0 h-9"
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
                <Text className="text-[12px] text-[#5A5859] leading-relaxed mt-1">
                  Use at least 8 characters, including 1 uppercase letter, 1
                  number, and 1 special character.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reset Password Button */}
        <View className="mt-8">
          <TouchableOpacity
            onPress={handleResetPassword}
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
                Reset Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

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

export default ResetPasswordScreen;
