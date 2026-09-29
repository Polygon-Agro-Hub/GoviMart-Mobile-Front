import React, { useEffect, useState } from "react";
import { Alert, LogBox } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import NetInfo from "@react-native-community/netinfo";
import { store, persistor } from "../src/store";
import { navigationRef } from "../navigationRef";
import RootStackNavigator from "@/routes/Routes";
import { GlobalAlert } from "@/component/common/AlertModal";
import pushNotificationService from "@/services/notification/pushNotification.service";
import socketService from "@/services/socket/socket.service";
import { updateGlobalUnreadCount } from "@/store/notificationStore";
import { AppUpdateProvider } from "@/features/app-update";

LogBox.ignoreLogs([
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "expo-notifications: Android Push notifications",
]);

// Disable console logs in production to improve JS thread performance (Sales Dash pattern)
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

function AppContent() {
  const [isOfflineAlertShown, setIsOfflineAlertShown] = useState(false);

  useEffect(() => {
    // 1. Connect socket at app root level (Sales Dash pattern — runs before any screen mounts)
    socketService.connect();

    // 2. Init push notifications + request permission on APK (Android 13+ requires runtime request)
    pushNotificationService.init().then(() => {
      pushNotificationService.requestPermissions();
    });

    // 3. Global new_notification listener — same as Sales Dash App.tsx lines 164-171
    // This runs at root level and is NEVER unmounted, so it always fires regardless of which tab is active
    const unsubscribe = socketService.onNewNotification((item) => {
      if (typeof (item as any).unreadCount === "number") {
        updateGlobalUnreadCount((item as any).unreadCount);
      }
      // Display native OS heads-up banner
      pushNotificationService.displayLocalNotification(item);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected === false && !isOfflineAlertShown) {
        setIsOfflineAlertShown(true);
        Alert.alert(
          "No Internet Connection",
          "Please check your connection and try again.",
          [
            {
              text: "OK",
              onPress: () => {
                setIsOfflineAlertShown(false);
              },
            },
          ]
        );
      } else if (state.isConnected === true) {
        setIsOfflineAlertShown(false);
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [isOfflineAlertShown]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <NavigationContainer ref={navigationRef}>
          <RootStackNavigator />
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
          <AppUpdateProvider>
            <AppContent />
          </AppUpdateProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
