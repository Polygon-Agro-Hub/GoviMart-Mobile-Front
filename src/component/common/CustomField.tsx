import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

// INPUT FIELD

export const InputField = React.memo(({
    isIconThemeDark,
    icon,
    label,
    value,
    onChangeText,
    onBlur,
    onFocus,
    keyboardType = "default",
    placeholder,
    maxLength,
    error,
    prefix,
    iconBgColor,
    iconColor,
    autoCapitalize,
    secureTextEntry,
}: {
    icon: keyof typeof Ionicons.glyphMap | any;
    isIconThemeDark?: boolean;
    iconBgColor?: string;
    iconColor?: string;
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    keyboardType?: "default" | "phone-pad" | "email-address";
    placeholder?: string;
    maxLength?: number;
    error?: string;
    prefix?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    secureTextEntry?: boolean;
}) => {
    const resolvedBgColor = iconBgColor || (isIconThemeDark === false ? "#F2F2F6" : "#000000");
    const resolvedIconColor = iconColor || (isIconThemeDark === false ? "#000000" : "#FFFFFF");
    return (
        <View
            style={{
                marginBottom: error ? 6 : 12,
            }}
        >
            <View
                style={{
                    height: 67,
                    borderWidth: error ? 1.5 : 1,
                    borderColor: error ? "#FF3B30" : "#D9DEE5",
                    borderRadius: 40,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 11,
                    backgroundColor: "#FFFFFF",
                }}
            >
                {/* Icon */}

                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        backgroundColor: resolvedBgColor,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        solid
                        size={17}
                        color={resolvedIconColor}
                    />
                </View>

                {/* Text */}

                <View
                    style={{
                        flex: 1,
                        marginLeft: 10,
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            color: "#555",
                            lineHeight: 19,
                            marginBottom: 4,
                        }}
                    >
                        {label}
                    </Text>

                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        width: "100%",
                    }}>
                        {prefix && (
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: "#9CA3AF",
                                    fontWeight: "500",
                                    marginRight: 4,
                                }}
                            >
                                {prefix}
                            </Text>
                        )}

                        <TextInput
                            value={value}
                            onChangeText={onChangeText}
                            onBlur={onBlur}
                            onFocus={onFocus}
                            keyboardType={keyboardType}
                            placeholder={placeholder}
                            placeholderTextColor="#9CA3AF"
                            maxLength={maxLength}
                            autoCapitalize={autoCapitalize}
                            secureTextEntry={secureTextEntry}
                            style={{
                                flex: 1,
                                height: 24,
                                paddingVertical: 0,
                                paddingHorizontal: 0,
                                fontSize: 14,
                                color: "#111111",
                                fontWeight: "500",
                                textAlignVertical: "center",
                                includeFontPadding: false,
                            }}
                        />
                    </View>
                </View>
            </View>
            {/* Error Message */}
            {error ? (
                <Text
                    style={{
                        fontSize: 12,
                        color: "#FF3B30",
                        marginTop: 4,
                        marginLeft: 16,
                    }}
                >
                    {error}
                </Text>
            ) : null}
        </View>
    );
});

// DROPDOWN

export const DropdownField = ({
    icon,
    label,
    value,
    open,
    setOpen,
    options,
    onSelect,
    highlighted = false,
    error,
    placeholder = "Select From Here",
}: {
    icon: keyof typeof Ionicons.glyphMap | any;
    label: string;
    value: string;
    open: boolean;
    setOpen: (value: boolean) => void;
    options: string[];
    onSelect: (value: string) => void;
    highlighted?: boolean;
    error?: string;
    placeholder?: string;
}) => {
    return (
        <View
            style={{
                marginBottom: error ? -1 : 12,
                zIndex: open ? 100 : 1,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOpen(!open)}
                style={{
                    height: 67,
                    borderWidth: highlighted ? 2 : 1,
                    borderColor: error ? "#FF3B30" : (highlighted ? "#0788FF" : "#D9DEE5"),
                    borderRadius: 40,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 11,
                    backgroundColor: "#FFFFFF",
                }}
            >
                {/* Icon */}

                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#F2F2F6",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        solid
                        size={17}
                        color="#000000"
                    />
                </View>

                {/* Content */}

                <View
                    style={{
                        flex: 1,
                        marginLeft: 10,
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            color: "#555",
                            lineHeight: 19,
                            marginBottom: 4,
                        }}
                    >
                        {label}
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 18,
                            color: value ? "#111" : "#9CA3AF",
                            fontWeight: value ? "500" : "400",
                        }}
                    >
                        {value || placeholder}
                    </Text>
                </View>

                {/* Arrow */}

                <Ionicons
                    name={
                        open
                            ? "chevron-up"
                            : "chevron-down"
                    }
                    size={19}
                    color="#111"
                />
            </TouchableOpacity>

            {/* Dropdown Options */}

            {open && (
                <View
                    style={{
                        position: "absolute",

                        top: 62,
                        left: 0,
                        right: 0,
                        backgroundColor: "#FFFFFF",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E1E4E8",
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: 7,
                        overflow: "hidden",
                    }}
                >
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.7}
                            onPress={() => {
                                onSelect(option);
                                setOpen(false);
                            }}
                            style={{
                                minHeight: 44,
                                paddingHorizontal: 16,
                                justifyContent: "center",

                                borderBottomWidth: 1,
                                borderBottomColor: "#F1F1F1",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color:
                                        option === value
                                            ? "#000"
                                            : "#555",

                                    fontWeight:
                                        option === value
                                            ? "700"
                                            : "400",
                                }}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {/* Error Message */}
            {error ? (
                <Text
                    style={{
                        fontSize: 12,
                        color: "#FF3B30",
                        marginTop: 4,
                        marginLeft: 16,
                    }}
                >
                    {error}
                </Text>
            ) : null}
        </View>
    );
};