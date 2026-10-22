export const TITLES = ["Mr", "Mrs", "Ms", "Rev"] as const;

export type UserTitle = (typeof TITLES)[number];