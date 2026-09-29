import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonColor?: string;
  confirmButtonTextColor?: string;
  cancelButtonBgColor?: string;
  cancelButtonTextColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  buttonLayout?: "row" | "column";
  showCloseButton?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmButtonColor = "#DC2626",
  confirmButtonTextColor = "#FFFFFF",
  cancelButtonBgColor,
  cancelButtonTextColor = "#374151",
  iconName = "trash-outline",
  iconColor = "#DC2626",
  iconBgColor = "bg-red-50",
  buttonLayout = "row",
  showCloseButton = true,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-4 py-6">
        <View className="bg-white px-5 py-6 rounded-3xl items-center shadow-2xl w-full max-w-sm relative">
          {/* Top Right Close Button */}
          {showCloseButton && (
            <TouchableOpacity
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-[#F7FAFF] items-center justify-center"
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#000000" />
            </TouchableOpacity>
          )}

          {/* Action icon */}
          <View className={`w-16 h-16 rounded-full ${iconBgColor} items-center justify-center mb-4 mt-2`}>
            <Ionicons name={iconName} size={30} color={iconColor} />
          </View>

          {/* Title */}
          <Text className="font-extrabold text-xl text-black text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-sm text-center text-[#5A5859] leading-relaxed mb-6 px-2">
            {message}
          </Text>

          {/* Action Buttons */}
          {buttonLayout === "column" ? (
            <View style={{ width: "100%", alignSelf: "stretch" }}>
              <TouchableOpacity
                onPress={onConfirm}
                activeOpacity={0.85}
                style={{
                  backgroundColor: confirmButtonColor,
                  width: "100%",
                  alignSelf: "stretch",
                  minHeight: 50,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                className="w-full py-3.5 px-4 rounded-full items-center justify-center mb-3"
              >
                <Text
                  style={{
                    color: confirmButtonTextColor,
                    textAlign: "center",
                    includeFontPadding: false,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                  className="font-bold text-base text-center"
                >
                  {confirmLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.85}
                style={{
                  backgroundColor: cancelButtonBgColor || "#EAEFF5",
                  width: "100%",
                  alignSelf: "stretch",
                  minHeight: 50,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                className="w-full py-3.5 px-4 rounded-full items-center justify-center"
              >
                <Text
                  style={{
                    color: cancelButtonTextColor,
                    textAlign: "center",
                    includeFontPadding: false,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                  className="font-bold text-base text-center"
                >
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%", alignSelf: "stretch" }} className="flex-row w-full justify-between gap-x-3">
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                style={{
                  minHeight: 48,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                className="flex-1 py-3 px-3 border-2 border-gray-200 rounded-full items-center justify-center bg-white"
              >
                <Text
                  style={{ includeFontPadding: false, textAlign: "center" }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                  className="text-gray-700 font-bold text-base text-center"
                >
                  {cancelLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                activeOpacity={0.8}
                style={{
                  backgroundColor: confirmButtonColor,
                  minHeight: 48,
                  shadowColor: confirmButtonColor || "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                className="flex-1 py-3 px-3 rounded-full items-center justify-center"
              >
                <Text
                  style={{
                    color: confirmButtonTextColor,
                    includeFontPadding: false,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                  className="font-bold text-base text-center"
                >
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
