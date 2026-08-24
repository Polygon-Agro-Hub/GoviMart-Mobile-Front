import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import axios from "axios";
import { useDispatch } from "react-redux";
import { loginSuccess, setRememberMeDetails } from "@/store/authSlice";
import authService from "@/services/auth/auth.service";

type LoginNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginProps {
  navigation: LoginNavigationProp;
}

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const isValid = identifier.trim() !== "" && password.trim() !== "";

  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("rememberedEmail");
        const storedPassword = await AsyncStorage.getItem("rememberedPassword");
        if (storedEmail && storedPassword) {
          setIdentifier(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
          dispatch(
            setRememberMeDetails({
              rememberMe: true,
              rememberedDetails: { email: storedEmail, password: storedPassword },
            })
          );
        }
      } catch (e) {
        console.error("Failed to load remembered details:", e);
      }
    };
    loadRemembered();
  }, [dispatch]);

  const handleSignIn = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await authService.login({
         identifier: identifier.trim(), password: password.trim()
         });
      if (response.data && response.data.success) {
        const { token, firstName, lastName, email, phoneNumber, image, firstTimeUser, buyerType, isDashUser, isPswUpdated } = response.data.data;
        const loginTime = Date.now();

        // Save session details to AsyncStorage
        await AsyncStorage.setItem("userLoginTime", loginTime.toString());
        await AsyncStorage.setItem("userToken", token);
        const userProfile = {
          firstName,
          lastName,
          email,
          phoneNumber,
          image,
          firstTimeUser,
          buyerType,
          id: response.data.data.id,
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));

        // Dispatch login to Redux
        dispatch(loginSuccess({ token, userProfile, loginTime }));

        // Handle Remember Me details
        if (rememberMe) {
          await AsyncStorage.setItem("rememberedEmail", identifier.trim());
          await AsyncStorage.setItem("rememberedPassword", password.trim());
          dispatch(
            setRememberMeDetails({
              rememberMe: true,
              rememberedDetails: { email: identifier.trim(), password: password.trim() },
            })
          );
        } else {
          await AsyncStorage.removeItem("rememberedEmail");
          await AsyncStorage.removeItem("rememberedPassword");
          dispatch(
            setRememberMeDetails({
              rememberMe: false,
              rememberedDetails: null,
            })
          );
        }

        Alert.alert("Success", "Login successful!", [
          {
            text: "OK",
            onPress: () => {
              if (isDashUser === 1 && isPswUpdated === 0) {
                navigation.navigate("UpdatePassword", {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  number: phoneNumber,
                  redirectTo:"ExcludeListAdd"
                });
              } else if (buyerType === "Retail" && firstTimeUser === 0) {
                navigation.navigate("ExcludeListAdd", {
                  customerId: response.data.data.id,
                  name: `${firstName} ${lastName}`,
                  number: phoneNumber,
                });
              } else {
                navigation.navigate("Home");
              }
            }
          }
        ]);
      } else {
        Alert.alert("Login Failed", response.data.message || "An error occurred during login.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to connect to server.";
      Alert.alert("Login Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top half section: sign-in image */}
      <View className="w-full h-[40%]">
        <Image
          source={require("@/assets/images/auth/sign-in.webp")}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* Bottom section: White container overlapping the image with rounded top-right */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white mt-[-40px] rounded-tr-[60px] overflow-hidden"
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo centered */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/public/polygon-logo.png")}
              className="w-48 h-12"
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-black mt-2">
              Welcome to Polygon
            </Text>
          </View>

          {/* Form Fields Section */}
          <View className="space-y-4">
            {/* Input 1: Mobile / Email */}
            <View>
              <View className="w-full h-[50px] bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5">
                <View className="mr-3">
                  <MaterialIcons name="email" size={20} color="black" />
                </View>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Mobile Number (7XXXXXXXX) / Email"
                  placeholderTextColor="black"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-sm text-black font-semibold p-0"
                />
              </View>
            </View>

            {/* Input 2: Password */}
            <View className="mt-4">
              <View className="w-full h-[50px] bg-white border border-[#E4EBF2] rounded-full flex-row items-center px-5">
                <View className="mr-3 ml-1">
                  <FontAwesome6 name="lock" size={18} color="black" />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="black"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-sm text-black font-semibold p-0"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pl-2">
                  <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Checkbox & Forgot Password Row */}
          <View className="flex-row items-center justify-between mt-5 px-1">
            <View className="flex-row items-center">
              <Checkbox
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? "#094EE8" : undefined}
                className="w-5 h-5 rounded-md"
              />
              <Text className="text-sm font-semibold text-[#777A7D] ml-2">Remember me</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm font-bold text-[#094EE8]">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Action Button Section */}
          <View className="mt-8">
            {/* Sign In Button */}
            <TouchableOpacity 
              className={`w-full h-[50px] rounded-full items-center justify-center flex-row ${isValid ? "bg-black" : "bg-[#7F919C]"}`}
              activeOpacity={isValid ? 0.8 : 1}
              onPress={handleSignIn}
              disabled={loading || !isValid}
            >
              {loading && <ActivityIndicator color="white" size="small" className="mr-2" />}
              <Text className="text-white text-base font-bold">Sign in</Text>
            </TouchableOpacity>

            {/* Redirect / Register Section */}
            <View className="items-center mt-6">
              <Text className="text-sm text-[#6B6B6B]">Don’t have an account?</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate("ChooseAuth")} 
                className="mt-1"
                activeOpacity={0.7}
              >
                <Text className="text-sm font-bold text-[#094EE8] underline">
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
