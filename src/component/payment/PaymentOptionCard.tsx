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
    icon: keyof typeof Ionicons.glyphMap| any;
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
            {/* Radio / Check */}

            <View
                style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    width: 22,
                    height: 22,
                    borderRadius: 90,
                    borderWidth: selected ? 0 : 2,
                    borderColor: "#000",

                    backgroundColor: selected
                        ? "#000"
                        : "#FFF",

                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {selected && (
                    <Ionicons
                        name="checkmark"
                        size={11}
                        color="#FFF"
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
                {/* Icon */}

                <View
                    style={{
                        width: 33,
                        height: 33,
                        borderRadius: 99,
                        backgroundColor: iconColor,

                        justifyContent: "center",
                        alignItems: "center",

                        marginRight: 10,
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        size={16}
                        color="#FFF"
                    />
                </View>

                {/* Text */}

                <View
                    style={{
                        flex: 1,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: "#111",
                        }}
                    >
                        {title}
                    </Text>

                    <Text
                        style={{
                            fontSize: 10,
                            color: "#777",
                            marginTop: 5,
                        }}
                    >
                        {description}
                    </Text>

                    {/* Total */}

                    <View
                        style={{
                            alignSelf: "flex-start",
                            marginTop: 5,

                            backgroundColor: "#F2F2F2",

                            borderRadius: 3,

                            paddingHorizontal: 5,
                            paddingVertical: 2,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                color: "#555",
                            }}
                        >
                            Total :{" "}
                            <Text
                                style={{
                                    color: "#111",
                                    fontWeight: "700",
                                }}
                            >
                                Rs.{" "}
                                {total.toLocaleString(
                                    "en-US",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    }
                                )}
                            </Text>
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};