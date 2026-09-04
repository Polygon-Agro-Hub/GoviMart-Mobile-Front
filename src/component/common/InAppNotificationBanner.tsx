import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import socketService from "@/services/socket/socket.service";
import { ServerNotificationItem } from "@/services/notification/notification.service";
import { renderBoldInvoiceMessage } from "@/constants/notificationTemplates";
import { navigationRef } from "../../../navigationRef";

const InAppNotificationBanner: React.FC = () => {
  const [currentNotification, setCurrentNotification] =
    useState<ServerNotificationItem | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const hideTimerRef = useRef<any>(null);

  useEffect(() => {
    socketService.connect();
    const unsubscribe = socketService.onNewNotification((item) => {
      showBanner(item);
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const showBanner = (item: ServerNotificationItem) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setCurrentNotification(item);

    Animated.spring(slideAnim, {
      toValue: Platform.OS === "ios" ? 50 : 20,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    hideTimerRef.current = setTimeout(() => {
      dismissBanner();
    }, 5000);
  };

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -180,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotification(null);
    });
  };

  const handlePress = () => {
    if (!currentNotification) return;
    dismissBanner();

    const titleLower = (currentNotification.title || "").toLowerCase();
    if (titleLower.includes("package finalization review")) {
      (navigationRef.current as any)?.navigate("ReviewPackage", {
        orderId: currentNotification.orderId || currentNotification.processOrderId,
      });
    } else if (currentNotification.orderId || currentNotification.processOrderId) {
      (navigationRef.current as any)?.navigate("OrderDetails", {
        orderId: String(currentNotification.orderId || currentNotification.processOrderId),
      });
    } else {
      (navigationRef.current as any)?.navigate("Notification");
    }
  };

  if (!currentNotification) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 14,
        right: 14,
        zIndex: 9999,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        {/* Left: Polygon Leaf Icon */}
        <Image
          source={require("@/assets/images/notification/notification-icon.png")}
          style={{
            width: 48,
            height: 48,
            resizeMode: "contain",
            marginRight: 12,
          }}
        />

        {/* Right: Text Information */}
        <View style={{ flex: 1 }}>
          {/* Header Brand */}
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: "700",
              color: "#111827",
            }}
          >
            Polygon
          </Text>

          {/* Title */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#000000",
              marginTop: 2,
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {currentNotification.title}
          </Text>

          {/* Message with Bold Invoice No */}
          <Text
            style={{
              fontSize: 11.5,
              lineHeight: 16,
              color: "#6B7280",
            }}
            numberOfLines={2}
          >
            {renderBoldInvoiceMessage(
              currentNotification.message,
              {
                fontSize: 11.5,
                lineHeight: 16,
                color: "#6B7280",
              },
              {
                fontSize: 11.5,
                lineHeight: 16,
                fontWeight: "700",
                color: "#111827",
              }
            )}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default InAppNotificationBanner;
