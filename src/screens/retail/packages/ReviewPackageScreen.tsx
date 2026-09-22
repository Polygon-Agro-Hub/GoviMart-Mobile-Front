import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  BackHandler,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  initReviewData,
  setLoadingReview,
  replacePackageProduct,
  resetPackageProduct,
  updateProductQuantity as updateProductQuantityAction,
  toggleAlacartProduct as toggleAlacartProductAction,
  removeAlacartItem as removeAlacartItemAction,
  toggleAlacartItemUnit as toggleAlacartItemUnitAction,
  updateAlacartItemQuantity as updateAlacartItemQuantityAction,
  revertReviewChanges,
  AlacartSelectedProduct,
  PackageMeta,
} from "@/store/packageReviewSlice";
import { RootStackParamList, ProductType, ReviewProduct } from "@/types/types";
import productService from "@/services/product/product.service";
import orderService from "@/services/order/order.service";
import { HurryBanner } from "@/component/package/HurryBanner";
import { TimeRanOutBanner } from "@/component/package/TimeRanOutBanner";
import { AlacartCardSkeleton } from "@/component/ala-cart-product/AlacartCardSkeleton";
import { AlacartProductCard } from "@/component/ala-cart-product/AlacartProductCard";
import ConfirmationModal from "@/component/common/ConfirmationModal";
import { ProductReviewCard } from "@/component/ala-cart-product/ProductReviewCard";
import LoadingPage from "@/component/common/LoadingPage";
import CustomHeader from "@/component/common/CustomHeader";

type Props = StackScreenProps<RootStackParamList, "ReviewPackage">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type ScreenMode = "overview" | "flow";

const getPackageImage = (pkgId: string, image?: any) => {
  if (image) {
    if (typeof image === "string") return { uri: image };
    return image;
  }
  if (pkgId === "fruity") return require("@/assets/images/home/fruits.webp");
  if (pkgId === "veggie") return require("@/assets/images/home/veggies.webp");
  return require("@/assets/images/home/packages.webp");
};

// One step per package type, plus one alacart step, plus one confirm step.
type FlowStep =
  | { type: "package"; packageId: string }
  | { type: "alacart" }
  | { type: "confirm" };

interface Category {
  id: string;
  name: string;
  circleBg: string;
  borderColor: string;
  activeBg: string;
  active: boolean;
}

const CATEGORY_IMAGES: Record<string, any> = {
  Vegetables: require("@/assets/images/home/veggies.webp"),
  Fruits: require("@/assets/images/home/fruits.webp"),
  Cereals: require("@/assets/images/home/cereal.webp"),
  Spices: require("@/assets/images/home/spices.webp"),
  Mushrooms: require("@/assets/images/home/mushroom.webp"),
  Pulses: require("@/assets/images/home/pulses.webp"),
};

const CATEGORIES: Category[] = [
  {
    id: "Vegetables",
    name: "Veggies",
    circleBg: "#F3FFDD",
    borderColor: "#50FF43",
    activeBg: "#92D01B",
    active: true,
  },
  {
    id: "Fruits",
    name: "Fruits",
    circleBg: "#FEE5E4",
    borderColor: "#EA2A3D",
    activeBg: "#EA2A3D",
    active: false,
  },
  {
    id: "Cereals",
    name: "Cereal",
    circleBg: "#FFFBE0",
    borderColor: "#FFCF70",
    activeBg: "#FBA600",
    active: false,
  },
  {
    id: "Spices",
    name: "Spices",
    circleBg: "#FFF0DD",
    borderColor: "#A56021",
    activeBg: "#8C4C17",
    active: false,
  },
  {
    id: "Mushrooms",
    name: "Mushrooms",
    circleBg: "#FFEED9",
    borderColor: "#B47E7F",
    activeBg: "#8D4546",
    active: false,
  },
  {
    id: "Pulses",
    name: "Pulses",
    circleBg: "#FFE3E9",
    borderColor: "#B47E7F",
    activeBg: "#872844",
    active: false,
  },
];

const formatPrice = (value: number | string) =>
  (Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatWeightDisplay = (
  display?: string,
  amount?: number,
  unit?: string
): string => {
  if (amount != null && !isNaN(Number(amount)) && unit) {
    return `${parseFloat(String(amount))} ${unit.toLowerCase()}`;
  }
  if (display) {
    const match = display.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      const cleanNum = parseFloat(match[1]);
      return isNaN(cleanNum) ? display : `${cleanNum} ${match[2]}`.trim();
    }
    return display;
  }
  return "";
};

/* ---------------------------------------------------------
   Small pieces
--------------------------------------------------------- */

const TimeBox: React.FC<{ value: string }> = ({ value }) => (
  <View className="bg-black rounded-md px-3 py-1.5 min-w-[42px] items-center">
    <Text className="text-white text-[16px] font-bold">{value}</Text>
  </View>
);

// One dot per step in the WHOLE flow (packages + alacart + confirm), not per package type.
const ProgressDots: React.FC<{ total: number; current: number }> = ({
  total,
  current,
}) => (
  <View className="flex-row mx-5 mt-6" style={{ gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className="flex-1 rounded-full"
        style={{
          height: 4,
          backgroundColor: i <= current ? "#000" : "#E4E4E4",
        }}
      />
    ))}
  </View>
);

/* ---------------------------------------------------------
   Main Screen Component
--------------------------------------------------------- */

const ReviewPackage: React.FC<Props> = ({ navigation, route }) => {
  const effectiveOrderId = route.params?.orderId || 3906;
  // invoiceNo from route params acts as an initial display value before the API fetch completes
  const routeInvoiceNo = route.params?.invoiceNo;
  const dispatch = useDispatch();

  const {
    packagesMeta,
    packageProducts,
    productTemplatesState,
    orderPackageDbIds,
    alacartSelection,
    invoiceNo: reduxInvoiceNo,
    scheduleDateStr,
    initialPaidAmount,
    moneyPaid,
    creditPaid,
    paymentMethod,
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
  } = useSelector((state: RootState) => state.packageReview);

  // Prefer the API-fetched invoice number; fall back to the one passed via route params
  const invoiceNo = reduxInvoiceNo || routeInvoiceNo || "";

  const [mode, setMode] = useState<ScreenMode>("overview");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  const [selectedAlaCartCategory, setSelectedAlaCartCategory] =
    useState<string>("Vegetables");
  const [alaCartProducts, setAlaCartProducts] =
    useState<ProductType[]>([]);
  const [loadingAlaCartProducts, setLoadingAlaCartProducts] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  const isTimeRanOut = useMemo(() => {
    const currentHour = new Date().getHours();
    // Package review window is from 8:00 AM to 6:00 PM (08:00 - 18:00)
    // Past 6:00 PM (or before 8:00 AM), time ran out for the day
    return currentHour >= 18 || currentHour < 8;
  }, []);
  // const isTimeRanOut = false; // Temporarily disable time ran out check for testing
  const nextScheduleDateStr = useMemo(() => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      const dayOrdinal = getOrdinal(tomorrow.getDate());
      const monthName = tomorrow.toLocaleDateString("en-US", { month: "long" });
      return `${dayOrdinal} ${monthName}`;
    } catch {
      return "Schedule Date";
    }
  }, [scheduleDateStr]);

  const onSendReminderTomorrow = () => {
    Alert.alert(
      "Reminder Scheduled",
      `Your scheduled order review date will be extended to ${nextScheduleDateStr}. We'll remind you again tomorrow at 8:00 AM.`,
      [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            });
          },
        },
      ],
    );
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

  // Fetch review data from backend
  const fetchReviewData = useCallback(
    async (force = false) => {
      dispatch(setLoadingReview(true));
      try {
        const res = await orderService.getPackageReview(effectiveOrderId);
        if (res.data?.status && res.data?.data) {
          const { orderInfo, packages, additionalItems, packingSlots } =
            res.data.data;
          let resolvedProcessOrderId = null;
          let resolvedInvNo = "INV-2660000";
          let resolvedPaidAmount = 0;
          let resolvedMoneyPaid = 0;
          let resolvedCreditPaid = 0;
          let resolvedPaymentMethod = "";
          let resolvedIsPaid = false;
          let resolvedProcessOrderAmount = 0;
          let resolvedDeliveryCharge = 0;
          let resolvedDateStr = "14th August";

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
            resolvedIsPaid =
              parseInt(orderInfo.isPaid, 10) === 1 || orderInfo.isPaid === true;
            if (orderInfo.sheduleDate || orderInfo.processScheduleDate) {
              const d = new Date(
                orderInfo.sheduleDate || orderInfo.processScheduleDate,
              );
              if (!isNaN(d.getTime())) {
                resolvedDateStr = d.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                });
              }
            }
          }

          const loadedAlacart: Record<string | number, AlacartSelectedProduct> =
            {};
          if (Array.isArray(additionalItems) && additionalItems.length > 0) {
            additionalItems.forEach((item: any) => {
              const prodId = item.productId || item.additionalItemId;
              const basePrice = parseFloat(item.normalPrice || item.price || 0);
              const price = parseFloat(item.price || item.normalPrice || 0);
              const dbUnitType = (item.unitType || "g").toLowerCase();
              const unit = (item.unit?.toLowerCase() === "g" ? "g" : (dbUnitType === "g" ? "g" : "kg")) as
                | "kg"
                | "g";
              const rawQty = item.qty || item.quantity || item.weight || 1;
              const parsedAmount = parseFloat(String(rawQty));
              const amount = isNaN(parsedAmount) ? 1 : parsedAmount;

              const rawChangeBy = item.changeby != null && String(item.changeby).trim() !== "" && parseFloat(String(item.changeby)) > 0
                ? parseFloat(String(item.changeby))
                : (item.startValue ? parseFloat(String(item.startValue)) : 0.5);

              const step = unit === "g"
                ? (dbUnitType === "kg" || rawChangeBy <= 10 ? Math.round(rawChangeBy * 1000) : Math.round(rawChangeBy))
                : (dbUnitType === "kg" || rawChangeBy <= 10 ? parseFloat(rawChangeBy.toFixed(3)) : parseFloat((rawChangeBy / 1000).toFixed(3)));

              const rawStart = parseFloat(item.startValue) > 0 ? parseFloat(item.startValue) : rawChangeBy;
              const minQuantity = unit === "g"
                ? (dbUnitType === "kg" || rawStart <= 10 ? Math.round(rawStart * 1000) : Math.round(rawStart))
                : (dbUnitType === "kg" || rawStart <= 10 ? parseFloat(rawStart.toFixed(3)) : parseFloat((rawStart / 1000).toFixed(3)));

              const itemKey = `prev-${item.id || prodId}`;
              loadedAlacart[itemKey] = {
                id: itemKey,
                productId: prodId,
                displayName: item.productName || item.cropNameEnglish || "Item",
                image: item.productImage,
                price: price,
                basePrice: basePrice,
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
            });
          }

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

              newMeta.push({
                id: pkgKey,
                name: pkg.packageName || "Custom Package",
                icon: pkg.packageName?.toLowerCase().includes("fruit")
                  ? "🍇"
                  : "🥗",
                image: pkg.packageImage,
                qty: parseInt(pkg.qty) || 1,
                unitPrice: parseFloat(pkg.unitPrice) || 1000,
                serviceFee: parseFloat(pkg.serviceFee) || 50,
                packingFee: parseFloat(pkg.packingFee) || 50,
              });

              // Map active items
              const activeItems: ReviewProduct[] = (pkg.items || []).map(
                (i: any, itemIdx: number) => {
                  const itemStep = parseFloat(i.step || i.changeby || 0.5);
                  const itemMin = parseFloat(i.minQuantity || i.startValue || i.qty || itemStep);
                  return {
                    id: String(i.productId || i.itemId || `${pkgKey}-${itemIdx}`),
                    itemId: i.itemId ? Number(i.itemId) : undefined,
                    productId: i.productId ? Number(i.productId) : undefined,
                    category:
                      i.categoryName || i.productTypeName || "Package Item",
                    name: i.productName || "Product",
                    icon: "🥗",
                    image: i.productImage,
                    price: parseFloat(i.baseUnitPrice || i.price || 0),
                    quantity: parseFloat(i.qty || 1),
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
                          category: i.originalProduct.category || "Original Item",
                          name: i.originalProduct.name,
                          icon: "🥗",
                          image: i.originalProduct.image,
                          price: parseFloat(i.originalProduct.price || 0),
                          quantity: parseFloat(i.originalProduct.quantity || 1),
                          unit: "kg" as "kg" | "g",
                          step: parseFloat(i.originalProduct.step || i.originalProduct.changeby || itemStep),
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
                const baseMin = parseFloat(b.minQuantity || b.startValue || b.qty || baseStep);
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
                  price: parseFloat(b.baseUnitPrice || b.price || 0),
                  quantity: parseFloat(b.qty || 1),
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
              initialPaidAmount: resolvedPaidAmount,
              moneyPaid: resolvedMoneyPaid,
              creditPaid: resolvedCreditPaid,
              paymentMethod: resolvedPaymentMethod,
              isPaid: resolvedIsPaid,
              processOrderAmount: resolvedProcessOrderAmount,
              deliveryCharge: resolvedDeliveryCharge,
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
        }
      } catch (err) {
        console.log("Failed to load package review details from API:", err);
      } finally {
        dispatch(setLoadingReview(false));
      }
    },
    [dispatch, effectiveOrderId],
  );

  // Refresh review data from backend whenever user is on/enters overview screen
  useFocusEffect(
    useCallback(() => {
      if (mode === "overview") {
        fetchReviewData(true);
      }
    }, [mode, fetchReviewData]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchReviewData(true);
    setIsRefreshing(false);
  }, [fetchReviewData]);

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

    if (
      response.data?.status &&
      Array.isArray(response.data.products)
    ) {
      if (response.data.products.length > 0) {
        const products = response.data.products
          .map((item: any) => ({
            ...item,
            type: "product",
          }))
          // Defensive: never show a disabled product even if it slips
          // through the backend filter (e.g. isEnable is null/0/"0").
          .filter((item: any) => item.isEnable === undefined || item.isEnable === 1 || item.isEnable === true);
        setAlaCartProducts(products);
      } else {
        setAlaCartProducts([]);
      }
    } else {
      setAlaCartProducts([]);
      const message =
        response.data?.message || `No products available for ${categoryId}.`;
      Alert.alert("Notice", message);
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

  const overviewTotal = packagesMeta.reduce(
    (sum, p) => sum + p.qty * (p.unitPrice + p.serviceFee + p.packingFee),
    0,
  );

  const currentStep = steps[currentStepIndex] ||
    steps[0] || { type: "confirm" as const };

  const goToPrevStep = () => {
    if (currentStepIndex === 0) {
      setShowExitModal(true);
    } else {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const goToNextStep = async () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Confirm order completion & finalize review (BATCH UPDATE ON LAST STEP)
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

        // Build packages payload for initial insert into orderpackageitems (Todo packages)
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
                p.productId ||
                (p.id && !isNaN(Number(p.id)) ? Number(p.id) : 0);
              return {
                productType: pType,
                productId: prodId,
                qty: Number(p.quantity) || 1,
                price: Number(((p.price || 0) * (p.quantity || 1)).toFixed(2)),
              };
            }),
          }),
        );

        console.log(
          "\n[ReviewPackageScreen] Triggering confirmPackageReview with payload:",
          {
            orderId: effectiveOrderId,
            processOrderId: processOrderId || undefined,
            lockNow: true,
            additionalAmount: additionalPayAmount > 0 ? additionalPayAmount : 0,
            newScheduleDate:
              (route.params as any)?.newScheduleDate || undefined,
            replacements,
            additionalItems: additionalItemsPayload,
            packagesCount: packagesPayload.length,
          },
        );

        // Detect payment method for backend branching
        const pMethod = (paymentMethod || "").trim().toLowerCase();
        const isCard =
          pMethod.includes("card") ||
          pMethod.includes("payhere") ||
          pMethod.includes("online") ||
          (isPaid && !pMethod.includes("cash") && !pMethod.includes("cod"));

        // Net package diff (pure package + alacart items, without delivery fee)
        const netDiff = confirmGrandTotal - packagesTotal;
        const netRefundSavings = (isCard || isPaid) && netDiff < 0
          ? Number(Math.abs(netDiff).toFixed(2))
          : 0;

        const confirmRes = await orderService.confirmPackageReview({
          orderId: actualOrderId || effectiveOrderId,
          processOrderId: processOrderId || undefined,
          lockNow: true,
          additionalAmount: additionalPayAmount > 0 ? additionalPayAmount : 0,
          newScheduleDate: (route.params as any)?.newScheduleDate || undefined,
          paymentMethod: paymentMethod || undefined,
          newTotal: finalOrderTotalWithDelivery,
          creditToAdd: netRefundSavings > 0 ? netRefundSavings : 0,
          replacements,
          additionalItems: additionalItemsPayload,
          packages: packagesPayload,
        });
        console.log(
          "[ReviewPackageScreen] confirmPackageReview response:",
          confirmRes.data,
          { isCard, netRefundSavings, finalOrderTotalWithDelivery },
        );
      } catch (err) {
        console.error("[ReviewPackageScreen] Confirm review API error:", err);
      }

      // Navigate directly to OrderConfirmed
      navigation.navigate("OrderConfirmed", {
        orderId: String(effectiveOrderId),
        invoiceNumber: invoiceNo,
        total: finalOrderTotalWithDelivery,
      });
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
      price: item.price,
      originalPrice: item.basePrice,
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
      originalPrice: number;
      diff: number;
      additionalChanges: number;
      currentPrice: number;
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

        // Full signed diff — positive means more expensive, negative means savings
        const originalPrice =
          (pkg.unitPrice + pkg.serviceFee + pkg.packingFee) * pkg.qty;
        const additionalChanges = diff * pkg.qty; // signed
        const currentPrice =
          (pkg.unitPrice + pkg.serviceFee + pkg.packingFee + diff) * pkg.qty;

        list.push({
          pkg,
          stepIndex: idx,
          originalPrice,
          diff,
          additionalChanges,
          currentPrice,
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
  const packagesTotal = packagesMeta.reduce(
    (sum, pkg) =>
      sum + pkg.qty * (pkg.unitPrice + pkg.serviceFee + pkg.packingFee),
    0,
  );
  const alacartTotal = Object.values(alacartSelection).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const newlyAddedAlacartTotal = Object.values(alacartSelection)
    .filter((item) => item.isAddedNow)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const deliveryCharge = Number(reduxDeliveryCharge || 0);
  const grandTotal = packagesTotal + alacartTotal + deliveryCharge;
  const confirmGrandTotal = confirmPackagesTotal + alacartTotal;
  const finalOrderTotalWithDelivery = confirmGrandTotal + deliveryCharge;
  // Signed diff between the original paid-for total and the reviewed total.
  // Positive => customer owes more. Negative => total went down (reduced / refundable).
  const totalDiff = confirmGrandTotal - packagesTotal;
  const additionalPayAmount = Math.max(0, totalDiff);
  const totalSavingsAmount = Math.max(0, -totalDiff);

  // Cash on Delivery vs card/online — used to word the "Please Note" box correctly
  const pMethodLower = (paymentMethod || "").trim().toLowerCase();
  const isCashOnDelivery =
    pMethodLower.includes("cash") || pMethodLower === "cod";

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
      ) : mode === "overview" && unreadReminderDays >= 3 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#92D01B"]}
              tintColor="#92D01B"
            />
          }
        >
          <View className="items-center mt-2 mb-4">
            <Text className="text-[17px] font-bold text-black">
              Order : #{invoiceNo || effectiveOrderId}
            </Text>
            <Text className="text-[14px] text-[#494A65] mt-1">
              Schedule to : {scheduleDateStr}
            </Text>
          </View>

          <View className="h-[1px] bg-[#ECECEC] mb-6" />

          {/* Top Notice Banner: Green (if slot full) or Red (if time expired) */}
          {availableSlots <= 0 ? (
            <View className="mx-5 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-5 flex-row items-start">
              <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
                <Ionicons name="time" size={14} color="#FFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-black leading-5">
                  Sorry, We’re not accepting any orders for Today!
                </Text>
                <Text className="text-[13px] text-[#475467] mt-2 leading-5">
                  You have already used all 3 in-app reminders. This order will
                  be automatically canceled.
                </Text>
              </View>
            </View>
          ) : (
            <View className="mx-5 bg-[#FEF3F2] border border-[#FDA29B] rounded-3xl p-5 flex-row items-start">
              <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
                <Ionicons name="time" size={14} color="#FFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-black leading-5">
                  Time Ran Out!
                </Text>
                <Text className="text-[13px] text-[#475467] mt-2 leading-5">
                  You have already used all 3 in-app reminders. This order will
                  be automatically canceled.
                </Text>
              </View>
            </View>
          )}

          {/* Credit Refund Card (If Paid) */}
          {initialPaidAmount > 0 && (
            <View className="mx-5 mt-6 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-6 items-center">
              <View className="w-10 h-10 rounded-full bg-[#16B364] items-center justify-center mb-3">
                <Ionicons name="wallet" size={20} color="#FFFFFF" />
              </View>
              <Text className="text-[15px] font-bold text-black text-center">
                Amount will be credited to your credit balance.
              </Text>
              <Text className="text-[13px] text-[#475467] text-center mt-2 leading-5">
                After canceling, the full amount of{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(initialPaidAmount)}
                </Text>{" "}
                will be added to your credit balance. You can use it for your
                next purchase.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : mode === "overview" && (isLimitReached || availableSlots <= 0) ? (
        /* Case 2: Day 1 or Day 2 Slot Limit Full with Reminder/Cancel Options */
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#92D01B"]}
              tintColor="#92D01B"
            />
          }
        >
          <View className="items-center mt-2 mb-4">
            <Text className="text-[17px] font-bold text-black">
              Order : #{invoiceNo || effectiveOrderId}
            </Text>
            <Text className="text-[14px] text-[#494A65] mt-1">
              Schedule to : {scheduleDateStr}
            </Text>
          </View>

          <View className="h-[1px] bg-[#ECECEC] mb-6" />

          {/* Green Notice Box */}
          <View className="mx-5 bg-[#EDFDF2] border border-[#A6F4C5] rounded-3xl p-5 flex-row items-start">
            <View className="w-6 h-6 rounded-full bg-black items-center justify-center mr-3 mt-0.5">
              <Ionicons name="time" size={14} color="#FFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-black leading-5">
                Sorry, We’re not accepting any orders for Today!
              </Text>
              <Text className="text-[13px] text-[#475467] mt-2 leading-5">
                We accept limited orders for packing, Please try again tomorrow
                when you receive the notification.
              </Text>
            </View>
          </View>

          {/* Section Header */}
          <Text className="text-center text-[18px] font-bold text-black mt-8 mb-2">
            What would you like to do?
          </Text>

          {/* Option 1: Send me the reminder tomorrow */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              navigation.navigate("Notification");
            }}
            className="mx-5 mt-4 bg-[#FAF5FF] border border-[#D6BBFB] rounded-3xl p-5 flex-row items-center justify-between"
          >
            <View className="w-14 h-14 rounded-full bg-[#EDE4FF] items-center justify-center mr-4">
              <Text style={{ fontSize: 28 }}>🔔</Text>
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-[15px] font-bold text-black">
                Send me the reminder tomorrow
              </Text>
              <Text className="text-[12px] text-[#475467] mt-1 leading-4">
                Your scheduled order date will be extended to{" "}
                <Text className="font-bold text-black">
                  {nextScheduleDateStr}
                </Text>
                .{"\n"}If that works for you, we’ll remind you again tomorrow at
                8:00 AM.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>

          {/* Divider: or */}
          <View className="flex-row items-center justify-center my-6 mx-10">
            <View className="flex-1 h-[1px] bg-[#D0D5DD]" />
            <Text className="mx-4 text-[14px] text-[#475467] font-medium">
              or
            </Text>
            <View className="flex-1 h-[1px] bg-[#D0D5DD]" />
          </View>

          {/* Option 2: Cancel My Order */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCancelOrder}
            className="mx-5 bg-[#FEF3F2] border border-[#FDA29B] rounded-3xl p-5 flex-row items-center justify-between"
          >
            <View className="w-14 h-14 rounded-full bg-[#FEE4E2] items-center justify-center mr-4">
              <Ionicons name="close-circle" size={36} color="#F04438" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-[15px] font-bold text-black">
                Cancel My Order
              </Text>
              <Text className="text-[13px] text-[#475467] mt-1">
                I no longer needed this order.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        </ScrollView>
      ) : mode === "overview" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#000000"]}
              tintColor="#000000"
            />
          }
        >
          <View className="items-center mt-2">
            <Text className="text-[17px] font-bold text-black">
              Order : #{invoiceNo || effectiveOrderId}
            </Text>
            <Text className="text-[14px] text-[#494A65] mt-1">
              Schedule to : {scheduleDateStr}
            </Text>
          </View>

          {isLocked && (
            <View className="mx-5 mt-3 bg-[#FFF3CD] border border-[#FFEBAA] rounded-2xl p-4 flex-row items-center">
              <Ionicons name="lock-closed" size={20} color="#856404" />
              <Text className="text-[13px] text-[#856404] font-medium ml-2 flex-1">
                Package reviewing is currently locked. Your order is already
                being packed.
              </Text>
            </View>
          )}

          <View className="h-[1px] bg-[#ECECEC] mt-5" />

          {isTimeRanOut ? (
            <TimeRanOutBanner
              nextScheduleDateStr={nextScheduleDateStr}
              onSendReminderTomorrow={onSendReminderTomorrow}
              onCancelOrder={onCancelOrder}
            />
          ) : (
            <>
              <Text className="text-center text-[12px] text-[#5A5859] mt-4 mx-8 leading-5">
                Review and customize your package as per your preference.
              </Text>

              <View className="mt-5">
                <HurryBanner
                  ordersLeft={availableSlots > 0 ? availableSlots : 30}
                  date={scheduleDateStr}
                  showCancelLink={true}
                  onCancelOrder={onCancelOrder}
                />
              </View>

              <View className="h-[1px] bg-[#ECECEC] mt-6" />

              <Text className="text-center text-[12px] text-[#494A65] mt-4 mx-8 leading-5">
                Here are the packages you purchased. You can review and update
                them if needed.
              </Text>

              {loadingReview ? (
                <LoadingPage
                  message="Loading package details..."
                  fullScreen={false}
                />
              ) : packagesMeta.length === 0 ? (
                <View className="mx-5 mt-4 p-6 bg-[#F9FAFB] rounded-2xl items-center justify-center border border-[#ECECEC]">
                  <Ionicons name="cube-outline" size={36} color="#9CA3AF" />
                  <Text className="text-[14px] text-[#6B6B6B] font-medium mt-2">
                    No packages found for this order.
                  </Text>
                </View>
              ) : (
                packagesMeta.map((pkg, pIdx) => (
                  <View
                    key={`pkg-${pkg.id}-${pIdx}`}
                    className="mx-5 mt-4 border border-[#EEEEEE] bg-white rounded-2xl p-4 flex-row items-center"
                  >
                    <View className="w-14 h-14 rounded-2xl bg-[#F9FAFB] border border-[#EEEEEE] items-center justify-center overflow-hidden">
                      {pkg.image ? (
                        <Image
                          source={{ uri: pkg.image }}
                          className="w-12 h-12 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 24 }}>{pkg.icon || "📦"}</Text>
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        className="text-[17px] font-bold text-black"
                        numberOfLines={1}
                      >
                        {pkg.name} (x{pkg.qty})
                      </Text>
                      <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                        Price :{" "}
                        <Text className="font-bold text-black">
                          Rs.{" "}
                          {formatPrice(
                            pkg.unitPrice +
                            pkg.serviceFee +
                            pkg.packingFee
                          )}{" "}
                          x {pkg.qty} = Rs.{" "}
                          {formatPrice(
                            (pkg.unitPrice + pkg.serviceFee + pkg.packingFee) *
                            pkg.qty
                          )}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ))
              )}

              <Text className="text-center text-[14px] text-[#6B6B6B] mt-5 mx-8 leading-5">
                Lastly, you may also purchase any additional items you want
                after reviewing the packages you purchased.
              </Text>

              <View className="mx-5 mt-4 bg-[#F5F5F5] rounded-2xl p-4">
                <Text className="text-[14px] font-bold text-black mb-1">
                  Please Note :
                </Text>
                <Text className="text-[13px] text-[#6B6B6B] leading-5">
                  If you update the quantities of products in your packages, or
                  add or replace products, the total amount may change. You'll
                  need to pay any additional amount due.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      ) : null}

      {mode === "flow" &&
        currentStep.type === "package" &&
        (() => {
          const pkg = packagesMeta.find((p) => p.id === currentStep.packageId)!;
          if (!pkg) return null;
          const products = packageProducts[pkg.id] || [];
          const templateProds = productTemplatesState[pkg.id] || [];
          const templateSum = templateProds.reduce(
            (s, p) => s + p.price * p.quantity,
            0,
          );
          const currentSum = products.reduce(
            (s, p) => s + p.price * p.quantity,
            0,
          );
          const diff = currentSum - templateSum;

          const originalPackagePrice = pkg.unitPrice;
          const serviceFee = pkg.serviceFee;
          const packingFee = pkg.packingFee;
          const totalFor1Package =
            originalPackagePrice + serviceFee + packingFee + diff;
          const totalForNPackages = totalFor1Package * pkg.qty;

          return (
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "space-between",
                paddingBottom: Platform.OS === "ios" ? 34 : 24,
              }}
            >
              <View>
                <View className="bg-white pt-1 pb-3">
                  <HurryBanner
                    ordersLeft={availableSlots > 0 ? availableSlots : 30}
                    date={scheduleDateStr}
                    showCancelLink
                    onCancelOrder={onCancelOrder}
                  />
                  <ProgressDots total={steps.length} current={currentStepIndex} />
                </View>

                <Text className="text-[19px] font-bold text-black mx-5 mt-4">
                  Package : {pkg.name}
                  {pkg.qty > 1 ? ` (x${pkg.qty})` : ""}
                </Text>
                <Text className="text-[13px] text-[#6B6B6B] mx-5 mt-1 mb-2">
                  You can change the products and quantity as needed.
                </Text>

                {(() => {
  // Count how many products fall under each category within
  // THIS package only, so the header shown on every card in
  // that category reflects the correct group size.
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    const key = p.category || "Other";
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  });

  return products.map((product, index) => (
    <ProductReviewCard
      key={`pkg-${pkg.id}-item-${product.itemId || product.productId || product.id}-idx-${index}`}
      product={product}
      categoryCount={categoryCounts[product.category || "Other"]}
      onIncrease={() =>
        updateProductQuantity(pkg.id, product.id, 1)
      }
      onDecrease={() =>
        updateProductQuantity(pkg.id, product.id, -1)
      }
      onChangeProduct={() => onChangeProduct(pkg.id, product)}
      onResetToOriginal={() =>
        onResetToOriginal(pkg.id, product.id)
      }
    />
  ));
})()}
              </View>

              {/* Price Breakdown & Confirm Button (Inside ScrollView) */}
              <View
                style={{
                  backgroundColor: "#FFF",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  paddingHorizontal: 20,
                  paddingTop: 22,
                  paddingBottom: Platform.OS === "ios" ? 34 : 28,
                  marginTop: 20,
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: {
                    width: 0,
                    height: -3,
                  },
                  elevation: 15,
                }}
              >
                {/* Original Package */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "400",
                      color: "#000000",
                    }}
                  >
                    Original Package
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#000000",
                    }}
                  >
                    Rs. {formatPrice(originalPackagePrice)}
                  </Text>
                </View>

                {/* HR line 1 */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#E1E7EE",
                    marginVertical: 14,
                  }}
                />

                {/* Service Fee */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "400",
                      color: "#000000",
                    }}
                  >
                    Service Fee
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#000000",
                    }}
                  >
                    Rs. {formatPrice(serviceFee)}
                  </Text>
                </View>

                {/* HR line 2 */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#E1E7EE",
                    marginVertical: 14,
                  }}
                />

                {/* Packing Fee */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "400",
                      color: "#000000",
                    }}
                  >
                    Packing Fee
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#000000",
                    }}
                  >
                    Rs. {formatPrice(packingFee)}
                  </Text>
                </View>

                {/* HR line 3 */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#E1E7EE",
                    marginVertical: 14,
                  }}
                />

                {/* Due to Changes — shown only when user has modified products */}
                {diff !== 0 && (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "400",
                          color: "#000000",
                        }}
                      >
                        Due to Changes
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: diff > 0 ? "#FF2D55" : "#0088FF",
                        }}
                      >
                        {diff > 0 ? "+" : ""}Rs. {formatPrice(diff)}
                      </Text>
                    </View>

                    {/* HR line before Total */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 14,
                      }}
                    />
                  </>
                )}

                {/* Total for 1 Package */}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 2,
                    marginBottom: pkg.qty > 1 ? 0 : 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: pkg.qty > 1 ? 16 : 18,
                      fontWeight: pkg.qty > 1 ? "600" : "700",
                      color: "#000000",
                    }}
                  >
                    Total for 1 Package
                  </Text>
                  <Text
                    style={{
                      fontSize: pkg.qty > 1 ? 16 : 18,
                      fontWeight: pkg.qty > 1 ? "600" : "700",
                      color: "#000000",
                    }}
                  >
                    Rs. {formatPrice(totalFor1Package)}
                  </Text>
                </View>

                {pkg.qty > 1 && (
                  <>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 14,
                      }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 2,
                        marginBottom: 20,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#000000",
                        }}
                      >
                        Total for {pkg.qty} Packages
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#000000",
                        }}
                      >
                        Rs. {formatPrice(totalForNPackages)}
                      </Text>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  onPress={goToNextStep}
                  activeOpacity={0.85}
                  style={{
                    height: 54,
                    backgroundColor: "#000000",
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: {
                      width: 0,
                      height: 3,
                    },
                    elevation: 5,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Confirm & Continue ({currentStepIndex + 1})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          );
        })()}

      {mode === "flow" && currentStep.type === "alacart" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="bg-white pt-1 pb-3">
            <HurryBanner
              ordersLeft={availableSlots > 0 ? availableSlots : 30}
              date={scheduleDateStr}
              showCancelLink
              onCancelOrder={onCancelOrder}
            />
            <ProgressDots total={steps.length} current={currentStepIndex} />
          </View>

          <Text className="text-[20px] font-bold text-black text-center mt-4">
            Ala Carte Items
          </Text>
          <Text className="text-[13px] text-[#6B6B6B] text-center mt-1 mb-4">
            Feel free to add anything you like from here!
          </Text>

          {/* Category filter selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            className="flex-row"
          >
            {CATEGORIES.map((category) => {
              const isActive = category.id === selectedAlaCartCategory;
              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.9}
                  onPress={() => fetchCategoryProducts(category.id)}
                  style={{
                    width: 76,
                    height: 98,
                    backgroundColor: isActive ? category.activeBg : "#FFFFFF",
                    borderWidth: 1.2,
                    borderColor: isActive
                      ? category.activeBg
                      : category.borderColor,
                    borderTopLeftRadius: 38,
                    borderTopRightRadius: 38,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isActive ? "#FFFFFF" : category.circleBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source={CATEGORY_IMAGES[category.id]}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: isActive ? "#FFFFFF" : "#1E1E1E",
                      textAlign: "center",
                      marginTop: 6,
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2-column Product Grid or Skeleton */}
          {loadingAlaCartProducts ? (
            <View className="mt-6 px-3">
              <View className="flex-row justify-between mb-4">
                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                <AlacartCardSkeleton pulseAnim={pulseAnim} />
              </View>
              <View className="flex-row justify-between mb-4">
                <AlacartCardSkeleton pulseAnim={pulseAnim} />
                <AlacartCardSkeleton pulseAnim={pulseAnim} />
              </View>
            </View>
          ) : alaCartProducts.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Ionicons name="basket-outline" size={48} color="#CCCCCC" />
              <Text className="text-[#8A8A8A] text-[14px] mt-3">
                No items available in this category
              </Text>
            </View>
          ) : (
            <View className="mt-6 px-3">
              {(() => {
                const rows: ProductType[][] = [];
                for (let i = 0; i < alaCartProducts.length; i += 2) {
                  rows.push(alaCartProducts.slice(i, i + 2));
                }
                return rows.map((row, rowIndex) => (
                  <View
                    key={`alacart-row-${rowIndex}`}
                    className="flex-row justify-between mb-4"
                  >
                    {row.map((product, pIdx) => (
                      <AlacartProductCard
                        key={`alacart-prod-${product.id}-${rowIndex}-${pIdx}`}
                        product={product}
                        selected={Object.values(alacartSelection).some(
                          (item) =>
                            String(item.productId || item.id) ===
                              String(product.id) && Boolean(item.isAddedNow),
                        )}
                        onToggle={() => toggleAlacartProduct(product)}
                      />
                    ))}
                    {row.length === 1 && <View className="flex-1 mx-2" />}
                  </View>
                ));
              })()}
            </View>
          )}
        </ScrollView>
      )}

      {/* Step: final confirm order details with dedicated ScrollView */}
      {mode === "flow" && currentStep.type === "confirm" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="bg-white pt-1 pb-3">
            <HurryBanner
              ordersLeft={availableSlots > 0 ? availableSlots : 30}
              date={scheduleDateStr}
              showCancelLink
              onCancelOrder={onCancelOrder}
            />
            <ProgressDots total={steps.length} current={currentStepIndex} />
          </View>

          {/* Package Cards */}
          <View className="mt-3">
            {packageSummaries.map((item, sIdx) => (
              <View
                key={`summary-${item.pkg.id}-${sIdx}`}
                className="border border-[#EEEEEE] rounded-2xl p-4 mb-3 mx-5 bg-white"
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-2xl bg-[#F9FAFB] border border-[#EEEEEE] items-center justify-center mr-3 overflow-hidden">
                    {item.pkg.image ? (
                      <Image
                        source={
                          typeof item.pkg.image === "string"
                            ? { uri: item.pkg.image }
                            : item.pkg.image
                        }
                        className="w-12 h-12 rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={getPackageImage(item.pkg.id)}
                        className="w-10 h-10"
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-bold text-black">
                      {item.pkg.name}
                      {item.pkg.qty > 1 ? ` (x${item.pkg.qty})` : ""}
                    </Text>
                    <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                      Original Price :{" "}
                      <Text className="font-bold text-black">
                        Rs. {formatPrice(item.originalPrice)}
                      </Text>
                    </Text>
                    <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                      Additional Changes :{" "}
                      {item.diff === 0 ? (
                        <Text className="font-bold text-black">Rs. 0.00</Text>
                      ) : (
                        <Text
                          className="font-bold"
                          style={{ color: item.diff > 0 ? "#FF2D55" : "#0088FF" }}
                        >
                          {item.diff > 0 ? "+ " : "- "}Rs.{" "}
                          {formatPrice(Math.abs(item.additionalChanges))}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>

                <View className="h-[1px] bg-[#F0F0F0] my-3" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-black">
                    Current Price :{" "}
                    <Text className="font-bold">
                      Rs. {formatPrice(item.currentPrice)}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCurrentStepIndex(item.stepIndex)}
                    activeOpacity={0.8}
                    className="w-7 h-7 rounded-full bg-black items-center justify-center"
                  >
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Ala Carte Items Section (only if order has ala carte items or user added them) */}
          {Object.keys(alacartSelection).length > 0 && (
            <>
              <View className="h-[1px] bg-[#E5E5EA] my-3" />

              <View className="mt-1">
                <Text className="text-[16px] font-bold text-black mx-5 mb-3">
                  Ala Carte Items (
                  {String(Object.keys(alacartSelection).length).padStart(
                    2,
                    "0",
                  )}
                  )
                </Text>

                {Object.values(alacartSelection).map((item, aIdx) => (
                  <View
                    key={`alacart-item-${item.id}-${aIdx}`}
                    className="border border-[#EEEEEE] rounded-2xl p-4 mb-3 mx-5 bg-white"
                  >
                    {/* Top row: Image, Name & Price, Trash, Added Now */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-14 h-14 rounded-2xl bg-[#F8F8F8] items-center justify-center mr-3 overflow-hidden border border-[#F0F0F0]">
                          {item.image ? (
                            typeof item.image === "string" ? (
                              <Image
                                source={{ uri: item.image }}
                                className="w-12 h-12"
                                resizeMode="contain"
                              />
                            ) : (
                              <Image
                                source={item.image}
                                className="w-12 h-12"
                                resizeMode="contain"
                              />
                            )
                          ) : (
                            <Ionicons
                              name="leaf-outline"
                              size={24}
                              color="#92D01B"
                            />
                          )}
                        </View>
                        <View className="flex-1 pr-2">
                          <Text
                            className="text-[16px] font-bold text-black"
                            numberOfLines={1}
                          >
                            {item.displayName}
                          </Text>
                          <Text
                            className={`text-[15px] font-bold mt-0.5 ${
                              item.isAddedNow ? "text-[#F04438]" : "text-black"
                            }`}
                          >
                            Rs. {formatPrice(item.price)}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end justify-between h-14">
                        <TouchableOpacity
                          onPress={() => removeAlacartItem(item.id)}
                          activeOpacity={0.7}
                          className="w-8 h-8 rounded-full bg-[#F5F5F5] items-center justify-center"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#000"
                          />
                        </TouchableOpacity>

                        {item.isAddedNow && (
                          <Text className="text-[12px] font-medium text-[#F04438]">
                            Added Now
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Dashed line */}
                    <View className="border-b border-dashed border-[#E5E5EA] my-3.5" />

                    {/* Bottom row: Unit selector & Stepper */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Text className="text-[13px] text-[#6B6B6B] mr-2">
                          Unit :
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleAlacartItemUnit(item.id, "kg")}
                          activeOpacity={0.8}
                          className={`px-3.5 py-1 rounded-full mr-1.5 ${
                            item.unit === "kg" ? "bg-[#FF9114]" : "bg-[#FCE1C5]"
                          }`}
                        >
                          <Text className="text-white font-bold text-[12px]">
                            kg
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => toggleAlacartItemUnit(item.id, "g")}
                          activeOpacity={0.8}
                          className={`px-3.5 py-1 rounded-full ${
                            item.unit === "g" ? "bg-[#FF9114]" : "bg-[#FCE1C5]"
                          }`}
                        >
                          <Text className="text-white font-bold text-[12px]">
                            g
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => updateAlacartItemQuantity(item.id, -1)}
                          activeOpacity={0.7}
                          className="w-6 h-6 rounded-full bg-[#D1D1D6] items-center justify-center"
                        >
                          <Ionicons name="remove" size={14} color="#FFF" />
                        </TouchableOpacity>

                        <Text className="text-[13px] font-semibold text-black mx-2.5 min-w-[40px] text-center">
                          {formatWeightDisplay(item.weightDisplay, item.amount, item.unit)}
                        </Text>

                        <TouchableOpacity
                          onPress={() => updateAlacartItemQuantity(item.id, 1)}
                          activeOpacity={0.7}
                          className="w-6 h-6 rounded-full bg-black items-center justify-center"
                        >
                          <Ionicons name="add" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Please Note Box — wording/color depend on whether the reviewed total
              went UP (extra payment due) or DOWN (reduced / refundable) vs. what
              was originally paid for. */}
          {totalDiff > 0 ? (
            <View className="bg-[#F8F9FA] rounded-2xl p-4 mx-5 my-4">
              <Text className="text-[14px] font-bold text-black mb-1">
                Please Note :
              </Text>
              <Text className="text-[13px] text-[#6B6B6B] leading-5">
                You have already paid for this order. The additional amount{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(additionalPayAmount)}
                </Text>{" "}
                will need to be paid at the end of this process.
              </Text>
            </View>
          ) : totalDiff < 0 ? (
            <View className="bg-[#EDFDF2] border border-[#A6F4C5] rounded-2xl p-4 mx-5 my-4">
              <Text className="text-[14px] font-bold text-black mb-1">
                Please Note :
              </Text>
              <Text className="text-[13px] text-[#475467] leading-5">
                Your {isCashOnDelivery ? "Cash on Delivery" : "order"} total
                has been reduced by{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(totalSavingsAmount)}
                </Text>
                . Your new total is{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(finalOrderTotalWithDelivery)}
                </Text>
                .
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Fixed Bottom Payment & Action Section */}
      {mode === "overview" && !loadingReview && !isTimeRanOut && (
        <View
          style={{
            backgroundColor: "#FFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: Platform.OS === "ios" ? 34 : 28,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -3 },
            elevation: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 2,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              Total
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              Rs. {formatPrice(overviewTotal)}
            </Text>
          </View>

          <TouchableOpacity
            disabled={loadingReview || packagesMeta.length === 0}
            onPress={() => {
              setCurrentStepIndex(0);
              setMode("flow");
            }}
            activeOpacity={0.85}
            style={{
              height: 54,
              backgroundColor:
                loadingReview || packagesMeta.length === 0
                  ? "#7F919C"
                  : "#000000",
              borderRadius: 30,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity:
                loadingReview || packagesMeta.length === 0 ? 0 : 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: loadingReview || packagesMeta.length === 0 ? 0 : 5,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {loadingReview ? "Loading Packages..." : "Review My Packages"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "flow" && currentStep.type === "alacart" && (
        <View
          style={{
            backgroundColor: "#FFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: Platform.OS === "ios" ? 34 : 28,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -3 },
            elevation: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 2,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              For Ala Carte Items
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              Rs. {formatPrice(newlyAddedAlacartTotal)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={goToNextStep}
            activeOpacity={0.85}
            style={{
              height: 54,
              backgroundColor: "#000000",
              borderRadius: 30,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              Confirm & Continue ({currentStepIndex + 1})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "flow" && currentStep.type === "confirm" && (
        <View
          style={{
            backgroundColor: "#FFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: Platform.OS === "ios" ? 34 : 28,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -3 },
            elevation: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "400", color: "#000000" }}>
              For Packages
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}>
              Rs. {formatPrice(confirmPackagesTotal)}
            </Text>
          </View>

          {Object.keys(alacartSelection).length > 0 && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E1E7EE",
                  marginVertical: 14,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "400", color: "#000000" }}
                >
                  Ala Carte Items
                </Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}
                >
                  Rs. {formatPrice(alacartTotal)}
                </Text>
              </View>
            </>
          )}

          <View
            style={{
              height: 1,
              backgroundColor: "#E1E7EE",
              marginVertical: 14,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 2,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              Total
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000000" }}>
              Rs. {formatPrice(finalOrderTotalWithDelivery)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={goToNextStep}
            activeOpacity={0.85}
            style={{
              height: 54,
              backgroundColor: "#000000",
              borderRadius: 30,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {totalDiff > 0
                ? `Pay Additional Rs. ${formatPrice(additionalPayAmount)}`
                : "Confirm Order Details"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal when navigating back */}
      <ConfirmationModal
        visible={showExitModal}
        title="Are you sure you want to go back?"
        message="Going back will cause you to lose all your changes."
        confirmLabel="Yes, Go Back"
        cancelLabel="No, Stay on the page"
        confirmButtonColor="#000000"
        confirmButtonTextColor="#FFFFFF"
        cancelButtonBgColor="#EAEFF5"
        cancelButtonTextColor="#4B5563"
        iconName="warning"
        iconColor="#D32F2F"
        iconBgColor="bg-[#FEECEC]"
        buttonLayout="column"
        showCloseButton={false}
        onConfirm={() => {
          setShowExitModal(false);
          setCurrentStepIndex(0);
          setMode("overview");
          dispatch(revertReviewChanges());
          fetchReviewData(true);
        }}
        onCancel={() => setShowExitModal(false)}
      />
    </View>
  );
};

export default ReviewPackage;