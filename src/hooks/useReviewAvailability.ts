import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import socketService from "@/services/socket/socket.service";
import productService from "@/services/product/product.service";
import orderService from "@/services/order/order.service";
import { setPackingSlots, PackageMeta, AlacartSelectedProduct } from "@/store/packageReviewSlice";
import { FlowStep, ProductType, ScreenMode } from "@/types/types";

interface UseReviewAvailabilityProps {
  effectiveOrderId: string | number;
  processOrderId?: string | number | null;
  rawScheduleDate?: string | null;
  mode: ScreenMode;
  currentStep: FlowStep;
  selectedAlaCartCategory: string;
  alaCartProducts: ProductType[];
  packagesMeta: PackageMeta[];
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  setAlaCartProducts: (products: ProductType[]) => void;
  setReminderCount: (count: number) => void;
  setDisabledAlacartProductIds: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
}

export const useReviewAvailability = ({
  effectiveOrderId,
  processOrderId,
  rawScheduleDate,
  mode,
  currentStep,
  selectedAlaCartCategory,
  alaCartProducts,
  packagesMeta,
  alacartSelection,
  setAlaCartProducts,
  setReminderCount,
  setDisabledAlacartProductIds,
}: UseReviewAvailabilityProps) => {
  const dispatch = useDispatch();

  const [unavailablePackageIds, setUnavailablePackageIds] = useState<
    Record<string, boolean>
  >({});

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
  }, [mode, currentStep, selectedAlaCartCategory, checkAllAvailability, setAlaCartProducts]);

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
    }, [dispatch, rawScheduleDate, processOrderId, effectiveOrderId, setReminderCount]),
  );

  return {
    unavailablePackageIds,
    setUnavailablePackageIds,
    checkAllAvailability,
  };
};

export default useReviewAvailability;
