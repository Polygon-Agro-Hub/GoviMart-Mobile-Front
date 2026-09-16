import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import CustomHeader from "@/component/common/CustomHeader";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import notificationService, {
    ServerNotificationItem,
} from "@/services/notification/notification.service";
import socketService from "@/services/socket/socket.service";
import {
    isActionRequiredNotification,
    renderBoldInvoiceMessage,
} from "@/constants/notificationTemplates";
import { Ionicons } from "@expo/vector-icons";

export interface UiNotificationItem {
    id: number;
    processOrderId?: number;
    orderId?: number;
    invNo?: string;
    title: string;
    message: string;
    time: string;
    group: "Today" | "Yesterday" | "Earlier";
    isRead: boolean;
    actionRequired: boolean;
    createdAt: string;
}

type NotificationNavigationProp = StackNavigationProp<
    RootStackParamList,
    "Notification"
>;

interface NotificationProps {
    navigation: NotificationNavigationProp;
}

const getNotificationGroup = (dateStr?: string): "Today" | "Yesterday" | "Earlier" => {
    if (!dateStr) return "Today";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Today";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate.getTime() === today.getTime()) {
        return "Today";
    } else if (targetDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
    } else {
        return "Earlier";
    }
};

const formatNotificationTime = (dateStr?: string, group?: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    if (group === "Earlier") {
        const datePart = date.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
        });
        return `${datePart}, ${timeStr}`;
    }

    return timeStr;
};

const mapServerItemToUi = (item: ServerNotificationItem): UiNotificationItem => {
    const group = getNotificationGroup(item.createdAt);
    const time = formatNotificationTime(item.createdAt, group);
    const isReadBool = Number(item.isRead) === 1 || Boolean(item.isRead);
    const actionRequired = isActionRequiredNotification(item.title);

    return {
        id: item.id,
        processOrderId: item.processOrderId,
        orderId: item.orderId,
        invNo: item.invNo,
        title: item.title,
        message: item.message,
        time,
        group,
        isRead: isReadBool,
        actionRequired,
        createdAt: item.createdAt,
    };
};

const Notifications: React.FC<NotificationProps> = ({ navigation }) => {
    const [notifications, setNotifications] = useState<UiNotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [showMenu, setShowMenu] = useState<boolean>(false);

    // Fetch notifications from API
    const loadNotifications = useCallback(async (showLoadingSpinner = true) => {
        if (showLoadingSpinner) setIsLoading(true);
        try {
            const res = await notificationService.getNotifications(50, 0);
            if (res.data?.status && Array.isArray(res.data?.notifications)) {
                const uiItems = res.data.notifications.map(mapServerItemToUi);
                setNotifications(uiItems);
            }
        } catch (error) {
            console.warn("Failed to load notifications from API:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications(true);

        // Connect socket
        socketService.connect();

        // Listen for live socket notifications
        const unsubscribe = socketService.onNewNotification((serverItem) => {
            const uiItem = mapServerItemToUi(serverItem);
            setNotifications((prev) => {
                // Avoid duplicates
                if (prev.some((n) => n.id === uiItem.id)) {
                    return prev;
                }
                return [uiItem, ...prev];
            });
        });

        return () => {
            unsubscribe();
        };
    }, [loadNotifications]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadNotifications(false);
    };

    // MARK NOTIFICATION AS READ & NAVIGATE
    const handleNotificationPress = async (item: UiNotificationItem) => {
        // Optimistic UI update
        if (!item.isRead) {
            setNotifications((previous) =>
                previous.map((n) =>
                    n.id === item.id
                        ? { ...n, isRead: true }
                        : n
                )
            );
            try {
                await notificationService.markAsRead(item.id);
            } catch (err) {
                console.warn("Failed to mark notification as read:", err);
            }
        }

        // Navigate based on notification title/type
        const titleLower = (item.title || "").toLowerCase();
        if (titleLower.includes("package finalization review") || titleLower.includes("review package") || titleLower.includes("package review")) {
            navigation.navigate("ReviewPackage", {
                orderId: item.processOrderId || item.orderId,
                invoiceNo: item.invNo,
            });
        } else if (item.processOrderId || item.orderId) {
            navigation.navigate("OrderDetails", {
                orderId: String(item.processOrderId || item.orderId),
            });
        }
    };

    // MARK ALL NOTIFICATIONS AS READ
    const handleMarkAllAsRead = async () => {
        // navigation.navigate("ReviewPackage"); //testing purpose-remove this after testing 
        setShowMenu(false);
        setNotifications((previous) =>
            previous.map((n) => ({
                ...n,
                isRead: true,
            }))
        );
        try {
            await notificationService.markAllAsRead();
        } catch (err) {
            console.warn("Failed to mark all as read:", err);
        }
    };

    // GROUP NOTIFICATIONS
    const todayNotifications = useMemo(
        () => notifications.filter((item) => item.group === "Today"),
        [notifications]
    );

    const yesterdayNotifications = useMemo(
        () => notifications.filter((item) => item.group === "Yesterday"),
        [notifications]
    );

    const earlierNotifications = useMemo(
        () => notifications.filter((item) => item.group === "Earlier"),
        [notifications]
    );

    // NOTIFICATION CARD
    const renderNotification = (item: UiNotificationItem) => {
        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(item)}
                style={{
                    width: "100%",
                    minHeight: 88,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E2E5E8",
                    borderLeftWidth: 3.5,
                    borderLeftColor: item.isRead ? "#E2E5E8" : "#FFE000",
                    borderRadius: 16,
                    marginBottom: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 3,
                    elevation: 1,
                }}
            >
                {item.actionRequired ? (
                    // Action Required: Row 1 has Badge (left) & Time (right), Row 2 has Title below badge
                    <>
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 6,
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: "#FFF1F2",
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 11.5,
                                        color: "#FF4B55",
                                        fontWeight: "600",
                                    }}
                                >
                                    Action Required
                                </Text>
                            </View>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                }}
                            >
                                {item.time}
                            </Text>
                        </View>

                        <Text
                            style={{
                                fontSize: 13.5,
                                fontWeight: "700",
                                color: "#111827",
                                marginBottom: 3,
                            }}
                        >
                            {item.title}
                        </Text>
                    </>
                ) : (
                    // Standard: Title & Date/Time in the SAME top row
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13.5,
                                fontWeight: "700",
                                color: "#111827",
                                flex: 1,
                                paddingRight: 8,
                            }}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                color: "#6B7280",
                            }}
                        >
                            {item.time}
                        </Text>
                    </View>
                )}

                {/* MESSAGE (with bold invoice number) */}
                <Text
                    style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: "#6B7280",
                    }}
                >
                    {renderBoldInvoiceMessage(
                        item.message,
                        {
                            fontSize: 13,
                            lineHeight: 18,
                            color: "#6B7280",
                        },
                        {
                            fontSize: 13,
                            lineHeight: 18,
                            fontWeight: "700",
                            color: "#111827",
                        }
                    )}
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
            {/* HEADER WITH 3-DOTS BUTTON & NO BACK BUTTON */}
            <CustomHeader
                title="Notifications"
                showBackButton={false}
                rightComponent={
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowMenu((prev) => !prev)}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            alignItems: "center",
                            justifyContent: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color="#111827"
                        />
                    </TouchableOpacity>
                }
            />

            {/* DROPDOWN MENU FOR MARK ALL AS READ */}
            {showMenu && (
                <>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setShowMenu(false)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 998,
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            top: 68,
                            right: 16,
                            zIndex: 999,
                            backgroundColor: "#FFFFFF",
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            paddingVertical: 4,
                            paddingHorizontal: 4,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleMarkAllAsRead}
                            style={{
                                paddingVertical: 8,
                                paddingHorizontal: 14,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: "700",
                                    color: "#111827",
                                }}
                            >
                                Mark all as read
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* CONTENT */}
            {isLoading && !isRefreshing ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <ActivityIndicator size="large" color="#3E206D" />
                </View>
            ) : notifications.length === 0 ? (
                <ScrollView
                    contentContainerStyle={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 24,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={["#3E206D"]}
                        />
                    }
                >
                    <Ionicons
                        name="notifications-off-outline"
                        size={48}
                        color="#9CA3AF"
                    />
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#374151",
                            marginTop: 12,
                        }}
                    >
                        No Notifications Yet
                    </Text>
                    <Text
                        style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            textAlign: "center",
                            marginTop: 4,
                        }}
                    >
                        You’ll get real-time updates regarding your orders and packages right here.
                    </Text>
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 14,
                        paddingTop: 8,
                        paddingBottom: 130,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={["#3E206D"]}
                        />
                    }
                >
                    {/* TODAY */}
                    {todayNotifications.length > 0 && (
                        <View style={{ marginBottom: 6 }}>
                            <Text
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: "700",
                                    color: "#111827",
                                    marginBottom: 10,
                                    marginTop: 4,
                                }}
                            >
                                Today
                            </Text>
                            {todayNotifications.map(renderNotification)}
                        </View>
                    )}

                    {/* YESTERDAY */}
                    {yesterdayNotifications.length > 0 && (
                        <View style={{ marginBottom: 6 }}>
                            <Text
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: "700",
                                    color: "#111827",
                                    marginBottom: 10,
                                    marginTop: 4,
                                }}
                            >
                                Yesterday
                            </Text>
                            {yesterdayNotifications.map(renderNotification)}
                        </View>
                    )}

                    {/* EARLIER */}
                    {earlierNotifications.length > 0 && (
                        <View>
                            <Text
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: "700",
                                    color: "#111827",
                                    marginBottom: 10,
                                    marginTop: 4,
                                }}
                            >
                                Earlier
                            </Text>
                            {earlierNotifications.map(renderNotification)}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Floating Bottom Navigation Bar */}
            <BottomNavigation activeScreen="Notification" navigation={navigation} />
        </View>
    );
};

export default Notifications;
