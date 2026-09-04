import React from "react";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

export const PaymentOptionCard = ({
    title,
    description,
    total,
    icon,
    iconColor,
    selected,
    onPress,
}: {
    title: string;
    description: string;
    total: number;
    icon: keyof typeof Ionicons.glyphMap | any;
    iconColor: string;
    selected: boolean;
    onPress: () => void;
}) => {
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={{
               marginHorizontal: 15,
                minHeight: 96,
                borderWidth: 1.5,
                borderColor: selected ? "#FF8A00" : "#E1E7EE",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: selected ? 0.08 : 0.03,
                shadowRadius: 4,
                elevation: selected ? 3 : 1,
            }}
        >
            {/* Radio / Check Circle */}
            <View
                style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    width: 22,
                    height: 22,
                    borderRadius: 90,
                    borderWidth: selected ? 0 : 2,
                    borderColor: "#BAC2C7",
                    backgroundColor: selected ? "#000000" : "#FFFFFF",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {selected && (
                    <Ionicons
                        name="checkmark"
                        size={14}
                        color="#FFFFFF"
                    />
                )}
            </View>

            {/* Content */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                {/* Left Icon (Bigger) */}
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: iconColor,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 14,
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        size={20}
                        color="#FFFFFF"
                    />
                </View>

                {/* Text Details (Bigger) */}
                <View
                    style={{
                        flex: 1,
                        paddingRight: 24,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#111111",
                        }}
                    >
                        {title}
                    </Text>

                    <Text
                        style={{
                            fontSize: 12.5,
                            color: "#64748B",
                            marginTop: 3,
                            lineHeight: 17,
                        }}
                    >
                        {description}
                    </Text>

                    {/* Total Badge */}
                    <View
                        style={{
                            alignSelf: "flex-start",
                            marginTop: 6,
                            backgroundColor: "#F3F4F6",
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#4B5563",
                                fontWeight: "500",
                            }}
                        >
                            Total :{" "}
                            <Text
                                style={{
                                    color: "#111111",
                                    fontWeight: "700",
                                }}
                            >
                                Rs.{" "}
                                {total.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </Text>
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};