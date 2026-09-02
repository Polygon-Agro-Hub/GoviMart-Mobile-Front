import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  htmlForm?: string;
  checkoutUrl?: string;
  postBody?: string;
  domain?: string;
  orderId: string;
  amount: number;
  onSuccess: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onClose: () => void;
}

export const PayHereCheckoutModal: React.FC<Props> = ({
  visible,
  htmlForm,
  checkoutUrl,
  postBody,
  domain = "https://dev.govimart.com",
  orderId,
  amount,
  onSuccess,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);

  const handleClose = () => {
    Alert.alert(
      "Cancel Payment?",
      "Are you sure you want to cancel the PayHere payment process?",
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
    console.log("[PayHere WebView] Navigated to:", url);

    if (
      url.includes("/payment/return") ||
      url.includes("status=success") ||
      url.includes("return_url")
    ) {
      onSuccess(orderId);
      onClose();
    } else if (
      url.includes("/payment/cancel") ||
      url.includes("status=cancel") ||
      url.includes("cancel_url")
    ) {
      onCancel(orderId);
      onClose();
    }
  };

  // Determine webview source (POST direct vs HTML form with approved baseUrl)
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
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#0F172A",
              }}
            >
              PayHere Secure Checkout
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 2,
              }}
            >
              LKR {amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} • Sandbox / Test
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "#F1F5F9",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={{ flex: 1, position: "relative" }}>
          {visible && (
            <WebView
              originWhitelist={["*"]}
              source={webViewSource}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              mixedContentMode="always"
              userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              style={{ flex: 1 }}
            />
          )}

          {loading && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#3E206D" />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                Connecting to PayHere...
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
