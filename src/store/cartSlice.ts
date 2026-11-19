import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { loginSuccess, logoutSuccess } from "./authSlice";

export interface PackageCartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  totalItems: number;
  isUnavailable?: boolean;
  packageType?: string | null;
  endDate?: string | null;
}

export interface ProductCartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  normalPrice?: number;
  discountedPrice?: number;
  comPrice?: number;
  weight: number;
  unit: "g" | "kg";
  minimumWeight: number;
  maxWeight?: number;
  maxQuantity?: number;
  step: number;
  isUnavailable?: boolean;
}

export interface CartState {
  packages: PackageCartItem[];
  products: ProductCartItem[];
  cartUserId: number | null;
  deletedProductIds: number[];
  deletedPackageIds: number[];
  isCartSyncing: boolean;
}

const initialState: CartState = {
  packages: [],
  products: [],
  cartUserId: null,
  deletedProductIds: [],
  deletedPackageIds: [],
  isCartSyncing: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // ─── PRODUCT ACTIONS ───────────────────────────────────────────────────────
    addProduct: (state, action: PayloadAction<ProductCartItem>) => {
      state.deletedProductIds = (state.deletedProductIds || []).filter((id) => id !== action.payload.id);
      const existingIndex = state.products.findIndex((p) => p.id === action.payload.id);
      if (existingIndex >= 0) {
        state.products[existingIndex] = {
          ...state.products[existingIndex],
          weight: action.payload.weight,
          unit: action.payload.unit,
          price: action.payload.price,
          normalPrice: action.payload.normalPrice ?? state.products[existingIndex].normalPrice,
          discountedPrice: action.payload.discountedPrice ?? state.products[existingIndex].discountedPrice,
          comPrice: action.payload.comPrice ?? state.products[existingIndex].comPrice,
          minimumWeight: action.payload.minimumWeight ?? state.products[existingIndex].minimumWeight,
          maxWeight: action.payload.maxWeight ?? state.products[existingIndex].maxWeight,
          maxQuantity: action.payload.maxQuantity ?? state.products[existingIndex].maxQuantity,
          step: action.payload.step ?? state.products[existingIndex].step,
          isUnavailable: false,
        };
      } else {
        state.products.push({ ...action.payload, isUnavailable: false });
      }
    },
    removeProduct: (state, action: PayloadAction<number>) => {
      state.products = state.products.filter((p) => p.id !== action.payload);
      if (!state.deletedProductIds) state.deletedProductIds = [];
      if (!state.deletedProductIds.includes(action.payload)) {
        state.deletedProductIds.push(action.payload);
      }
    },
    increaseProductWeight: (state, action: PayloadAction<number>) => {
      const product = state.products.find((p) => p.id === action.payload);
      if (product) {
        const nextWeight = product.unit === "kg"
          ? parseFloat((product.weight + product.step).toFixed(3))
          : Math.round(product.weight + product.step);
        if (product.maxWeight != null && product.maxWeight > 0) {
          if (product.weight < product.maxWeight) {
            product.weight = Math.min(product.maxWeight, nextWeight);
          }
        } else {
          product.weight = nextWeight;
        }
      }
    },
    decreaseProductWeight: (state, action: PayloadAction<number>) => {
      const product = state.products.find((p) => p.id === action.payload);
      if (product) {
        const newWeight = product.unit === "kg"
          ? parseFloat((product.weight - product.step).toFixed(3))
          : Math.round(product.weight - product.step);
        if (newWeight >= product.minimumWeight) {
          product.weight = newWeight;
        }
      }
    },
    changeProductUnit: (
      state,
      action: PayloadAction<{ id: number; newUnit: "g" | "kg" }>
    ) => {
      const product = state.products.find((p) => p.id === action.payload.id);
      if (product && product.unit !== action.payload.newUnit) {
        if (action.payload.newUnit === "kg") {
          product.weight = parseFloat((product.weight / 1000).toFixed(3));
          product.minimumWeight = parseFloat((product.minimumWeight / 1000).toFixed(3));
          product.step = parseFloat((product.step / 1000).toFixed(3));
          if (product.maxWeight != null && product.maxWeight > 0) {
            product.maxWeight = parseFloat((product.maxWeight / 1000).toFixed(3));
          }
          product.unit = "kg";
        } else {
          product.weight = Math.round(product.weight * 1000);
          product.minimumWeight = Math.round(product.minimumWeight * 1000);
          product.step = Math.round(product.step * 1000);
          if (product.maxWeight != null && product.maxWeight > 0) {
            product.maxWeight = Math.round(product.maxWeight * 1000);
          }
          product.unit = "g";
        }
      }
    },

    // ─── PACKAGE ACTIONS ───────────────────────────────────────────────────────
    addPackage: (state, action: PayloadAction<PackageCartItem>) => {
      state.deletedPackageIds = (state.deletedPackageIds || []).filter((id) => id !== action.payload.id);
      const existingIndex = state.packages.findIndex((p) => p.id === action.payload.id);
      if (existingIndex >= 0) {
        state.packages[existingIndex].quantity += action.payload.quantity;
        if (action.payload.totalItems) {
          state.packages[existingIndex].totalItems = action.payload.totalItems;
        }
        state.packages[existingIndex].isUnavailable = false;
      } else {
        state.packages.push({ ...action.payload, isUnavailable: false });
      }
    },
    setPackageQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number; totalItems?: number }>
    ) => {
      const pkg = state.packages.find((p) => p.id === action.payload.id);
      if (pkg) {
        pkg.quantity = Math.max(1, action.payload.quantity);
        if (action.payload.totalItems !== undefined) {
          pkg.totalItems = action.payload.totalItems;
        }
      }
    },
    increasePackageQuantity: (state, action: PayloadAction<number>) => {
      const pkg = state.packages.find((p) => p.id === action.payload);
      if (pkg) {
        pkg.quantity += 1;
      }
    },
    decreasePackageQuantity: (state, action: PayloadAction<number>) => {
      const pkg = state.packages.find((p) => p.id === action.payload);
      if (pkg && pkg.quantity > 1) {
        pkg.quantity -= 1;
      }
    },
    removePackage: (state, action: PayloadAction<number>) => {
      state.packages = state.packages.filter((p) => p.id !== action.payload);
      if (!state.deletedPackageIds) state.deletedPackageIds = [];
      if (!state.deletedPackageIds.includes(action.payload)) {
        state.deletedPackageIds.push(action.payload);
      }
    },

    // ─── BACKEND SYNC ACTIONS ──────────────────────────────────────────────────
    setCartFromBackend: (
      state,
      action: PayloadAction<{
        products: ProductCartItem[];
        packages: PackageCartItem[];
        cartUserId?: number | null;
      }>
    ) => {
      const deletedProdSet = new Set(state.deletedProductIds || []);
      const incomingProducts = (action.payload.products || []).filter(
        (p) => !deletedProdSet.has(p.id)
      );
      const deletedPkgSet = new Set(state.deletedPackageIds || []);
      const incomingPackages = (action.payload.packages || []).filter(
        (pkg) => !deletedPkgSet.has(pkg.id)
      );

      // 1. Stable merge for products: preserve current order of items already visible
      const newProductsMap = new Map(incomingProducts.map((p) => [p.id, p]));
      const mergedProducts: ProductCartItem[] = [];

      for (const existing of state.products) {
        if (newProductsMap.has(existing.id)) {
          const fresh = newProductsMap.get(existing.id)!;
          mergedProducts.push({
            ...existing,
            ...fresh,
          });
          newProductsMap.delete(existing.id);
        }
      }
      for (const remaining of newProductsMap.values()) {
        mergedProducts.push(remaining);
      }

      // 2. Stable merge for packages
      const newPackagesMap = new Map(incomingPackages.map((p) => [p.id, p]));
      const mergedPackages: PackageCartItem[] = [];

      for (const existing of state.packages) {
        if (newPackagesMap.has(existing.id)) {
          const fresh = newPackagesMap.get(existing.id)!;
          mergedPackages.push({
            ...existing,
            ...fresh,
          });
          newPackagesMap.delete(existing.id);
        }
      }
      for (const remaining of newPackagesMap.values()) {
        mergedPackages.push(remaining);
      }

      // 3. Only update array reference if contents actually changed
      const productsChanged =
        state.products.length !== mergedProducts.length ||
        state.products.some(
          (p, i) =>
            p.id !== mergedProducts[i]?.id ||
            p.weight !== mergedProducts[i]?.weight ||
            p.unit !== mergedProducts[i]?.unit ||
            p.price !== mergedProducts[i]?.price ||
            p.isUnavailable !== mergedProducts[i]?.isUnavailable
        );

      const packagesChanged =
        state.packages.length !== mergedPackages.length ||
        state.packages.some(
          (pkg, i) =>
            pkg.id !== mergedPackages[i]?.id ||
            pkg.quantity !== mergedPackages[i]?.quantity ||
            pkg.price !== mergedPackages[i]?.price ||
            pkg.totalItems !== mergedPackages[i]?.totalItems ||
            pkg.isUnavailable !== mergedPackages[i]?.isUnavailable ||
            pkg.packageType !== mergedPackages[i]?.packageType ||
            pkg.endDate !== mergedPackages[i]?.endDate
        );

      if (productsChanged) {
        state.products = mergedProducts;
      }
      if (packagesChanged) {
        state.packages = mergedPackages;
      }

      if (action.payload.cartUserId !== undefined) {
        state.cartUserId = action.payload.cartUserId;
      }
    },

    // ─── AVAILABILITY SYNC ──────────────────────────────────────────────────────
    updateAvailabilityMap: (
      state,
      action: PayloadAction<{
        products: Record<number, boolean>;
        packages: Record<number, boolean>;
      }>
    ) => {
      const { products, packages } = action.payload;

      state.products.forEach((product) => {
        if (products[product.id] !== undefined) {
          product.isUnavailable = !products[product.id];
        }
      });

      state.packages.forEach((pkg) => {
        if (packages[pkg.id] !== undefined) {
          pkg.isUnavailable = !packages[pkg.id];
        }
      });
    },

    clearDeletedProductId: (state, action: PayloadAction<number>) => {
      state.deletedProductIds = (state.deletedProductIds || []).filter(
        (id) => id !== action.payload
      );
    },
    clearDeletedPackageId: (state, action: PayloadAction<number>) => {
      state.deletedPackageIds = (state.deletedPackageIds || []).filter(
        (id) => id !== action.payload
      );
    },
    setCartSyncing: (state, action: PayloadAction<boolean>) => {
      state.isCartSyncing = action.payload;
    },

    clearCart: (state) => {
      state.packages = [];
      state.products = [];
      state.cartUserId = null;
      state.deletedProductIds = [];
      state.deletedPackageIds = [];
      state.isCartSyncing = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutSuccess, (state) => {
        state.packages = [];
        state.products = [];
        state.cartUserId = null;
      state.deletedProductIds = [];
      state.deletedPackageIds = [];
      state.isCartSyncing = false;
      })
      .addCase(loginSuccess, (state, action) => {
        const newUserId = action.payload.userProfile?.id ?? null;
        if (state.cartUserId !== newUserId) {
          state.packages = [];
          state.products = [];
          state.cartUserId = newUserId;
          state.deletedProductIds = [];
          state.deletedPackageIds = [];
          state.isCartSyncing = false;
        }
      });
  },
});

export const {
  addProduct,
  removeProduct,
  increaseProductWeight,
  decreaseProductWeight,
  changeProductUnit,
  addPackage,
  setPackageQuantity,
  increasePackageQuantity,
  decreasePackageQuantity,
  removePackage,
  setCartFromBackend,
  updateAvailabilityMap,
  clearCart,
  clearDeletedProductId,
  clearDeletedPackageId,
  setCartSyncing,
} = cartSlice.actions;

export default cartSlice.reducer;
