import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";

type DeleteAccountNavigationProp = StackNavigationProp<
    RootStackParamList,
    "DeleteAccount"
>;

interface DeleteAccountProps {
    navigation: DeleteAccountNavigationProp;
}

const DeleteAccount: React.FC<DeleteAccountProps> = ({
    navigation,
}) => {
    const [confirmation, setConfirmation] = useState("");

    const isDeleteEnabled =
        confirmation.toUpperCase() === "DELETE";

    const handleDelete = () => {
        if (!isDeleteEnabled) {
            return;
        }

        Alert.alert(
            "Delete Account",
            "Are you sure you want to permanently delete your account?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        console.log("Delete account");
                    },
                },
            ],
        );
    };

    return (
        <KeyboardAvoidingView
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : "height"
            }
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                }}
            >
                {/* Header */}
                <CustomHeader navigation={navigation} title="Delete Account" showBackButton={true} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 14,
                        paddingBottom: 140,
                    }}
                >
                    {/* Delete Icon */}

                    <View
                        style={{
                            alignItems: "center",
                            marginTop: 0,
                            marginBottom: 25,
                        }}
                    >
                        <View
                            style={{
                                width: 57,
                                height: 57,
                                borderRadius: 999,
                                backgroundColor: "#FFE8E8",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <FontAwesome6
                                name="trash"
                                size={22}
                                color="#FF383C"
                            />
                        </View>
                    </View>

                    {/* Title */}

                    <Text
                        style={{
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#000000",
                            marginBottom: 7,
                        }}
                    >
                        Delete Your Account?
                    </Text>

                    {/* Description */}

                    <Text
                        style={{
                            textAlign: "center",
                            fontSize: 14,
                            lineHeight: 18,
                            fontWeight:"400",
                            color: "#494A65",
                            paddingHorizontal: 8,
                            marginBottom: 18,
                        }}
                    >
                        This action is permanent and cannot be{"\n"}
                        undone. All your data, orders, and account{"\n"}
                        information{" "}
                        <Text
                            style={{
                                color: "#FF3B42",
                            }}
                        >
                            will be permanently deleted.
                        </Text>
                    </Text>

                    {/* What will be deleted */}

                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: "#DDE2E7",
                            borderRadius: 17,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            marginHorizontal: 3,
                        }}
                    >
                        <Text
                            style={{
                                textAlign: "left",
                                fontSize: 14,
                                fontWeight: "700",
                                color: "#00000",
                                marginLeft:10,
                                marginBottom: 9,
                            }}
                        >
                            What will be deleted?
                        </Text>

                        <View>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#494A65",
                                    lineHeight: 22,
                                }}
                            >
                                • Your personal information and profile.
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#494A65",
                                    lineHeight: 22,
                                }}
                            >
                                • All order history and transaction details.
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#494A65",
                                    lineHeight: 22,
                                }}
                            >
                                • Saved addresses and payment methods.
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#494A65",
                                    lineHeight: 22,
                                }}
                            >
                                • Account preferences and settings.
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#494A65",
                                    lineHeight: 22,
                                }}
                            >
                                • Any remaining positive credit balance.
                            </Text>
                        </View>
                    </View>

                    {/* Confirmation Text */}

                    <View
                        style={{
                            alignItems: "center",
                            marginTop: 47,
                            marginBottom: 22,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#111111",
                                textAlign: "center",
                                lineHeight: 19,
                            }}
                        >
                            To confirm account deletion,
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#111111",
                                textAlign: "center",
                                lineHeight: 19,
                            }}
                        >
                            please type{" "}
                            <Text
                                style={{
                                    color: "#FF383C",
                                }}
                            >
                                DELETE
                            </Text>{" "}
                            in the box below.
                        </Text>
                    </View>

                    {/* Confirmation Input */}

                    <View
                        style={{
                            height: 50,
                            borderWidth: 1,
                            borderColor: "#DDE2E7",
                            borderRadius: 999,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 7,
                            marginHorizontal: 0,
                        }}
                    >
                        {/* Lock Icon */}

                        <View
                            style={{
                                width: 27,
                                height: 27,
                                borderRadius: 14,
                                backgroundColor: "#F1F2F4",
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 9,
                            }}
                        >
                            <FontAwesome6
                                name="lock"
                                solid
                                size={13}
                                color="#000000"
                            />
                        </View>

                        {/* Input */}

                        <TextInput
                            value={confirmation}
                            onChangeText={(text) => {
                                setConfirmation(text.toUpperCase());
                            }}
                            placeholder="Type DELETE to confirm"
                            placeholderTextColor="#747990"
                            autoCapitalize="characters"
                            maxLength={6}
                            style={{
                                flex: 1,
                                height: "100%",
                                fontSize: 14,
                                color: "#FF3B42",
                                fontWeight: "500",
                                paddingVertical: 0,
                            }}
                        />

                        {/* Character Count */}

                        <Text
                            style={{
                                fontSize: 12,
                                color: "#7B7F91",
                                marginRight: 7,
                            }}
                        >
                            {confirmation.length}/6
                        </Text>
                    </View>
                </ScrollView>

                {/* Delete Button */}

                <View
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        paddingHorizontal: 14,
                        paddingBottom: 12,
                        paddingTop: 8,
                        backgroundColor: "#FFFFFF",
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={!isDeleteEnabled}
                        onPress={handleDelete}
                        style={{
                            height: 52,
                            borderRadius: 27,
                            backgroundColor: isDeleteEnabled
                                ? "#FF3B42"
                                : "#FF3B42",
                            justifyContent: "center",
                            alignItems: "center",

                            opacity: isDeleteEnabled ? 1 : 0.95,

                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.12,
                            shadowRadius: 4,
                            elevation: 3,
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "700",
                                letterSpacing: 0.2,
                            }}
                        >
                            Delete My Account
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default DeleteAccount;