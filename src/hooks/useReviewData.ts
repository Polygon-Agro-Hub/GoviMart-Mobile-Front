import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import orderService from "@/services/order/order.service";
import productService from "@/services/product/product.service";
import {
  initReviewData,
  setLoadingReview,
  setPackingSlots,
  AlacartSelectedProduct,
  PackageMeta,
} from "@/store/packageReviewSlice";
import { ScreenMode, OriginalAlacartEntry, ReviewProduct, ProductType } from "@/types/types";
import { num, toLocalDateOnly, parseDateOnly, formatScheduleLabel } from "@/utils/reviewPackageUtils";

interface UseReviewDataProps {
  effectiveOrderId: string | number;
  orderKey: string;
  buyerType?: string;
  mode: ScreenMode;
  navigation: any;
  setOriginalAlacartTotal: (total: number) => void;
  setOriginalAlacartMap: (map: Record<number, OriginalAlacartEntry>) => void;
  setAlacartNormalPriceMap: (map: Record<string, number>) => void;
  setAlacartSavedPriceMap: (map: Record<string, number>) => void;
  setDisabledAlacartProductIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setUnavailablePackageIds: (map: Record<string, boolean>) => void;
  setReminderCount: (count: number) => void;
}

export const useReviewData = ({
  effectiveOrderId,
  orderKey,
  buyerType,
  mode,
  navigation,
  setOriginalAlacartTotal,
  setOriginalAlacartMap,
  setAlacartNormalPriceMap,
  setAlacartSavedPriceMap,
  setDisabledAlacartProductIds,
  setUnavailablePackageIds,
  setReminderCount,
}: UseReviewDataProps) => {
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Which order (as a string key) the data currently in Redux was loaded for.
  // null = nothing loaded yet (or it was cleared) → a fetch is required.
  const loadedOrderIdRef = useRef<string | null>(null);
  // Monotonically increasing id so a slow response for an OLD order
  // can never overwrite the data of the order the user is looking at now.
  const requestIdRef = useRef(0);
  // Tracks whether the user has successfully confirmed this order,
  // preventing background re-fetches and alerts while the success overlay is showing.
  const isConfirmedRef = useRef(false);

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

  return {
    isRefreshing,
    setIsRefreshing,
    loadedOrderIdRef,
    requestIdRef,
    isConfirmedRef,
    fetchReviewData,
    handleRefresh,
  };
};

export default useReviewData;
