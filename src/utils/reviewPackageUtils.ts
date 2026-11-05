import { ReviewProduct } from "@/types/types";

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
