import React from "react";
import { View, Text, Modal, ActivityIndicator } from "react-native";

export const SubmittingModal: React.FC<{ visible: boolean }> = ({ visible }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          paddingVertical: 36,
          paddingHorizontal: 40,
          alignItems: "center",
          minWidth: 220,
        }}
      >
        <ActivityIndicator size="large" color="#000000" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 15,
            fontWeight: "600",
            color: "#000000",
            textAlign: "center",
          }}
        >
          Confirming your order...
        </Text>
      </View>
    </View>
  </Modal>
);

export default SubmittingModal;
