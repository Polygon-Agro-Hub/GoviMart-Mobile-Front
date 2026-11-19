import { Category } from "@/types/types";

export const CATEGORY_IMAGES: Record<string, any> = {
  Vegetables: require("@/assets/images/home/veggies.webp"),
  Fruits: require("@/assets/images/home/fruits.webp"),
  Cereals: require("@/assets/images/home/cereal.webp"),
  Spices: require("@/assets/images/home/spices.webp"),
  Mushrooms: require("@/assets/images/home/mushroom.webp"),
  Pulses: require("@/assets/images/home/pulses.webp"),
};

export const CATEGORIES: Category[] = [
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

export const getPackageImage = (pkgId: string, image?: any) => {
  if (image) {
    if (typeof image === "string") return { uri: image };
    return image;
  }
  if (pkgId === "fruity") return require("@/assets/images/home/fruits.webp");
  if (pkgId === "veggie") return require("@/assets/images/home/veggies.webp");
  return require("@/assets/images/home/packages.webp");
};

