import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Feather from '@expo/vector-icons/Feather';
import notificationService from "@/services/notification/notification.service";
import socketService from "@/services/socket/socket.service";
import pushNotificationService from "@/services/notification/pushNotification.service";

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
    activeScreen,
    navigation,
}) => {
    const isOrdersActive = activeScreen === "OrderHistory" || activeScreen === "MyCart";
    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        // Fetch unread count
        let isMounted = true;
        notificationService
            .getNotifications(1, 0)
            .then((res) => {
                if (isMounted && res.data?.status) {
                    setUnreadCount(Number(res.data?.unreadCount) || 0);
                }
            })
            .catch(() => {});

        // Listen for real-time notification socket updates
        socketService.connect();
        const unsubscribeNotif = socketService.onNewNotification((item) => {
            if (isMounted) {
                if (typeof (item as any)?.unreadCount === "number") {
                    setUnreadCount((item as any).unreadCount);
                } else {
                    setUnreadCount((prev) => prev + 1);
                }
            }
        });

        const unsubscribeCount = socketService.onUnreadCountUpdate((count) => {
            if (isMounted) {
                setUnreadCount(count);
            }
        });

        return () => {
            isMounted = false;
            unsubscribeNotif();
            unsubscribeCount();
        };
    }, [activeScreen]);

    return (
        <View
            style={{
                position: "absolute",
                bottom: Platform.OS === "ios" ? 10 : 18,
                left: 24, // mx-6
                right: 24, // mx-6

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

            {/* NOTIFICATIONS / ALERTS */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={async () => {
                    if (activeScreen === "Notification") return;
                    try {
                        const hasPerm = await pushNotificationService.hasPermission();
                        if (hasPerm) {
                            navigation.navigate("Notification");
                        } else {
                            navigation.navigate("NotificationAccess", {
                                returnScreen: "Notification",
                            });
                        }
                    } catch (e) {
                        navigation.navigate("Notification");
                    }
                }}
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
                <View style={{ position: "relative" }}>
                    <Ionicons
                        name={
                            activeScreen === "Notification"
                                ? "notifications"
                                : "notifications-outline"
                        }
                        size={22}
                        color="#FFFFFF"
                    />
                    {unreadCount > 0 && (
                        <View
                            style={{
                                position: "absolute",
                                top: -5,
                                right: -7,
                                backgroundColor:
                                    activeScreen === "Notification"
                                        ? "#FFFFFF"
                                        : "#FFFFFF",
                                minWidth: 15,
                                height: 15,
                                borderRadius: 7.5,
                                paddingHorizontal: 3,
                                alignItems: "center",
                                justifyContent: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.15,
                                shadowRadius: 2,
                                elevation: 3,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#000000",
                                    fontSize: 8.5,
                                    fontWeight: "900",
                                    textAlign: "center",
                                    lineHeight: 11,
                                }}
                            >
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
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
                        Account
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default BottomNavigation;