import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

interface BackConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const BackConfirmationModal: React.FC<BackConfirmationModalProps> = ({
  visible,
  title = "Are you sure you want to go back?",
  message = "Going back will cause you to lose all your checkout and payment details.\nAre you sure you want to go back?",
  confirmLabel = "Yes, Go Back",
  cancelLabel = "No, Stay on the page",
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Warning Icon Badge */}
          <View style={styles.iconCircle}>
            <FontAwesome6
              name="triangle-exclamation"
              size={24}
              color="#DC2626"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Button: Confirm (Yes, Go Back) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onConfirm}
            style={styles.confirmButton}
          >
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>

          {/* Button: Cancel (No, Stay on the page) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FBE7E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#101828",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475467",
    textAlign: "center",
    marginBottom: 26,
    paddingHorizontal: 6,
  },
  confirmButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EBF0F5",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BackConfirmationModal;
