import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import axios from "axios";

type LoginNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginProps {
  navigation: LoginNavigationProp;
}

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = identifier.trim() !== "" && password.trim() !== "";

  const handleSignIn = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await axios.post(`${environment.API_BASE_URL}api/auth/login`, {
        identifier: identifier.trim(),
        password: password.trim(),
      });

      if (response.data && response.data.success) {
        const { token, firstName, lastName, email, phoneNumber, image } = response.data.data;
        
        // Save user session details
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userProfile", JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          image,
        }));

        Alert.alert("Success", "Login successful!", [
          { text: "OK", onPress: () => navigation.navigate("Home") }
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
      <View className="flex-1 bg-white mt-[-40px] rounded-tr-[60px] overflow-hidden">
        <ScrollView 
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo centered */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/public/govimart-logo.png")}
              className="w-48 h-12"
              resizeMode="contain"
            />
            <Text className="text-2xl font-black text-black mt-2">
              Welcome to GoViMart
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
      </View>
    </View>
  );
};

export default Login;
