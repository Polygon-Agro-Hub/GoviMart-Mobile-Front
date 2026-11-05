import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { PriceRow } from "../common/PriceRow";
import { formatPrice } from "../../../utils/reviewPackageUtils";

interface FloatingAlacartBarProps {
  newlyAddedAlacartTotal: number;
  currentStepIndex: number;
  onContinue: () => void;
}

const FloatingAlacartBar: React.FC<FloatingAlacartBarProps> = ({
  newlyAddedAlacartTotal,
  currentStepIndex,
  onContinue,
}) => {
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: Platform.OS === "ios" ? 34 : 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -3 },
        elevation: 15,
      }}
    >
      <PriceRow
        label="For Ala Carte Items"
        value={`Rs. ${formatPrice(newlyAddedAlacartTotal)}`}
        strong
        big
        marginBottom={20}
      />

      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.85}
        style={{
          height: 54,
          backgroundColor: "#000000",
          borderRadius: 30,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
          Confirm & Continue ({currentStepIndex + 1})
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(FloatingAlacartBar);

