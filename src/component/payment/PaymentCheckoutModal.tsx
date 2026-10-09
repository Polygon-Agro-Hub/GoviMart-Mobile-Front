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
  customerAddress?: {
    street?: string;
    city?: string;
    postcode?: string;
  };
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
  customerAddress,
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

  const handleUrlIntercept = (url: string): boolean => {
    if (!url) return true;
    console.log(`[${displayGateway} WebView] Processing URL:`, url);
    const lowerUrl = url.toLowerCase();

    // Check for success callbacks (order completion or card saved)
    if (
      lowerUrl.includes("polygon://payments-lk/return") ||
      lowerUrl.includes("/payments-lk/return") ||
      lowerUrl.includes("/payment/return") ||
      lowerUrl.includes("polygon://payment/return") ||
      lowerUrl.includes("status=success") ||
      lowerUrl.includes("status=succeeded") ||
      lowerUrl.includes("return_url")
    ) {
      if (lowerUrl.includes("status=cancel") || lowerUrl.includes("status=cancelled")) {
        onCancel(orderId);
        onClose();
        return false;
      }
      onSuccess(orderId);
      onClose();
      return false;
    }

    // Check for cancel/failure callbacks
    if (
      lowerUrl.includes("/payment/cancel") ||
      lowerUrl.includes("polygon://payment/cancel") ||
      lowerUrl.includes("status=cancel") ||
      lowerUrl.includes("status=cancelled") ||
      lowerUrl.includes("cancel_url")
    ) {
      onCancel(orderId);
      onClose();
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState: { url: string }) => {
    handleUrlIntercept(navState.url);
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

        {/* Help Banner for Saving Cards */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F0FDF4",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderColor: "#BBF7D0",
            gap: 8,
          }}
        >
          <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: "#166534",
              fontWeight: "600",
              lineHeight: 16,
            }}
          >
            Please ensure "Keep my card on file" is checked below to securely save your card.
          </Text>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 110,
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
            onShouldStartLoadWithRequest={(req) => handleUrlIntercept(req.url)}
            injectedJavaScript={`
              (function() {
                function setNativeValue(element, value) {
                  if (!element) return;
                  var valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
                    ? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
                    : null;
                  if (valueSetter) {
                    valueSetter.call(element, value);
                  } else {
                    element.value = value;
                  }
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                }

                function setReactCheckbox(cb) {
                  if (!cb) return;
                  var label = cb.closest('label');
                  var labelText = label ? label.textContent.toLowerCase() : '';
                  // Only target the save card checkbox
                  if (!labelText.includes('keep') && !labelText.includes('card') && !labelText.includes('file')) {
                    return;
                  }

                  // Visually highlight the checkbox container so it is clearly visible to the customer
                  if (label && !label.dataset.styled) {
                    label.dataset.styled = 'true';
                    label.style.backgroundColor = '#F0FDF4';
                    label.style.border = '2px solid #16A34A';
                    label.style.borderRadius = '8px';
                    label.style.padding = '8px 12px';
                    label.style.marginTop = '4px';
                    label.style.marginBottom = '4px';
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                  }

                  if (!cb.checked) {
                    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')
                      ? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set
                      : null;
                    if (setter) {
                      setter.call(cb, true);
                    } else {
                      cb.checked = true;
                    }
                    cb.dispatchEvent(new Event('input', { bubbles: true }));
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Native click fallback if state still un-toggled
                    if (!cb.checked) {
                      cb.click();
                    }
                  }
                }

                function autofill() {
                  // 1. Street address
                  var streetVal = ${JSON.stringify(customerAddress?.street || "")};
                  if (streetVal) {
                    var streetEl = document.querySelector('input[autocomplete="address-line1"]') ||
                                   document.querySelector('input[id$="-street"]') ||
                                   document.querySelector('input[placeholder*="street" i]');
                    if (streetEl && (!streetEl.value || streetEl.value.trim() === '')) {
                      setNativeValue(streetEl, streetVal);
                    }
                  }

                  // 2. Town or city
                  var cityVal = ${JSON.stringify(customerAddress?.city || "")};
                  if (cityVal) {
                    var cityEl = document.querySelector('input[autocomplete="address-level2"]') ||
                                 document.querySelector('input[id$="-city"]') ||
                                 document.querySelector('input[placeholder*="city" i]');
                    if (cityEl && (!cityEl.value || cityEl.value.trim() === '')) {
                      setNativeValue(cityEl, cityVal);
                    }
                  }

                  // 3. Postal code
                  var postcodeVal = ${JSON.stringify(customerAddress?.postcode || "")};
                  if (postcodeVal) {
                    var postcodeEl = document.querySelector('input[autocomplete="postal-code"]') ||
                                     document.querySelector('input[id$="-postcode"]') ||
                                     document.querySelector('input[placeholder*="postal" i]') ||
                                     document.querySelector('input[placeholder="00600"]');
                    if (postcodeEl && (!postcodeEl.value || postcodeEl.value.trim() === '')) {
                      setNativeValue(postcodeEl, postcodeVal);
                    }
                  }

                  // 4. "Keep my card on file" Checkbox
                  var checkboxes = document.querySelectorAll('input[type="checkbox"]');
                  checkboxes.forEach(function(cb) {
                    setReactCheckbox(cb);
                  });
                }

                autofill();
                var tries = 0;
                var interval = setInterval(function() {
                  autofill();
                  tries++;
                  if (tries > 30) clearInterval(interval);
                }, 300);
              })();
              true;
            `}
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
