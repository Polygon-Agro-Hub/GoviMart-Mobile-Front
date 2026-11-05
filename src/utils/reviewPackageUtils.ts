import { ReviewProduct, OriginalAlacartEntry } from "@/types/types";
import { AlacartSelectedProduct } from "@/store/packageReviewSlice";

export const formatPrice = (value: number | string) =>
  (Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "YYYY-MM-DD" -> local Date (avoids timezone drift)
export const parseDateOnly = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const addDays = (date: Date, days: number): Date => {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
};

// "16th August"
export const formatScheduleLabel = (d: Date) =>
  `${getOrdinal(d.getDate())} ${d.toLocaleDateString("en-US", {
    month: "long",
  })}`;

// Local YYYY-MM-DD (no UTC conversion)
export const toLocalDateOnly = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Parse a DB value exactly. A real 0 stays 0 (no `|| 50` style fallbacks).
export const num = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const toKg = (a: number, u: string) => (u === "kg" ? a : a / 1000);

export const formatWeightDisplay = (
  display?: string,
  amount?: number,
  unit?: string,
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

// Store price is PER KG (needed for the stepper and totals).
// The card SHOWS the line price = price x quantity, which equals
// definepackageitems.price at the define quantity (e.g. Ginger 120/kg x 0.5 = 60).
export const toDisplayProduct = (p: ReviewProduct): ReviewProduct => ({
  ...p,
  price: Number(((p.price || 0) * (p.quantity || 0)).toFixed(2)),
  originalProduct: p.originalProduct
    ? {
      ...p.originalProduct,
      price: Number(
        (
          (p.originalProduct.price || 0) * (p.originalProduct.quantity || 0)
        ).toFixed(2),
      ),
    }
    : undefined,
});

export const buildReplacementsPayload = (
  packageProducts: Record<string, ReviewProduct[]>,
  orderPackageDbIds: Record<string, number>,
  productTemplatesState: Record<string, ReviewProduct[]>,
) => {
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

  return replacements;
};

export const buildAdditionalItemsPayload = (
  alacartSelection: Record<string | number, AlacartSelectedProduct>,
) => {
  return Object.values(alacartSelection)
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
};

export const buildUpdatedAdditionalItemsPayload = (
  alacartSelection: Record<string | number, AlacartSelectedProduct>,
  originalAlacartMap: Record<number, OriginalAlacartEntry>,
  isItemUnavailable: (item: any) => boolean,
) => {
  return Object.values(alacartSelection)
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
};

export const buildPackagesPayload = (
  packageProducts: Record<string, ReviewProduct[]>,
  orderPackageDbIds: Record<string, number>,
) => {
  return Object.entries(packageProducts).map(([pkgKey, prods]) => ({
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
  }));
};

export interface BuildConfirmPayloadParams {
  orderId: string | number;
  processOrderId?: string | number | null;
  packageProducts: Record<string, ReviewProduct[]>;
  orderPackageDbIds: Record<string, number>;
  productTemplatesState: Record<string, ReviewProduct[]>;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  originalAlacartMap: Record<number, OriginalAlacartEntry>;
  deletedAdditionalItemIds?: number[];
  isItemUnavailable: (item: any) => boolean;
  additionalDue: number;
  newScheduleDate?: string;
  paymentMethod?: string;
  isPaid?: boolean | number;
  overrideIsPaid?: boolean | number;
  finalOrderTotalWithDelivery: number;
  totalDiff: number;
}

export const buildConfirmPayload = ({
  orderId,
  processOrderId,
  packageProducts,
  orderPackageDbIds,
  productTemplatesState,
  alacartSelection,
  originalAlacartMap,
  deletedAdditionalItemIds,
  isItemUnavailable,
  additionalDue,
  newScheduleDate,
  paymentMethod,
  isPaid,
  overrideIsPaid,
  finalOrderTotalWithDelivery,
  totalDiff,
}: BuildConfirmPayloadParams) => {
  const replacements = buildReplacementsPayload(
    packageProducts,
    orderPackageDbIds,
    productTemplatesState,
  );

  const additionalItemsPayload = buildAdditionalItemsPayload(alacartSelection);

  const updatedAdditionalItemsPayload = buildUpdatedAdditionalItemsPayload(
    alacartSelection,
    originalAlacartMap,
    isItemUnavailable,
  );

  const packagesPayload = buildPackagesPayload(
    packageProducts,
    orderPackageDbIds,
  );

  const netDiff = totalDiff;
  const netRefundSavings =
    Boolean(isPaid) && netDiff < 0 && additionalDue < 0.01
      ? Number(Math.abs(netDiff).toFixed(2))
      : 0;

  const resolvedIsPaidPayload =
    overrideIsPaid !== undefined ? (overrideIsPaid ? 1 : 0) : isPaid ? 1 : 0;

  return {
    orderId,
    processOrderId: processOrderId || undefined,
    lockNow: true,
    additionalAmount: additionalDue > 0 ? additionalDue : 0,
    newScheduleDate,
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
