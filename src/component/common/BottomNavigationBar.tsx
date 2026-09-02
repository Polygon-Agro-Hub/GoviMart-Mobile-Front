import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Feather from '@expo/vector-icons/Feather';

type BottomScreen =
    | "Home"
    | "MyCart"
    | "OrderHistory"
    | "Notification"
    | "Profile";

interface BottomNavigationProps {
    activeScreen: BottomScreen;
    navigation: any;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
    activeScreen, navigation
}) => {
    const isOrdersActive = activeScreen === "OrderHistory" || activeScreen === "MyCart";

    return (
        <View
            style={{
                position: "absolute",
                bottom: Platform.OS === "ios" ? 10 : 24,
                left: 24,
                right: 24,

                height: 64,

                backgroundColor: "#000000",
                borderRadius: 32,

                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",

                paddingHorizontal: 12,

                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 4,
                },
                shadowOpacity: 0.25,
                shadowRadius: 8,

                elevation: 10,

                zIndex: 20,
            }}
        >
            {/* HOME */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate("Home")}
                style={{
                    flexDirection: "row",
                    alignItems: "center",

                    paddingHorizontal:
                        activeScreen === "Home" ? 16 : 10,

                    paddingVertical: 9,

                    borderRadius: 25,

                    backgroundColor:
                        activeScreen === "Home"
                            ? "#FFA07A"
                            : "transparent",
                }}
            >
                <Feather
                    name="home"
                    size={18}
                    color="#FFFFFF"
                />

                {activeScreen === "Home" && (
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "800",
                            marginLeft: 6,
                        }}
                    >
                        Home
                    </Text>
                )}
            </TouchableOpacity>

            {/* ORDERS */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("OrderHistory")}
                style={{
                    flexDirection: "row",
                    alignItems: "center",

                    paddingHorizontal: isOrdersActive ? 16 : 10,

                    paddingVertical: 9,

                    borderRadius: 25,

                    backgroundColor: isOrdersActive ? "#FFA07A" : "transparent",
                }}
            >
                <Ionicons
                    name={isOrdersActive ? "basket" : "basket-outline"}
                    size={22}
                    color="#FFFFFF"
                />
                {isOrdersActive && (
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "800",
                            marginLeft: 6,
                        }}
                    >
                        Orders
                    </Text>
                )}
            </TouchableOpacity>

            {/* NOTIFICATIONS */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Notification")}
                style={{
                    flexDirection: "row",
                    alignItems: "center",

                    paddingHorizontal:
                        activeScreen === "Notification" ? 16 : 10,

                    paddingVertical: 9,

                    borderRadius: 25,

                    backgroundColor:
                        activeScreen === "Notification"
                            ? "#FFA07A"
                            : "transparent",
                }}
            >
                <Ionicons
                    name={
                        activeScreen === "Notification"
                            ? "notifications"
                            : "notifications-outline"
                    }
                    size={22}
                    color="#FFFFFF"
                />
                {activeScreen === "Notification" && (
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "800",
                            marginLeft: 6,
                        }}
                    >
                        Alerts
                    </Text>
                )}
            </TouchableOpacity>

            {/* PROFILE */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Profile")}
                style={{
                    flexDirection: "row",
                    alignItems: "center",

                    paddingHorizontal:
                        activeScreen === "Profile" ? 16 : 10,

                    paddingVertical: 9,

                    borderRadius: 25,

                    backgroundColor:
                        activeScreen === "Profile"
                            ? "#FFA07A"
                            : "transparent",
                }}
            >
                <Ionicons
                    name={
                        activeScreen === "Profile"
                            ? "person"
                            : "person-outline"
                    }
                    size={22}
                    color="#FFFFFF"
                />
                {activeScreen === "Profile" && (
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "800",
                            marginLeft: 6,
                        }}
                    >
                        Profile
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default BottomNavigation;