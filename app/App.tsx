import React, { useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/store";
import { navigationRef } from "../navigationRef";
import RootStackNavigator from "@/routes/Routes";
import { GlobalAlert } from "@/component/common/AlertModal";
import pushNotificationService from "@/services/notification/pushNotification.service";

function AppContent() {
  useEffect(() => {
    pushNotificationService.init();
  }, []);

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
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
