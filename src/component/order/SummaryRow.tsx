import { FontAwesome6 } from "@expo/vector-icons";
import { Text, View } from "react-native";


export const SummaryRow = ({
    label,
    value,
    bold = false,
    iconColor,
    icon
}: {
    label: string;
    value: string;
    bold?: boolean;
    iconColor?: string,
    icon?: any
}) => {
    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
            }}
        >
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                {/* Icon */}

                {icon &&
                    <FontAwesome6
                        name={icon}
                        size={16}
                        color={iconColor}
                    />
                }
                <Text
                    style={{
                        fontSize: 14,
                        color: "#00000",
                        fontWeight: bold ? "600" : "400",
                    }}
                >
                    {label}
                </Text>
            </View>

            <Text
                style={{
                    fontSize: 14,
                    color: "#00000",
                    fontWeight: bold ? "600" : "500",
                }}
            >
                {value}
            </Text>
        </View>
    );
};