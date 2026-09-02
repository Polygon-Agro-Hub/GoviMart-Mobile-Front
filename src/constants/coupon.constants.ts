/**
 * Coupon Types and Theme Configurations
 * Matches design specifications:
 * - Percentage: Primary/Border #5B18AD, Background #FCFAFD
 * - Fixed Amount: Primary/Border #009D3F, Background #F5FFF8
 * - Free Delivery: Primary/Border #FF8F66, Background #FFF1E5
 */

export type CouponType =
  | "Percentage"
  | "Fixed Amount"
  | "Free Delivery"
  | "Free Delivary";

export interface CouponTheme {
  primary: string;
  background: string;
  border: string;
  badge: string;
  cardBorder: string;
}

export const COUPON_THEMES: Record<string, CouponTheme> = {
  Percentage: {
    primary: "#5B18AD",
    background: "#FCFAFD",
    border: "#5B18AD",
    badge: "#F3E8FF",
    cardBorder: "#D8B4FE",
  },
  "Fixed Amount": {
    primary: "#009D3F",
    background: "#F5FFF8",
    border: "#009D3F",
    badge: "#DCFCE7",
    cardBorder: "#A7F3D0",
  },
  "Free Delivery": {
    primary: "#FF8F66",
    background: "#FFF1E5",
    border: "#FF8F66",
    badge: "#FFEDD5",
    cardBorder: "#FDBA74",
  },
  "Free Delivary": {
    primary: "#FF8F66",
    background: "#FFF1E5",
    border: "#FF8F66",
    badge: "#FFEDD5",
    cardBorder: "#FDBA74",
  },
};

export const getCouponTheme = (type?: string | null): CouponTheme => {
  if (!type) return COUPON_THEMES["Percentage"];
  return COUPON_THEMES[type] || COUPON_THEMES["Percentage"];
};

export interface CouponItem {
  id: number;
  code: string;
  type: CouponType | string;
  percentage: number | null;
  status: string;
  checkLimit: number;
  priceLimit: string | number | null;
  fixDiscount: string | number | null;
  startDate: string;
  endDate: string;
}
