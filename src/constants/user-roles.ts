export const ROLES = {
  RETAIL: "Retail",
  WHOLESALE: "Wholesale",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
export type UserRoleType = typeof ROLES[keyof typeof ROLES];
