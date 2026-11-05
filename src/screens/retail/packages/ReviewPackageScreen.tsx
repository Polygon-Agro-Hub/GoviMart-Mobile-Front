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
  initReviewData,
  setLoadingReview,
  setPackingSlots,
  replacePackageProduct,
  resetPackageProduct,
  updateProductQuantity as updateProductQuantityAction,
  toggleAlacartProduct as toggleAlacartProductAction,
  removeAlacartItem as removeAlacartItemAction,
  toggleAlacartItemUnit as toggleAlacartItemUnitAction,
  updateAlacartItemQuantity as updateAlacartItemQuantityAction,
  revertReviewChanges,
  clearPackageReview as clearReviewData,
  AlacartSelectedProduct,
  PackageMeta,
} from "@/store/packageReviewSlice";
import {
  RootStackParamList,
  ProductType,
  ReviewProduct,
  ScreenMode,
  FlowStep,
  OriginalAlacartEntry,
} from "@/types/types";
import productService from "@/services/product/product.service";
import orderService from "@/services/order/order.service";
import { AlertModal } from "@/component/common/AlertModal";
import LoadingPage from "@/component/common/LoadingPage";
import CustomHeader from "@/component/common/CustomHeader";
import socketService from "@/services/socket/socket.service";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import { PaymentCheckoutModal } from "@/component/payment/PaymentCheckoutModal";
import cardStorageService, {
  SavedCard,
} from "@/services/payment/cardStorageService";
import apiClient from "@/services/config-service/axio-config";
import { ENDPOINTS } from "@/services/config-service/endpoints";
import { getAuthHeader } from "@/services/config-service/auth-header";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

import {
  parseDateOnly,
  addDays,
  formatScheduleLabel,
  toLocalDateOnly,
  num,
  formatWeightDisplay,
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

  // orderadditionalitems.normalPrice (line price BEFORE discount) per saved row.
  // key = redux ala carte item id (e.g. "prev-7073")
  const [alacartNormalPriceMap, setAlacartNormalPriceMap] = useState<
    Record<string, number>
  >({});

  // orderadditionalitems.price (what was saved earlier) per saved row
  const [alacartSavedPriceMap, setAlacartSavedPriceMap] = useState<
    Record<string, number>
  >({});

  // Package review window closes at 6:00 PM (18:00)
  const REVIEW_END_HOUR = 18;

  // ── Additional Card Payment State ──────────────────────────────────────────
  const [activeGateway, setActiveGateway] = useState<string>("payments_lk");
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [pendingConfirmPayload, setPendingConfirmPayload] = useState<any>(null);

  const [selectedAlaCartCategory, setSelectedAlaCartCategory] =
    useState<string>("Vegetables");
  const [alaCartProducts, setAlaCartProducts] = useState<ProductType[]>([]);
  const [loadingAlaCartProducts, setLoadingAlaCartProducts] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [unavailablePackageIds, setUnavailablePackageIds] = useState<
    Record<string, boolean>
  >({});
  // Tracks product IDs (as strings) that have been disabled via socket — used
  // to show "No longer available" red style in BOTH the ala carte grid AND the confirm step.
  const [disabledAlacartProductIds, setDisabledAlacartProductIds] = useState<
    Set<string>
  >(new Set());

  const [originalAlacartTotal, setOriginalAlacartTotal] = useState<number>(0);

  // The qty + unit each SAVED ala carte row had when the review loaded
  // (key = orderadditionalitems.id). Used to detect which saved rows the
  // customer edited so we can send them to the backend for an UPDATE.
  const [originalAlacartMap, setOriginalAlacartMap] = useState<
    Record<number, OriginalAlacartEntry>
  >({});

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Which order (as a string key) the data currently in Redux was loaded for.
  // null = nothing loaded yet (or it was cleared) → a fetch is required.
  const loadedOrderIdRef = useRef<string | null>(null);
  // Monotonically increasing id so a slow response for an OLD order
  // can never overwrite the data of the order the user is looking at now.
  const requestIdRef = useRef(0);
  // Tracks whether the user has successfully confirmed this order,
  // preventing background re-fetches and alerts while the success overlay is showing.
  const isConfirmedRef = useRef(false);

  const isTimeRanOut = useMemo(() => {
    const currentHour = new Date().getHours();
    // Package review window is from 8:00 AM to 6:00 PM (08:00 - 18:00)
    // Past 6:00 PM (or before 8:00 AM), time ran out for the day
    return currentHour >= 23 || currentHour < 8;
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

  const userProfile = useSelector((state: RootState) => state.auth.userProfile);
  const buyerType = useSelector(
    (state: RootState) => state.auth.userProfile?.buyerType || "Retail",
  );

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

  // Fetch active payment gateway from backend config
  useEffect(() => {
    const fetchActiveGateway = async () => {
      try {
        const headers = await getAuthHeader();
        const res = await apiClient.get(ENDPOINTS.PAYMENT.ACTIVE_GATEWAY, {
          headers,
        });
        if (res.data?.status && res.data?.data?.activeGateway) {
          setActiveGateway(res.data.data.activeGateway);
        }
      } catch {
        setActiveGateway("payments_lk");
      }
    };
    fetchActiveGateway();
  }, []);

  // Load saved card for 1-click fast pay (additional payment flow)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadCard = async () => {
        try {
          const card = await cardStorageService.getSavedCard(userProfile?.id);
          if (isMounted) setSavedCard(card);
        } catch { }
      };
      loadCard();
      return () => {
        isMounted = false;
      };
    }, [userProfile?.id]),
  );

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
    loadedOrderIdRef.current = null;
    // NOTE: Redux is NOT cleared here. clearReviewData() runs only after the
    // final confirm step succeeds (see goToNextStep).
  }, [orderKey]);

  // Fetch review data from backend
  const fetchReviewData = useCallback(
    async (force = false) => {
      if (isConfirmedRef.current) return;
      if (buyerType && buyerType.toLowerCase() !== "retail") {
        return;
      }
      // Tag this request; only the latest one is allowed to write to Redux
      const reqId = ++requestIdRef.current;
      dispatch(setLoadingReview(true));
      try {
        const res = await orderService.getPackageReview(effectiveOrderId);

        // A newer request (e.g. a different order) superseded this one
        if (reqId !== requestIdRef.current) return;

        if (res.data?.status && res.data?.data) {
          const { orderInfo, packages, additionalItems, packingSlots } =
            res.data.data;

          if (
            orderInfo?.status &&
            orderInfo.status.toLowerCase() === "cancelled"
          ) {
            dispatch(setLoadingReview(false));
            Alert.alert(
              "Cannot Proceed!",
              "You have already cancelled this order. You cannot proceed to the payment.",
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
              { cancelable: false },
            );
            return;
          }

          if (
            orderInfo?.isFinalized &&
            (Number(orderInfo.isFinalized) === 1 ||
              orderInfo.isFinalized === true)
          ) {
            dispatch(setLoadingReview(false));
            if (!isConfirmedRef.current) {
              if (effectiveOrderId) {
                navigation.replace("OrderDetails", {
                  orderId: String(effectiveOrderId),
                });
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("Home");
              }
            }
            return;
          }

          let resolvedProcessOrderId = null;
          let resolvedInvNo = "INV-2660000";
          let resolvedPaidAmount = 0;
          let resolvedMoneyPaid = 0;
          let resolvedCreditPaid = 0;
          let resolvedPaymentMethod = "";
          // delivaryMethod is the DB column name (typo in schema — kept as-is for compatibility)
          let resolvedDeliveryMethod = "";
          let resolvedIsPaid = false;
          let resolvedProcessOrderAmount = 0;
          let resolvedDeliveryCharge = 0;
          let resolvedDateStr = "14th August";
          let resolvedRawDate: string | null = null;
          let resolvedIsCoupon = 0;
          let resolvedCouponType: string | null = null;
          let resolvedCouponValue = 0;

          if (orderInfo) {
            resolvedProcessOrderId =
              orderInfo.processOrderId || orderInfo.actualOrderId;
            if (orderInfo.invNo) resolvedInvNo = orderInfo.invNo;
            if (orderInfo.amount) {
              resolvedPaidAmount = parseFloat(orderInfo.amount) || 0;
              resolvedProcessOrderAmount = parseFloat(orderInfo.amount) || 0;
            }
            if (orderInfo.deliveryCharge) {
              resolvedDeliveryCharge =
                parseFloat(orderInfo.deliveryCharge) || 0;
            }
            if (orderInfo.moneyPaid) {
              resolvedMoneyPaid = parseFloat(orderInfo.moneyPaid) || 0;
            }
            if (orderInfo.creditPaid) {
              resolvedCreditPaid = parseFloat(orderInfo.creditPaid) || 0;
            }
            if (orderInfo.paymentMethod) {
              resolvedPaymentMethod = orderInfo.paymentMethod;
            }
            // DB column is "delivaryMethod" (typo in the DB schema — intentionally kept).
            if (orderInfo.delivaryMethod) {
              resolvedDeliveryMethod = String(orderInfo.delivaryMethod).trim();
            }
            resolvedIsPaid =
              parseInt(orderInfo.isPaid, 10) === 1 || orderInfo.isPaid === true;
            resolvedIsCoupon = Number(orderInfo.isCoupon) === 1 ? 1 : 0;
            resolvedCouponType = orderInfo.couponType || null;
            resolvedCouponValue = parseFloat(orderInfo.couponValue) || 0;
            if (orderInfo.sheduleDate || orderInfo.processScheduleDate) {
              const rawDateVal =
                orderInfo.sheduleDate || orderInfo.processScheduleDate;
              const d = new Date(rawDateVal);
              if (!isNaN(d.getTime())) {
                // Local date parts (not toISOString, which is UTC and can be 1 day off)
                resolvedRawDate = toLocalDateOnly(d);
                resolvedDateStr = d.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                });
              }
            }
          }

          const loadedAlacart: Record<string | number, AlacartSelectedProduct> =
            {};
          // orderadditionalitems.normalPrice per saved row (line price before discount)
          const loadedNormalMap: Record<string, number> = {};
          // orderadditionalitems.price per saved row (what was saved EARLIER)
          const loadedSavedMap: Record<string, number> = {};

          if (Array.isArray(additionalItems) && additionalItems.length > 0) {
            additionalItems.forEach((item: any) => {
              const prodId = item.productId || item.additionalItemId;
              const perKgNormal = parseFloat(item.perKgNormalPrice || 0);
              const perKgDiscounted = parseFloat(
                item.perKgDiscountedPrice || 0,
              );
              const perKgPrice =
                perKgDiscounted > 0
                  ? perKgDiscounted
                  : perKgNormal > 0
                    ? perKgNormal
                    : parseFloat(item.price || item.normalPrice || 0);
              const basePrice = perKgNormal > 0 ? perKgNormal : perKgPrice;
              const dbUnitType = (item.unitType || "g").toLowerCase();
              // The unit saved on the order row always wins; the product's unitType is only a fallback
              const rowUnit = String(item.unit || "")
                .trim()
                .toLowerCase();
              const unit = (
                rowUnit === "kg" || rowUnit === "g"
                  ? rowUnit
                  : dbUnitType === "g"
                    ? "g"
                    : "kg"
              ) as "kg" | "g";
              const rawQty = item.qty || item.quantity || item.weight || 1;
              const parsedAmount = parseFloat(String(rawQty));
              const amount = isNaN(parsedAmount) ? 1 : parsedAmount;

              // Calculate price using marketplaceitems table current rates for the ordered quantity
              const weightKg = unit === "kg" ? amount : amount / 1000;
              const livePrice =
                perKgPrice > 0
                  ? Number((perKgPrice * weightKg).toFixed(2))
                  : parseFloat(item.price || item.normalPrice || 0);
              const liveNormalPrice =
                perKgNormal > 0
                  ? Number((perKgNormal * weightKg).toFixed(2))
                  : livePrice;

              const rawChangeBy =
                item.changeby != null &&
                  String(item.changeby).trim() !== "" &&
                  parseFloat(String(item.changeby)) > 0
                  ? parseFloat(String(item.changeby))
                  : item.startValue
                    ? parseFloat(String(item.startValue))
                    : 0.5;

              const step =
                unit === "g"
                  ? dbUnitType === "kg" || rawChangeBy <= 10
                    ? Math.round(rawChangeBy * 1000)
                    : Math.round(rawChangeBy)
                  : dbUnitType === "kg" || rawChangeBy <= 10
                    ? parseFloat(rawChangeBy.toFixed(3))
                    : parseFloat((rawChangeBy / 1000).toFixed(3));

              const rawStart =
                parseFloat(item.startValue) > 0
                  ? parseFloat(item.startValue)
                  : rawChangeBy;
              const minQuantity =
                unit === "g"
                  ? dbUnitType === "kg" || rawStart <= 10
                    ? Math.round(rawStart * 1000)
                    : Math.round(rawStart)
                  : dbUnitType === "kg" || rawStart <= 10
                    ? parseFloat(rawStart.toFixed(3))
                    : parseFloat((rawStart / 1000).toFixed(3));

              const itemKey = `prev-${item.id || prodId}`;
              loadedAlacart[itemKey] = {
                id: itemKey,
                additionalItemId: item.id ? Number(item.id) : undefined,
                productId: prodId,
                displayName: item.productName || item.cropNameEnglish || "Item",
                image: item.productImage,
                price: livePrice,
                basePrice: basePrice,
                perKgPrice: perKgPrice,
                perKgNormalPrice: perKgNormal,
                perKgDiscountedPrice: perKgDiscounted,
                weightDisplay: `${amount} ${unit}`,
                unit: unit,
                amount: amount,
                quantity: 1,
                isAddedNow: false,
                step: step,
                minQuantity: minQuantity,
                changeby: item.changeby,
                startValue: item.startValue,
                unitType: item.unitType,
              };

              // Normal line price from marketplaceitems table (used by the cancel screen)
              loadedNormalMap[itemKey] = liveNormalPrice;

              // Price stored in orderadditionalitems when the item was saved.
              // Used for the strikethrough on "Added Earlier" rows when it differs
              // from today's marketplace price.
              // NOTE: if your API sends this under another name (e.g. savedPrice),
              // change the field read here.
              loadedSavedMap[itemKey] = parseFloat(item.price || 0) || 0;
            });
          }

          setAlacartNormalPriceMap(loadedNormalMap);
          setAlacartSavedPriceMap(loadedSavedMap);

          // Remember what the customer ORIGINALLY paid for ala carte items,
          // so "Pay Additional" only counts real changes.
          setOriginalAlacartTotal(
            Object.values(loadedAlacart).reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            ),
          );

          // Remember the original qty + unit of every SAVED ala carte row
          // (keyed by orderadditionalitems.id) so we can detect edits later.
          setOriginalAlacartMap(
            Object.values(loadedAlacart).reduce(
              (acc, item) => {
                if (item.additionalItemId) {
                  acc[item.additionalItemId] = {
                    amount: item.amount,
                    unit: item.unit,
                  };
                }
                return acc;
              },
              {} as Record<number, OriginalAlacartEntry>,
            ),
          );

          const newMeta: PackageMeta[] = [];
          const newTemplates: Record<string, ReviewProduct[]> = {};
          const newProducts: Record<string, ReviewProduct[]> = {};
          const dbIdMap: Record<string, number> = {};
          let anyLocked = false;

          if (Array.isArray(packages) && packages.length > 0) {
            packages.forEach((pkg: any) => {
              const pkgKey = String(pkg.packageId || pkg.orderPackageId);
              dbIdMap[pkgKey] = pkg.orderPackageId;
              if (pkg.isLock === 1) anyLocked = true;

              // Use DB values exactly (no `|| 1000` / `|| 50` fallbacks).
              newMeta.push({
                id: pkgKey,
                name: pkg.packageName || "Custom Package",
                icon: pkg.packageName?.toLowerCase().includes("fruit")
                  ? "🍇"
                  : "🥗",
                image: pkg.packageImage,
                qty: parseInt(pkg.qty) || 1,
                unitPrice: num(pkg.unitPrice), // marketplacepackages.productPrice
                serviceFee: num(pkg.serviceFee), // marketplacepackages.serviceFee
                packingFee: num(pkg.packingFee), // marketplacepackages.packingFee
                discountPerUnit: num(pkg.discountPerUnit), // definepackage.price - productPrice
              });

              // Map active items
              const activeItems: ReviewProduct[] = (pkg.items || []).map(
                (i: any, itemIdx: number) => {
                  const itemStep = parseFloat(i.step || i.changeby || 0.5);
                  const itemMin = parseFloat(
                    i.minQuantity || i.startValue || i.qty || itemStep,
                  );
                  return {
                    id: String(
                      i.productId || i.itemId || `${pkgKey}-${itemIdx}`,
                    ),
                    itemId: i.itemId ? Number(i.itemId) : undefined,
                    productId: i.productId ? Number(i.productId) : undefined,
                    category:
                      i.categoryName || i.productTypeName || "Package Item",
                    name: i.productName || "Product",
                    icon: "🥗",
                    image: i.productImage,
                    // PER-KG price. For definepackageitems fallback rows the backend
                    // sends discountedPrice = null and baseUnitPrice = definePrice / qty.
                    price: parseFloat(
                      i.discountedPrice || i.baseUnitPrice || i.price || 0,
                    ),
                    // definepackageitems.qty (fallback) or orderpackageitems.qty
                    quantity: parseFloat(i.qty ?? 1),
                    minQuantity: itemMin,
                    // orderpackageitems.qty is always stored in kg — never use 'g' here
                    unit: "kg" as "kg" | "g",
                    step: itemStep,
                    productType: i.productType,
                    productTypeId: i.productType || i.productTypeId,
                    productTypeName: i.productTypeName,
                    isReplaced: !!i.isReplaced,
                    excludedWarning: i.excludedWarning,
                    originalProduct: i.originalProduct
                      ? {
                        id: String(i.originalProduct.id),
                        itemId: i.originalProduct.itemId
                          ? Number(i.originalProduct.itemId)
                          : i.itemId
                            ? Number(i.itemId)
                            : undefined,
                        productId: i.originalProduct.productId
                          ? Number(i.originalProduct.productId)
                          : i.productId
                            ? Number(i.productId)
                            : undefined,
                        category:
                          i.originalProduct.category || "Original Item",
                        name: i.originalProduct.name,
                        icon: "🥗",
                        image: i.originalProduct.image,
                        price: parseFloat(i.originalProduct.price || 0),
                        quantity: parseFloat(i.originalProduct.quantity ?? 1),
                        unit: "kg" as "kg" | "g",
                        step: parseFloat(
                          i.originalProduct.step ||
                          i.originalProduct.changeby ||
                          itemStep,
                        ),
                        productType: i.originalProduct.productType,
                        productTypeId: i.originalProduct.productType,
                      }
                      : undefined,
                  };
                },
              );

              // Map baseline templates
              const baseItems: ReviewProduct[] = (
                pkg.baselineProducts || []
              ).map((b: any, bIdx: number) => {
                const baseStep = parseFloat(b.step || b.changeby || 0.5);
                const baseMin = parseFloat(
                  b.minQuantity || b.startValue || b.qty || baseStep,
                );
                return {
                  id: String(
                    b.productId || b.baselineId || `${pkgKey}-base-${bIdx}`,
                  ),
                  itemId:
                    b.itemId || b.baselineId
                      ? Number(b.itemId || b.baselineId)
                      : undefined,
                  productId: b.productId ? Number(b.productId) : undefined,
                  category:
                    b.categoryName || b.productTypeName || "Baseline Item",
                  name: b.productName || "Product",
                  icon: "🥗",
                  image: b.productImage,
                  price: parseFloat(
                    b.discountedPrice || b.baseUnitPrice || b.price || 0,
                  ),
                  quantity: parseFloat(b.qty ?? 1),
                  minQuantity: baseMin,
                  unit: "kg" as "kg" | "g",
                  step: baseStep,
                  productType: b.productType,
                  productTypeId: b.productType || b.productTypeId,
                  productTypeName: b.productTypeName,
                };
              });

              newProducts[pkgKey] = activeItems;
              newTemplates[pkgKey] =
                baseItems.length > 0 ? baseItems : activeItems;
            });
          }

          dispatch(
            initReviewData({
              orderId: effectiveOrderId,
              processOrderId: resolvedProcessOrderId,
              actualOrderId: orderInfo?.actualOrderId,
              invoiceNo: resolvedInvNo,
              scheduleDateStr: resolvedDateStr,
              rawScheduleDate: resolvedRawDate,
              initialPaidAmount: resolvedPaidAmount,
              moneyPaid: resolvedMoneyPaid,
              creditPaid: resolvedCreditPaid,
              paymentMethod: resolvedPaymentMethod,
              deliveryMethod: resolvedDeliveryMethod,
              isPaid: resolvedIsPaid,
              processOrderAmount: resolvedProcessOrderAmount,
              deliveryCharge: resolvedDeliveryCharge,
              isCoupon: resolvedIsCoupon,
              couponType: resolvedCouponType,
              couponValue: resolvedCouponValue,
              packagesMeta: newMeta,
              packageProducts: newProducts,
              productTemplatesState: newTemplates,
              orderPackageDbIds: dbIdMap,
              alacartSelection: loadedAlacart,
              isLocked: anyLocked,
              availableSlots: packingSlots?.availableSlots,
              targetLimit: packingSlots?.targetLimit,
              isLimitReached: packingSlots?.isLimitReached,
              unreadReminderDays: packingSlots?.unreadReminderDays,
            }),
          );

          // Reminder rows count -> schedule date shift (1 = +0, 2 = +1, 3 = +2 days)
          const rc = Number(packingSlots?.reminderCount);
          setReminderCount(
            Number.isFinite(rc) && rc > 0
              ? rc
              : Math.max(1, Number(packingSlots?.unreadReminderDays) || 1),
          );

          // Redux now holds data for THIS order (stored as a string key)
          loadedOrderIdRef.current = orderKey;
        }
      } catch (err) {
        console.log("Failed to load package review details from API:", err);
      } finally {
        // Only the latest request may turn the loading flag off
        if (reqId === requestIdRef.current) {
          dispatch(setLoadingReview(false));
        }
      }
    },
    [dispatch, effectiveOrderId, orderKey, buyerType, navigation],
  );

  // Fetch when:
  //  • the user is on the overview screen (always refresh), OR
  //  • Redux holds data for a DIFFERENT order than the one being opened.
  // NEVER refetch while the user is editing inside the flow for the same order
  // (e.g. coming back from ReplaceProduct) — that would wipe their edits.
  useFocusEffect(
    useCallback(() => {
      if (isConfirmedRef.current) return;
      const dataIsForThisOrder = loadedOrderIdRef.current === orderKey;

      // Never refetch while the user is editing in the flow
      if (mode === "flow" && dataIsForThisOrder) return;

      if (mode === "overview" || !dataIsForThisOrder) {
        fetchReviewData(true);
      }
    }, [mode, orderKey, fetchReviewData]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchReviewData(true);
    setIsRefreshing(false);
  }, [fetchReviewData]);

  // Poll packing slots remaining count every 1 minute while screen is focused
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(async () => {
        try {
          const orderIdParam = processOrderId || effectiveOrderId;
          const res = await orderService.getPackingLimit(
            rawScheduleDate || undefined,
            orderIdParam,
          );
          if (res.data?.status && res.data?.data) {
            const slotData = res.data.data;
            const slots =
              slotData.remaining !== undefined
                ? slotData.remaining
                : slotData.availableSlots;
            dispatch(
              setPackingSlots({
                availableSlots: slots,
                targetLimit: slotData.targetLimit,
                isLimitReached: slotData.isLimitReached || slots <= 0,
                unreadReminderDays: slotData.unreadReminderDays,
              }),
            );
            // Keep reminder count in sync (drives the schedule date shift)
            const rc = Number(slotData.reminderCount);
            if (Number.isFinite(rc) && rc > 0) setReminderCount(rc);
          }
        } catch (err) {
          console.warn(
            "[ReviewPackageScreen] Polling packing limit error:",
            err,
          );
        }
      }, 60000);

      return () => {
        clearInterval(interval);
      };
    }, [dispatch, rawScheduleDate, processOrderId, effectiveOrderId]),
  );

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

  const fetchCategoryProducts = async (categoryId: string) => {
    try {
      setSelectedAlaCartCategory(categoryId);
      setLoadingAlaCartProducts(true);
      const response = await productService.getProductsByCategory(categoryId);

      if (response.data?.status && Array.isArray(response.data.products)) {
        if (response.data.products.length > 0) {
          // Keep ALL products (enabled AND disabled) so that when a product
          // is disabled via socket, the card turns red ("No longer available")
          // instead of disappearing — giving the user clear visual feedback.
          const products = response.data.products.map((item: any) => ({
            ...item,
            type: "product",
          }));
          setAlaCartProducts(products);
        } else {
          setAlaCartProducts([]);
        }
      } else {
        setAlaCartProducts([]);
      }
    } catch (error: any) {
      console.error("Failed to load products by category from API:", error);
      setAlaCartProducts([]);
      const errorMsg =
        error?.response?.data?.message ||
        `Failed to load products for ${categoryId}. Please check your connection and try again.`;
      Alert.alert("Error", errorMsg);
    } finally {
      setLoadingAlaCartProducts(false);
    }
  };

  useEffect(() => {
    fetchCategoryProducts("Vegetables");
  }, []);

  // Helper: check if any packages or ala carte items in the current review are still enabled in marketplaceitems/marketplacepackages
  const checkAllAvailability = useCallback(async () => {
    try {
      const packageIds = packagesMeta
        .map((p) => parseInt(p.id))
        .filter((id) => !isNaN(id));

      const productIds = Object.values(alacartSelection)
        .map((item) => {
          if (typeof item.productId === "number" && !isNaN(item.productId))
            return item.productId;
          const parsed = parseInt(
            String(item.productId || item.id).replace(/[^0-9]/g, ""),
            10,
          );
          return isNaN(parsed) ? 0 : parsed;
        })
        .filter((id) => id > 0);

      if (packageIds.length === 0 && productIds.length === 0) return;

      const res = await productService.checkAvailability(
        productIds,
        packageIds,
      );

      if (res.data?.packages) {
        const unavailable: Record<string, boolean> = {};
        packagesMeta.forEach((p) => {
          const id = parseInt(p.id);
          if (res.data.packages[id] === false) {
            unavailable[p.id] = true;
          }
        });
        setUnavailablePackageIds(unavailable);
      }

      if (res.data?.products) {
        setDisabledAlacartProductIds((prev) => {
          const next = new Set(prev);
          Object.entries(res.data.products).forEach(([idStr, isAvailable]) => {
            if (isAvailable === false) {
              next.add(String(idStr));
            } else if (isAvailable === true) {
              next.delete(String(idStr));
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.log("[ReviewPackageScreen] checkAllAvailability error:", err);
    }
  }, [packagesMeta, alacartSelection]);

  // Re-check availability whenever packagesMeta or alacartSelection changes
  useEffect(() => {
    checkAllAvailability();
  }, [checkAllAvailability]);

  const toggleAlacartProduct = (product: ProductType) => {
    dispatch(toggleAlacartProductAction(product));
  };

  const removeAlacartItem = (id: string | number) => {
    dispatch(removeAlacartItemAction(id));
  };

  const toggleAlacartItemUnit = (id: string | number, newUnit: "kg" | "g") => {
    dispatch(toggleAlacartItemUnitAction({ id, newUnit }));
  };

  const updateAlacartItemQuantity = (id: string | number, delta: number) => {
    dispatch(updateAlacartItemQuantityAction({ id, delta }));
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

  const currentStep = steps[currentStepIndex] ||
    steps[0] || { type: "confirm" as const };

  // Real-time Ala Carte Products & Package Availability update via Socket.IO
  useEffect(() => {
    const unsubscribe = socketService.onCatalogUpdate((data) => {
      console.log(
        "📦 [ReviewPackageScreen] Real-time catalog update received via Socket.IO:",
        data,
      );
      // Re-fetch the currently selected ala carte category (don't reset category).
      // Keep ALL products (including newly-disabled ones) so AlacartProductCard
      // can show them as red "No longer available" instead of silently vanishing.
      if (mode === "flow" && currentStep.type === "alacart") {
        productService
          .getProductsByCategory(selectedAlaCartCategory)
          .then((response) => {
            if (
              response.data?.status &&
              Array.isArray(response.data.products)
            ) {
              const products = response.data.products.map((item: any) => ({
                ...item,
                type: "product",
              }));
              setAlaCartProducts(products);
            }
          })
          .catch(() => { });
      }
      // Re-check both packages and ala carte items availability in real time via socket
      checkAllAvailability();
    });
    return () => {
      unsubscribe();
    };
  }, [mode, currentStep, selectedAlaCartCategory, checkAllAvailability]);

  // Check package & product availability whenever the user enters the confirm step
  useEffect(() => {
    if (mode === "flow" && currentStep.type === "confirm") {
      checkAllAvailability();
    }
  }, [mode, currentStep, checkAllAvailability]);

  // When alaCartProducts updates (initial load or socket catalog update),
  // collect any product IDs marked as disabled (isEnable === 0 / false).
  // These IDs are used to render "No longer available" red cards in BOTH:
  //   • the ala carte selection grid (step: alacart)
  //   • the ala carte items list     (step: confirm)
  // Items are NOT auto-removed from alacartSelection so the user can see
  // what became unavailable and decide to delete manually via the trash icon.
  useEffect(() => {
    if (alaCartProducts.length === 0) return;
    const newDisabledIds = new Set(
      alaCartProducts
        .filter((p) => p.isEnable === 0 || p.isEnable === false)
        .map((p) => String(p.id)),
    );
    setDisabledAlacartProductIds((prev) => {
      // Merge: once a product is marked disabled it stays disabled
      // until a fresh category load clears/replaces the set.
      const merged = new Set([...prev, ...newDisabledIds]);
      // If the product appears again as enabled, remove it from disabled set.
      alaCartProducts.forEach((p) => {
        if (
          p.isEnable === 1 ||
          p.isEnable === true ||
          p.isEnable === undefined
        ) {
          merged.delete(String(p.id));
        }
      });
      return merged;
    });
  }, [alaCartProducts]);

  const goToPrevStep = () => {
    if (currentStepIndex === 0) {
      setShowExitModal(true);
    } else {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Builds the full confirmPackageReview payload from current Redux + component state.
  // Called from both the card-additional-payment branch and the existing direct-confirm path.
  const buildConfirmPayload = (overrideIsPaid?: boolean | number) => {
    const replacements: Array<{
      orderPackageId: number;
      replceId?: number;
      newProductId: number;
      productType?: string | number;
      newQty: number;
      newPrice: number;
    }> = [];

    Object.entries(packageProducts).forEach(([pkgKey, prods]) => {
      const orderPkgId = orderPackageDbIds[pkgKey];
      if (orderPkgId) {
        const templateProds = productTemplatesState[pkgKey] || [];
        prods.forEach((p) => {
          const templateProd = templateProds.find(
            (t) =>
              (t.productId && p.productId && t.productId === p.productId) ||
              String(t.itemId || t.id) === String(p.itemId || p.id),
          );
          const baselineQty =
            templateProd?.quantity ??
            p.minQuantity ??
            p.originalProduct?.quantity;
          const isQtyChanged =
            baselineQty !== undefined
              ? Number(p.quantity) !== Number(baselineQty)
              : false;

          if (p.isReplaced || isQtyChanged) {
            const replceId =
              p.originalProduct?.itemId ||
              p.itemId ||
              (p.originalProduct?.id
                ? parseInt(p.originalProduct.id)
                : undefined) ||
              p.productId ||
              parseInt(p.id) ||
              undefined;
            const newProdId = p.productId || parseInt(p.id) || 0;
            replacements.push({
              orderPackageId: orderPkgId,
              replceId: replceId,
              newProductId: newProdId,
              productType: p.productTypeId || p.productType || p.category,
              newQty: p.quantity || 1,
              newPrice: Number(((p.price || 0) * (p.quantity || 1)).toFixed(2)),
            });
          }
        });
      }
    });

    const additionalItemsPayload = Object.values(alacartSelection)
      .filter((item) => item.isAddedNow)
      .map((item) => ({
        productId:
          typeof item.productId === "number"
            ? item.productId
            : parseInt(
              String(item.productId || item.id).replace(/[^0-9]/g, ""),
            ) || 0,
        qty: item.amount,
        unit: item.unit,
        normalPrice: item.basePrice,
        price: item.price,
      }));

    const updatedAdditionalItemsPayload = Object.values(alacartSelection)
      .filter((item) => {
        if (item.isAddedNow || !item.additionalItemId) return false;
        if (isItemUnavailable(item)) return false;
        const orig = originalAlacartMap[item.additionalItemId];
        if (!orig) return false;
        return (
          Number(orig.amount) !== Number(item.amount) || orig.unit !== item.unit
        );
      })
      .map((item) => ({
        id: item.additionalItemId as number,
        productId:
          typeof item.productId === "number"
            ? item.productId
            : parseInt(
              String(item.productId || item.id).replace(/[^0-9]/g, ""),
            ) || 0,
        qty: item.amount,
        unit: item.unit,
        price: Number((item.price * item.quantity).toFixed(2)),
      }));

    const packagesPayload = Object.entries(packageProducts).map(
      ([pkgKey, prods]) => ({
        orderPackageId: orderPackageDbIds[pkgKey],
        packageId: pkgKey,
        items: (prods as any[]).map((p) => {
          const pType =
            p.productTypeId != null && !isNaN(Number(p.productTypeId))
              ? Number(p.productTypeId)
              : p.productType != null && !isNaN(Number(p.productType))
                ? Number(p.productType)
                : null;
          const prodId =
            p.productId || (p.id && !isNaN(Number(p.id)) ? Number(p.id) : 0);
          return {
            productType: pType,
            productId: prodId,
            qty: Number(p.quantity) || 1,
            price: Number(((p.price || 0) * (p.quantity || 1)).toFixed(2)),
          };
        }),
      }),
    );

    const pMethodInner = (paymentMethod || "").trim().toLowerCase();
    const isCardMethod =
      pMethodInner.includes("card") ||
      pMethodInner.includes("payhere") ||
      pMethodInner.includes("online") ||
      (isPaid &&
        !pMethodInner.includes("cash") &&
        !pMethodInner.includes("cod"));

    const netDiff = totalDiff;
    const netRefundSavings =
      Boolean(isPaid) && netDiff < 0 && additionalDue < 0.01
        ? Number(Math.abs(netDiff).toFixed(2))
        : 0;

    const resolvedIsPaidPayload =
      overrideIsPaid !== undefined ? (overrideIsPaid ? 1 : 0) : isPaid ? 1 : 0;

    return {
      orderId: actualOrderId || effectiveOrderId,
      processOrderId: processOrderId || undefined,
      lockNow: true,
      additionalAmount: additionalDue > 0 ? additionalDue : 0,
      newScheduleDate: (route.params as any)?.newScheduleDate || undefined,
      paymentMethod: paymentMethod || undefined,
      isPaid: resolvedIsPaidPayload,
      newTotal: finalOrderTotalWithDelivery,
      creditToAdd: netRefundSavings > 0 ? netRefundSavings : 0,
      replacements,
      additionalItems: additionalItemsPayload,
      updatedAdditionalItems:
        updatedAdditionalItemsPayload.length > 0
          ? updatedAdditionalItemsPayload
          : undefined,
      deletedAdditionalItemIds:
        deletedAdditionalItemIds && deletedAdditionalItemIds.length > 0
          ? deletedAdditionalItemIds
          : undefined,
      packages: packagesPayload,
    };
  };

  const cleanupAfterSuccess = () => {
    loadedOrderIdRef.current = null;
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

  // Show the success message FIRST. Home navigation happens only when the
  // AlertModal closes (see its onClose).
  const showSuccessMessage = (inv: string) => {
    setSuccessInvoiceNo(inv);
    isConfirmedRef.current = true; // stop refetch / redirects
    requestIdRef.current += 1; // invalidate any in-flight fetch
    setIsSubmitting(false); // close the "Confirming your order..." Modal
    // wait for the loading Modal to finish closing before opening the next one
    setTimeout(() => setShowSuccessOverlay(true), 350);
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
      const replacements: Array<{
        orderPackageId: number;
        replceId?: number;
        newProductId: number;
        productType?: string | number;
        newQty: number;
        newPrice: number;
      }> = [];

      Object.entries(packageProducts).forEach(([pkgKey, prods]) => {
        const orderPkgId = orderPackageDbIds[pkgKey];
        if (orderPkgId) {
          const templateProds = productTemplatesState[pkgKey] || [];
          prods.forEach((p) => {
            const templateProd = templateProds.find(
              (t) =>
                (t.productId && p.productId && t.productId === p.productId) ||
                String(t.itemId || t.id) === String(p.itemId || p.id),
            );
            const baselineQty =
              templateProd?.quantity ??
              p.minQuantity ??
              p.originalProduct?.quantity;
            const isQtyChanged =
              baselineQty !== undefined
                ? Number(p.quantity) !== Number(baselineQty)
                : false;

            if (p.isReplaced || isQtyChanged) {
              const replceId =
                p.originalProduct?.itemId ||
                p.itemId ||
                (p.originalProduct?.id
                  ? parseInt(p.originalProduct.id)
                  : undefined) ||
                p.productId ||
                parseInt(p.id) ||
                undefined;
              const newProdId = p.productId || parseInt(p.id) || 0;
              replacements.push({
                orderPackageId: orderPkgId,
                replceId: replceId,
                newProductId: newProdId,
                productType: p.productTypeId || p.productType || p.category,
                newQty: p.quantity || 1,
                newPrice: Number(
                  ((p.price || 0) * (p.quantity || 1)).toFixed(2),
                ),
              });
            }
          });
        }
      });

      // Ala carte items ADDED in this review session (new rows / merge by productId)
      const additionalItemsPayload = Object.values(alacartSelection)
        .filter((item) => item.isAddedNow)
        .map((item) => ({
          productId:
            typeof item.productId === "number"
              ? item.productId
              : parseInt(
                String(item.productId || item.id).replace(/[^0-9]/g, ""),
              ) || 0,
          qty: item.amount,
          unit: item.unit,
          normalPrice: item.basePrice,
          price: item.price,
        }));

      // Ala carte items ALREADY SAVED whose qty or unit the customer changed.
      // Sent with their orderadditionalitems.id so the backend UPDATEs that row.
      const updatedAdditionalItemsPayload = Object.values(alacartSelection)
        .filter((item) => {
          if (item.isAddedNow || !item.additionalItemId) return false;
          if (isItemUnavailable(item)) return false;
          const orig = originalAlacartMap[item.additionalItemId];
          if (!orig) return false;
          return (
            Number(orig.amount) !== Number(item.amount) ||
            orig.unit !== item.unit
          );
        })
        .map((item) => ({
          id: item.additionalItemId as number, // orderadditionalitems.id
          productId:
            typeof item.productId === "number"
              ? item.productId
              : parseInt(
                String(item.productId || item.id).replace(/[^0-9]/g, ""),
              ) || 0,
          qty: item.amount,
          unit: item.unit,
          // fallback only: backend recalculates from marketplace per-kg rates
          price: Number((item.price * item.quantity).toFixed(2)),
        }));

      // Packages payload for initial insert into orderpackageitems
      const packagesPayload = Object.entries(packageProducts).map(
        ([pkgKey, prods]) => ({
          orderPackageId: orderPackageDbIds[pkgKey],
          packageId: pkgKey,
          items: (prods as any[]).map((p) => {
            const pType =
              p.productTypeId != null && !isNaN(Number(p.productTypeId))
                ? Number(p.productTypeId)
                : p.productType != null && !isNaN(Number(p.productType))
                  ? Number(p.productType)
                  : null;
            const prodId =
              p.productId || (p.id && !isNaN(Number(p.id)) ? Number(p.id) : 0);
            return {
              productType: pType,
              productId: prodId,
              qty: Number(p.quantity) || 1,
              price: Number(((p.price || 0) * (p.quantity || 1)).toFixed(2)),
            };
          }),
        }),
      );

      // Net package diff (pure package + alacart items, without delivery fee)
      const netDiff = totalDiff;
      const netRefundSavings =
        Boolean(isPaid) && netDiff < 0
          ? Number(Math.abs(netDiff).toFixed(2))
          : 0;

      const confirmPayload = {
        orderId: actualOrderId || effectiveOrderId,
        processOrderId: processOrderId || undefined,
        lockNow: true,
        additionalAmount: additionalPayAmount > 0 ? additionalPayAmount : 0,
        newScheduleDate: (route.params as any)?.newScheduleDate || undefined,
        paymentMethod: paymentMethod || undefined,
        isPaid: isUnpaidCardOrder ? 1 : isPaid ? 1 : 0,
        newTotal: finalOrderTotalWithDelivery,
        creditToAdd: netRefundSavings > 0 ? netRefundSavings : 0,
        replacements,
        additionalItems: additionalItemsPayload,
        updatedAdditionalItems:
          updatedAdditionalItemsPayload.length > 0
            ? updatedAdditionalItemsPayload
            : undefined,
        deletedAdditionalItemIds:
          deletedAdditionalItemIds && deletedAdditionalItemIds.length > 0
            ? deletedAdditionalItemIds
            : undefined,
        packages: packagesPayload,
      };

      console.log(
        "\n[ReviewPackageScreen] Triggering confirmPackageReview with payload:",
        {
          orderId: confirmPayload.orderId,
          processOrderId: confirmPayload.processOrderId,
          lockNow: true,
          additionalAmount: confirmPayload.additionalAmount,
          newScheduleDate: confirmPayload.newScheduleDate,
          replacements,
          additionalItems: additionalItemsPayload,
          updatedAdditionalItems: updatedAdditionalItemsPayload,
          packagesCount: packagesPayload.length,
        },
      );

      const confirmRes =
        await orderService.confirmPackageReview(confirmPayload);
      console.log(
        "[ReviewPackageScreen] confirmPackageReview response:",
        confirmRes.data,
        { isCard, netRefundSavings, finalOrderTotalWithDelivery },
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
  // ── Additional Card Payment Handlers ────────────────────────────────────

  const handleAdditionalPaymentSuccess = async (confirmPayload?: any) => {
    setCheckoutModalVisible(false);

    const payload = confirmPayload ?? pendingConfirmPayload;
    if (!payload) {
      Alert.alert("Error", "Order details missing. Please contact support.");
      setIsSubmitting(false);
      return;
    }

    try {
      const confirmRes = await orderService.confirmPackageReview({
        ...payload,
        isPaid: 1,
      });
      console.log(
        "[ReviewPackageScreen] confirmPackageReview (post-payment):",
        confirmRes.data,
      );

      showSuccessMessage(
        invoiceNo ||
        routeInvoiceNo ||
        (effectiveOrderId ? `#${effectiveOrderId}` : ""),
      );
    } catch (err: any) {
      console.error("[ReviewPackageScreen] Post-payment confirm error:", err);
      setIsSubmitting(false);
      Alert.alert(
        "Order Confirmation Failed",
        "Your payment was received but the order could not be confirmed. Please contact support.",
      );
    }
  };

  const handleAdditionalPaymentCancel = () => {
    setCheckoutModalVisible(false);
    setCheckoutSession(null);
    setPendingConfirmPayload(null);
    setIsSubmitting(false);
    Alert.alert(
      "Payment Cancelled",
      "The payment was not completed. Your order was not confirmed. You can try again.",
    );
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

  // Helper to check if an ala carte item is currently marked disabled
  const isItemUnavailable = useCallback(
    (item: any) => {
      const rawPid = item.productId ?? item.id;
      const pidStr = String(rawPid);
      const numericPid = String(
        typeof rawPid === "number"
          ? rawPid
          : parseInt(String(rawPid).replace(/[^0-9]/g, ""), 10),
      );
      return (
        disabledAlacartProductIds.has(pidStr) ||
        disabledAlacartProductIds.has(numericPid)
      );
    },
    [disabledAlacartProductIds],
  );

  // Normal (pre-discount) line price for an ala carte row.
  //  • Saved row whose qty/unit is unchanged -> loaded normal price from marketplaceitems
  //  • Edited or newly added row             -> perKgNormalPrice * weightKg (or basePrice)
  const getNormalLinePrice = (item: any): number => {
    const linePrice = item.price * item.quantity;

    if (!item.isAddedNow && item.additionalItemId) {
      const orig = originalAlacartMap[item.additionalItemId];
      const unchanged =
        !!orig &&
        Number(orig.amount) === Number(item.amount) &&
        orig.unit === item.unit;
      if (unchanged && alacartNormalPriceMap[String(item.id)] != null) {
        return alacartNormalPriceMap[String(item.id)];
      }
    }

    const weightKg =
      (item.unit === "kg" ? item.amount : item.amount / 1000) || 1;
    const normalRate =
      item.perKgNormalPrice ||
      (item.basePrice && item.basePrice > 0 ? item.basePrice : 0);
    const calcNormal =
      normalRate > 0 ? Number((normalRate * weightKg).toFixed(2)) : linePrice;
    return Math.max(calcNormal, linePrice);
  };

  // Strikethrough price for "Added Earlier" rows only.
  // Returns the saved orderadditionalitems price (scaled to the current qty)
  // when it differs from today's marketplace price; otherwise null.
  const getSavedStrikePrice = (item: any): number | null => {
    if (item.isAddedNow || !item.additionalItemId) return null;
    const saved = alacartSavedPriceMap[String(item.id)];
    const orig = originalAlacartMap[item.additionalItemId];
    if (!saved || saved <= 0 || !orig) return null;

    const toKg = (a: number, u: string) => (u === "kg" ? a : a / 1000);
    const origKg = toKg(Number(orig.amount), orig.unit);
    if (origKg <= 0) return null;

    const scaledSaved = Number(
      ((saved / origKg) * toKg(Number(item.amount), item.unit)).toFixed(2),
    );
    const current = item.price * item.quantity;
    return Math.abs(scaledSaved - current) > 0.005 ? scaledSaved : null;
  };

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
