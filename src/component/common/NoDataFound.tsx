import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

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
     <LottieView
        source={require("@/assets/json/public/no-data.json")}
        style={{ width: 150, height: 150 }}
        autoPlay
        loop
      />
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
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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
