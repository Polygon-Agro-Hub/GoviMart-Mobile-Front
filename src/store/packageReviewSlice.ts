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
  invoiceNo: string;
  scheduleDateStr: string;
  initialPaidAmount: number;
  packagesMeta: PackageMeta[];
  packageProducts: Record<string, ReviewProduct[]>;
  productTemplatesState: Record<string, ReviewProduct[]>;
  orderPackageDbIds: Record<string, number>;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  isLocked: boolean;
  loadingReview: boolean;
}

const initialState: PackageReviewState = {
  orderId: null,
  processOrderId: null,
  invoiceNo: "INV-2660000",
  scheduleDateStr: "14th August",
  initialPaidAmount: 0,
  packagesMeta: [],
  packageProducts: {},
  productTemplatesState: {},
  orderPackageDbIds: {},
  alacartSelection: {},
  isLocked: false,
  loadingReview: false,
};

export const packageReviewSlice = createSlice({
  name: "packageReview",
  initialState,
  reducers: {
    setLoadingReview: (state, action: PayloadAction<boolean>) => {
      state.loadingReview = action.payload;
    },
    initReviewData: (
      state,
      action: PayloadAction<{
        orderId?: number | string;
        processOrderId?: number | string;
        invoiceNo?: string;
        scheduleDateStr?: string;
        initialPaidAmount?: number;
        packagesMeta: PackageMeta[];
        packageProducts: Record<string, ReviewProduct[]>;
        productTemplatesState: Record<string, ReviewProduct[]>;
        orderPackageDbIds: Record<string, number>;
        alacartSelection?: Record<string | number, AlacartSelectedProduct>;
        isLocked?: boolean;
      }>
    ) => {
      const payload = action.payload;
      state.orderId = payload.orderId ?? state.orderId;
      state.processOrderId = payload.processOrderId ?? state.processOrderId;
      if (payload.invoiceNo) state.invoiceNo = payload.invoiceNo;
      if (payload.scheduleDateStr) state.scheduleDateStr = payload.scheduleDateStr;
      if (typeof payload.initialPaidAmount === "number") {
        state.initialPaidAmount = payload.initialPaidAmount;
      }
      state.packagesMeta = payload.packagesMeta;
      state.productTemplatesState = payload.productTemplatesState;
      state.orderPackageDbIds = payload.orderPackageDbIds;
      state.isLocked = !!payload.isLocked;
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

      if (payload.alacartSelection && Object.keys(payload.alacartSelection).length > 0) {
        state.alacartSelection = {
          ...payload.alacartSelection,
          ...state.alacartSelection,
        };
      }
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
        state.packageProducts[packageId] = state.packageProducts[packageId].map((prod) =>
          prod.id === productId
            ? {
                ...prod,
                quantity: Math.max(prod.step, Number((prod.quantity + delta * prod.step).toFixed(2))),
              }
            : prod
        );
      }
    },
    toggleAlacartProduct: (state, action: PayloadAction<ProductType>) => {
      const product = action.payload;
      const basePrice = parseFloat(product.normalPrice) || 0;
      const initialUnit = (product.unitType?.toLowerCase() === "kg" ? "kg" : "g") as "kg" | "g";
      const initialAmount = product.startValue ? parseFloat(product.startValue) : initialUnit === "kg" ? 1 : 500;
      const weightDisplay = `${initialAmount} ${initialUnit}`;

      if (state.alacartSelection[product.id]) {
        delete state.alacartSelection[product.id];
      } else {
        state.alacartSelection[product.id] = {
          id: product.id,
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
    clearPackageReview: () => initialState,
  },
});

export const {
  setLoadingReview,
  initReviewData,
  replacePackageProduct,
  resetPackageProduct,
  updateProductQuantity,
  toggleAlacartProduct,
  removeAlacartItem,
  toggleAlacartItemUnit,
  updateAlacartItemQuantity,
  clearPackageReview,
} = packageReviewSlice.actions;

export default packageReviewSlice.reducer;
