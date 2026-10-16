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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  currentStepIndex: number;
  steps: ProcessingStep[];
  title?: string;
  isReconciling?: boolean;
  unconfirmedState?: UnconfirmedStateProps | null;
  slowThresholdSeconds?: number;
  onCancel?: () => void;
}

const { width } = Dimensions.get("window");

export const OrderProcessingModal: React.FC<OrderProcessingModalProps> = ({
  visible,
  currentStepIndex,
  steps,
  title = "Processing Your Order",
  isReconciling = false,
  unconfirmedState = null,
  slowThresholdSeconds = 6,
  onCancel,
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

  // Reset internal loading states when modal is hidden
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

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideWarningAnim = useRef(new Animated.Value(-20)).current;
  const opacityWarningAnim = useRef(new Animated.Value(0)).current;

  // 1. Intercept Android Hardware Back Button while modal is open
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Prevent back press during order processing to protect against duplicate submissions
        return true;
      }
    );

    return () => backHandler.remove();
  }, [visible]);

  // 2. Track elapsed time and trigger slow network notice
  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      setIsSlowNetwork(false);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= slowThresholdSeconds && !isSlowNetwork) {
          setIsSlowNetwork(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, slowThresholdSeconds, isSlowNetwork]);

  // 3. Pulse animation for active step & slow network badge
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible]);

  // 4. Slide in slow network warning banner when slow
  useEffect(() => {
    if (isSlowNetwork && !unconfirmedState) {
      Animated.parallel([
        Animated.timing(slideWarningAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityWarningAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isSlowNetwork) {
      slideWarningAnim.setValue(-20);
      opacityWarningAnim.setValue(0);
    }
  }, [isSlowNetwork, unconfirmedState]);

  if (!visible) return null;

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
      onRequestClose={() => {
        // Do nothing to block dismissal
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ── Unconfirmed Timeout Fallback State (Phase 3) ── */}
          {unconfirmedState ? (
            <View style={styles.unconfirmedWrapper}>
              <View style={styles.unconfirmedIconContainer}>
                <Ionicons name="cloud-offline" size={40} color="#D97706" />
              </View>

              <Text style={styles.unconfirmedTitle}>
                {unconfirmedState.title || "Network Delay Detected"}
              </Text>

              <Text style={styles.unconfirmedMessage}>
                {unconfirmedState.message}
              </Text>

              {unconfirmedState.isPaid && (
                <View style={styles.paidBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#15803D" />
                  <Text style={styles.paidBadgeText}>
                    Payment is recorded. Your order is safe.
                  </Text>
                </View>
              )}

              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={[
                    styles.primaryActionButton,
                    isCheckingStatus && styles.primaryActionButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={isCheckingStatus || isRetrying}
                  onPress={handleCheckStatus}
                >
                  {isCheckingStatus ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.primaryActionText}>Checking Status...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryActionText}>Check Order Status</Text>
                    </>
                  )}
                </TouchableOpacity>

                {unconfirmedState.onRetry && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryActionButton,
                      (isRetrying || isCheckingStatus) && styles.secondaryActionButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={isRetrying || isCheckingStatus}
                    onPress={handleRetry}
                  >
                    {isRetrying ? (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <ActivityIndicator
                          size="small"
                          color="#374151"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.secondaryActionText}>Retrying...</Text>
                      </View>
                    ) : (
                      <Text style={styles.secondaryActionText}>Retry Submission</Text>
                    )}
                  </TouchableOpacity>
                )}

                {unconfirmedState.onCancel && (
                  <TouchableOpacity
                    style={styles.textActionButton}
                    activeOpacity={0.8}
                    disabled={isCheckingStatus || isRetrying}
                    onPress={unconfirmedState.onCancel}
                  >
                    <Text
                      style={[
                        styles.textActionText,
                        (isCheckingStatus || isRetrying) && { opacity: 0.5 },
                      ]}
                    >
                      Go Back
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            /* ── Normal Processing State (Phase 2) ── */
            <View>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.spinnerContainer}>
                  {isReconciling ? (
                    <ActivityIndicator size="large" color="#2563EB" />
                  ) : (
                    <ActivityIndicator size="large" color="#16A34A" />
                  )}
                </View>

                <Text style={styles.title}>
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
                          : "#16A34A",
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

              {/* Slow Network Dynamic Banner */}
              {isSlowNetwork && !isReconciling && (
                <Animated.View
                  style={[
                    styles.slowBanner,
                    {
                      transform: [{ translateY: slideWarningAnim }],
                      opacity: opacityWarningAnim,
                    },
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

              {/* Progress Milestones / Steps */}
              <View style={styles.stepsList}>
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isActive = idx === currentStepIndex;
                  const isPending = idx > currentStepIndex;

                  return (
                    <View key={step.id || idx} style={styles.stepRow}>
                      {/* Step Indicator */}
                      <View style={styles.indicatorCol}>
                        {isCompleted ? (
                          <View style={styles.stepCompletedIcon}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : isActive ? (
                          <View style={styles.stepActiveIcon}>
                            <ActivityIndicator size="small" color="#16A34A" />
                          </View>
                        ) : (
                          <View style={styles.stepPendingIcon}>
                            <View style={styles.stepPendingInnerDot} />
                          </View>
                        )}

                        {/* Connector line between steps */}
                        {idx < steps.length - 1 && (
                          <View
                            style={[
                              styles.connectorLine,
                              isCompleted ? styles.connectorCompleted : styles.connectorPending,
                            ]}
                          />
                        )}
                      </View>

                      {/* Step Text */}
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
                        {step.sublabel && (
                          <Text style={styles.stepSublabel}>{step.sublabel}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Reassuring Footer */}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    width: Math.min(width - 32, 380),
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  spinnerContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  slowBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  slowBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  slowBannerText: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
    lineHeight: 14,
  },
  stepsList: {
    marginVertical: 6,
    paddingHorizontal: 6,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 46,
  },
  indicatorCol: {
    alignItems: "center",
    width: 28,
  },
  stepCompletedIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
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
  stepPendingInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  connectorCompleted: {
    backgroundColor: "#16A34A",
  },
  connectorPending: {
    backgroundColor: "#E5E7EB",
  },
  stepContentCol: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  stepLabel: {
    fontSize: 13,
  },
  stepLabelCompleted: {
    color: "#1F2937",
    fontWeight: "500",
  },
  stepLabelActive: {
    color: "#16A34A",
    fontWeight: "700",
  },
  stepLabelPending: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  stepSublabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 5,
  },
  /* Unconfirmed state styling */
  unconfirmedWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  unconfirmedIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  unconfirmedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  unconfirmedMessage: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    marginLeft: 6,
  },
  buttonStack: {
    width: "100%",
    marginTop: 4,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryActionButtonDisabled: {
    backgroundColor: "#22C55E",
    opacity: 0.85,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryActionButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  secondaryActionButtonDisabled: {
    opacity: 0.6,
  },
  secondaryActionText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  textActionButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  textActionText: {
    color: "#6B7280",
    fontSize: 13,
  },
});

export default OrderProcessingModal;
