import React from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  title?: string;
  subtitle?: string;
  description?: string;
  getStartedText?: string;
  continueText?: string;
}

const polygonLeafImage = require("@/assets/images/public/polygon-leaf.png");

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onClose,
  navigation,
  title = "Welcome, Guest!",
  subtitle,
  description,
  getStartedText = "Get Started",
  continueText = "Continue Browsing",
}) => {
  const insets = useSafeAreaInsets();

  const handleRegister = () => {
    onClose();
    navigation.navigate("ChooseAuth");
  };

  const handleLogin = () => {
    onClose();
    navigation.navigate("Login");
  };

  const displayText =
    description ||
    subtitle ||
    "We're excited to have you here! To unlock the best experience, please log in or create a new account.";

  // Safe bottom padding to ensure the continue button is never cut off or cramped on any phone screen
  const safeBottomPadding = Math.max(insets.bottom, 16) + 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingTop: 12,
                paddingBottom: safeBottomPadding,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: -6 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 24,
              }}
            >
              {/* Top Handle / Drag Bar */}
              <View
                style={{
                  width: 44,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#D9DFE8",
                  alignSelf: "center",
                  marginBottom: 8,
                }}
              />

              {/* Close Button ("✕") on top right */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  paddingHorizontal: 20,
                  marginBottom: 4,
                }}
              >
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "#F1F5F9",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Centered Polygon Leaf Emblem */}
              <View
                style={{
                  alignItems: "center",
                  marginTop: 2,
                  marginBottom: 18,
                }}
              >
                <Image
                  source={polygonLeafImage}
                  style={{ width: 62, height: 74 }}
                  resizeMode="contain"
                />
              </View>

              {/* Welcome Text Section */}
              <View
                style={{
                  alignItems: "center",
                  paddingHorizontal: 28,
                  marginBottom: 26,
                }}
              >
                <Text
                  style={{
                    color: "#000000",
                    fontSize: 24,
                    fontWeight: "700",
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  {title}
                </Text>

                <Text
                  style={{
                    fontSize: 13,
                    color: "#494A65",
                    fontWeight: "400",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {displayText}
                </Text>
              </View>

              {/* Action Buttons Section */}
              <View style={{ paddingHorizontal: 24 }}>
                {/* Get Started Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRegister}
                  style={{
                    backgroundColor: "#FF9114",
                    borderRadius: 26,
                    height: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#FF9114",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.28,
                    shadowRadius: 8,
                    elevation: 4,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {getStartedText}
                  </Text>
                </TouchableOpacity>

                {/* Continue Browsing Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={{
                    paddingVertical: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#64748B",
                      fontWeight: "500",
                      fontSize: 13,
                      textDecorationLine: "underline",
                    }}
                  >
                    {continueText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AuthPromptModal;
