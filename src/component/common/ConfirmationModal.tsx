import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
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
      <View className="flex-1 bg-black/60 justify-center items-center p-6">
        <View className="bg-white p-6 rounded-3xl items-center shadow-2xl w-full max-w-sm relative">
          {/* Top Right Close Button */}
          <TouchableOpacity
            className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-[#F7FAFF] items-center justify-center"
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#000000" />
          </TouchableOpacity>

          {/* Red warning icon */}
          <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4 mt-2">
            <Ionicons name="trash-outline" size={30} color="#DC2626" />
          </View>

          {/* Title */}
          <Text className="font-extrabold text-xl text-black text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-sm text-center text-[#5A5859] leading-relaxed mb-6 px-2">
            {message}
          </Text>

          {/* Action Button Row */}
          <View className="flex-row w-full justify-between gap-x-3">
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              className="flex-1 py-3.5 border-2 border-gray-200 rounded-full items-center justify-center bg-white"
            >
              <Text className="text-gray-700 font-bold text-base">{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.8}
              className="flex-1 py-3.5 bg-[#DC2626] rounded-full items-center justify-center"
            >
              <Text className="text-white font-bold text-base">{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
