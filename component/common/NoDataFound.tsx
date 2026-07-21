import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface NoDataFoundProps {
  message?: string;
  containerStyle?: object;
}

const NoDataFound: React.FC<NoDataFoundProps> = ({
  message = "No Data Found",
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="search-outline" size={80} color="#6C3CD1" />
      <View style={styles.textWrapper}>
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  textWrapper: {
    marginTop: 15,
    backgroundColor: "transparent",
  },
  messageText: {
    color: "#888888",
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default NoDataFound;
