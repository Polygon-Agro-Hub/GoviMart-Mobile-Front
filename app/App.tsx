import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Splash from "@/screens/splash/SplashScreen";
import ChooseAuth from "@/screens/auth/ChooseAuth";
import DeliveryLocation from "@/screens/auth/DeliveryLocationScreen";
import Login from "@/screens/auth/SignInScreen";
import SignUp from "@/screens/auth/SignUpScreen";
import UpdatePassword from "@/screens/auth/UpdatePasswordScreen";
import SignUpOTP from "@/screens/auth/SignUpOTPScreen";
import Home from "@/screens/home/HomeScreen";
import ExcludeListAdd from "@/screens/exclude-items/ExcludeListAddScreen";
import ExcludeListSummery from "@/screens/exclude-items/ExcludeListSummeryScreen";
import Profile from "@/screens/auth/ProfileScreen";
import { navigationRef } from "../navigationRef";
import { GlobalAlert } from "@/component/common/AlertModal";

import { Provider } from "react-redux";
import { store } from "../store";
import ViewProduct from "@/screens/products/ViewProductScreen";
import ViewPackage from "@/screens/packages/ViewPackageScreen";
import MyCart from "@/screens/cart/MyCartScreen";
import SavedAddresses from "@/screens/account/SavedAddressesScreen";
import EditAddress from "@/screens/account/EditAddressScreen";
import AddNewAddress from "@/screens/account/AddNewAddressScreen";
import ReportComplaint from "@/screens/complaints/ReportComplaintScreen";
import ComplaintHistory from "@/screens/complaints/ComplaintHistoryScreen";
import ViewComplaint from "@/screens/complaints/ViewComplaintScreen";

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
            <Stack.Screen name="UpdatePassword" component={UpdatePassword} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="SignUpOTP" component={SignUpOTP} />
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="ExcludeListAdd" component={ExcludeListAdd} />
            <Stack.Screen name="ExcludeListSummery" component={ExcludeListSummery} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="ViewProduct" component={ViewProduct} />
            <Stack.Screen name="ViewPackage" component={ViewPackage} />
            <Stack.Screen name="MyCart" component={MyCart} />
            <Stack.Screen name="SavedAddresses" component={SavedAddresses} />
            <Stack.Screen name="EditAddress" component={EditAddress} />
            <Stack.Screen name="AddNewAddress" component={AddNewAddress} />
            <Stack.Screen name="ReportComplaint" component={ReportComplaint} />
            <Stack.Screen name="ComplaintHistory" component={ComplaintHistory} />
            <Stack.Screen name="ViewComplaint" component={ViewComplaint} />
          </Stack.Navigator>
        </NavigationContainer>
        <GlobalAlert />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
