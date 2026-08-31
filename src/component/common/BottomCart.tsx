import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
    minimumValue: number;
    quantity: number;
    unit?: any;
    step?: number;
    initialIsAdded?: boolean;
    onIncrease: () => void;
    onDecrease: () => void;

    onAddToCart: () => Promise<void> | void;
    onUpdateCart: () => Promise<void> | void;
    onRemoveFromCart: () => Promise<void> | void;

    // onViewCart: () => void;
}

const ProductBottomCart: React.FC<Props> = ({
    minimumValue,
    quantity,
    unit,
    step,
    initialIsAdded = false,
    onIncrease,
    onDecrease,
    onAddToCart,
    onUpdateCart,
    onRemoveFromCart,
    // onViewCart,
}) => {
    const [isAdded, setIsAdded] = useState(initialIsAdded);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setIsAdded(initialIsAdded);
    }, [initialIsAdded]);

    const increase = () => {
        onIncrease();
        if (isAdded) {
            setHasChanges(true);
        }
    };
    const stepValue = step ?? 1;

    const decrease = () => {
        onDecrease();
        if (isAdded) {
            setHasChanges(true);
        }
    };

    const handleAdd = async () => {
        await onAddToCart();

        setIsAdded(true);
        setHasChanges(false);
    };

    const handleUpdate = async () => {
        await onUpdateCart();

        setHasChanges(false);
    };

    const handleDelete = async () => {
        await onRemoveFromCart();

        setIsAdded(false);
        setHasChanges(false);
    };

    return (
        <View
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 88,
                backgroundColor: "#FFF",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                borderTopWidth: 1,
                borderTopColor: "#ECECEC",

                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: {
                    width: 0,
                    height: -3,
                },
                elevation: 12,
            }}
        >
            {/* Left Button:
                - quantity > minimum  → active dark minus button (always, even before adding to cart)
                - quantity <= minimum, not added → gray disabled trash (nothing to delete)
                - quantity <= minimum, added      → dark active trash (removes from cart) */}
            {quantity > minimumValue ? (
                <TouchableOpacity
                    onPress={decrease}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#000",
                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                    }}
                >
                    <Ionicons
                        name="remove"
                        size={24}
                        color="#FFF"
                    />
                </TouchableOpacity>
            ) : isAdded ? (
                <TouchableOpacity
                    onPress={handleDelete}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#000",
                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                    }}
                >
                    <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#FFF"
                    />
                </TouchableOpacity>
            ) : (
                <View
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#F3F3F3",
                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Ionicons
                        name="trash-outline"
                        size={24}
                        color="#CFCFCF"
                    />
                </View>
            )}

            {/* Quantity */}
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "700",
                    marginHorizontal: 12,
                    minWidth: 70,
                    textAlign: "center",
                    color: "#000",
                }}
            >
                {quantity}
                {unit ? ` ${unit}` : ""}
            </Text>

            {/* Plus */}
            <TouchableOpacity
                onPress={increase}
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#000",
                    justifyContent: "center",
                    alignItems: "center",

                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                }}
            >
                <Ionicons
                    name="add"
                    size={24}
                    color="#FFF"
                />
            </TouchableOpacity>

            {/* Right Button */}
            {!isAdded ? (
                <TouchableOpacity
                    onPress={handleAdd}
                    style={{
                        flex: 1,
                        height: 52,
                        marginLeft: 16,
                        backgroundColor: "#000",
                        borderRadius: 28,
                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFF",
                            fontSize: 17,
                            fontWeight: "700",
                        }}
                    >
                        Add to Cart
                    </Text>
                </TouchableOpacity>
            ) : (
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <TouchableOpacity
                        disabled={!hasChanges}
                        onPress={handleUpdate}
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: hasChanges ? "#000" : "#D9D9D9",

                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Ionicons
                            name="checkmark"
                            size={24}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default ProductBottomCart;