import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import productService from "@/services/product/product.service";
import {
  toggleAlacartProduct as toggleAlacartProductAction,
  removeAlacartItem as removeAlacartItemAction,
  toggleAlacartItemUnit as toggleAlacartItemUnitAction,
  updateAlacartItemQuantity as updateAlacartItemQuantityAction,
} from "@/store/packageReviewSlice";
import { ProductType, OriginalAlacartEntry } from "@/types/types";

export const useReviewAlacart = () => {
  const dispatch = useDispatch();

  const [selectedAlaCartCategory, setSelectedAlaCartCategory] =
    useState<string>("Vegetables");
  const [alaCartProducts, setAlaCartProducts] = useState<ProductType[]>([]);
  const [loadingAlaCartProducts, setLoadingAlaCartProducts] =
    useState<boolean>(false);
  const [disabledAlacartProductIds, setDisabledAlacartProductIds] = useState<
    Set<string>
  >(new Set());
  const [originalAlacartTotal, setOriginalAlacartTotal] = useState<number>(0);
  const [originalAlacartMap, setOriginalAlacartMap] = useState<
    Record<number, OriginalAlacartEntry>
  >({});
  const [alacartNormalPriceMap, setAlacartNormalPriceMap] = useState<
    Record<string, number>
  >({});
  const [alacartSavedPriceMap, setAlacartSavedPriceMap] = useState<
    Record<string, number>
  >({});

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

  return {
    selectedAlaCartCategory,
    setSelectedAlaCartCategory,
    alaCartProducts,
    setAlaCartProducts,
    loadingAlaCartProducts,
    setLoadingAlaCartProducts,
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
  };
};

export default useReviewAlacart;
