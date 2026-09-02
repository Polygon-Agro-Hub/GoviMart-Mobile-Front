import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Splash from "@/screens/splash/SplashScreen";
import ChooseAuth from "@/screens/auth/ChooseAuth";
import DeliveryLocation from "@/screens/locations/DeliveryLocationScreen";
import Login from "@/screens/auth/SignInScreen";
import SignUp from "@/screens/auth/SignUpScreen";
import UpdatePassword from "@/screens/auth/UpdatePasswordScreen";
import SignUpOTP from "@/screens/auth/SignUpOTPScreen";
import Home from "@/screens/home/HomeScreen";
import ExcludeListAdd from "@/screens/exclude-items/ExcludeListAddScreen";
import ExcludeListSummery from "@/screens/exclude-items/ExcludeListSummeryScreen";
import Profile from "@/screens/account/ProfileScreen";
import { navigationRef } from "../navigationRef";
import { GlobalAlert } from "@/component/common/AlertModal";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/store";
import ViewProduct from "@/screens/products/ViewProductScreen";
import ViewPackage from "@/screens/packages/ViewPackageScreen";
import MyCart from "@/screens/cart/MyCartScreen";
import SavedAddresses from "@/screens/locations/SavedAddressesScreen";
import EditAddress from "@/screens/locations/EditAddressScreen";
import AddNewAddress from "@/screens/locations/AddNewAddressScreen";
import ReportComplaint from "@/screens/complaints/ReportComplaintScreen";
import ComplaintHistory from "@/screens/complaints/ComplaintHistoryScreen";
import ViewComplaint from "@/screens/complaints/ViewComplaintScreen";
import MyAccount from "@/screens/account/EditMyAccountScreen";
import DeleteAccount from "@/screens/account/DeleteAccountScreen";
import Notifications from "@/screens/notification/NotificationScreen";
import PaymentMethod from "@/screens/payment/PaymentMethodScreen";
import PaymentScreen from "@/screens/payment/PaymentScreen";
import OrderDeliveryMethod from "@/screens/locations/OrderDeliveryMethodScreen";
import OrderConfirmed from "@/screens/order/OrderConfirmedScreen";
import SetLocation from "@/screens/locations/SetLocationScreen";
import ChoosePickupCentre from "@/screens/locations/ChoosePickupCentreScreen";
import OrderHistory from "@/screens/order/OrderHistoryScreen";
import OrderDetails from "@/screens/order/OrderDetailsScreen";
import ViewLocation from "@/screens/locations/ViewLocation";
import ReviewPackage from "@/screens/packages/ReviewPackageScreen";
import ChangeProductQuantity from "@/screens/products/SetQuantityProductScreen";
import OrderCancelConfirmation from "@/screens/order/OrderCancelConfirmedScreen";
import ReplaceProduct from "@/screens/products/ReplaceProductScreen";

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
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
            <Stack.Screen name="MyAccount" component={MyAccount} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccount} />
            <Stack.Screen name="Notification" component={Notifications} />
            <Stack.Screen name="PaymentMethod" component={PaymentMethod} />
            <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
            <Stack.Screen name="OrderDeliveryMethod" component={OrderDeliveryMethod} />
            <Stack.Screen name="OrderConfirmed" component={OrderConfirmed} />
            <Stack.Screen name="SetLocation" component={SetLocation} />
            <Stack.Screen name="ChoosePickupCentre" component={ChoosePickupCentre} />
            <Stack.Screen name="OrderHistory" component={OrderHistory} />
            <Stack.Screen name="OrderDetails" component={OrderDetails} />
            <Stack.Screen name="ViewLocation" component={ViewLocation} />
            <Stack.Screen name="ReviewPackage" component={ReviewPackage} />
            <Stack.Screen name="SetQauntity" component={ChangeProductQuantity} />
            <Stack.Screen name="OrderCancelConfirmation" component={OrderCancelConfirmation} />
            <Stack.Screen name="ReplaceProduct" component={ReplaceProduct} />
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
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
