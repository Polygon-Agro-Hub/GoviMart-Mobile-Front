import React, { useState, useEffect, useRef, useMemo } from "react";
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
  onSuccess: (orderId: string, cardHolder?: string) => void;
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
  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedInitialRef = useRef(false);
  const isHandledRef = useRef(false);
  const cardHolderRef = useRef<string>("");
  // Session-bound nonce: derived from sessionId so it's unique per checkout.
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
      hasLoadedInitialRef.current = false;
      setInitialLoading(true);
      cardHolderRef.current = "";

      if (sessionId) {
        const tail = sessionId.slice(-8);
        const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
        sessionNonceRef.current = `${tail}${rand}`;
      } else {
        sessionNonceRef.current = "";
      }

      // Listen for OS deep links (e.g. polygon://payments-lk/return) when returning from bank app
      const sub = Linking.addEventListener("url", (event) => {
        if (event?.url) {
          handleUrlIntercept(event.url);
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
    if (!url) return true;

    const lowerUrl = url.toLowerCase();
    const isCustomScheme = lowerUrl.startsWith("polygon://") || lowerUrl.startsWith("govimart://");

    // If already handled, never let WebView navigate to custom scheme (which causes ERR_UNKNOWN_URL_SCHEME / reload loops)
    if (isHandledRef.current) {
      return !isCustomScheme;
    }

    console.log(`[${displayGateway} WebView] Processing URL:`, url);

    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      // If URL parsing fails for custom schemes, fall back to string inspection
    }

    const scheme = parsed ? parsed.protocol : (url.split(":")[0] + ":");
    const hostAndPath = parsed
      ? (parsed.hostname + parsed.pathname).toLowerCase()
      : lowerUrl.split("?")[0].replace(/^[a-z0-9_-]+:\/\//i, "");
    const params = parsed ? parsed.searchParams : new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
    const status = (params.get("status") ?? "").toLowerCase();

    // Verify orderId matches this active session if specified in the URL
    const urlOrderId = params.get("orderId") || params.get("order_id");
    if (urlOrderId && orderId && urlOrderId !== orderId) {
      console.warn(`[PaymentCheckoutModal] Ignoring URL with mismatched orderId (${urlOrderId} !== ${orderId})`);
      return !isCustomScheme;
    }

    const isPolygonDeepLink = scheme === "polygon:" || isCustomScheme;
    if (isPolygonDeepLink && sessionNonceRef.current) {
      const incomingToken = params.get("_st") ?? "";
      if (incomingToken && incomingToken !== sessionNonceRef.current) {
        console.warn("[PaymentCheckoutModal] Deep-link rejected: state token mismatch");
        return false;
      }
    }

    const isPaymentsLkReturn =
      hostAndPath.includes("payments-lk/return") ||
      lowerUrl.includes("payments-lk/return");

    const isPayHereReturn =
      hostAndPath.includes("payment/return") ||
      lowerUrl.includes("payment/return");

    const isRecognizedReturnPath =
      isPaymentsLkReturn ||
      isPayHereReturn ||
      (isPolygonDeepLink && hostAndPath.includes("return"));

    // ── 1. Cancel / failure detection (ONLY on recognized return paths) ────────
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

    if (isCancelPath || (isRecognizedReturnPath && isCancelStatus)) {
      isHandledRef.current = true;
      onCancel(orderId);
      onClose();
      return false;
    }

    // ── 2. Success detection ─────────────────────────────────────────────────
    // Payments.lk and PayHere statuses: success, succeeded, completed, paid
    const isSuccessStatus =
      status === "success" ||
      status === "succeeded" ||
      status === "completed" ||
      status === "paid";

    const isPayHereParamSuccess =
      isPayHereReturn &&
      params.has("order_id") &&
      params.has("payment_id");

    const isReturnPathWithoutCancel =
      isRecognizedReturnPath &&
      !isCancelStatus &&
      !isCancelPath;

    if (
      (isPaymentsLkReturn && isSuccessStatus) ||
      (isPayHereReturn && isSuccessStatus) ||
      isPayHereParamSuccess ||
      (isPolygonDeepLink && isSuccessStatus) ||
      isReturnPathWithoutCancel
    ) {
      isHandledRef.current = true;
      onSuccess(orderId, cardHolderRef.current || undefined);
      onClose();
      return false;
    }

    // For any custom deep link scheme, always return false so Android WebView doesn't throw ERR_UNKNOWN_URL_SCHEME
    if (isCustomScheme) {
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState: { url: string }) => {
    handleUrlIntercept(navState.url);
  };

  // Memoize webViewSource to prevent unnecessary reload of WebView on parent re-renders
  const webViewSource = useMemo(() => {
    if (checkoutUrl && postBody) {
      return {
        uri: checkoutUrl,
        method: "POST" as const,
        body: postBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: domain,
          Origin: domain,
        },
      };
    }
    if (checkoutUrl) {
      return { uri: checkoutUrl };
    }
    return {
      html: htmlForm || "",
      baseUrl: domain,
    };
  }, [checkoutUrl, postBody, htmlForm, domain]);

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

        {/* WebView container */}
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          {initialLoading && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
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
            onLoadStart={() => {
              if (!hasLoadedInitialRef.current) {
                setInitialLoading(true);
              }
            }}
            onLoadEnd={() => {
              hasLoadedInitialRef.current = true;
              setInitialLoading(false);
            }}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={(req) => handleUrlIntercept(req.url)}
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === "CARD_HOLDER" && msg.name) {
                  cardHolderRef.current = String(msg.name).trim();
                }
              } catch {}
            }}
            injectedJavaScript={`
              (function() {
                function postCardHolder(name) {
                  if (!name) return;
                  var trimmed = name.trim();
                  if (trimmed.length >= 2 && window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'CARD_HOLDER',
                      name: trimmed
                    }));
                  }
                }

                // Listen for cardholder input typing
                document.addEventListener('input', function(e) {
                  var t = e.target;
                  if (!t) return;
                  var isName = 
                    t.autocomplete === 'cc-name' || 
                    (t.name && (t.name.toLowerCase().includes('name') || t.name.toLowerCase().includes('holder'))) ||
                    (t.placeholder && t.placeholder.toLowerCase().includes('name')) ||
                    (t.id && (t.id.toLowerCase().includes('name') || t.id.toLowerCase().includes('holder')));
                  if (isName && t.value) {
                    postCardHolder(t.value);
                  }
                }, true);

                document.addEventListener('change', function(e) {
                  var t = e.target;
                  if (!t) return;
                  var isName = 
                    t.autocomplete === 'cc-name' || 
                    (t.name && (t.name.toLowerCase().includes('name') || t.name.toLowerCase().includes('holder'))) ||
                    (t.placeholder && t.placeholder.toLowerCase().includes('name')) ||
                    (t.id && (t.id.toLowerCase().includes('name') || t.id.toLowerCase().includes('holder')));
                  if (isName && t.value) {
                    postCardHolder(t.value);
                  }
                }, true);

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
                  var label = cb.closest('label') || cb.parentElement;
                  var labelText = label ? label.textContent.toLowerCase() : '';
                  // Only target the save card checkbox - Payments.lk uses "keep my card on file"
                  if (!labelText.includes('keep') && !labelText.includes('card') && !labelText.includes('file') && !labelText.includes('save')) {
                    return;
                  }

                  // Visually highlight the checkbox container so it is clearly visible to the customer
                  var highlightEl = cb.closest('label') || cb.parentElement;
                  if (highlightEl && !highlightEl.dataset.styled) {
                    highlightEl.dataset.styled = 'true';
                    highlightEl.style.backgroundColor = '#F0FDF4';
                    highlightEl.style.border = '2px solid #16A34A';
                    highlightEl.style.borderRadius = '8px';
                    highlightEl.style.padding = '8px 12px';
                    highlightEl.style.marginTop = '4px';
                    highlightEl.style.marginBottom = '4px';
                    highlightEl.style.display = 'flex';
                    highlightEl.style.alignItems = 'center';
                  }

                  // Check and fire React-compatible events if not already checked
                  if (!cb.checked && !cb.dataset.autochecked) {
                    cb.dataset.autochecked = 'true';
                    // Method 1: Native click (works for most React checkboxes)
                    cb.click();
                    // Method 2: If still not checked, force via React internal setter + events
                    setTimeout(function() {
                      if (!cb.checked) {
                        try {
                          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
                          if (nativeInputValueSetter && nativeInputValueSetter.set) {
                            nativeInputValueSetter.set.call(cb, true);
                          } else {
                            cb.checked = true;
                          }
                          cb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                          cb.dispatchEvent(new Event('change', { bubbles: true }));
                          cb.dispatchEvent(new Event('input', { bubbles: true }));
                        } catch(e) {}
                      }
                    }, 100);
                  }
                }

                function autofill() {
                  // Check existing cardholder name on DOM
                  var nameEl = document.querySelector('input[autocomplete="cc-name"]') ||
                               document.querySelector('input[placeholder*="name" i]') ||
                               document.querySelector('input[name*="name" i]') ||
                               document.querySelector('input[name*="holder" i]');
                  if (nameEl && nameEl.value) {
                    postCardHolder(nameEl.value);
                  }

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
