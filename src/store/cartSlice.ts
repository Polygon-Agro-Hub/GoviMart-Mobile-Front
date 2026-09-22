import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PackageCartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  totalItems: number;
  isUnavailable?: boolean;
}

export interface ProductCartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  normalPrice?: number;
  weight: number;
  unit: "g" | "kg";
  minimumWeight: number;
  step: number;
  isUnavailable?: boolean;
}

export interface CartState {
  packages: PackageCartItem[];
  products: ProductCartItem[];
}

const initialState: CartState = {
  packages: [],
  products: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // ─── PRODUCT ACTIONS ───────────────────────────────────────────────────────
    addProduct: (state, action: PayloadAction<ProductCartItem>) => {
      const existingIndex = state.products.findIndex((p) => p.id === action.payload.id);
      if (existingIndex >= 0) {
        state.products[existingIndex] = {
          ...state.products[existingIndex],
          weight: action.payload.weight,
          unit: action.payload.unit,
          price: action.payload.price,
          normalPrice: action.payload.normalPrice ?? state.products[existingIndex].normalPrice,
          isUnavailable: false,
        };
      } else {
        state.products.push({ ...action.payload, isUnavailable: false });
      }
    },
    removeProduct: (state, action: PayloadAction<number>) => {
      state.products = state.products.filter((p) => p.id !== action.payload);
    },
    increaseProductWeight: (state, action: PayloadAction<number>) => {
      const product = state.products.find((p) => p.id === action.payload);
      if (product) {
        product.weight = product.unit === "kg"
          ? parseFloat((product.weight + product.step).toFixed(3))
          : Math.round(product.weight + product.step);
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
          product.step = 0.5;
          product.unit = "kg";
        } else {
          product.weight = Math.round(product.weight * 1000);
          product.minimumWeight = Math.round(product.minimumWeight * 1000);
          product.step = product.minimumWeight >= 500 ? 500 : 100;
          product.unit = "g";
        }
      }
    },

    // ─── PACKAGE ACTIONS ───────────────────────────────────────────────────────
    addPackage: (state, action: PayloadAction<PackageCartItem>) => {
      const existingIndex = state.packages.findIndex((p) => p.id === action.payload.id);
      if (existingIndex >= 0) {
        state.packages[existingIndex].quantity += action.payload.quantity;
        state.packages[existingIndex].isUnavailable = false;
      } else {
        state.packages.push({ ...action.payload, isUnavailable: false });
      }
    },
    setPackageQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number }>
    ) => {
      const pkg = state.packages.find((p) => p.id === action.payload.id);
      if (pkg) {
        pkg.quantity = Math.max(1, action.payload.quantity);
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
    },

    // ─── BACKEND SYNC ACTIONS ──────────────────────────────────────────────────
    setCartFromBackend: (
      state,
      action: PayloadAction<{ products: ProductCartItem[]; packages: PackageCartItem[] }>
    ) => {
      state.products = action.payload.products;
      state.packages = action.payload.packages;
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

    clearCart: (state) => {
      state.packages = [];
      state.products = [];
    },
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
} = cartSlice.actions;

export default cartSlice.reducer;
