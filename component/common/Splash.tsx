import React, { useEffect } from "react";
import { View, Image, StatusBar, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";

const logo = require("@/assets/images/public/govimart-logo.png");

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

const Splash: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Home");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View className="items-center">
        <Image source={logo} className="w-96 h-full" resizeMode="contain" />
      </View>
      <View className="absolute bottom-6 left-0 right-0 items-center">
        <Text className="text-base text-black opacity-60 font-normal tracking-widest">
          Powered By Polygon
        </Text>
      </View>
    </View>
  );
};

export default Splash;