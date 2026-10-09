import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  gatewayName?: string;
  checkoutUrl?: string;
  postBody?: string;
  htmlForm?: string;
  domain?: string;
  orderId: string;
  amount: number;
  onSuccess: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onClose: () => void;
}

export const PaymentCheckoutModal: React.FC<Props> = ({
  visible,
  gatewayName = "payments_lk",
  checkoutUrl,
  postBody,
  htmlForm,
  domain = "https://dev.govimart.com",
  orderId,
  amount,
  onSuccess,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);

  const displayGateway =
    gatewayName.toLowerCase() === "payhere" ? "PayHere" : "Payments.lk";

  const handleClose = () => {
    Alert.alert(
      "Cancel Payment?",
      `Are you sure you want to cancel the ${displayGateway} payment process?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            onCancel(orderId);
            onClose();
          },
        },
      ]
    );
  };

  const handleNavigationStateChange = (navState: { url: string }) => {
    const url = navState.url || "";
    console.log(`[${displayGateway} WebView] Navigated to:`, url);

    const lowerUrl = url.toLowerCase();

    // Check for success callbacks
    if (
      lowerUrl.includes("/payment/return") ||
      lowerUrl.includes("polygon://payment/return") ||
      lowerUrl.includes("status=success") ||
      lowerUrl.includes("status=succeeded") ||
      lowerUrl.includes("return_url")
    ) {
      onSuccess(orderId);
      onClose();
    }
    // Check for cancel/failure callbacks
    else if (
      lowerUrl.includes("/payment/cancel") ||
      lowerUrl.includes("polygon://payment/cancel") ||
      lowerUrl.includes("status=cancel") ||
      lowerUrl.includes("status=cancelled") ||
      lowerUrl.includes("cancel_url")
    ) {
      onCancel(orderId);
      onClose();
    }
  };

  // Determine WebView source:
  // 1. If checkoutUrl + postBody (PayHere Direct POST)
  // 2. If checkoutUrl only (Payments.lk Hosted URL)
  // 3. If htmlForm provided (PayHere HTML Form)
  const webViewSource =
    checkoutUrl && postBody
      ? {
          uri: checkoutUrl,
          method: "POST" as const,
          body: postBody,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: domain,
            Origin: domain,
          },
        }
      : checkoutUrl
      ? {
          uri: checkoutUrl,
        }
      : {
          html: htmlForm || "",
          baseUrl: domain,
        };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Modal Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: "#E2E8F0",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                Secure Checkout ({displayGateway})
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 2,
              }}
            >
              Order: {orderId} • Rs. {amount.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              padding: 6,
              borderRadius: 20,
              backgroundColor: "#F1F5F9",
            }}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 70,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              zIndex: 10,
            }}
          >
            <ActivityIndicator size="large" color="#FF8A00" />
            <Text
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#64748B",
                fontWeight: "500",
              }}
            >
              Connecting to {displayGateway}...
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "#94A3B8",
              }}
            >
              Please do not close this window
            </Text>
          </View>
        )}

        {/* WebView */}
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <WebView
            source={webViewSource}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={["*"]}
            mixedContentMode="always"
            allowsBackForwardNavigationGestures={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn(`[${displayGateway} WebView Error]`, nativeEvent);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};
