import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  message: string;
}

const CartToast = ({ visible, message }: Props) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 48,
        alignSelf: "center",
        zIndex: 999,

        backgroundColor: "#2D2D2D",

        borderRadius: 999,

        paddingHorizontal: 10,
        paddingVertical: 5,

        flexDirection: "row",
        alignItems: "center",

        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 5,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        elevation: 6,
      }}
    >
      <Ionicons
        name="checkmark-circle"
        color="#FFF"
        size={15}
      />

      <Text
        style={{
          color: "#FFF",
          marginLeft: 8,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {message}
      </Text>
    </View>
  );
};

export default CartToast;