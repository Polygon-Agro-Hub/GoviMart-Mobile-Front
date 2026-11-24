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
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            javaScriptCanOpenWindowsAutomatically={true}
            setSupportMultipleWindows={false}
            originWhitelist={["*"]}
            mixedContentMode="always"
            allowsBackForwardNavigationGestures={false}
            userAgent={
              Platform.OS === "android"
                ? "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
                : undefined
            }
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
