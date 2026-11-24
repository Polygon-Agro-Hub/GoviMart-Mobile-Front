export interface Category {
  id: string;
  name: string;
  circleBg: string;
  borderColor: string;
  activeBg: string;
  active: boolean;
}

// Price display types coming from the backend (marketplaceitems.displayType):
// "AP&SP&D" -> Actual Price (struck through) + Sale Price + Discount% badge
// "AP&SP"   -> Actual Price (struck through) + Sale Price, no badge
// "D&AP"    -> Discount% badge + Actual Price (normal price), no struck-through price
export type DisplayType = "AP&SP&D" | "D&AP" | "AP&SP";

export const CATEGORY_IMAGES: Record<string, any> = {
  Packages: require("@/assets/images/home/packages.webp"),
  Vegetables: require("@/assets/images/home/veggies.webp"),
  Fruits: require("@/assets/images/home/fruits.webp"),
  Cereals: require("@/assets/images/home/cereal.webp"),
  Spices: require("@/assets/images/home/spices.webp"),
  Mushrooms: require("@/assets/images/home/mushroom.webp"),
  Pulses: require("@/assets/images/home/pulses.webp"),
};

export const CATEGORIES: Category[] = [
  {
    id: "Packages",
    name: "Packages",
    circleBg: "#FFCCB9",
    borderColor: "#C58B8B",
    activeBg: "#FB4300",
    active: false,
  },
  {
    id: "Vegetables",
    name: "Veggies",
    circleBg: "#F3FFDD",
    borderColor: "#50FF43",
    activeBg: "#92D01B",
    active: true,
  },
  {
    id: "Fruits",
    name: "Fruits",
    circleBg: "#FEE5E4",
    borderColor: "#EA2A3D",
    activeBg: "#EA2A3D",
    active: false,
  },
  {
    id: "Cereals",
    name: "Cereal",
    circleBg: "#FFFBE0",
    borderColor: "#FFCF70",
    activeBg: "#FBA600",
    active: false,
  },
  {
    id: "Spices",
    name: "Spices",
    circleBg: "#FFF0DD",
    borderColor: "#A56021",
    activeBg: "#8C4C17",
    active: false,
  },
  {
    id: "Mushrooms",
    name: "Mushrooms",
    circleBg: "#FFEED9",
    borderColor: "#B47E7F",
    activeBg: "#8D4546",
    active: false,
  },
  {
    id: "Pulses",
    name: "Pulses",
    circleBg: "#FFE3E9",
    borderColor: "#B47E7F",
    activeBg: "#872844",
    active: false,
  },
];