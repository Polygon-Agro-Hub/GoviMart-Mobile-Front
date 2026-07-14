import React from "react";
import { View, Text, StyleSheet, Image, StatusBar } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";

const logo = require("@/assets/images/public/govimart-logo.png");

type HomeNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeProps {
  navigation: HomeNavigationProp;
}

const Home: React.FC<HomeProps> = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Govi Mart</Text>
      <Text style={styles.subtitle}>Your Digital Farmer Marketplace</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333333",
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
});

export default Home;
