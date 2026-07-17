import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Splash from "@/component/common/Splash";
import ChooseAuth from "@/component/auth/ChooseAuth";
import DeliveryLocation from "@/component/auth/DeliveryLocation";
import Login from "@/component/auth/Login";
import SignUp from "@/component/auth/SignUp";
import SignUpOTP from "@/component/auth/SignUpOTP";
import Home from "@/component/home/Home";
import { navigationRef } from "../navigationRef";
import { GlobalAlert } from "@/component/common/AlertModal";

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={Splash} />
            <Stack.Screen name="ChooseAuth" component={ChooseAuth} />
            <Stack.Screen name="DeliveryLocation" component={DeliveryLocation} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="SignUpOTP" component={SignUpOTP} />
            <Stack.Screen name="Home" component={Home} />
          </Stack.Navigator>
        </NavigationContainer>
        <GlobalAlert />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
