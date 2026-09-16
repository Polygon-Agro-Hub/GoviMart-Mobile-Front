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
import Splash from "@/screens/splash/SplashScreen";
import ChooseAuth from "@/screens/auth/ChooseAuth";
import Login from "@/screens/auth/SignInScreen";
import SignUp from "@/screens/auth/SignUpScreen";
import SignUpOTP from "@/screens/auth/SignUpOTPScreen";
import UpdatePassword from "@/screens/auth/UpdatePasswordScreen";
import DeliveryLocation from "@/screens/locations/DeliveryLocationScreen";
import CameraAccess from "@/screens/permission/CameraAccess";
import LocationAccess from "@/screens/permission/LocationAccess";
import NotificationAccess from "@/screens/permission/NotificationAccess";

// ============================================================================
// --- Customer & Shopping Screens (Retail & Wholesale) ---
// ============================================================================
import Home from "@/screens/home/HomeScreen";
import Profile from "@/screens/account/ProfileScreen";
import MyAccount from "@/screens/account/EditMyAccountScreen";
import DeleteAccount from "@/screens/account/DeleteAccountScreen";
import ViewProduct from "@/screens/products/ViewProductScreen";
import ViewPackage from "@/screens/packages/ViewPackageScreen";
import ReviewPackage from "@/screens/packages/ReviewPackageScreen";
import ChangeProductQuantity from "@/screens/products/SetQuantityProductScreen";
import ReplaceProduct from "@/screens/products/ReplaceProductScreen";
import PackageConfirmation from "@/screens/packages/PackageConfirmation";
import MyCart from "@/screens/cart/MyCartScreen";
import CheckoutScreen from "@/screens/checkout/CheckoutScreen";
import ScheduleOrder from "@/screens/checkout/ScheduleOrderScreen";
import PaymentMethod from "@/screens/payment/PaymentMethodScreen";
import PaymentScreen from "@/screens/payment/PaymentScreen";
import OrderDeliveryMethod from "@/screens/locations/OrderDeliveryMethodScreen";
import OrderConfirmed from "@/screens/order/OrderConfirmedScreen";
import SavedAddresses from "@/screens/locations/SavedAddressesScreen";
import EditAddress from "@/screens/locations/EditAddressScreen";
import AddNewAddress from "@/screens/locations/AddNewAddressScreen";
import SetLocation from "@/screens/locations/SetLocationScreen";
import ChoosePickupCentre from "@/screens/locations/ChoosePickupCentreScreen";
import ViewLocation from "@/screens/locations/ViewLocation";
import OrderHistory from "@/screens/order/OrderHistoryScreen";
import OrderDetails from "@/screens/order/OrderDetailsScreen";
import OrderCancelConfirmation from "@/screens/order/OrderCancelConfirmedScreen";
import ReportComplaint from "@/screens/complaints/ReportComplaintScreen";
import ComplaintHistory from "@/screens/complaints/ComplaintHistoryScreen";
import ViewComplaint from "@/screens/complaints/ViewComplaintScreen";
import Notifications from "@/screens/notification/NotificationScreen";

// ============================================================================
// --- Role-Protected / Exclude Items Screens ---
// ============================================================================
import ExcludeListAdd from "@/screens/exclude-items/ExcludeListAddScreen";
import ExcludeListSummery from "@/screens/exclude-items/ExcludeListSummeryScreen";

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
  { name: "DeliveryLocation", component: DeliveryLocation, allowedRoles: "PUBLIC" },
  { name: "CameraAccess", component: CameraAccess as any, allowedRoles: "PUBLIC" },
  { name: "LocationAccess", component: LocationAccess as any, allowedRoles: "PUBLIC" },
  { name: "NotificationAccess", component: NotificationAccess as any, allowedRoles: "PUBLIC" },
];

// ============================================================================
// 2. CUSTOMER & SHOPPING ROUTES (Accessible by both Retail and Wholesale)
// ============================================================================
export const CUSTOMER_STACK_SCREENS: StackRouteConfig[] = [
  { name: "Home", component: Home, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "Profile", component: Profile, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "MyAccount", component: MyAccount, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "DeleteAccount", component: DeleteAccount, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ViewProduct", component: ViewProduct, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ViewPackage", component: ViewPackage, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ReviewPackage", component: ReviewPackage, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "SetQauntity", component: ChangeProductQuantity, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ReplaceProduct", component: ReplaceProduct, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "PackageConfirmation", component: PackageConfirmation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "MyCart", component: MyCart, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "CheckoutScreen", component: CheckoutScreen, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ScheduleOrder", component: ScheduleOrder, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "PaymentMethod", component: PaymentMethod, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "PaymentScreen", component: PaymentScreen, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "OrderDeliveryMethod", component: OrderDeliveryMethod, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "OrderConfirmed", component: OrderConfirmed, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "SavedAddresses", component: SavedAddresses, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "EditAddress", component: EditAddress, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "AddNewAddress", component: AddNewAddress, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "SetLocation", component: SetLocation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ChoosePickupCentre", component: ChoosePickupCentre, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ViewLocation", component: ViewLocation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "OrderHistory", component: OrderHistory, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "OrderDetails", component: OrderDetails, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "OrderCancelConfirmation", component: OrderCancelConfirmation, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ReportComplaint", component: ReportComplaint, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ComplaintHistory", component: ComplaintHistory, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "ViewComplaint", component: ViewComplaint, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
  { name: "Notification", component: Notifications, allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN] },
];

// ============================================================================
// 3. ROLE-PROTECTED SUBSCRIBER ROUTES (Exclusion Lists)
// ============================================================================
export const PROTECTED_STACK_SCREENS: StackRouteConfig[] = [
  {
    name: "ExcludeListAdd",
    component: ExcludeListAdd,
    allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN],
  },
  {
    name: "ExcludeListSummery",
    component: ExcludeListSummery,
    allowedRoles: [ROLES.RETAIL, ROLES.WHOLESALE, ROLES.ADMIN],
  },
];

// ============================================================================
// COMBINED ROUTE CONFIGURATIONS
// ============================================================================
const STACK_SCREENS_CONFIG: StackRouteConfig[] = [
  ...PUBLIC_STACK_SCREENS,
  ...CUSTOMER_STACK_SCREENS,
  ...PROTECTED_STACK_SCREENS,
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
