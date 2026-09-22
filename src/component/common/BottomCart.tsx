import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

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

    const isFirstRender = React.useRef(true);

    useEffect(() => {
        setIsAdded(initialIsAdded);
        setHasChanges(false);
    }, [initialIsAdded]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isAdded) {
            setHasChanges(true);
        }
    }, [unit]);

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

    const isMinimum = quantity <= minimumValue;

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
                paddingHorizontal: 16,
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
            {/* Quantity Stepper Capsule with #F3F3F3 background */}
            <View
                style={{
                    flex: isAdded ? 1 : undefined,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#F3F3F3",
                    borderRadius: 28,
                    padding: 4,
                    marginRight: isAdded ? 14 : 12,
                }}
            >
                {/* Left Button:
                    - quantity > minimum  → active dark minus button
                    - quantity <= minimum, added      → dark active trash (removes from cart)
                    - quantity <= minimum, not added → gray disabled trash */}
                {!isMinimum ? (
                    <TouchableOpacity
                        onPress={decrease}
                        activeOpacity={0.8}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: "#000",
                            justifyContent: "center",
                            alignItems: "center",

                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 3,
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
                        activeOpacity={0.8}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: "#000",
                            justifyContent: "center",
                            alignItems: "center",

                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 3,
                        }}
                    >
                        <FontAwesome6
                            name="trash"
                            size={18}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                ) : (
                    <View
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: "#D9D9D9",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome6
                            name="trash"
                            size={18}
                            color="#FFF"
                        />
                    </View>
                )}

                {/* Quantity Text */}
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "700",
                        paddingHorizontal: 12,
                        minWidth: 60,
                        textAlign: "center",
                        color: "#000",
                    }}
                >
                    {quantity}
                    {unit ? ` ${unit}` : ""}
                </Text>

                {/* Plus Button */}
                <TouchableOpacity
                    onPress={increase}
                    activeOpacity={0.8}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "#000",
                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 3,
                    }}
                >
                    <Ionicons
                        name="add"
                        size={24}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>

            {/* Right Action Button */}
            {!isAdded ? (
                <TouchableOpacity
                    onPress={handleAdd}
                    activeOpacity={0.8}
                    style={{
                        flex: 1,
                        height: 52,
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
                <TouchableOpacity
                    disabled={!hasChanges}
                    onPress={handleUpdate}
                    activeOpacity={0.8}
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
                        size={26}
                        color="#FFF"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default ProductBottomCart;