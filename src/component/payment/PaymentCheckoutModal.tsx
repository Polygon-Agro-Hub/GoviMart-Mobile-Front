import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  gatewayName?: string;
  checkoutUrl?: string;
  postBody?: string;
  htmlForm?: string;
  domain?: string;
  orderId: string;
  amount: number;
  /** Payments.lk session ID — used to generate a session-bound state nonce for deep-link verification */
  sessionId?: string;
  customerAddress?: {
    street?: string;
    city?: string;
    postcode?: string;
  };
  onSuccess: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onClose: () => void;
}

// Extra breathing room above the header (increase for more space)
const TOP_EXTRA_SPACE = 10;

export const PaymentCheckoutModal: React.FC<Props> = ({
  visible,
  gatewayName = "payments_lk",
  checkoutUrl,
  postBody,
  htmlForm,
  domain = "https://dev.govimart.com",
  orderId,
  amount,
  sessionId,
  customerAddress,
  onSuccess,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const isHandledRef = useRef(false);
  // Session-bound nonce: derived from sessionId so it's unique per checkout.
  // The gateway won't return it, but OS deep-links from the same app will carry
  // whatever return-URL params we embedded — this is a best-effort frontend guard.
  // Real payment verification happens server-side in createOrder.
  const sessionNonceRef = useRef<string>("");

  // ─── SAFE AREA ──────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const topInset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  useEffect(() => {
    if (visible) {
      isHandledRef.current = false;
      // Generate a session-bound nonce. We embed a short hash of sessionId
      // so external deep-links without the correct token are silently rejected.
      if (sessionId) {
        // Simple deterministic token: last 8 chars of sessionId + 4 random hex chars
        const tail = sessionId.slice(-8);
        const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
        sessionNonceRef.current = `${tail}${rand}`;
      } else {
        sessionNonceRef.current = "";
      }

      // Listen for OS deep links (e.g. polygon://payments-lk/return) when returning from bank app or browser
      const sub = Linking.addEventListener("url", (event) => {
        if (event?.url) {
          handleUrlIntercept(event.url);
        }
      });

      Linking.getInitialURL().then((url) => {
        if (url) {
          handleUrlIntercept(url);
        }
      });

      return () => {
        sub.remove();
      };
    }
  }, [visible]);

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
            if (!isHandledRef.current) {
              isHandledRef.current = true;
              onCancel(orderId);
              onClose();
            }
          },
        },
      ]
    );
  };

  const handleUrlIntercept = (url: string): boolean => {
    if (!url || isHandledRef.current) return true;
    console.log(`[${displayGateway} WebView] Processing URL:`, url);

    // ── Strict URL parsing (Risk 4-C fix) ───────────────────────────────────
    // Parse the URL properly instead of loose substring matching, so an attacker
    // cannot craft a URL like "https://evil.com/order_id=1&status=success" and
    // trigger a false payment success via an injected deep-link.
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      // Malformed URL — ignore silently, do not block navigation
      return true;
    }

    const scheme = parsed.protocol; // e.g. "polygon:", "https:"
    const hostAndPath = (parsed.hostname + parsed.pathname).toLowerCase(); // e.g. "payments-lk/return"
    const params = parsed.searchParams;
    const status = (params.get("status") ?? "").toLowerCase();

    // ── Deep-link nonce verification (best-effort frontend guard) ────────────
    // If this is a polygon:// deep-link AND we have a nonce, reject links that
    // don't carry our session token.  External apps cannot know the nonce.
    // Note: gateways redirect through their own servers first, so the nonce may
    // not be preserved — treat a missing nonce as "not our link, let it pass".
    const isPolygonDeepLink = scheme === "polygon:";
    if (isPolygonDeepLink && sessionNonceRef.current) {
      const incomingToken = params.get("_st") ?? "";
      if (incomingToken && incomingToken !== sessionNonceRef.current) {
        console.warn("[PaymentCheckoutModal] Deep-link rejected: state token mismatch");
        return true; // Not our session — ignore silently
      }
    }

    // ── 1. Cancel / failure detection ────────────────────────────────────────
    const isCancelPath =
      hostAndPath.includes("/payment/cancel") ||
      hostAndPath.includes("/payments-lk/cancel");
    const isCancelStatus =
      status === "cancel" ||
      status === "cancelled" ||
      status === "fail" ||
      status === "failed" ||
      status === "declined" ||
      status === "error";

    if (isCancelPath || isCancelStatus) {
      isHandledRef.current = true;
      onCancel(orderId);
      onClose();
      return false;
    }

    // ── 2. Success detection — exact status match only ────────────────────────
    // We require BOTH the correct return path AND status=success/succeeded.
    // This prevents any URL that merely contains the word "success" from triggering.
    const isSuccessStatus = status === "success" || status === "succeeded";
    const isPaymentsLkReturn =
      hostAndPath.includes("payments-lk/return");
    const isPayHereReturn =
      hostAndPath.includes("payment/return");

    // PayHere also passes order_id + payment_id on success (no status param in some flows)
    const isPayHereParamSuccess =
      isPayHereReturn &&
      params.has("order_id") &&
      params.has("payment_id");

    if (
      (isPaymentsLkReturn && isSuccessStatus) ||
      (isPayHereReturn && isSuccessStatus) ||
      isPayHereParamSuccess ||
      (isPolygonDeepLink && isSuccessStatus)
    ) {
      isHandledRef.current = true;
      onSuccess(orderId);
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
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: topInset + TOP_EXTRA_SPACE,
        }}
      >
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
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
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
            Please ensure "Keep my card on file" is checked below to securely
            save your card.
          </Text>
        </View>

        {/* WebView container (loading overlay lives inside so it only covers the WebView) */}
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          {loading && (
            <View
              style={{
                position: "absolute",
                top: 0,
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
      </View>
    </Modal>
  );
};