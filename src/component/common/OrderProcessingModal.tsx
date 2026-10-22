import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polygon, Rect, Circle } from "react-native-svg"; // npx expo install react-native-svg

/**
 * Solid red rounded triangle with a white "!" – matches the design icon.
 */
export const WarningIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 36,
  color = "#C80000",
}) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    {/* Rounded triangle: fill + same-colour stroke with round joins */}
    <Polygon
      points="24,9 41,38 7,38"
      fill={color}
      stroke={color}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    {/* Exclamation mark */}
    <Rect x="22" y="19" width="4" height="10" rx="2" fill="#FFFFFF" />
    <Circle cx="24" cy="33.5" r="2.3" fill="#FFFFFF" />
  </Svg>
);

/**
 * FONT NOTE
 * The design uses Poppins. Install & load it once at app root:
 *   npx expo install @expo-google-fonts/poppins expo-font
 *   const [loaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
 * If Poppins isn't loaded, RN silently falls back to the system font.
 */
const FONT = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
};

const COLORS = {
  black: "#000000",
  title: "#0F0F1A",
  body: "#4B4B63",
  dangerBg: "#FBE4E4",
  danger: "#C81E1E",
  warnBg: "#FEF3C7",
  warn: "#D97706",
  secondaryBg: "#EDEEF2",
  secondaryText: "#4A4D68",
  overlay: "rgba(0, 0, 0, 0.65)",
};

const { width } = Dimensions.get("window");

/* ────────────────────────────────────────────────────────────
 * 1. AlertModal – the exact design from the screenshot
 *    (icon circle, title, message, black pill + gray pill)
 * ──────────────────────────────────────────────────────────── */
export interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: "danger" | "warning";
  loadingPrimary?: boolean;
  disabled?: boolean;
  onRequestClose?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  iconName = "warning",
  tone = "danger",
  loadingPrimary = false,
  disabled = false,
  onRequestClose,
}) => (
  <Modal
    transparent
    animationType="fade"
    statusBarTranslucent
    visible={visible}
    onRequestClose={onRequestClose}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <AlertBody
          title={title}
          message={message}
          primaryLabel={primaryLabel}
          onPrimaryPress={onPrimaryPress}
          secondaryLabel={secondaryLabel}
          onSecondaryPress={onSecondaryPress}
          iconName={iconName}
          tone={tone}
          loadingPrimary={loadingPrimary}
          disabled={disabled}
        />
      </View>
    </View>
  </Modal>
);

/** Reusable inner content so both modals share the same look */
const AlertBody: React.FC<Omit<AlertModalProps, "visible" | "onRequestClose">> = ({
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  iconName = "warning",
  tone = "danger",
  loadingPrimary,
  disabled,
}) => (
  <View style={styles.alertWrapper}>
    <View
      style={[
        styles.iconCircle,
        { backgroundColor: tone === "danger" ? COLORS.dangerBg : COLORS.warnBg },
      ]}
    >
      {iconName === "warning" ? (
        <WarningIcon size={38} color={tone === "danger" ? "#C80000" : COLORS.warn} />
      ) : (
        <Ionicons
          name={iconName}
          size={34}
          color={tone === "danger" ? COLORS.danger : COLORS.warn}
        />
      )}
    </View>

    <Text style={styles.alertTitle}>{title}</Text>
    <Text style={styles.alertMessage}>{message}</Text>

    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.buttonDisabled]}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPrimaryPress}
    >
      {loadingPrimary ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      )}
    </TouchableOpacity>

    {secondaryLabel && onSecondaryPress && (
      <TouchableOpacity
        style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
        activeOpacity={0.85}
        disabled={disabled}
        onPress={onSecondaryPress}
      >
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* ────────────────────────────────────────────────────────────
 * 1b. ConfirmModal – confirm / cancel dialog with the warning icon.
 *     Accepts the custom colour props used in ReviewPackageScreen.
 * ──────────────────────────────────────────────────────────── */
export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmButtonColor?: string;
  confirmButtonTextColor?: string;
  cancelButtonBgColor?: string;
  cancelButtonTextColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  showIcon?: boolean;
  isLoading?: boolean;
  /** hide the secondary button (single-button dialog like "View my cart") */
  hideCancel?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmButtonColor = COLORS.black,
  confirmButtonTextColor = "#FFFFFF",
  cancelButtonBgColor = COLORS.secondaryBg,
  cancelButtonTextColor = COLORS.secondaryText,
  iconBackgroundColor = COLORS.dangerBg,
  iconColor = "#C80000",
  showIcon = true,
  isLoading = false,
  hideCancel = false,
}) => (
  <Modal
    transparent
    animationType="fade"
    statusBarTranslucent
    visible={visible}
    onRequestClose={onCancel}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.alertWrapper}>
          {showIcon && (
            <View style={[styles.iconCircle, { backgroundColor: iconBackgroundColor }]}>
              <WarningIcon size={38} color={iconColor} />
            </View>
          )}

          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: confirmButtonColor },
              isLoading && styles.buttonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={onConfirm}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={confirmButtonTextColor} />
            ) : (
              <Text style={[styles.primaryText, { color: confirmButtonTextColor }]}>
                {confirmLabel}
              </Text>
            )}
          </TouchableOpacity>

          {!hideCancel && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: cancelButtonBgColor },
                isLoading && styles.buttonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={isLoading}
              onPress={onCancel}
            >
              <Text style={[styles.secondaryText, { color: cancelButtonTextColor }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </Modal>
);

/* ────────────────────────────────────────────────────────────
 * 2. OrderProcessingModal – your original logic, restyled
 * ──────────────────────────────────────────────────────────── */
export interface ProcessingStep {
  id: string;
  label: string;
  sublabel?: string;
}

export interface UnconfirmedStateProps {
  title: string;
  message: string;
  isPaid?: boolean;
  onCheckStatus: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  onCancel?: () => void;
  isLoadingStatus?: boolean;
  isLoadingRetry?: boolean;
}

export interface OrderProcessingModalProps {
  visible: boolean;
  currentStepIndex?: number;
  steps?: ProcessingStep[];
  title?: string;
  isReconciling?: boolean;
  unconfirmedState?: UnconfirmedStateProps | null;
  slowThresholdSeconds?: number;
  /** false (default) = no steps screen; modal only appears for the connection-lost state */
  showSteps?: boolean;
  onCancel?: () => void;
}

export const OrderProcessingModal: React.FC<OrderProcessingModalProps> = ({
  visible,
  currentStepIndex = 0,
  steps = [],
  title = "Processing Your Order",
  isReconciling = false,
  unconfirmedState = null,
  slowThresholdSeconds = 6,
  showSteps = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [isCheckingStatusInternal, setIsCheckingStatusInternal] = useState(false);
  const [isRetryingInternal, setIsRetryingInternal] = useState(false);

  const isCheckingStatus =
    isReconciling ||
    Boolean(unconfirmedState?.isLoadingStatus) ||
    isCheckingStatusInternal;

  const isRetrying =
    Boolean(unconfirmedState?.isLoadingRetry) || isRetryingInternal;

  useEffect(() => {
    if (!visible) {
      setIsCheckingStatusInternal(false);
      setIsRetryingInternal(false);
    }
  }, [visible]);

  const handleCheckStatus = async () => {
    if (isCheckingStatus || !unconfirmedState?.onCheckStatus) return;
    try {
      setIsCheckingStatusInternal(true);
      await unconfirmedState.onCheckStatus();
    } catch (error) {
      console.warn("[OrderProcessingModal] Check status error:", error);
    } finally {
      setIsCheckingStatusInternal(false);
    }
  };

  const handleRetry = async () => {
    if (isRetrying || isCheckingStatus || !unconfirmedState?.onRetry) return;
    try {
      setIsRetryingInternal(true);
      await unconfirmedState.onRetry();
    } catch (error) {
      console.warn("[OrderProcessingModal] Retry submission error:", error);
    } finally {
      setIsRetryingInternal(false);
    }
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideWarningAnim = useRef(new Animated.Value(-20)).current;
  const opacityWarningAnim = useRef(new Animated.Value(0)).current;

  // Block Android back button while processing
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, [visible]);

  // Elapsed timer + slow network flag
  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      setIsSlowNetwork(false);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= slowThresholdSeconds && !isSlowNetwork) setIsSlowNetwork(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, slowThresholdSeconds, isSlowNetwork]);

  // Pulse animation
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible]);

  // Slow banner animation
  useEffect(() => {
    if (isSlowNetwork && !unconfirmedState) {
      Animated.parallel([
        Animated.timing(slideWarningAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(opacityWarningAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    } else if (!isSlowNetwork) {
      slideWarningAnim.setValue(-20);
      opacityWarningAnim.setValue(0);
    }
  }, [isSlowNetwork, unconfirmedState]);

  if (!visible) return null;

  // No steps screen: show the modal ONLY when the connection was lost
  // (Check Order Status / Retry Submission / Go Back).
  if (!unconfirmedState && !showSteps) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {unconfirmedState ? (
            /* ── Unconfirmed state: same design as screenshot ── */
            <View style={styles.alertWrapper}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.dangerBg }]}>
                <WarningIcon size={38} color="#C80000" />
              </View>

              <Text style={styles.alertTitle}>
                {unconfirmedState.title || "Network Delay Detected"}
              </Text>
              <Text style={styles.alertMessage}>{unconfirmedState.message}</Text>

              {unconfirmedState.isPaid && (
                <View style={styles.paidBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#15803D" />
                  <Text style={styles.paidBadgeText}>
                    Payment is recorded. Your order is safe.
                  </Text>
                </View>
              )}

              {/* Primary – black pill */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isCheckingStatus || isRetrying) && styles.buttonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={isCheckingStatus || isRetrying}
                onPress={handleCheckStatus}
              >
                {isCheckingStatus ? (
                  <View style={styles.row}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryText}>Checking Status...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryText}>Check Order Status</Text>
                )}
              </TouchableOpacity>

              {/* Secondary – gray pill */}
              {unconfirmedState.onRetry && (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    (isRetrying || isCheckingStatus) && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={isRetrying || isCheckingStatus}
                  onPress={handleRetry}
                >
                  {isRetrying ? (
                    <View style={styles.row}>
                      <ActivityIndicator size="small" color={COLORS.secondaryText} style={{ marginRight: 8 }} />
                      <Text style={styles.secondaryText}>Retrying...</Text>
                    </View>
                  ) : (
                    <Text style={styles.secondaryText}>Retry Submission</Text>
                  )}
                </TouchableOpacity>
              )}

              {unconfirmedState.onCancel && (
                <TouchableOpacity
                  style={styles.textButton}
                  activeOpacity={0.8}
                  disabled={isCheckingStatus || isRetrying}
                  onPress={unconfirmedState.onCancel}
                >
                  <Text
                    style={[
                      styles.textButtonLabel,
                      (isCheckingStatus || isRetrying) && { opacity: 0.5 },
                    ]}
                  >
                    Go Back
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* ── Normal processing state ── */
            <View>
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: "#F3F4F6" }]}>
                  <ActivityIndicator size="large" color={COLORS.black} />
                </View>

                <Text style={styles.alertTitle}>
                  {isReconciling ? "Verifying with Server..." : title}
                </Text>

                <View style={styles.timerRow}>
                  <Animated.View
                    style={[
                      styles.pulsingDot,
                      {
                        backgroundColor: isReconciling
                          ? "#2563EB"
                          : isSlowNetwork
                          ? "#EAB308"
                          : COLORS.black,
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <Text style={styles.timerText}>
                    {isReconciling
                      ? "Verifying order status..."
                      : `Elapsed: ${formatTimer(elapsedSeconds)}`}
                  </Text>
                </View>
              </View>

              {isSlowNetwork && !isReconciling && (
                <Animated.View
                  style={[
                    styles.slowBanner,
                    { transform: [{ translateY: slideWarningAnim }], opacity: opacityWarningAnim },
                  ]}
                >
                  <Ionicons name="cellular-outline" size={18} color="#92400E" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.slowBannerTitle}>Slow Network Environment</Text>
                    <Text style={styles.slowBannerText}>
                      We are securely processing your request. Please keep this screen open.
                    </Text>
                  </View>
                </Animated.View>
              )}

              <View style={styles.stepsList}>
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isActive = idx === currentStepIndex;

                  return (
                    <View key={step.id || idx} style={styles.stepRow}>
                      <View style={styles.indicatorCol}>
                        {isCompleted ? (
                          <View style={styles.stepCompletedIcon}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : isActive ? (
                          <View style={styles.stepActiveIcon}>
                            <ActivityIndicator size="small" color={COLORS.black} />
                          </View>
                        ) : (
                          <View style={styles.stepPendingIcon}>
                            <View style={styles.stepPendingInnerDot} />
                          </View>
                        )}
                        {idx < steps.length - 1 && (
                          <View
                            style={[
                              styles.connectorLine,
                              isCompleted ? styles.connectorCompleted : styles.connectorPending,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepContentCol}>
                        <Text
                          style={[
                            styles.stepLabel,
                            isActive
                              ? styles.stepLabelActive
                              : isCompleted
                              ? styles.stepLabelCompleted
                              : styles.stepLabelPending,
                          ]}
                        >
                          {step.label}
                        </Text>
                        {step.sublabel && <Text style={styles.stepSublabel}>{step.sublabel}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.footer}>
                <Ionicons name="lock-closed" size={13} color="#6B7280" />
                <Text style={styles.footerText}>
                  Your data and transaction are encrypted and secured.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

/* ────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(width - 40, 360),
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },

  /* Alert layout (matches screenshot) */
  alertWrapper: { alignItems: "center" },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  alertTitle: {
    fontFamily: FONT.bold,
    fontWeight: "700",
    fontSize: 19,
    color: COLORS.title,
    textAlign: "center",
    marginBottom: 10,
  },
  alertMessage: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.body,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  /* Buttons */
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  secondaryButton: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.secondaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  secondaryText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    color: COLORS.secondaryText,
    letterSpacing: 0.4,
  },
  buttonDisabled: { opacity: 0.6 },
  textButton: { alignItems: "center", paddingVertical: 14 },
  textButtonLabel: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.body,
  },

  /* Paid badge */
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
  },
  paidBadgeText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "#15803D",
    marginLeft: 6,
  },

  /* Processing state */
  header: { alignItems: "center", marginBottom: 12 },
  timerRow: { flexDirection: "row", alignItems: "center" },
  pulsingDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  timerText: { fontFamily: FONT.medium, fontSize: 12, color: "#6B7280" },
  slowBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  slowBannerTitle: { fontFamily: FONT.semibold, fontSize: 12, color: "#92400E" },
  slowBannerText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
    lineHeight: 15,
  },
  stepsList: { marginVertical: 6, paddingHorizontal: 6 },
  stepRow: { flexDirection: "row", minHeight: 46 },
  indicatorCol: { alignItems: "center", width: 28 },
  stepCompletedIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPendingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPendingInnerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  connectorLine: { width: 2, flex: 1, marginVertical: 2 },
  connectorCompleted: { backgroundColor: COLORS.black },
  connectorPending: { backgroundColor: "#E5E7EB" },
  stepContentCol: { flex: 1, marginLeft: 10, paddingTop: 1 },
  stepLabel: { fontFamily: FONT.regular, fontSize: 13 },
  stepLabelCompleted: { fontFamily: FONT.medium, color: "#1F2937" },
  stepLabelActive: { fontFamily: FONT.semibold, color: COLORS.black },
  stepLabelPending: { color: "#9CA3AF" },
  stepSublabel: { fontFamily: FONT.regular, fontSize: 11, color: "#6B7280", marginTop: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerText: { fontFamily: FONT.regular, fontSize: 11, color: "#6B7280", marginLeft: 5 },
});

export default OrderProcessingModal;