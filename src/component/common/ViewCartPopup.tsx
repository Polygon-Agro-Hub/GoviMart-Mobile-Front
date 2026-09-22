import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  itemCount: number;
  onPress?: () => void;
}

const ViewCartPopup = ({ visible, itemCount, onPress }: Props) => {
  if (!visible) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        position: "absolute",
        bottom: 96,
        alignSelf: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      {/* Black Section */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "black",
          borderRadius: 999,
          opacity: 0.9,
          paddingHorizontal: 16,
          paddingVertical: 12,
          width: 160,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            marginLeft: 10,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            View Cart
          </Text>

          <Text
            style={{
              color: "#D1D5DB",
              fontSize: 11.5,
              marginTop: 1,
            }}
          >
            {itemCount} Item{itemCount > 1 ? "s" : ""}
          </Text>
        </View>
        {/* White Circle */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#FFF",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: 12,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 5,
            shadowOffset: {
              width: 0,
              height: 2,
            },
            elevation: 8,
          }}
        >
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ViewCartPopup;
