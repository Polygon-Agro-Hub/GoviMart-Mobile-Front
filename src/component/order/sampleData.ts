interface PackageItem {
    itemName: string;
    quantity: string;
    image: string;
}

interface Package {
    id: number;
    name: string;
    quantity: number;
    price: number;
    items: PackageItem[];
}
interface CartItem {
    id: number;
    name: string;
    quantity: string;
    price: number;
    image: string;
    oldPrice?: number;
}
export const packages: Package[] = [
    {
        id: 1,
        name: "Healthy Pack",
        quantity: 2,
        price: 1000,
        items: [
            {
                itemName: "Beetroot",
                quantity: "2 kg",
                image:
                    "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=200",
            },
            {
                itemName: "Dragon Fruit",
                quantity: "0.5 kg",
                image:
                    "https://images.unsplash.com/photo-1527325678964-54921661f888?w=200",
            },
            {
                itemName: "Strawberry",
                quantity: "0.5 kg",
                image:
                    "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200",
            },
            {
                itemName: "Lemon",
                quantity: "2 kg",
                image:
                    "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200",
            },
        ],
    },
    {
        id: 2,
        name: "Veggie Pack",
        quantity: 1,
        price: 1000,
        items: [
            {
                itemName: "Beetroot",
                quantity: "2 kg",
                image:
                    "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=200",
            },
            {
                itemName: "Lemon",
                quantity: "0.5 kg",
                image:
                    "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200",
            },
        ],
    },
];

export const cartItems: CartItem[] = [
    {
        id: 1,
        name: "Lemon",
        quantity: "500 g",
        price: 100,
        image:
            "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200",
    },
    {
        id: 2,
        name: "Strawberry",
        quantity: "2 kg",
        price: 2000,
        oldPrice: 2100,
        image:
            "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200",
    },
];