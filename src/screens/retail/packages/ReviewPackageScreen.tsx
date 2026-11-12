import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Animated,
  BackHandler,
  Alert,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  setPackingSlots,
  replacePackageProduct,
  resetPackageProduct,
  updateProductQuantity as updateProductQuantityAction,
  revertReviewChanges,
  clearPackageReview as clearReviewData,
  PackageMeta,
} from "@/store/packageReviewSlice";
import {
  RootStackParamList,
  ReviewProduct,
  ScreenMode,
  FlowStep,
} from "@/types/types";
import orderService from "@/services/order/order.service";
import { AlertModal } from "@/component/common/AlertModal";
import LoadingPage from "@/component/common/LoadingPage";
import CustomHeader from "@/component/common/CustomHeader";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";

import {
  parseDateOnly,
  addDays,
  formatScheduleLabel,
  formatWeightDisplay,
  buildConfirmPayload as buildConfirmPayloadUtil,
} from "../../../utils/reviewPackageUtils";
import { FinalCancelView } from "../../../component/package/overview/FinalCancelView";
import { LimitReachedView } from "../../../component/package/overview/LimitReachedView";
import { ReviewOverviewView } from "../../../component/package/overview/ReviewOverviewView";
import PackageStepView from "../../../component/package/flow/PackageStepView";
import AlacartStepView from "../../../component/package/flow/AlacartStepView";
import FloatingAlacartBar from "../../../component/package/flow/FloatingAlacartBar";
import ConfirmationStepView from "../../../component/package/flow/ConfirmationStepView";
import SubmittingModal from "../../../component/package/common/SubmittingModal";
import ExitConfirmModal from "../../../component/package/common/ExitConfirmModal";

import { useReviewPayment } from "@/hooks/useReviewPayment";
import { useReviewAvailability } from "@/hooks/useReviewAvailability";
import { useReviewAlacart } from "@/hooks/useReviewAlacart";
import { useReviewData } from "@/hooks/useReviewData";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

/* ---------------------------------------------------------
   Main Screen Component
--------------------------------------------------------- */

const ReviewPackage: React.FC<Props> = ({ navigation, route }) => {
  const effectiveOrderId = route.params?.orderId || 3906;
  // String key so "3906" vs 3906 never counts as a different order
  const orderKey = String(effectiveOrderId);
  // invoiceNo from route params acts as an initial display value before the API fetch completes
  const routeInvoiceNo = route.params?.invoiceNo;
  const dispatch = useDispatch();

  const userProfile = useSelector((state: RootState) => state.auth.userProfile);
  const buyerType = useSelector(
    (state: RootState) => state.auth.userProfile?.buyerType || "Retail",
  );

  const {
    packagesMeta,
    packageProducts,
    productTemplatesState,
    orderPackageDbIds,
    alacartSelection,
    deletedAdditionalItemIds,
    invoiceNo: reduxInvoiceNo,
    // renamed: the screen shows its own reminder-shifted `scheduleDateStr` (see below)
    scheduleDateStr: reduxScheduleDateStr,
    rawScheduleDate,
    initialPaidAmount,
    moneyPaid,
    creditPaid,
    paymentMethod,
    deliveryMethod,
    isPaid,
    processOrderAmount,
    processOrderId,
    actualOrderId,
    isLocked,
    loadingReview,
    availableSlots,
    targetLimit,
    isLimitReached,
    unreadReminderDays,
    deliveryCharge: reduxDeliveryCharge,
    isCoupon,
    couponType,
    couponValue,
  } = useSelector((state: RootState) => state.packageReview);

  // Prefer the API-fetched invoice number; fall back to the one passed via route params
  const invoiceNo = reduxInvoiceNo || routeInvoiceNo || "";

  const [mode, setMode] = useState<ScreenMode>("overview");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successInvoiceNo, setSuccessInvoiceNo] = useState<string>("");

  // How many "Package Finalization Review" reminders were sent for this order
  // (comes from the backend as packingSlots.reminderCount)
  const [reminderCount, setReminderCount] = useState<number>(1);

  // Package review window closes at 6:00 PM (18:00)
  const REVIEW_END_HOUR = 18;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Build the step list: one "package" step per unique package type,
  // then one "alacart" step (always displayed so user can add items),
  // then one "confirm" step.
  const steps: FlowStep[] = useMemo(() => {
    const packageSteps: FlowStep[] = packagesMeta.map((pkg) => ({
      type: "package" as const,
      packageId: pkg.id,
    }));
    return [...packageSteps, { type: "alacart" }, { type: "confirm" }];
  }, [packagesMeta]);

  const currentStep =
    steps[currentStepIndex] || steps[0] || { type: "confirm" as const };

  // ── Custom Hooks ───────────────────────────────────────────────────────────
  const alacart = useReviewAlacart();

  const availability = useReviewAvailability({
    effectiveOrderId,
    processOrderId,
    rawScheduleDate,
    mode,
    currentStep,
    selectedAlaCartCategory: alacart.selectedAlaCartCategory,
    alaCartProducts: alacart.alaCartProducts,
    packagesMeta,
    alacartSelection,
    setAlaCartProducts: alacart.setAlaCartProducts,
    setReminderCount,
    setDisabledAlacartProductIds: alacart.setDisabledAlacartProductIds,
  });

  const data = useReviewData({
    effectiveOrderId,
    orderKey,
    buyerType,
    mode,
    navigation,
    setOriginalAlacartTotal: alacart.setOriginalAlacartTotal,
    setOriginalAlacartMap: alacart.setOriginalAlacartMap,
    setAlacartNormalPriceMap: alacart.setAlacartNormalPriceMap,
    setAlacartSavedPriceMap: alacart.setAlacartSavedPriceMap,
    setDisabledAlacartProductIds: alacart.setDisabledAlacartProductIds,
    setUnavailablePackageIds: availability.setUnavailablePackageIds,
    setReminderCount,
  });

  // Show the success message FIRST. Home navigation happens only when the
  // AlertModal closes (see its onClose).
  const showSuccessMessage = (inv: string) => {
    setSuccessInvoiceNo(inv);
    data.isConfirmedRef.current = true; // stop refetch / redirects
    data.requestIdRef.current += 1; // invalidate any in-flight fetch
    setIsSubmitting(false); // close the "Confirming your order..." Modal
    // wait for the loading Modal to finish closing before opening the next one
    setTimeout(() => setShowSuccessOverlay(true), 350);
  };

  const payment = useReviewPayment({
    userId: userProfile?.id,
    invoiceNo,
    routeInvoiceNo,
    effectiveOrderId,
    showSuccessMessage,
    setIsSubmitting,
  });

  const {
    selectedAlaCartCategory,
    alaCartProducts,
    loadingAlaCartProducts,
    disabledAlacartProductIds,
    setDisabledAlacartProductIds,
    originalAlacartTotal,
    setOriginalAlacartTotal,
    originalAlacartMap,
    setOriginalAlacartMap,
    alacartNormalPriceMap,
    setAlacartNormalPriceMap,
    alacartSavedPriceMap,
    setAlacartSavedPriceMap,
    fetchCategoryProducts,
    toggleAlacartProduct,
    removeAlacartItem,
    toggleAlacartItemUnit,
    updateAlacartItemQuantity,
    isItemUnavailable,
    getNormalLinePrice,
    getSavedStrikePrice,
  } = alacart;

  const { unavailablePackageIds, setUnavailablePackageIds } = availability;

  const { isRefreshing, handleRefresh } = data;

  const {
    activeGateway,
    savedCard,
    setSavedCard,
    checkoutSession,
    setCheckoutSession,
    checkoutModalVisible,
    setCheckoutModalVisible,
    pendingConfirmPayload,
    setPendingConfirmPayload,
    handleAdditionalPaymentSuccess,
    handleAdditionalPaymentCancel,
  } = payment;

  const isTimeRanOut = useMemo(() => {
    const currentHour = new Date().getHours();
    // Package review window is from 8:00 AM to 6:00 PM (08:00 - 18:00)
    // Past 6:00 PM (or before 8:00 AM), time ran out for the day
    return currentHour >= 10 || currentHour < 8;
  }, []);
  // const isTimeRanOut = false; // Temporarily disable time ran out check for testing

  const reminderShiftDays = Math.min(Math.max(reminderCount - 1, 0), 2);

  // 3rd (last) reminder already sent → there is NO "send reminder tomorrow" anymore
  const isFinalReminderDay = reminderCount >= 3 || unreadReminderDays >= 3;

  // Final state: last reminder day AND (after 6 PM OR packing slots full)
  const showFinalCancelScreen =
    isFinalReminderDay &&
    (isTimeRanOut || isLimitReached || availableSlots <= 0);

  // Current (shifted) schedule date as a Date
  const scheduleDateObj = useMemo(() => {
    const base = parseDateOnly(rawScheduleDate);
    return base ? addDays(base, reminderShiftDays) : null;
  }, [rawScheduleDate, reminderShiftDays]);

  // "Schedule to : 25th October" (shown on every step)
  const scheduleDateStr = useMemo(
    () =>
      scheduleDateObj
        ? formatScheduleLabel(scheduleDateObj)
        : reduxScheduleDateStr,
    [scheduleDateObj, reduxScheduleDateStr],
  );

  // "Send me the reminder tomorrow" card + "Reminder Scheduled" popup:
  // the NEXT day after the current schedule date.
  //   1 row  -> schedule date 25th, reminder date 26th
  //   2 rows -> schedule date 26th, reminder date 27th
  const nextScheduleDateStr = useMemo(() => {
    try {
      const next = scheduleDateObj
        ? addDays(scheduleDateObj, 1)
        : addDays(new Date(), 1);
      return formatScheduleLabel(next);
    } catch {
      return "Schedule Date";
    }
  }, [scheduleDateObj]);

  const onSendReminderTomorrow = () => {
    navigation.navigate("Home");
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Wholesale guard: Block Wholesale users from viewing ReviewPackage
  useEffect(() => {
    if (buyerType && buyerType.toLowerCase() !== "retail") {
      Alert.alert(
        "Access Denied",
        "Package review feature is only available for Retail users.",
        [
          {
            text: "OK",
            onPress: () => {
              if (effectiveOrderId) {
                navigation.replace("OrderDetails", {
                  orderId: String(effectiveOrderId),
                });
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("Home");
              }
            },
          },
        ],
      );
    }
  }, [buyerType, effectiveOrderId, navigation]);

  // Reset EVERYTHING whenever the order being reviewed changes
  // (also runs on first mount, which wipes data left in Redux by a previous
  // order). Depends on orderKey (a string) so a type change of the same id
  // ("3906" vs 3906) can never trigger a reset. Must stay ABOVE the
  // useFocusEffect that fetches, so the reset runs first and the fetch afterwards.
  useEffect(() => {
    setMode("overview");
    setCurrentStepIndex(0);
    setShowExitModal(false);
    setIsSubmitting(false);
    setShowSuccessOverlay(false);
    setUnavailablePackageIds({});
    setDisabledAlacartProductIds(new Set());
    setOriginalAlacartTotal(0);
    setOriginalAlacartMap({});
    setAlacartNormalPriceMap({});
    setReminderCount(1);
    data.loadedOrderIdRef.current = null;
    // NOTE: Redux is NOT cleared here. clearReviewData() runs only after the
    // final confirm step succeeds (see goToNextStep).
  }, [orderKey]);

  // Handle navigation returns with step or replaced item
  useEffect(() => {
    if (typeof route.params?.targetStepIndex === "number") {
      setMode("flow");
      setCurrentStepIndex(route.params.targetStepIndex);
      navigation.setParams({
        targetStepIndex: undefined,
      });
    }
    if (route.params?.replacedProduct) {
      dispatch(replacePackageProduct(route.params.replacedProduct));
      navigation.setParams({
        replacedProduct: undefined,
      });
    }
  }, [route.params?.targetStepIndex, route.params?.replacedProduct]);

  // Intercept Android hardware back button only when this screen is active/focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (mode === "flow") {
          goToPrevStep();
          return true;
        } else {
          navigation.navigate("Notification");
          return true;
        }
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [mode, currentStepIndex]),
  );

  const handleBackPress = () => {
    if (mode === "flow") {
      goToPrevStep();
    } else {
      navigation.navigate("Notification");
    }
  };

  // Handle Reset to Original (DISPATCH TO REDUX - NO API CALL)
  const onResetToOriginal = (packageId: string, productId: string) => {
    dispatch(resetPackageProduct({ packageId, productId }));
  };

  const updateProductQuantity = (
    packageId: string,
    productId: string,
    delta: number,
  ) => {
    dispatch(updateProductQuantityAction({ packageId, productId, delta }));
  };

  // ── Overview totals ────────────────────────────────────────────────────────
  // Full Total = marketplacepackages (productPrice + packingFee + serviceFee) x qty
  const overviewFullTotal = packagesMeta.reduce(
    (sum, pkg) =>
      sum + (pkg.unitPrice + pkg.packingFee + pkg.serviceFee) * pkg.qty,
    0,
  );

  // Discount Received = (definepackage.price - marketplacepackages.productPrice) x qty
  const overviewDiscount = packagesMeta.reduce(
    (sum, pkg) => sum + (pkg.discountPerUnit ?? 0) * pkg.qty,
    0,
  );

  // Total = Full Total + Discount Received (price before discount)
  const overviewTotal = overviewFullTotal + overviewDiscount;

  const goToPrevStep = () => {
    if (currentStepIndex === 0) {
      setShowExitModal(true);
    } else {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };
  // Builds the full confirmPackageReview payload from current Redux + component state.
  // Called from both the card-additional-payment branch and the existing direct-confirm path.
  const buildConfirmPayload = (overrideIsPaid?: boolean | number) =>
    buildConfirmPayloadUtil({
      orderId: actualOrderId || effectiveOrderId,
      processOrderId,
      packageProducts,
      orderPackageDbIds,
      productTemplatesState,
      alacartSelection,
      originalAlacartMap,
      deletedAdditionalItemIds,
      isItemUnavailable,
      additionalDue,
      newScheduleDate: (route.params as any)?.newScheduleDate,
      paymentMethod,
      isPaid,
      overrideIsPaid,
      finalOrderTotalWithDelivery,
      totalDiff,
    });

  const cleanupAfterSuccess = () => {
    data.loadedOrderIdRef.current = null;
    dispatch(clearReviewData());
    setUnavailablePackageIds({});
    setAlacartNormalPriceMap({});
    setDisabledAlacartProductIds(new Set());
    setOriginalAlacartTotal(0);
    setOriginalAlacartMap({});
    setAlacartSavedPriceMap({});
    setCurrentStepIndex(0);
    setMode("overview");
    setPendingConfirmPayload(null);
  };
  // ─────────────────────────────────────────────────────────────────────────
  // 2) goToNextStep — full corrected function
  // ─────────────────────────────────────────────────────────────────────────

  const goToNextStep = async () => {
    // Prevent double taps while the request is running
    if (isSubmitting) return;
    const isLastStep = currentStepIndex >= steps.length - 1;

    // ── Time check: final confirm is not allowed after 6:00 PM ──
    // Evaluated fresh on every click (isTimeRanOut is memoized only on mount).
    if (isLastStep && new Date().getHours() >= REVIEW_END_HOUR) {
      Alert.alert(
        "Time Ran Out",
        "Package review is not allowed after 6:00 PM. Please try again tomorrow.",
        [
          {
            text: "OK",
            onPress: () => {
              // Back to overview, which shows the "Time Ran Out" options
              setCurrentStepIndex(0);
              setMode("overview");
            },
          },
        ],
        { cancelable: false },
      );
      return;
    }

    // Validate packing slot remaining count: if 0, show error
    try {
      const orderIdParam = processOrderId || effectiveOrderId;
      const res = await orderService.getPackingLimit(
        rawScheduleDate || undefined,
        orderIdParam,
      );
      if (res.data?.status && res.data?.data) {
        const slotData = res.data.data;
        const currentRemaining =
          slotData.remaining !== undefined
            ? slotData.remaining
            : slotData.availableSlots;
        dispatch(
          setPackingSlots({
            availableSlots: currentRemaining,
            targetLimit: slotData.targetLimit,
            isLimitReached: slotData.isLimitReached || currentRemaining <= 0,
            unreadReminderDays: slotData.unreadReminderDays,
          }),
        );
        if (currentRemaining <= 0) {
          Alert.alert(
            "Packing Limit Reached",
            "Sorry, we are not accepting any more orders for this schedule date.",
            [{ text: "OK" }],
          );
          return;
        }
      } else if (availableSlots <= 0) {
        Alert.alert(
          "Packing Limit Reached",
          "Sorry, we are not accepting any more orders for this schedule date.",
          [{ text: "OK" }],
        );
        return;
      }
    } catch (valErr) {
      console.warn(
        "[ReviewPackageScreen] Packing limit validation error:",
        valErr,
      );
      if (availableSlots <= 0) {
        Alert.alert(
          "Packing Limit Reached",
          "Sorry, we are not accepting any more orders for this schedule date.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    // Not the last step yet: just move forward
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    // ───────────────────────────────────────────────────────────
    // Last step: confirm order completion & finalize review
    // ───────────────────────────────────────────────────────────

    // Detect payment method
    const pMethod = (paymentMethod || "").trim().toLowerCase();
    const isCard =
      pMethod.includes("card") ||
      pMethod.includes("payhere") ||
      pMethod.includes("online") ||
      (isPaid && !pMethod.includes("cash") && !pMethod.includes("cod"));

    const isPaidCardOrder = isCard && Boolean(isPaid);
    const isUnpaidCardOrder = isCard && !isPaid;

    // Invoice number shown in the success message
    const confirmedInv =
      invoiceNo ||
      routeInvoiceNo ||
      (effectiveOrderId ? `#${effectiveOrderId}` : "");

    // Show "Processing..." on the button for EVERY payment type
    setIsSubmitting(true);

    // ── Path 1: Card order already paid, but additional payment required ───────
    if (isPaidCardOrder && additionalDue >= 0.01) {
      const confirmPayload = buildConfirmPayload(1);
      setPendingConfirmPayload(confirmPayload);
      try {
        const adapter = PaymentGatewayFactory.getAdapter(activeGateway as any);

        // Attempt 1-click saved card charge first
        if (savedCard && adapter.chargeSavedCard) {
          try {
            const chargeRes = await adapter.chargeSavedCard({
              cardId: savedCard.id,
              amount: additionalDue,
              paymentType: "order",
              orderId: String(processOrderId || effectiveOrderId),
              itemsDescription: `Polygon Package Additional Payment - ${invoiceNo}`,
            });
            if (chargeRes.success) {
              await handleAdditionalPaymentSuccess(confirmPayload);
              return;
            }
          } catch (chargeErr: any) {
            const isInvalid =
              chargeErr?.response?.data?.cardInvalid ||
              chargeErr?.message?.includes("invalid") ||
              chargeErr?.message?.includes("expired") ||
              chargeErr?.message?.includes("No such object");
            if (!isInvalid) {
              setIsSubmitting(false);
              Alert.alert(
                "Payment Error",
                chargeErr?.response?.data?.message ||
                chargeErr?.message ||
                "Payment failed. Please try again.",
              );
              return;
            }
            setSavedCard(null); // invalid/expired → fall through to hosted checkout
          }
        }

        // Hosted checkout (no saved card, or saved card was invalid/expired)
        const session = await adapter.initiatePayment({
          orderId: String(processOrderId || effectiveOrderId),
          amount: additionalDue,
          paymentType: "order",
          itemsDescription: `Polygon Package Additional Payment - ${invoiceNo}`,
        });

        setCheckoutSession(session);
        setCheckoutModalVisible(true);
        // isSubmitting stays true — button is blocked while the modal is open
      } catch (err: any) {
        setIsSubmitting(false);
        Alert.alert(
          "Payment Error",
          err?.response?.data?.message ||
          err?.message ||
          "Failed to start payment. Please try again.",
        );
      }
      return; // Do NOT fall through to the direct confirmPackageReview call
    }

    // ── Path 2: Card order not yet paid (full total must be paid via gateway) ──
    // Deduct coupon discount ONLY for the payment gateway payable value
    const couponDeduction =
      Number(isCoupon) === 1 && !isFreeDeliveryCoupon
        ? Number(couponValue) || 0
        : 0;
    const payableNow = Math.max(
      0,
      Number(
        (
          finalOrderTotalWithDelivery -
          (creditPaid || 0) -
          couponDeduction
        ).toFixed(2),
      ),
    );

    if (isUnpaidCardOrder && payableNow > 0) {
      const confirmPayload = buildConfirmPayload(1);
      setPendingConfirmPayload(confirmPayload);
      try {
        const adapter = PaymentGatewayFactory.getAdapter(activeGateway as any);

        // Attempt 1-click saved card charge first
        if (savedCard && adapter.chargeSavedCard) {
          try {
            const chargeRes = await adapter.chargeSavedCard({
              cardId: savedCard.id,
              amount: payableNow,
              paymentType: "order",
              orderId: String(processOrderId || effectiveOrderId),
              itemsDescription: `Polygon Package Order Payment - ${invoiceNo}`,
            });
            if (chargeRes.success) {
              await handleAdditionalPaymentSuccess(confirmPayload);
              return;
            }
          } catch (chargeErr: any) {
            const isInvalid =
              chargeErr?.response?.data?.cardInvalid ||
              chargeErr?.message?.includes("invalid") ||
              chargeErr?.message?.includes("expired") ||
              chargeErr?.message?.includes("No such object");
            if (!isInvalid) {
              setIsSubmitting(false);
              Alert.alert(
                "Payment Error",
                chargeErr?.response?.data?.message ||
                chargeErr?.message ||
                "Payment failed. Please try again.",
              );
              return;
            }
            setSavedCard(null); // invalid/expired → fall through to hosted checkout
          }
        }

        // Hosted checkout (no saved card, or saved card was invalid/expired)
        const session = await adapter.initiatePayment({
          orderId: String(processOrderId || effectiveOrderId),
          amount: payableNow,
          paymentType: "order",
          itemsDescription: `Polygon Package Order Payment - ${invoiceNo}`,
        });

        setCheckoutSession(session);
        setCheckoutModalVisible(true);
        // isSubmitting stays true — button is blocked while the modal is open
      } catch (err: any) {
        setIsSubmitting(false);
        Alert.alert(
          "Payment Error",
          err?.response?.data?.message ||
          err?.message ||
          "Failed to start payment. Please try again.",
        );
      }
      return; // Do NOT fall through to the direct confirmPackageReview call
    }

    // ── Path 3: Direct confirm (cash / credit / reduced or unchanged totals) ───
    try {
      const confirmPayload = buildConfirmPayload(
        isUnpaidCardOrder ? 1 : isPaid ? 1 : 0,
      );

      console.log(
        "\n[ReviewPackageScreen] Triggering confirmPackageReview with payload:",
        {
          orderId: confirmPayload.orderId,
          processOrderId: confirmPayload.processOrderId,
          lockNow: true,
          additionalAmount: confirmPayload.additionalAmount,
          newScheduleDate: confirmPayload.newScheduleDate,
          replacements: confirmPayload.replacements,
          additionalItems: confirmPayload.additionalItems,
          updatedAdditionalItems: confirmPayload.updatedAdditionalItems,
          packagesCount: confirmPayload.packages.length,
        },
      );

      const confirmRes =
        await orderService.confirmPackageReview(confirmPayload);
      console.log(
        "[ReviewPackageScreen] confirmPackageReview response:",
        confirmRes.data,
        {
          isCard,
          netRefundSavings: confirmPayload.creditToAdd,
          finalOrderTotalWithDelivery,
        },
      );

      // Order is saved. Show the success message FIRST.
      // Redux cleanup + navigation to Home happen in AlertModal.onClose.
      showSuccessMessage(confirmedInv);
      return;
    } catch (err) {
      console.error("[ReviewPackageScreen] Confirm review API error:", err);
      setIsSubmitting(false);
      setShowSuccessOverlay(false);
      // Stay on the confirm step so the user can retry
      Alert.alert("Error", "Could not confirm your order. Please try again.");
      return;
    }
  };
  const onChangeProduct = (packageId: string, product: ReviewProduct) => {
    navigation.navigate("ReplaceProduct", {
      orderId: effectiveOrderId,
      fromProduct: product,
      packageId,
      orderPackageId: orderPackageDbIds[packageId],
      replceId: product.itemId || parseInt(product.id) || undefined,
      stepIndex: currentStepIndex,
      paymentMethod: paymentMethod, // Redux value, e.g. "Cash on Delivery"
      deliveryMethod: deliveryMethod as "home" | "pickup" | undefined, // Redux value, e.g. "Pickup" / "Delivery"
      isPaid: isPaid,
    });
  };

  const onCancelOrder = async () => {
    const pkgs = packagesMeta.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      image: p.image,
      qty: p.qty,
      unitPrice: p.unitPrice,
      serviceFee: p.serviceFee,
      packingFee: p.packingFee,
    }));
    const alacarts = Object.values(alacartSelection).map((item) => ({
      id: String(item.id),
      name: item.displayName,
      image: item.image,
      weight: formatWeightDisplay(item.weightDisplay, item.amount, item.unit),
      // line price actually paid
      price: item.price * item.quantity,
      // line price before discount (orderadditionalitems.normalPrice)
      originalPrice: getNormalLinePrice(item),
    }));

    const pMethod = (paymentMethod || "").trim().toLowerCase();
    const isCardOrOnline =
      pMethod.includes("card") ||
      pMethod.includes("payhere") ||
      (isPaid && !pMethod.includes("cash"));
    const isCashMethod = pMethod.includes("cash") || pMethod === "cod";

    const totalPaidCard = isCardOrOnline
      ? moneyPaid > 0
        ? moneyPaid
        : initialPaidAmount
      : 0;
    const totalPaidCredit = creditPaid || 0;
    const totalGrandFromPackages =
      pkgs.reduce(
        (s, p) =>
          s + p.qty * (p.unitPrice + (p.serviceFee || 0) + (p.packingFee || 0)),
        0,
      ) + alacarts.reduce((s, i) => s + i.price, 0);
    const processOrderTotal =
      processOrderAmount > 0
        ? processOrderAmount
        : initialPaidAmount || totalGrandFromPackages;
    const totalCashDue =
      isCashMethod && !isPaid
        ? Math.max(0, processOrderTotal - totalPaidCredit)
        : 0;

    let refundCreditAmount = 0;
    if (isCardOrOnline) {
      refundCreditAmount = totalPaidCard + totalPaidCredit;
    } else if (pMethod.includes("credit")) {
      refundCreditAmount =
        totalPaidCredit > 0 ? totalPaidCredit : processOrderTotal;
    } else {
      refundCreditAmount = totalPaidCredit > 0 ? totalPaidCredit : 0;
    }

    navigation.navigate("OrderCancelConfirmation", {
      orderId: effectiveOrderId,
      processOrderId: processOrderId || undefined,
      packages: pkgs,
      alaCarteItems: alacarts,
      totalPaid: initialPaidAmount,
      totalPaidCard,
      totalPaidCredit,
      totalCashDue,
      processOrderTotal,
      paymentMethod,
      refundCreditAmount,
    });
  };

  const packageSummaries = useMemo(() => {
    const list: {
      pkg: PackageMeta;
      stepIndex: number;
      originalPrice: number; // total (x qty) - still used for totals
      unitOriginalPrice: number; // price of ONE package
      unitCurrentPrice: number; // price of ONE package incl. changes
      diff: number; // change for ONE package
      additionalChanges: number;
      currentPrice: number; // total (x qty)
    }[] = [];

    steps.forEach((step, idx) => {
      if (step.type === "package") {
        const pkg = packagesMeta.find((p) => p.id === step.packageId)!;
        if (!pkg) return;
        const prods = packageProducts[pkg.id] || [];
        const templateProds = productTemplatesState[pkg.id] || [];

        const templateSum = templateProds.reduce(
          (s, p) => s + p.price * p.quantity,
          0,
        );
        const currentSum = prods.reduce((s, p) => s + p.price * p.quantity, 0);
        const diff = currentSum - templateSum;

        const unitOriginalPrice =
          pkg.unitPrice + pkg.serviceFee + pkg.packingFee;
        const unitCurrentPrice = unitOriginalPrice + diff;

        list.push({
          pkg,
          stepIndex: idx,
          originalPrice: unitOriginalPrice * pkg.qty,
          unitOriginalPrice,
          unitCurrentPrice,
          diff,
          additionalChanges: diff * pkg.qty,
          currentPrice: unitCurrentPrice * pkg.qty,
        });
      }
    });
    return list;
  }, [steps, packagesMeta, packageProducts, productTemplatesState]);

  const confirmPackagesTotal = packageSummaries.reduce(
    (sum, item) => sum + item.currentPrice,
    0,
  );

  // Totals for the final confirm step
  // originalPrice in packageSummaries = productPrice + fees (what was originally paid)
  const packagesTotal = packageSummaries.reduce(
    (sum, item) => sum + item.originalPrice,
    0,
  );
  // Only available ala carte items count towards the price
  const alacartTotal = Object.values(alacartSelection)
    .filter((item) => !isItemUnavailable(item))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const newlyAddedAlacartTotal = Object.values(alacartSelection)
    .filter((item) => item.isAddedNow && !isItemUnavailable(item))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Cash on Delivery vs card/online — used to word the "Please Note" box correctly
  // Cash payment (COD or pickup) vs card/online — used to word the "Please Note" box
  const pMethodLower = (paymentMethod || "").trim().toLowerCase();
  const dMethodLower = (deliveryMethod || "").trim().toLowerCase();
  const isCashPayment = pMethodLower.includes("cash") || pMethodLower === "cod";
  const isPickup =
    dMethodLower.includes("pickup") || pMethodLower.includes("pickup");
  const cashLabel = isPickup ? "Cash on Pickup" : "Cash on Delivery";
  const isCashOnDelivery =
    pMethodLower.includes("cash") || pMethodLower === "cod";

  const paidMoney = Number(moneyPaid) || 0;
  const paidCredit = Number(creditPaid) || 0;
  const refundableAmount = isCashPayment
    ? paidCredit
    : paidMoney + paidCredit > 0
      ? paidMoney + paidCredit
      : Number(initialPaidAmount) || 0;

  const deliveryCharge = Number(reduxDeliveryCharge || 0);
  const isCouponApplied = Number(isCoupon) === 1;
  const couponTypeStr = String(couponType || "").toLowerCase();
  const isFreeDeliveryCoupon =
    isCouponApplied &&
    (couponTypeStr.includes("free") || couponTypeStr.includes("delivery"));
  const effectiveDeliveryCharge =
    isPickup || isFreeDeliveryCoupon ? 0 : deliveryCharge;
  const couponDiscount =
    isCouponApplied && !isFreeDeliveryCoupon ? Number(couponValue) || 0 : 0;

  const grandTotal = packagesTotal + alacartTotal + effectiveDeliveryCharge;
  const confirmGrandTotal = confirmPackagesTotal + alacartTotal;
  // Total before coupon deduction — passed unreduced to the backend
  const finalOrderTotalWithDelivery =
    confirmGrandTotal + effectiveDeliveryCharge;

  // Payable amount for payment gateway (unpaid card orders): deduct creditPaid and coupon discount
  const fullPayableAmount = Math.max(
    0,
    Number(
      (
        finalOrderTotalWithDelivery -
        (creditPaid || 0) -
        couponDiscount
      ).toFixed(2),
    ),
  );
  // Signed diff between the original paid-for total and the reviewed total.
  // Positive => customer owes more. Negative => total went down (reduced / refundable).
  // Compare against what the customer ORIGINALLY paid:
  // original packages + ala carte items that were already in the order.
  const originalPaidTotal = packagesTotal + originalAlacartTotal;
  const totalDiff = confirmGrandTotal - originalPaidTotal;
  const additionalPayAmount = Math.max(0, totalDiff);
  const totalSavingsAmount = Math.max(0, -totalDiff);

  // What the customer has actually paid so far (credit + card)
  const paidSoFar =
    Number(moneyPaid || 0) + Number(creditPaid || 0) > 0
      ? Number(moneyPaid || 0) + Number(creditPaid || 0)
      : Number(initialPaidAmount) || 0;

  // New payable total (same value the backend stores as fullTotal)
  const livePayableTotal = Math.max(
    0,
    Number((finalOrderTotalWithDelivery - couponDiscount).toFixed(2)),
  );

  // Paid order (credit / card) whose total went up because of today's prices
  // and/or the customer's edits -> this amount must go to the gateway.
  const priceIncreaseDue =
    isPaid && !isCashPayment
      ? Math.max(0, Number((livePayableTotal - paidSoFar).toFixed(2)))
      : 0;

  const additionalDue =
    isPaid && !isCashPayment
      ? Math.max(additionalPayAmount, priceIncreaseDue)
      : additionalPayAmount;

  console.log({
    paidSoFar,
    livePayableTotal,
    priceIncreaseDue,
    additionalPayAmount,
    additionalDue,
  });

  // True when at least one package in the confirm step is no longer available
  const hasUnavailablePackage = packagesMeta.some(
    (p) => unavailablePackageIds[p.id] === true,
  );

  // True when at least one ala carte item in alacartSelection is disabled / no longer available
  const hasDisabledAlacartItem =
    Object.values(alacartSelection).some(isItemUnavailable);

  const isConfirmDisabled = hasUnavailablePackage || hasDisabledAlacartItem;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <CustomHeader
        title="Review Your Package"
        showBackButton={true}
        navigation={navigation}
        onBackPress={handleBackPress}
      />

      {/* Overview Full-Page Loading State */}
      {mode === "overview" && loadingReview ? (
        <View className="flex-1 justify-center items-center">
          <LoadingPage message="Loading package details..." fullScreen={true} />
        </View>
      ) : mode === "overview" && showFinalCancelScreen ? (
        <FinalCancelView
          invoiceNo={invoiceNo}
          effectiveOrderId={effectiveOrderId}
          scheduleDateStr={scheduleDateStr}
          isTimeRanOut={isTimeRanOut}
          isLimitReached={isLimitReached}
          availableSlots={
            typeof availableSlots === "number"
              ? Math.max(0, availableSlots)
              : 0
          }
          refundableAmount={refundableAmount}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      ) : mode === "overview" && (isLimitReached || availableSlots <= 0) ? (
        <LimitReachedView
          invoiceNo={invoiceNo}
          effectiveOrderId={effectiveOrderId}
          scheduleDateStr={scheduleDateStr}
          nextScheduleDateStr={nextScheduleDateStr}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onSendReminderTomorrow={onSendReminderTomorrow}
          onCancelOrder={onCancelOrder}
        />
      ) : mode === "overview" ? (
        <ReviewOverviewView
          invoiceNo={invoiceNo}
          effectiveOrderId={effectiveOrderId}
          scheduleDateStr={scheduleDateStr}
          nextScheduleDateStr={nextScheduleDateStr}
          isLocked={isLocked}
          isTimeRanOut={isTimeRanOut}
          availableSlots={
            typeof availableSlots === "number"
              ? Math.max(0, availableSlots)
              : 0
          }
          loadingReview={loadingReview}
          packagesMeta={packagesMeta}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          overviewTotal={overviewTotal}
          overviewDiscount={overviewDiscount}
          overviewFullTotal={overviewFullTotal}
          onSendReminderTomorrow={onSendReminderTomorrow}
          onCancelOrder={onCancelOrder}
          onStartReview={() => {
            setCurrentStepIndex(0);
            setMode("flow");
          }}
        />
      ) : null}

      {mode === "flow" &&
        currentStep.type === "package" &&
        (() => {
          const pkg = packagesMeta.find((p) => p.id === currentStep.packageId);
          if (!pkg) return null;
          const products = packageProducts[pkg.id] || [];
          const templateProds = productTemplatesState[pkg.id] || [];

          return (
            <PackageStepView
              key={pkg.id}
              pkg={pkg}
              products={products}
              templateProds={templateProds}
              availableSlots={
                typeof availableSlots === "number"
                  ? Math.max(0, availableSlots)
                  : 0
              }
              scheduleDateStr={scheduleDateStr}
              totalSteps={steps.length}
              currentStepIndex={currentStepIndex}
              onCancelOrder={onCancelOrder}
              updateProductQuantity={updateProductQuantity}
              onChangeProduct={onChangeProduct}
              onResetToOriginal={onResetToOriginal}
              onNext={goToNextStep}
            />
          );
        })()}

      {mode === "flow" && currentStep.type === "alacart" && (
        <AlacartStepView
          availableSlots={availableSlots}
          scheduleDateStr={scheduleDateStr}
          onCancelOrder={onCancelOrder}
          totalSteps={steps.length}
          currentStepIndex={currentStepIndex}
          selectedAlaCartCategory={selectedAlaCartCategory}
          onSelectCategory={fetchCategoryProducts}
          loadingAlaCartProducts={loadingAlaCartProducts}
          pulseAnim={pulseAnim}
          alaCartProducts={alaCartProducts}
          disabledAlacartProductIds={disabledAlacartProductIds}
          alacartSelection={alacartSelection}
          toggleAlacartProduct={toggleAlacartProduct}
          removeAlacartItem={removeAlacartItem}
        />
      )}

      {/* Step: final confirm order details with dedicated ScrollView */}
      {mode === "flow" && currentStep.type === "confirm" && (
        <ConfirmationStepView
          availableSlots={availableSlots}
          scheduleDateStr={scheduleDateStr}
          onCancelOrder={onCancelOrder}
          totalSteps={steps.length}
          currentStepIndex={currentStepIndex}
          packageSummaries={packageSummaries}
          unavailablePackageIds={unavailablePackageIds}
          onSelectStepIndex={(idx) => setCurrentStepIndex(idx)}
          alacartSelection={alacartSelection}
          isItemUnavailable={isItemUnavailable}
          getSavedStrikePrice={getSavedStrikePrice}
          removeAlacartItem={removeAlacartItem}
          toggleAlacartItemUnit={toggleAlacartItemUnit}
          updateAlacartItemQuantity={updateAlacartItemQuantity}
          totalDiff={totalDiff}
          isPaid={isPaid}
          isCashPayment={isCashPayment}
          additionalDue={additionalDue}
          cashLabel={cashLabel}
          additionalPayAmount={additionalPayAmount}
          confirmGrandTotal={confirmGrandTotal}
          totalSavingsAmount={totalSavingsAmount}
          fullPayableAmount={fullPayableAmount}
          confirmPackagesTotal={confirmPackagesTotal}
          alacartTotal={alacartTotal}
          isConfirmDisabled={isConfirmDisabled}
          isSubmitting={isSubmitting}
          onConfirm={goToNextStep}
        />
      )}

      {mode === "flow" && currentStep.type === "alacart" && (
        <FloatingAlacartBar
          newlyAddedAlacartTotal={newlyAddedAlacartTotal}
          currentStepIndex={currentStepIndex}
          onContinue={goToNextStep}
        />
      )}

      {/* Loading overlay — shown while API call is in progress (cash orders) */}
      <SubmittingModal visible={isSubmitting} />

      {/* Additional Card Payment Modal — card orders with extra amount due */}
      {checkoutSession && (
        <PaymentCheckoutModal
          visible={checkoutModalVisible}
          gatewayName={checkoutSession.gateway}
          checkoutUrl={checkoutSession.checkoutUrl}
          postBody={checkoutSession.postBody}
          orderId={checkoutSession.orderId}
          amount={checkoutSession.amount}
          customerAddress={checkoutSession.customerAddress}
          onSuccess={(_orderId) => handleAdditionalPaymentSuccess()}
          onCancel={(_orderId) => handleAdditionalPaymentCancel()}
          onClose={() => setCheckoutModalVisible(false)}
        />
      )}

      {/* Success alert — shown briefly after review package succeeds */}
      <AlertModal
        visible={showSuccessOverlay}
        type="success"
        title="Successful!"
        message={`Your order ${successInvoiceNo || invoiceNo}\n reviewed and dispatched successfully!`}
        autoClose={true}
        duration={2500}
        onClose={() => {
          setShowSuccessOverlay(false);
          cleanupAfterSuccess();
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        }}
      />

      {/* Confirmation Modal when navigating back */}
      <ExitConfirmModal
        visible={showExitModal}
        onConfirm={() => {
          setShowExitModal(false);
          setCurrentStepIndex(0);
          setMode("overview");
          dispatch(revertReviewChanges());
          // fetch happens via useFocusEffect (mode === "overview")
        }}
        onCancel={() => setShowExitModal(false)}
      />
    </View>
  );
};

export default ReviewPackage;
