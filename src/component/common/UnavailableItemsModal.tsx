import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

interface UnavailableItemsModalProps {
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void;
}

const UnavailableItemsModal: React.FC<UnavailableItemsModalProps> = ({
  visible,
  onClose,
  onViewCart,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
          <Text style={styles.title}>Payment cannot be completed</Text>

          {/* Message */}
          <Text style={styles.message}>
            One or more items in your cart are no longer available to order.
            Please review your cart to continue.
          </Text>

          {/* Button: View my cart */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onViewCart}
            style={styles.button}
          >
            <Text style={styles.buttonText}>View my cart</Text>
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
    borderRadius: 36,
    backgroundColor: "#FBE7E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
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
    paddingHorizontal: 8,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default UnavailableItemsModal;
