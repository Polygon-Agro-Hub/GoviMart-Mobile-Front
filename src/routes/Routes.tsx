import React, { useEffect } from "react";
import { Alert } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { ROLES } from "@/constants/user-roles";
import { navigationRef } from "../../navigationRef";
import { RootStackParamList } from "@/types/types";

// ============================================================================
// --- Public / Common Screens ---
// ============================================================================
import Splash from "@/screens/common/splash/SplashScreen";
import ChooseAuth from "@/screens/common/auth/ChooseAuth";
import Login from "@/screens/common/auth/SignInScreen";
import SignUp from "@/screens/common/auth/SignUpScreen";
import SignUpOTP from "@/screens/common/auth/SignUpOTPScreen";
import UpdatePassword from "@/screens/common/auth/UpdatePasswordScreen";
import ForgotPassword from "@/screens/common/auth/ForgotPasswordScreen";
import ForgotPasswordInput from "@/screens/common/auth/ForgotPasswordInputScreen";
import ForgotPasswordOTP from "@/screens/common/auth/ForgotPasswordOTPScreen";
import ResetPassword from "@/screens/common/auth/ResetPasswordScreen";
import DeliveryLocation from "@/screens/common/locations/DeliveryLocationScreen";
import CameraAccess from "@/screens/common/permission/CameraAccess";
import LocationAccess from "@/screens/common/permission/LocationAccess";
import NotificationAccess from "@/screens/common/permission/NotificationAccess";

// ============================================================================
// --- Shared Customer Screens (Retail & Wholesale) ---
// ============================================================================
import Home from "@/screens/common/home/HomeScreen";
import Profile from "@/screens/common/account/ProfileScreen";
import MyAccount from "@/screens/common/account/EditMyAccountScreen";
import DeleteAccount from "@/screens/common/account/DeleteAccountScreen";
import ViewProduct from "@/screens/common/products/ViewProductScreen";
import MyCart from "@/screens/common/cart/MyCartScreen";
import CheckoutScreen from "@/screens/common/checkout/CheckoutScreen";
import ScheduleOrder from "@/screens/common/checkout/ScheduleOrderScreen";
import PaymentMethod from "@/screens/common/payment/PaymentMethodScreen";
import PaymentScreen from "@/screens/common/payment/PaymentScreen";
import OrderDeliveryMethod from "@/screens/common/locations/OrderDeliveryMethodScreen";
import OrderConfirmed from "@/screens/common/order/OrderConfirmedScreen";
import SavedAddresses from "@/screens/common/locations/SavedAddressesScreen";
import EditAddress from "@/screens/common/locations/EditAddressScreen";
import AddNewAddress from "@/screens/common/locations/AddNewAddressScreen";
import SetLocation from "@/screens/common/locations/SetLocationScreen";
import ChoosePickupCentre from "@/screens/common/locations/ChoosePickupCentreScreen";
import ViewLocation from "@/screens/common/locations/ViewLocation";
import OrderHistory from "@/screens/common/order/OrderHistoryScreen";
import OrderDetails from "@/screens/common/order/OrderDetailsScreen";
import OrderCancelConfirmation from "@/screens/common/order/OrderCancelConfirmedScreen";
import ReportComplaint from "@/screens/common/complaints/ReportComplaintScreen";
import ComplaintHistory from "@/screens/common/complaints/ComplaintHistoryScreen";
import ViewComplaint from "@/screens/common/complaints/ViewComplaintScreen";
import Notifications from "@/screens/common/notification/NotificationScreen";

// ============================================================================
// --- Retail-Only Screens (Package Review & Customization) ---
// ============================================================================
import ViewPackage from "@/screens/retail/packages/ViewPackageScreen";
import ReviewPackage from "@/screens/retail/packages/ReviewPackageScreen";
import PackageConfirmation from "@/screens/retail/packages/PackageConfirmation";
import ChangeProductQuantity from "@/screens/retail/products/SetQuantityProductScreen";
import ReplaceProduct from "@/screens/retail/products/ReplaceProductScreen";
import ExcludeListAdd from "@/screens/retail/exclude-items/ExcludeListAddScreen";
import ExcludeListSummery from "@/screens/retail/exclude-items/ExcludeListSummeryScreen";

const Stack = createStackNavigator<RootStackParamList>();

export type AllowedRole = typeof ROLES[keyof typeof ROLES] | "PUBLIC";

export interface StackRouteConfig {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  allowedRoles: AllowedRole[] | "PUBLIC";
  options?: any;
}

/**
 * Fallback route used when a signed-in user tries to reach a screen
 * their role isn't allowed to see and there's nowhere sensible to go back to.
 */
const UNAUTHORIZED_FALLBACK_ROUTE = "ChooseAuth";

/**
 * Wraps a screen component with a role check. If the current user's role
 * (from Redux auth state) is not included in allowedRoles, the user sees an
 * "Access Denied" alert and gets bounced back / to the fallback route,
 * instead of the protected screen ever rendering.
 *
 * allowedRoles === "PUBLIC" means the screen is reachable regardless of
 * role (or with no role at all, e.g. pre-login screens).
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: AllowedRole[] | "PUBLIC"
) {
  function GuardedScreen(props: P & { navigation?: any }) {
    const userProfile = useSelector((state: RootState) => state.auth.userProfile);
    const token = useSelector((state: RootState) => state.auth.token);
    const userRole = userProfile?.buyerType || (token ? ROLES.RETAIL : null);

    const isAllowed =
      allowedRoles === "PUBLIC" ||
      (!!userRole &&
        (allowedRoles as string[]).some(
          (role) => role.toLowerCase() === userRole.toLowerCase()
        ));

    useEffect(() => {
      if (isAllowed) {
        return;
      }

      const navigation = (props as any)?.navigation;

      if (!token && !userRole) {
        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: UNAUTHORIZED_FALLBACK_ROUTE }],
          });
        }
        return;
      }

      Alert.alert(
        "Access Denied",
        "You don't have permission to view this screen.",
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
              }
              if (navigationRef.isReady()) {
                navigationRef.reset({
                  index: 0,
                  routes: [{ name: UNAUTHORIZED_FALLBACK_ROUTE }],
                });
              }
            },
          },
        ],
        { cancelable: false }
      );
    }, [isAllowed, userRole, token]);

    if (!isAllowed) {
      return null;
    }

    return <Component {...(props as P)} />;
  }

  GuardedScreen.displayName = `withRoleGuard(${
    Component.displayName || Component.name || "Component"
  })`;

  return GuardedScreen;
}

// ============================================================================
// 1. PUBLIC ROUTES (Login, splash, onboarding & permission screens)
// ============================================================================
export const PUBLIC_STACK_SCREENS: StackRouteConfig[] = [
  { name: "Splash", component: Splash, allowedRoles: "PUBLIC" },
  { name: "ChooseAuth", component: ChooseAuth, allowedRoles: "PUBLIC" },
  { name: "Login", component: Login, allowedRoles: "PUBLIC" },
  { name: "SignUp", component: SignUp, allowedRoles: "PUBLIC" },
  { name: "SignUpOTP", component: SignUpOTP, allowedRoles: "PUBLIC" },
  { name: "UpdatePassword", component: UpdatePassword, allowedRoles: "PUBLIC" },
  { name: "ForgotPassword", component: ForgotPassword, allowedRoles: "PUBLIC" },
  { name: "ForgotPasswordInput", component: ForgotPasswordInput, allowedRoles: "PUBLIC" },
  { name: "ForgotPasswordOTP", component: ForgotPasswordOTP, allowedRoles: "PUBLIC" },
  { name: "ResetPassword", component: ResetPassword, allowedRoles: "PUBLIC" },
  { name: "DeliveryLocation", component: DeliveryLocation, allowedRoles: "PUBLIC" },
  { name: "CameraAccess", component: CameraAccess as any, allowedRoles: "PUBLIC" },
  { name: "LocationAccess", component: LocationAccess as any, allowedRoles: "PUBLIC" },
  { name: "NotificationAccess", component: NotificationAccess as any, allowedRoles: "PUBLIC" },
];

// ============================================================================
// 2. SHARED CUSTOMER ROUTES (Accessible by both Retail and Wholesale)
// ============================================================================
export const CUSTOMER_STACK_SCREENS: StackRouteConfig[] = [
  { name: "Home", component: Home, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "Profile", component: Profile, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "MyAccount", component: MyAccount, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "DeleteAccount", component: DeleteAccount, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ViewProduct", component: ViewProduct, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "MyCart", component: MyCart, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "CheckoutScreen", component: CheckoutScreen, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ScheduleOrder", component: ScheduleOrder, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "PaymentMethod", component: PaymentMethod, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "PaymentScreen", component: PaymentScreen, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "OrderDeliveryMethod", component: OrderDeliveryMethod, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "OrderConfirmed", component: OrderConfirmed, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "SavedAddresses", component: SavedAddresses, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "EditAddress", component: EditAddress, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "AddNewAddress", component: AddNewAddress, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "SetLocation", component: SetLocation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ChoosePickupCentre", component: ChoosePickupCentre, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ViewLocation", component: ViewLocation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "OrderHistory", component: OrderHistory, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "OrderDetails", component: OrderDetails, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "OrderCancelConfirmation", component: OrderCancelConfirmation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ReportComplaint", component: ReportComplaint, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ComplaintHistory", component: ComplaintHistory, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ViewComplaint", component: ViewComplaint, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "Notification", component: Notifications, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ExcludeListAdd", component: ExcludeListAdd, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
  { name: "ExcludeListSummery", component: ExcludeListSummery, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE] },
];

// ============================================================================
// 3. RETAIL-ONLY ROUTES (Package Review & Customization - Retail Only)
// ============================================================================
export const RETAIL_STACK_SCREENS: StackRouteConfig[] = [
  { name: "ViewPackage", component: ViewPackage, allowedRoles: [ROLES.RETAIL] },
  { name: "ReviewPackage", component: ReviewPackage, allowedRoles: [ROLES.RETAIL] },
  { name: "SetQauntity", component: ChangeProductQuantity, allowedRoles: [ROLES.RETAIL] },
  { name: "ReplaceProduct", component: ReplaceProduct, allowedRoles: [ROLES.RETAIL] },
  { name: "PackageConfirmation", component: PackageConfirmation, allowedRoles: [ROLES.RETAIL] },
];

// ============================================================================
// COMBINED ROUTE CONFIGURATIONS
// ============================================================================
const STACK_SCREENS_CONFIG: StackRouteConfig[] = [
  ...PUBLIC_STACK_SCREENS,
  ...CUSTOMER_STACK_SCREENS,
  ...RETAIL_STACK_SCREENS,
];

/**
 * Screen list with role guard applied to every component.
 */
const STACK_SCREENS: StackRouteConfig[] = STACK_SCREENS_CONFIG.map((screen) => ({
  ...screen,
  component: withRoleGuard(screen.component, screen.allowedRoles),
}));

/**
 * Root Stack.Navigator. App.tsx renders this inside its NavigationContainer.
 */
export function RootStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      {STACK_SCREENS.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.options}
        />
      ))}
    </Stack.Navigator>
  );
}

export default RootStackNavigator;
