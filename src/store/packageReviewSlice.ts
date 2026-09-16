import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReviewProduct, ProductType } from "@/types/types";

export interface PackageMeta {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  qty: number;
  unitPrice: number;
  serviceFee: number;
  packingFee: number;
}

export interface AlacartSelectedProduct {
  id: number | string;
  productId?: number | string;
  displayName: string;
  image?: any;
  price: number;
  basePrice: number;
  weightDisplay: string;
  unit: "kg" | "g";
  amount: number;
  quantity: number;
  isAddedNow?: boolean;
}

export interface PackageReviewState {
  orderId: number | string | null;
  processOrderId: number | string | null;
  actualOrderId: number | string | null;
  invoiceNo: string;
  scheduleDateStr: string;
  initialPaidAmount: number;
  moneyPaid: number;
  creditPaid: number;
  paymentMethod: string;
  isPaid: boolean;
  processOrderAmount: number;
  packagesMeta: PackageMeta[];
  packageProducts: Record<string, ReviewProduct[]>;
  productTemplatesState: Record<string, ReviewProduct[]>;
  orderPackageDbIds: Record<string, number>;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  isLocked: boolean;
  loadingReview: boolean;
  availableSlots: number;
  targetLimit: number;
  isLimitReached: boolean;
  unreadReminderDays: number;
  deliveryCharge?: number;
}

const initialState: PackageReviewState = {
  orderId: null,
  processOrderId: null,
  actualOrderId: null,
  invoiceNo: "INV-2660000",
  scheduleDateStr: "14th August",
  initialPaidAmount: 0,
  moneyPaid: 0,
  creditPaid: 0,
  paymentMethod: "",
  isPaid: false,
  processOrderAmount: 0,
  deliveryCharge: 0,
  packagesMeta: [],
  packageProducts: {},
  productTemplatesState: {},
  orderPackageDbIds: {},
  alacartSelection: {},
  isLocked: false,
  loadingReview: false,
  availableSlots: 50,
  targetLimit: 50,
  isLimitReached: false,
  unreadReminderDays: 1,
};

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
      }>
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
        initialPaidAmount?: number;
        moneyPaid?: number;
        creditPaid?: number;
        paymentMethod?: string;
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
      }>
    ) => {
      const payload = action.payload;
      state.orderId = payload.orderId ?? state.orderId;
      state.processOrderId = payload.processOrderId ?? state.processOrderId;
      state.actualOrderId = payload.actualOrderId ?? state.actualOrderId;
      if (payload.invoiceNo) state.invoiceNo = payload.invoiceNo;
      if (payload.scheduleDateStr) state.scheduleDateStr = payload.scheduleDateStr;
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
      if (typeof payload.isPaid === "boolean") {
        state.isPaid = payload.isPaid;
      }
      if (typeof payload.processOrderAmount === "number") {
        state.processOrderAmount = payload.processOrderAmount;
      }
      if (typeof payload.deliveryCharge === "number") {
        state.deliveryCharge = payload.deliveryCharge;
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

      // Preserve any existing replacements if already modified
      const mergedProducts: Record<string, ReviewProduct[]> = { ...payload.packageProducts };
      Object.entries(state.packageProducts).forEach(([pkgKey, items]) => {
        if (mergedProducts[pkgKey]) {
          const replacedItems = items.filter((p) => p.isReplaced);
          if (replacedItems.length > 0) {
            mergedProducts[pkgKey] = mergedProducts[pkgKey].map((prod) => {
              const matchedReplaced = replacedItems.find(
                (r) =>
                  String(r.id) === String(prod.id) ||
                  (r.itemId && String(r.itemId) === String(prod.itemId)) ||
                  (r.originalProduct && (
                    String(r.originalProduct.id) === String(prod.id) ||
                    (r.originalProduct.itemId && String(r.originalProduct.itemId) === String(prod.itemId))
                  )) ||
                  (r.name && prod.name && r.name.trim().toLowerCase() === prod.name.trim().toLowerCase())
              );
              return matchedReplaced || prod;
            });
          }
        }
      });
      state.packageProducts = mergedProducts;

      state.alacartSelection = payload.alacartSelection ? { ...payload.alacartSelection } : {};
    },
    replacePackageProduct: (
      state,
      action: PayloadAction<{
        packageId?: string;
        orderPackageId?: number;
        originalProductId: string;
        newProduct: ReviewProduct;
      }>
    ) => {
      const { packageId, orderPackageId, originalProductId, newProduct } = action.payload;

      let replaced = false;
      const nextProducts: Record<string, ReviewProduct[]> = {};

      Object.entries(state.packageProducts).forEach(([pkgKey, list]) => {
        const isTargetPkg =
          !packageId ||
          pkgKey === String(packageId) ||
          String(state.orderPackageDbIds[pkgKey]) === String(packageId) ||
          (orderPackageId && String(state.orderPackageDbIds[pkgKey]) === String(orderPackageId));

        nextProducts[pkgKey] = list.map((prod) => {
          if (replaced && !isTargetPkg) return prod;

          const isMatch =
            String(prod.id) === String(originalProductId) ||
            (prod.itemId && String(prod.itemId) === String(originalProductId)) ||
            (prod.productId && String(prod.productId) === String(originalProductId)) ||
            (prod.originalProduct && (
              String(prod.originalProduct.id) === String(originalProductId) ||
              (prod.originalProduct.itemId && String(prod.originalProduct.itemId) === String(originalProductId)) ||
              (prod.originalProduct.productId && String(prod.originalProduct.productId) === String(originalProductId))
            )) ||
            (prod.name && newProduct?.originalProduct?.name && prod.name.trim().toLowerCase() === newProduct.originalProduct.name.trim().toLowerCase());

          if (isMatch) {
            replaced = true;
            const preservedOriginal = prod.originalProduct || {
              ...prod,
              isReplaced: false,
            };
            return {
              ...newProduct,
              id: String(newProduct.productId || newProduct.id),
              itemId: prod.itemId || prod.originalProduct?.itemId,
              productId: newProduct.productId ? Number(newProduct.productId) : (parseInt(newProduct.id) || undefined),
              minQuantity: newProduct.minQuantity ?? newProduct.step ?? 0.5,
              isReplaced: true,
              originalProduct: preservedOriginal,
            };
          }
          return prod;
        });
      });

      state.packageProducts = nextProducts;
    },
    resetPackageProduct: (
      state,
      action: PayloadAction<{
        packageId: string;
        productId: string;
      }>
    ) => {
      const { packageId, productId } = action.payload;
      const nextProducts: Record<string, ReviewProduct[]> = {};

      Object.entries(state.packageProducts).forEach(([pkgKey, list]) => {
        const templateList = state.productTemplatesState[pkgKey] || [];
        nextProducts[pkgKey] = list.map((prod) => {
          const isMatch =
            String(prod.id) === String(productId) ||
            (prod.itemId && String(prod.itemId) === String(productId)) ||
            (prod.productId && String(prod.productId) === String(productId)) ||
            (prod.originalProduct && (
              String(prod.originalProduct.id) === String(productId) ||
              (prod.originalProduct.itemId && String(prod.originalProduct.itemId) === String(productId)) ||
              (prod.originalProduct.productId && String(prod.originalProduct.productId) === String(productId))
            ));

          if (isMatch) {
            if (prod.originalProduct) {
              return { ...prod.originalProduct, isReplaced: false };
            }
            const defaultProd = templateList.find(
              (t) =>
                String(t.id) === String(productId) ||
                (t.itemId && String(t.itemId) === String(productId)) ||
                (t.name && prod.name && t.name.trim().toLowerCase() === prod.name.trim().toLowerCase())
            );
            if (defaultProd) {
              return { ...defaultProd, isReplaced: false };
            }
            return { ...prod, isReplaced: false };
          }
          return prod;
        });
      });

      state.packageProducts = nextProducts;
    },
    updateProductQuantity: (
      state,
      action: PayloadAction<{
        packageId: string;
        productId: string;
        delta: number;
      }>
    ) => {
      const { packageId, productId, delta } = action.payload;
      if (state.packageProducts[packageId]) {
        state.packageProducts[packageId] = state.packageProducts[packageId].map((prod) => {
          if (prod.id === productId) {
            const minAllowed = prod.minQuantity ?? prod.originalProduct?.quantity ?? prod.step ?? 1;
            return {
              ...prod,
              quantity: Math.max(minAllowed, Number((prod.quantity + delta * prod.step).toFixed(2))),
            };
          }
          return prod;
        });
      }
    },
    toggleAlacartProduct: (state, action: PayloadAction<ProductType>) => {
      const product = action.payload;
      const basePrice = parseFloat(product.normalPrice) || 0;
      const initialUnit = (product.unitType?.toLowerCase() === "kg" ? "kg" : "g") as "kg" | "g";
      const initialAmount = product.startValue ? parseFloat(product.startValue) : initialUnit === "kg" ? 1 : 500;
      const weightDisplay = `${initialAmount} ${initialUnit}`;
      const newKey = `new-${product.id}`;

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
          price: basePrice,
          basePrice: basePrice,
          weightDisplay,
          unit: initialUnit,
          amount: initialAmount,
          quantity: 1,
          isAddedNow: true,
        };
      }
    },
    removeAlacartItem: (state, action: PayloadAction<string | number>) => {
      delete state.alacartSelection[action.payload];
    },
    toggleAlacartItemUnit: (
      state,
      action: PayloadAction<{ id: string | number; newUnit: "kg" | "g" }>
    ) => {
      const { id, newUnit } = action.payload;
      const item = state.alacartSelection[id];
      if (!item || item.unit === newUnit) return;

      let newAmount = item.amount;
      let newPrice = item.price;
      if (newUnit === "kg") {
        newAmount = Math.max(1, Math.round(item.amount / 1000) || 1);
        newPrice = item.basePrice * (newAmount * 2);
      } else {
        newAmount = item.amount >= 1 && item.amount <= 10 ? item.amount * 1000 : 500;
        newPrice = item.basePrice * (newAmount / 500);
      }
      state.alacartSelection[id] = {
        ...item,
        unit: newUnit,
        amount: newAmount,
        weightDisplay: `${newAmount} ${newUnit}`,
        price: newPrice,
      };
    },
    updateAlacartItemQuantity: (
      state,
      action: PayloadAction<{ id: string | number; delta: number }>
    ) => {
      const { id, delta } = action.payload;
      const item = state.alacartSelection[id];
      if (!item) return;

      const step = item.unit === "kg" ? 1 : 250;
      const min = item.unit === "kg" ? 1 : 250;
      const newAmount = Math.max(min, item.amount + delta * step);
      const newPrice = Number(
        (item.basePrice * (item.unit === "kg" ? newAmount * 2 : newAmount / 500)).toFixed(2)
      );
      state.alacartSelection[id] = {
        ...item,
        amount: newAmount,
        weightDisplay: `${newAmount} ${item.unit}`,
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
      const restoredAlacart: Record<string | number, AlacartSelectedProduct> = {};
      Object.entries(state.alacartSelection).forEach(([key, item]) => {
        if (!item.isAddedNow) {
          restoredAlacart[key] = item;
        }
      });
      state.alacartSelection = restoredAlacart;
    },
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

