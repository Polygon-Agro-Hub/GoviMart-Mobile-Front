import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  title?: string;
  subtitle?: string;
}

const { width } = Dimensions.get("window");

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onClose,
  navigation,
  title = "Sign In to Continue",
  subtitle = "Please sign in or create an account to add items to your cart and proceed with your order.",
}) => {
  const handleSignIn = () => {
    onClose();
    navigation.navigate("Login");
  };

  const handleSignUp = () => {
    onClose();
    navigation.navigate("DeliveryLocation");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 36,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 20,
              }}
            >
              {/* Top Handle Bar */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#E2E8F0",
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              />

              {/* Top Close Button */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginBottom: 6,
                }}
              >
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#F1F5F9",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="close" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {/* Centered Graphic Badge */}
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#FFF3E0",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={32}
                    color="#FF9114"
                  />
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: "#0F172A",
                    textAlign: "center",
                    marginBottom: 6,
                  }}
                >
                  {title}
                </Text>

                {/* Subtitle */}
                <Text
                  style={{
                    fontSize: 13,
                    color: "#64748B",
                    textAlign: "center",
                    lineHeight: 19,
                    paddingHorizontal: 12,
                  }}
                >
                  {subtitle}
                </Text>
              </View>

              {/* Mini Highlights */}
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginBottom: 20,
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}
              >
                <View style={{ alignItems: "center", flexDirection: "row" }}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color="#10B981"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}
                  >
                    Secure
                  </Text>
                </View>
                <View style={{ alignItems: "center", flexDirection: "row" }}>
                  <Ionicons
                    name="flash"
                    size={16}
                    color="#F59E0B"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}
                  >
                    Fast Delivery
                  </Text>
                </View>
                <View style={{ alignItems: "center", flexDirection: "row" }}>
                  <Ionicons
                    name="pricetag"
                    size={16}
                    color="#6366F1"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}
                  >
                    Best Deals
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 10 }}>
                {/* Sign In Button (Orange) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSignIn}
                  style={{
                    backgroundColor: "#FF9114",
                    borderRadius: 28,
                    height: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#FF9114",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Button (Black) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSignUp}
                  style={{
                    backgroundColor: "#000000",
                    borderRadius: 28,
                    height: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Create an Account
                  </Text>
                </TouchableOpacity>

                {/* Maybe Later Link */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={{
                    paddingVertical: 8,
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <Text
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Continue Browsing
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
