import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import CustomHeader from "@/component/common/CustomHeader";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import BottomNavigation from "@/component/common/BottomNavigationBar";

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    time: string;
    date: string;
    group: "Today" | "Yesterday" | "Earlier";
    isRead: boolean;
    actionRequired?: boolean;
}

type NotificationNavigationProp = StackNavigationProp<
    RootStackParamList,
    "Notification"
>;

interface NotificationProps {
    navigation: NotificationNavigationProp;
}
const Notifications: React.FC<NotificationProps> = ({navigation}) => {
    const [notifications, setNotifications] = useState<
        NotificationItem[]
    >([
        {
            id: 1,
            title: "Package Finalization Review",
            message:
                "Please review and finalize your package in #[Invoice No] to proceed the order.",
            time: "8:00 AM",
            date: "Today",
            group: "Today",
            isRead: false,
            actionRequired: true,
        },

        {
            id: 2,
            title: "Order is Out For Delivery",
            message:
                "Your order #[Invoice No.], scheduled for August 8, is now out for delivery. One of our drivers will be assigned to deliver your order shortly.",
            time: "10:30 AM",
            date: "Yesterday",
            group: "Yesterday",
            isRead: false,
        },

        {
            id: 3,
            title: "Order is Ready to Pickup",
            message:
                "Your order #[Invoice No.], scheduled for August 8, is now ready to pickup. Please visit our centre before 9:00 PM today to collect your order.",
            time: "Aug 02, 10:30 AM",
            date: "Earlier",
            group: "Earlier",
            isRead: true,
        },

        {
            id: 4,
            title: "Order Picked up",
            message:
                "Your order #[Invoice No.] has been successfully picked up. We hope you had a great experience with our service.",
            time: "Aug 01, 09:30 AM",
            date: "Earlier",
            group: "Earlier",
            isRead: true,
        },

        {
            id: 5,
            title: "Order Collected by Driver",
            message:
                "Your order #[Invoice No.] has been collected by our driver.",
            time: "Aug 01, 08:30 AM",
            date: "Earlier",
            group: "Earlier",
            isRead: false,
        },

        {
            id: 6,
            title: "Order is On the Way",
            message:
                "Your order #[Invoice No.] is on its way to you. Our driver will deliver your order shortly.",
            time: "Aug 01, 07:30 AM",
            date: "Earlier",
            group: "Earlier",
            isRead: false,
        },

        {
            id: 7,
            title: "Order Delivered",
            message:
                "Your order #[Invoice No.] has been successfully delivered. We hope you're happy with our service and had a great experience.",
            time: "Aug 01, 06:30 AM",
            date: "Earlier",
            group: "Earlier",
            isRead: false,
        },
    ]);

    // MARK NOTIFICATION AS READ
    const handleNotificationPress = (id: number) => {
        setNotifications((previous) =>
            previous.map((notification) =>
                notification.id === id
                    ? {
                        ...notification,
                        isRead: true,
                    }
                    : notification,
            ),
        );

        // Navigate to relevant screen here if required.
        // navigation.navigate(...)
    };

    // GROUP NOTIFICATIONS
    const todayNotifications = useMemo(
        () =>
            notifications.filter(
                (item) => item.group === "Today",
            ),
        [notifications],
    );

    const yesterdayNotifications = useMemo(
        () =>
            notifications.filter(
                (item) => item.group === "Yesterday",
            ),
        [notifications],
    );

    const earlierNotifications = useMemo(
        () =>
            notifications.filter(
                (item) => item.group === "Earlier",
            ),
        [notifications],
    );

    // NOTIFICATION CARD
    const renderNotification = (
        item: NotificationItem,
    ) => {
        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() =>
                    handleNotificationPress(item.id)
                }
                style={{
                    width: "100%",
                    minHeight: 90,

                    backgroundColor: "#FFFFFF",

                    borderWidth: 1,
                    borderColor: "#E2E5E8",

                    borderLeftWidth: 3,
                    borderLeftColor: item.isRead
                        ? "#E2E5E8"
                        : "#FFE000",

                    borderRadius: 18,

                    marginBottom: 12,

                    paddingHorizontal: 12,
                    paddingVertical: 9,

                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.10,
                    shadowRadius: 4,

                    elevation: 2,
                }}
            >

                {/* TOP ROW */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {/* Action Required */}
                    {item.actionRequired ? (
                        <View
                            style={{
                                backgroundColor: "#FFF1F2",
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 9,
                                    color: "#FF4B55",
                                    fontWeight: "500",
                                }}
                            >
                                Action Required
                            </Text>
                        </View>
                    ) : (
                        <View />
                    )}

                    {/* Time */}
                    <Text
                        style={{
                            fontSize: 9.5,
                            color: "#596078",
                        }}
                    >
                        {item.time}
                    </Text>
                </View>

                {/* TITLE */}
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#111111",

                        marginTop: 5,
                        marginBottom: 3,
                    }}
                >
                    {item.title}
                </Text>

                {/* MESSAGE */}
                <Text
                    style={{
                        fontSize: 10,
                        lineHeight: 14,
                        color: "#777B89",
                    }}
                >
                    {item.message}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* HEADER */}
            <CustomHeader title="Notifications" />

            {/* NOTIFICATIONS */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingTop: 0,
                    paddingBottom: 130,
                }}
            >

                {/* TODAY */}
                {todayNotifications.length > 0 && (
                    <View
                        style={{
                            marginBottom: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: "#111111",

                                marginBottom: 8,
                            }}
                        >
                            Today
                        </Text>

                        {todayNotifications.map(
                            renderNotification,
                        )}
                    </View>
                )}

                {/* YESTERDAY */}
                {yesterdayNotifications.length > 0 && (
                    <View
                        style={{
                            marginBottom: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: "#111111",

                                marginBottom: 8,
                            }}
                        >
                            Yesterday
                        </Text>

                        {yesterdayNotifications.map(
                            renderNotification,
                        )}
                    </View>
                )}

                {/* EARLIER */}

                {earlierNotifications.length > 0 && (
                    <View>
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "500",
                                color: "#111111",

                                marginBottom: 8,
                            }}
                        >
                            Earlier
                        </Text>

                        {earlierNotifications.map(
                            renderNotification,
                        )}
                    </View>
                )}
            </ScrollView>
            {/* Floating Bottom Navigation Bar */}
            <BottomNavigation activeScreen="Notification" navigation={navigation}/>
        </View>
    );
};

export default Notifications;