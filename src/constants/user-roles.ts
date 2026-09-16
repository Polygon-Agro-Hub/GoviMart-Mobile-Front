export const ROLES = {
  RETAIL: "Retail",
  WHOLESALE: "Wholesale",
  ADMIN: "Admin",
} as const;

export type UserRoleType = typeof ROLES[keyof typeof ROLES];
