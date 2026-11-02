import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReviewProduct, ProductType } from "@/types/types";

export interface PackageMeta {
  id: string;
  name: string;
  icon: string;
  image?: any;
  qty: number;
  unitPrice: number;
  serviceFee: number;
  packingFee: number;
  discountPerUnit?: number; // definepackage.price - marketplacepackages.productPrice
}

export interface AlacartSelectedProduct {
  id: number | string;
  additionalItemId?: number;
  productId?: number | string;
  displayName: string;
  image?: any;
  price: number;
  basePrice: number;
  // Per-kg rate used to recompute `price` whenever amount/unit changes.
  // Falls back to `basePrice` for items loaded from an existing order
  // (where this isn't set) so their unit/qty math keeps working as before.
  perKgPrice?: number;
  perKgNormalPrice?: number;
  perKgDiscountedPrice?: number;
  weightDisplay: string;
  unit: "kg" | "g";
  amount: number;
  quantity: number;
  isAddedNow?: boolean;
  step?: number;
  minQuantity?: number;
  changeby?: string | number;
  startValue?: string | number;
  unitType?: string;
}

export interface PackageReviewState {
  orderId: number | string | null;
  processOrderId: number | string | null;
  actualOrderId: number | string | null;
  invoiceNo: string;
  scheduleDateStr: string;
  rawScheduleDate?: string | null;
  initialPaidAmount: number;
  moneyPaid: number;
  creditPaid: number;
  paymentMethod: string;
  deliveryMethod: string;
  isPaid: boolean;
  processOrderAmount: number;
  packagesMeta: PackageMeta[];
  packageProducts: Record<string, ReviewProduct[]>;
  productTemplatesState: Record<string, ReviewProduct[]>;
  orderPackageDbIds: Record<string, number>;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  deletedAdditionalItemIds: number[];
  isLocked: boolean;
  loadingReview: boolean;
  availableSlots: number;
  targetLimit: number;
  isLimitReached: boolean;
  unreadReminderDays: number;
  deliveryCharge?: number;
  isCoupon?: number;
  couponType?: string | null;
  couponValue?: number;
}

const initialState: PackageReviewState = {
  orderId: null,
  processOrderId: null,
  actualOrderId: null,
  invoiceNo: "INV-2660000",
  scheduleDateStr: "14th August",
  rawScheduleDate: null,
  initialPaidAmount: 0,
  moneyPaid: 0,
  creditPaid: 0,
  paymentMethod: "",
  deliveryMethod: "",
  isPaid: false,
  processOrderAmount: 0,
  deliveryCharge: 0,
  isCoupon: 0,
  couponType: null,
  couponValue: 0,
  packagesMeta: [],
  packageProducts: {},
  productTemplatesState: {},
  orderPackageDbIds: {},
  alacartSelection: {},
  deletedAdditionalItemIds: [],
  isLocked: false,
  loadingReview: false,
  availableSlots: 50,
  targetLimit: 50,
  isLimitReached: false,
  unreadReminderDays: 1,
};

/* ---------------------------------------------------------
   Helpers (package scoping)
--------------------------------------------------------- */

// Does this line match the given product / item id?
// Checks the line itself and the original product it replaced.
const matchesProduct = (prod: ReviewProduct, id: string): boolean =>
  String(prod.id) === id ||
  (prod.itemId != null && String(prod.itemId) === id) ||
  (prod.productId != null && String(prod.productId) === id) ||
  (!!prod.originalProduct &&
    (String(prod.originalProduct.id) === id ||
      (prod.originalProduct.itemId != null &&
        String(prod.originalProduct.itemId) === id) ||
      (prod.originalProduct.productId != null &&
        String(prod.originalProduct.productId) === id)));

// Resolve which package key the action is meant for.
// Only returns keys that were explicitly identified (packageId, or the
// orderPackageId DB id). It never returns "all packages".
const resolveTargetKeys = (
  state: PackageReviewState,
  packageId?: string | number,
  orderPackageId?: string | number,
): string[] =>
  Object.keys(state.packageProducts).filter((pkgKey) => {
    const dbId = state.orderPackageDbIds[pkgKey];
    return (
      (packageId != null && pkgKey === String(packageId)) ||
      (packageId != null &&
        dbId != null &&
        String(dbId) === String(packageId)) ||
      (orderPackageId != null &&
        dbId != null &&
        String(dbId) === String(orderPackageId))
    );
  });

export const packageReviewSlice = createSlice({
  name: "packageReview",
  initialState,
  reducers: {
    setLoadingReview: (state, action: PayloadAction<boolean>) => {
      state.loadingReview = action.payload;
    },
    setPackingSlots: (
      state,
      action: PayloadAction<{
        availableSlots: number;
        targetLimit: number;
        isLimitReached: boolean;
        unreadReminderDays?: number;
      }>,
    ) => {
      state.availableSlots = action.payload.availableSlots;
      state.targetLimit = action.payload.targetLimit;
      state.isLimitReached = action.payload.isLimitReached;
      if (typeof action.payload.unreadReminderDays === "number") {
        state.unreadReminderDays = action.payload.unreadReminderDays;
      }
    },
    initReviewData: (
      state,
      action: PayloadAction<{
        orderId?: number | string;
        processOrderId?: number | string;
        actualOrderId?: number | string;
        invoiceNo?: string;
        scheduleDateStr?: string;
        rawScheduleDate?: string | null;
        initialPaidAmount?: number;
        moneyPaid?: number;
        creditPaid?: number;
        paymentMethod?: string;
        deliveryMethod?: string;
        isPaid?: boolean;
        processOrderAmount?: number;
        packagesMeta: PackageMeta[];
        packageProducts: Record<string, ReviewProduct[]>;
        productTemplatesState: Record<string, ReviewProduct[]>;
        orderPackageDbIds: Record<string, number>;
        alacartSelection?: Record<string | number, AlacartSelectedProduct>;
        isLocked?: boolean;
        availableSlots?: number;
        targetLimit?: number;
        isLimitReached?: boolean;
        unreadReminderDays?: number;
        deliveryCharge?: number;
        isCoupon?: number;
        couponType?: string | null;
        couponValue?: number;
      }>,
    ) => {
      const payload = action.payload;

      // Remember which order was loaded BEFORE we overwrite it, so we can tell
      // whether this is a reload of the same order or a different one.
      const previousOrderId = state.orderId;

      state.orderId = payload.orderId ?? state.orderId;
      state.processOrderId = payload.processOrderId ?? state.processOrderId;
      state.actualOrderId = payload.actualOrderId ?? state.actualOrderId;
      if (payload.invoiceNo) state.invoiceNo = payload.invoiceNo;
      if (payload.scheduleDateStr)
        state.scheduleDateStr = payload.scheduleDateStr;
      if (payload.rawScheduleDate !== undefined) {
        state.rawScheduleDate = payload.rawScheduleDate;
      }
      if (typeof payload.initialPaidAmount === "number") {
        state.initialPaidAmount = payload.initialPaidAmount;
      }
      if (typeof payload.moneyPaid === "number") {
        state.moneyPaid = payload.moneyPaid;
      }
      if (typeof payload.creditPaid === "number") {
        state.creditPaid = payload.creditPaid;
      }
      if (typeof payload.paymentMethod === "string") {
        state.paymentMethod = payload.paymentMethod;
      }
      if (typeof payload.deliveryMethod === "string") {
        state.deliveryMethod = payload.deliveryMethod;
      }
      if (typeof payload.isPaid === "boolean") {
        state.isPaid = payload.isPaid;
      }
      if (typeof payload.processOrderAmount === "number") {
        state.processOrderAmount = payload.processOrderAmount;
      }
      if (typeof payload.deliveryCharge === "number") {
        state.deliveryCharge = payload.deliveryCharge;
      }
      if (payload.isCoupon !== undefined) {
        state.isCoupon = Number(payload.isCoupon);
      }
      if (payload.couponType !== undefined) {
        state.couponType = payload.couponType;
      }
      if (payload.couponValue !== undefined) {
        state.couponValue = Number(payload.couponValue) || 0;
      }
      state.packagesMeta = payload.packagesMeta;
      state.productTemplatesState = payload.productTemplatesState;
      state.orderPackageDbIds = payload.orderPackageDbIds;
      state.isLocked = !!payload.isLocked;
      if (typeof payload.availableSlots === "number") {
        state.availableSlots = payload.availableSlots;
      }
      if (typeof payload.targetLimit === "number") {
        state.targetLimit = payload.targetLimit;
      }
      if (typeof payload.isLimitReached === "boolean") {
        state.isLimitReached = payload.isLimitReached;
      }
      if (typeof payload.unreadReminderDays === "number") {
        state.unreadReminderDays = payload.unreadReminderDays;
      }
      state.loadingReview = false;

      // Preserve existing replacements ONLY when re-loading the SAME order
      // (e.g. coming back from ReplaceProduct). For a different order, even
      // one with the same package, the previous order's edits must NOT leak in.
      const isSameOrder =
        previousOrderId != null &&
        payload.orderId != null &&
        String(previousOrderId) === String(payload.orderId);

      const mergedProducts: Record<string, ReviewProduct[]> = {
        ...payload.packageProducts,
      };

      if (isSameOrder) {
        // Matching is done strictly INSIDE each package (pkgKey), so a
        // replacement in one package can never be applied to another.
        Object.entries(state.packageProducts).forEach(([pkgKey, items]) => {
          if (mergedProducts[pkgKey]) {
            const replacedItems = items.filter((p) => p.isReplaced);
            if (replacedItems.length > 0) {
              mergedProducts[pkgKey] = mergedProducts[pkgKey].map((prod) => {
                const matchedReplaced = replacedItems.find(
                  (r) =>
                    (r.itemId != null &&
                      prod.itemId != null &&
                      String(r.itemId) === String(prod.itemId)) ||
                    (r.originalProduct?.itemId != null &&
                      prod.itemId != null &&
                      String(r.originalProduct.itemId) ===
                        String(prod.itemId)) ||
                    String(r.id) === String(prod.id) ||
                    (r.originalProduct &&
                      String(r.originalProduct.id) === String(prod.id)),
                );
                return matchedReplaced || prod;
              });
            }
          }
        });
      }
      state.packageProducts = mergedProducts;

      state.alacartSelection = payload.alacartSelection
        ? { ...payload.alacartSelection }
        : {};
      state.deletedAdditionalItemIds = [];
    },

    // Replaces ONE product in ONE package.
    replacePackageProduct: (
      state,
      action: PayloadAction<{
        packageId?: string;
        orderPackageId?: number;
        originalProductId: string;
        newProduct: ReviewProduct;
      }>,
    ) => {
      const { packageId, orderPackageId, originalProductId, newProduct } =
        action.payload;
      const origId = String(originalProductId);

      let targetKeys = resolveTargetKeys(state, packageId, orderPackageId);

      // Fallback if the caller sent no package info: only act when exactly
      // ONE package contains this product. If several do, it is ambiguous,
      // so do nothing rather than replace the product in every package.
      if (targetKeys.length === 0) {
        const candidates = Object.keys(state.packageProducts).filter((k) =>
          state.packageProducts[k].some((p) => matchesProduct(p, origId)),
        );
        if (candidates.length !== 1) return;
        targetKeys = candidates;
      }

      const list = state.packageProducts[targetKeys[0]];
      if (!list) return;

      const idx = list.findIndex((p) => matchesProduct(p, origId));
      if (idx === -1) return;

      const prod = list[idx];
      const preservedOriginal = prod.originalProduct || {
        ...prod,
        isReplaced: false,
      };

      list[idx] = {
        ...newProduct,
        id: String(newProduct.productId || newProduct.id),
        itemId: prod.itemId || prod.originalProduct?.itemId,
        productId: newProduct.productId
          ? Number(newProduct.productId)
          : parseInt(newProduct.id) || undefined,
        minQuantity: newProduct.minQuantity ?? newProduct.step ?? 0.5,
        isReplaced: true,
        originalProduct: preservedOriginal,
      };
    },

    // Resets ONE product in ONE package back to its original.
    resetPackageProduct: (
      state,
      action: PayloadAction<{
        packageId: string;
        productId: string;
      }>,
    ) => {
      const { packageId, productId } = action.payload;
      const list = state.packageProducts[packageId];
      if (!list) return;

      const pid = String(productId);
      const idx = list.findIndex((p) => matchesProduct(p, pid));
      if (idx === -1) return;

      const prod = list[idx];

      if (prod.originalProduct) {
        list[idx] = { ...prod.originalProduct, isReplaced: false };
        return;
      }

      const templateList = state.productTemplatesState[packageId] || [];
      const defaultProd = templateList.find(
        (t) =>
          String(t.id) === pid ||
          (t.itemId != null && String(t.itemId) === pid) ||
          (prod.itemId != null &&
            t.itemId != null &&
            String(t.itemId) === String(prod.itemId)),
      );

      list[idx] = { ...(defaultProd ?? prod), isReplaced: false };
    },

    // Changes quantity of ONE product in ONE package.
    updateProductQuantity: (
      state,
      action: PayloadAction<{
        packageId: string;
        productId: string;
        delta: number;
      }>,
    ) => {
      const { packageId, productId, delta } = action.payload;
      const list = state.packageProducts[packageId];
      if (!list) return;

      state.packageProducts[packageId] = list.map((prod) => {
        if (String(prod.id) === String(productId)) {
          const stepVal = prod.step && prod.step > 0 ? prod.step : 0.5;
          const minAllowed =
            prod.minQuantity ?? prod.originalProduct?.quantity ?? stepVal;
          const nextQty =
            prod.unit === "kg"
              ? parseFloat((prod.quantity + delta * stepVal).toFixed(3))
              : Math.round(prod.quantity + delta * stepVal);
          return {
            ...prod,
            quantity: Math.max(minAllowed, nextQty),
          };
        }
        return prod;
      });
    },

    toggleAlacartProduct: (state, action: PayloadAction<ProductType>) => {
      const product = action.payload;

      // Per-kg rates as stored in marketplaceitems — discountedPrice is the
      // effective per-kg charge; fall back to normalPrice when there's no
      // discount (mirrors normalizeToKg() in AlacartProductCard).
      const normalPricePerKg = parseFloat(String(product.normalPrice)) || 0;
      const discountedPricePerKg =
        product.discountedPrice != null &&
        String(product.discountedPrice).trim() !== ""
          ? parseFloat(String(product.discountedPrice))
          : 0;
      const perKgPrice =
        discountedPricePerKg > 0 ? discountedPricePerKg : normalPricePerKg;
      const basePrice = normalPricePerKg;

      const dbUnitType = (product.unitType || "g").toLowerCase();
      const rawStartValue = product.startValue
        ? parseFloat(String(product.startValue))
        : dbUnitType === "kg"
          ? 1
          : 500;
      const initialUnit =
        (dbUnitType === "kg" && rawStartValue < 1) || dbUnitType === "g"
          ? "g"
          : "kg";
      const initialAmount =
        initialUnit === "g"
          ? dbUnitType === "kg" || rawStartValue <= 10
            ? Math.round(rawStartValue * 1000)
            : Math.round(rawStartValue)
          : dbUnitType === "kg" || rawStartValue <= 10
            ? parseFloat(rawStartValue.toFixed(3))
            : parseFloat((rawStartValue / 1000).toFixed(3));

      const rawChangeBy =
        product.changeby != null &&
        String(product.changeby).trim() !== "" &&
        parseFloat(String(product.changeby)) > 0
          ? parseFloat(String(product.changeby))
          : rawStartValue;

      const step =
        initialUnit === "g"
          ? dbUnitType === "kg" || rawChangeBy <= 10
            ? Math.round(rawChangeBy * 1000)
            : Math.round(rawChangeBy)
          : dbUnitType === "kg" || rawChangeBy <= 10
            ? parseFloat(rawChangeBy.toFixed(3))
            : parseFloat((rawChangeBy / 1000).toFixed(3));

      const minQuantity =
        initialUnit === "g"
          ? dbUnitType === "kg" || rawStartValue <= 10
            ? Math.round(rawStartValue * 1000)
            : Math.round(rawStartValue)
          : dbUnitType === "kg" || rawStartValue <= 10
            ? parseFloat(rawStartValue.toFixed(3))
            : parseFloat((rawStartValue / 1000).toFixed(3));

      const weightDisplay = `${initialAmount} ${initialUnit}`;
      const newKey = `new-${product.id}`;

      // Price at the initial quantity (per-kg rate x weight in kg)
      const initialWeightMultiplier =
        initialUnit === "kg" ? initialAmount : initialAmount / 1000;
      const initialPrice = Number(
        (perKgPrice * initialWeightMultiplier).toFixed(2),
      );

      // Check if this product is already in alacartSelection as newly added
      if (state.alacartSelection[newKey]) {
        delete state.alacartSelection[newKey];
      } else if (state.alacartSelection[product.id]?.isAddedNow) {
        delete state.alacartSelection[product.id];
      } else {
        state.alacartSelection[newKey] = {
          id: newKey,
          productId: product.id,
          displayName: product.displayName,
          image: product.image,
          price: initialPrice,
          basePrice: basePrice,
          perKgPrice,
          perKgNormalPrice: normalPricePerKg,
          perKgDiscountedPrice: discountedPricePerKg,
          weightDisplay,
          unit: initialUnit,
          amount: initialAmount,
          quantity: 1,
          isAddedNow: true,
          step,
          minQuantity,
          changeby: product.changeby,
          startValue: product.startValue,
          unitType: product.unitType,
        };
      }
    },
    removeAlacartItem: (state, action: PayloadAction<string | number>) => {
      const item = state.alacartSelection[action.payload];
      if (item && !item.isAddedNow) {
        const dbId =
          item.additionalItemId ||
          (typeof item.id === "number"
            ? item.id
            : parseInt(String(item.id).replace(/[^0-9]/g, "")) || 0);
        if (dbId && !state.deletedAdditionalItemIds.includes(dbId)) {
          state.deletedAdditionalItemIds.push(dbId);
        }
      }
      delete state.alacartSelection[action.payload];
    },
    toggleAlacartItemUnit: (
      state,
      action: PayloadAction<{ id: string | number; newUnit: "kg" | "g" }>,
    ) => {
      const { id, newUnit } = action.payload;
      const item = state.alacartSelection[id];
      if (!item || item.unit === newUnit) return;

      const newAmount =
        newUnit === "kg"
          ? parseFloat((item.amount / 1000).toFixed(3))
          : Math.round(item.amount * 1000);
      const newStep = item.step
        ? newUnit === "kg"
          ? parseFloat((item.step / 1000).toFixed(3))
          : Math.round(item.step * 1000)
        : undefined;
      const newMin = item.minQuantity
        ? newUnit === "kg"
          ? parseFloat((item.minQuantity / 1000).toFixed(3))
          : Math.round(item.minQuantity * 1000)
        : undefined;

      const weightMultiplier = newUnit === "kg" ? newAmount : newAmount / 1000;
      // perKgPrice is the correct multiplier; basePrice is only a fallback
      // for items loaded from an existing order that predate this field.
      const rate = item.perKgPrice ?? item.basePrice;
      const newPrice = Number((rate * weightMultiplier).toFixed(2));

      state.alacartSelection[id] = {
        ...item,
        unit: newUnit,
        amount: newAmount,
        step: newStep,
        minQuantity: newMin,
        weightDisplay: `${newAmount} ${newUnit}`,
        price: newPrice,
      };
    },
    updateAlacartItemQuantity: (
      state,
      action: PayloadAction<{ id: string | number; delta: number }>,
    ) => {
      const { id, delta } = action.payload;
      const item = state.alacartSelection[id];
      if (!item) return;

      const step =
        item.step && item.step > 0 ? item.step : item.unit === "kg" ? 0.5 : 500;
      const min =
        item.minQuantity && item.minQuantity > 0 ? item.minQuantity : step;

      const rawNewAmount =
        item.unit === "kg"
          ? parseFloat((item.amount + delta * step).toFixed(3))
          : Math.round(item.amount + delta * step);
      const cleanAmount = Math.max(min, rawNewAmount);

      const weightMultiplier =
        item.unit === "kg" ? cleanAmount : cleanAmount / 1000;
      // perKgPrice is the correct multiplier; basePrice is only a fallback
      // for items loaded from an existing order that predate this field.
      const rate = item.perKgPrice ?? item.basePrice;
      const newPrice = Number((rate * weightMultiplier).toFixed(2));

      state.alacartSelection[id] = {
        ...item,
        amount: cleanAmount,
        weightDisplay: `${cleanAmount} ${item.unit}`,
        price: newPrice,
      };
    },
    revertReviewChanges: (state) => {
      // 1. Revert packageProducts to original productTemplatesState
      const restoredProducts: Record<string, ReviewProduct[]> = {};
      Object.entries(state.productTemplatesState).forEach(([pkgKey, items]) => {
        restoredProducts[pkgKey] = items.map((prod) => ({
          ...prod,
          isReplaced: false,
          originalProduct: undefined,
        }));
      });
      state.packageProducts = restoredProducts;

      // 2. Remove any newly added ala carte items (isAddedNow: true)
      const restoredAlacart: Record<string | number, AlacartSelectedProduct> =
        {};
      Object.entries(state.alacartSelection).forEach(([key, item]) => {
        if (!item.isAddedNow) {
          restoredAlacart[key] = item;
        }
      });
      state.alacartSelection = restoredAlacart;
      state.deletedAdditionalItemIds = [];
    },
    // Wipes ALL review state back to the initial values
    clearPackageReview: () => initialState,
  },
});

export const {
  setLoadingReview,
  setPackingSlots,
  initReviewData,
  replacePackageProduct,
  resetPackageProduct,
  updateProductQuantity,
  toggleAlacartProduct,
  removeAlacartItem,
  toggleAlacartItemUnit,
  updateAlacartItemQuantity,
  revertReviewChanges,
  clearPackageReview,
} = packageReviewSlice.actions;

export default packageReviewSlice.reducer;