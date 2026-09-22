import React from "react";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

const ProfileMenuItem = ({
    icon,
    title,
    onPress,
    danger = false,
}: {
    icon: keyof typeof Ionicons.glyphMap | any;
    title: string;
    onPress?: () => void;
    danger?: boolean;
}) => {

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
                height: 58,
                backgroundColor: "#FFFFFF",
                borderRadius: 30,

                flexDirection: "row",
                alignItems: "center",

                paddingHorizontal: 10,

                borderWidth: 1,
                borderColor: "#E5E7EB",

                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.08,
                shadowRadius: 4,

                elevation: 2,

                marginBottom: 14,
            }}
        >
            {/* Icon Circle */}

            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,

                    backgroundColor: danger
                        ? "#FF3B43"
                        : "#000000",

                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <FontAwesome6
                    solid
                    name={icon}
                    size={20}
                    color="#FFFFFF"
                />
            </View>

            {/* Title */}

            <Text
                style={{
                    flex: 1,
                    marginLeft: 14,

                    fontSize: 15,
                    fontWeight: "600",

                    color: danger
                        ? "#FF3B43"
                        : "#111111",
                }}
            >
                {title}
            </Text>

            {/* Arrow */}

            <Ionicons
                name="chevron-forward"
                size={22}
                color={
                    danger
                        ? "#FF3B43"
                        : "#111111"
                }
            />
        </TouchableOpacity>
    );
};

export default ProfileMenuItem;