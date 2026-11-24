import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
  NativeScrollEvent,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import CustomHeader from "@/component/common/CustomHeader";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import notificationService, {
  ServerNotificationItem,
} from "@/services/notification/notification.service";
import socketService from "@/services/socket/socket.service";
import orderService from "@/services/order/order.service";
import {
  isActionRequiredNotification,
  isPaymentReminderTitle,
  renderBoldInvoiceMessage,
} from "@/constants/notificationTemplates";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { updateGlobalUnreadCount } from "@/store/notificationStore";
import { AlertModal } from "@/component/common/AlertModal";

export interface UiNotificationItem {
  id: number;
  processOrderId?: number;
  orderId?: number;
  invNo?: string;
  orderStatus?: string;
  isFinalized: boolean;
  isConfirmed: boolean;
  isPaid?: boolean;
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

// ─── PAGINATION ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const isCloseToBottom = ({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: NativeScrollEvent) =>
  layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;

// ─── TITLE MATCHERS ──────────────────────────────────────────────────────────
const isPackageReviewTitle = (title?: string) => {
  const t = (title || "").toLowerCase();
  return (
    t.includes("package finalization review") ||
    t.includes("review package") ||
    t.includes("package review")
  );
};

// Matches "Please Confirm Your Order" and "Please Confirm Your Order!"
const isOrderConfirmTitle = (title?: string) =>
  (title || "").toLowerCase().includes("confirm your order");

// ─── DATE HELPERS ────────────────────────────────────────────────────────────
const getNotificationGroup = (
  dateStr?: string,
): "Today" | "Yesterday" | "Earlier" => {
  if (!dateStr) return "Today";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Today";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (targetDate.getTime() === today.getTime()) return "Today";
  if (targetDate.getTime() === yesterday.getTime()) return "Yesterday";
  return "Earlier";
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

// Safely converts 1 / "1" / true / "true" to boolean
const toBool = (value: unknown): boolean =>
  value === true || value === "true" || Number(value) === 1;

// ─── SERVER -> UI MAPPER ─────────────────────────────────────────────────────
const mapServerItemToUi = (
  item: ServerNotificationItem,
): UiNotificationItem => {
  const group = getNotificationGroup(item.createdAt);
  const time = formatNotificationTime(item.createdAt, group);
  const isReadBool = toBool(item.isRead);
  const isFinalizedBool = toBool(item.isFinalized);
  const isConfirmedBool = toBool(item.isConfirmed);
  const isPaidBool = toBool((item as any).isPaid);

  // "Please Confirm Your Order" always shows the Action Required badge
  const actionRequired =
    isActionRequiredNotification(item.title) || isOrderConfirmTitle(item.title);

  let messageText = item.message || "";
  const returnReason = (item as any).returnReason;
  const returnNote = (item as any).returnNote || (item as any).otherReason;
  const effectiveReason =
    returnReason && returnReason.toLowerCase() === "other" && returnNote
      ? returnNote
      : returnNote ||
        (returnReason && returnReason.toLowerCase() !== "other"
          ? returnReason
          : "");

  if (effectiveReason) {
    messageText = messageText.replace(
      /Reason\s*:\s*[“"'\`\u201C\u201D\u2018\u2019]?Other[”"'\`\u201C\u201D\u2018\u2019]?/gi,
      `Reason : “${effectiveReason}”`,
    );
  }

  // Move Reason section to a second line (newline)
  messageText = messageText.replace(
    /([^\n\r])\s*(?:[.]\s*)?(Reason\s*[:：])/gi,
    (match, prefix, reasonTag) => {
      const trimmedPrefix = prefix.trimEnd();
      const hasPunctuation = /[.!?]$/.test(trimmedPrefix);
      return trimmedPrefix + (hasPunctuation ? "" : ".") + "\n" + reasonTag;
    },
  );

  return {
    id: item.id,
    processOrderId: item.processOrderId,
    orderId: item.orderId,
    invNo: item.invNo,
    orderStatus: item.orderStatus,
    isFinalized: isFinalizedBool,
    isConfirmed: isConfirmedBool,
    isPaid: isPaidBool,
    title: item.title,
    message: messageText,
    time,
    group,
    isRead: isReadBool,
    actionRequired,
    createdAt: item.createdAt,
  };
};

// ─── SCREEN ──────────────────────────────────────────────────────────────────
const Notifications: React.FC<NotificationProps> = ({ navigation }) => {
  const buyerType = useSelector(
    (state: RootState) => state.auth.userProfile?.buyerType || "Retail",
  );
  const isRetail = buyerType.toLowerCase() === "retail";

  const [notifications, setNotifications] = useState<UiNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [itemLoadingId, setItemLoadingId] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const hasFocusedOnce = useRef(false);
  // Number of RAW rows loaded from the server so far (before client filtering)
  const offsetRef = useRef(0);
  const isFetchingMoreRef = useRef(false);
  const listHeightRef = useRef(0);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning",
  ) => setAlertConfig({ visible: true, title, message, type });

  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  const PAYMENT_CUTOFF_HOUR = 18; // 6 PM

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Handle system back button with context-aware dismissal of action menu
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showMenu) {
          setShowMenu(false);
          return true;
        }
        navigation.navigate("Home");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [showMenu, navigation]),
  );

  const applyRoleFilter = useCallback(
    (items: UiNotificationItem[]) =>
      isRetail ? items : items.filter((n) => !isPackageReviewTitle(n.title)),
    [isRetail],
  );

  // Re-fetch the first `count` rows as separate 10-row pages (in parallel),
  // so every request is still limit=10 no matter how many are loaded.
  const fetchPages = useCallback(async (count: number) => {
    const pages = Math.max(Math.ceil(count / PAGE_SIZE), 1);
    const responses = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        notificationService.getNotifications(PAGE_SIZE, i * PAGE_SIZE),
      ),
    );

    const first = responses[0];
    const lastList = responses[pages - 1].data?.notifications ?? [];
    const all: ServerNotificationItem[] = responses.flatMap(
      (r) => r.data?.notifications ?? [],
    );

    // De-dupe by id (rows can shift between page requests)
    const seen = new Set<number>();
    const raw = all.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    return {
      ok: !!first.data?.status,
      raw,
      rawCount: all.length,
      unreadCount: Number(first.data?.unreadCount) || 0,
      lastPageFull: lastList.length >= PAGE_SIZE,
    };
  }, []);

  // Fetch notifications from API
  // reset = true  -> go back to the first page (initial load, pull-to-refresh)
  // reset = false -> re-fetch everything already loaded, so focus / socket
  //                  refreshes don't throw away pages 2, 3, ...
  const loadNotifications = useCallback(
    async (showLoadingSpinner = true, reset = false) => {
      if (showLoadingSpinner) setIsLoading(true);
      try {
        const loaded = reset
          ? PAGE_SIZE
          : Math.max(offsetRef.current, PAGE_SIZE);
        const result = await fetchPages(loaded);

        if (result.ok) {
          offsetRef.current = result.rawCount;
          setHasMore(result.lastPageFull);
          setNotifications(applyRoleFilter(result.raw.map(mapServerItemToUi)));
          // Keep global store in sync for badge on all tabs
          updateGlobalUnreadCount(result.unreadCount);
        }
      } catch (error) {
        console.warn("Failed to load notifications from API:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyRoleFilter, fetchPages],
  );

  // Load the next 10
  const loadMore = useCallback(async () => {
    if (
      isFetchingMoreRef.current ||
      !hasMore ||
      isLoading ||
      isRefreshing ||
      offsetRef.current === 0
    ) {
      return;
    }

    isFetchingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await notificationService.getNotifications(
        PAGE_SIZE,
        offsetRef.current,
      );
      if (res.data?.status && Array.isArray(res.data?.notifications)) {
        const raw = res.data.notifications;
        offsetRef.current += raw.length;
        // Use RAW length (not filtered length) to decide if more pages exist
        setHasMore(raw.length >= PAGE_SIZE);

        const incoming = applyRoleFilter(raw.map(mapServerItemToUi));
        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          return [...prev, ...incoming.filter((n) => !ids.has(n.id))];
        });
      }
    } catch (error) {
      console.warn("Failed to load more notifications:", error);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, isRefreshing, applyRoleFilter]);

  // If a page was fully filtered out (e.g. non-retail hides package reviews)
  // and the list is still empty, keep pulling pages automatically.
  useEffect(() => {
    if (
      !isLoading &&
      !isRefreshing &&
      !isLoadingMore &&
      hasMore &&
      notifications.length === 0 &&
      offsetRef.current > 0
    ) {
      loadMore();
    }
  }, [
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    notifications.length,
    loadMore,
  ]);

  // Re-fetch every time the screen regains focus (e.g. returning from
  // ReviewPackage / OrderConfirmation) so isFinalized / isConfirmed are fresh.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) {
        loadNotifications(false);
      }
      hasFocusedOnce.current = true;
    }, [loadNotifications]),
  );

  useEffect(() => {
    loadNotifications(true, true);

    // Connect socket
    socketService.connect();

    // Listen for live socket notifications (lightweight trigger or full item)
    const unsubscribeNotif = socketService.onNewNotification(
      (serverItem: any) => {
        // If full notification fields were provided, optimistically display
        if (serverItem?.id && serverItem?.title && serverItem?.createdAt) {
          const uiItem = mapServerItemToUi(serverItem);
          if (isRetail || !isPackageReviewTitle(uiItem.title)) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === uiItem.id)) {
                return prev;
              }
              return [uiItem, ...prev];
            });
          }
        }
        // Always re-fetch latest data from DB to keep state clean
        loadNotifications(false);
      },
    );

    // Listen for unread count updates
    const unsubscribeCount = socketService.onUnreadCountUpdate((count) => {
      if (count === 0) {
        setNotifications((prev) =>
          prev.map((n) => (n.isRead ? n : { ...n, isRead: true })),
        );
      }
    });

    return () => {
      unsubscribeNotif();
      unsubscribeCount();
    };
  }, [loadNotifications, isRetail]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(false, true);
  };

  // MARK NOTIFICATION AS READ & NAVIGATE
  const handleNotificationPress = async (tapped: UiNotificationItem) => {
    if (itemLoadingId !== null) return;
    setItemLoadingId(tapped.id);

    try {
      // 0) Always decide using the freshest order state from the server
      let item: UiNotificationItem = tapped;
      try {
        // Re-fetch every loaded page (10 per request) so the tapped item is included
        const result = await fetchPages(
          Math.max(offsetRef.current, PAGE_SIZE),
        );
        const fresh = result.raw.find((n) => n.id === tapped.id);
        if (fresh) {
          item = mapServerItemToUi(fresh);
          // Retain local isPaid if previously confirmed paid
          if (tapped.isPaid) {
            item.isPaid = true;
          }
        }
      } catch (err) {
        console.warn("Failed to refresh notification state:", err);
      }

      // Optimistic read update
      if (!item.isRead) {
        setNotifications((previous) => {
          const nextList = previous.map((n) =>
            n.id === item.id ? { ...n, isRead: true } : n,
          );
          const unread = nextList.filter((n) => !n.isRead).length;
          updateGlobalUnreadCount(unread);
          socketService.emitLocalUnreadCount(unread);
          return nextList;
        });
        try {
          await notificationService.markAsRead(item.id);
        } catch (err) {
          console.warn("Failed to mark notification as read:", err);
        }
      }

      const targetId = item.processOrderId || item.orderId;
      const isCancelled =
        !!item.orderStatus && item.orderStatus.toLowerCase() === "cancelled";

      // 1) Package finalization review
      if (isRetail && isPackageReviewTitle(item.title)) {
        if (isCancelled) {
          showAlert(
            "Cannot Proceed!",
            "You have already cancelled this order. You cannot proceed to the payment.",
            "error",
          );
          return;
        }

        // Only check isFinalized (0 = can review, 1 = already finalized)
        if (item.isFinalized) {
          showAlert(
            "Already Finalized!",
            "You have already reviewed and finalized your order. You cannot make any further changes.",
            "warning",
          );
          return;
        }

        navigation.navigate("ReviewPackage", {
          orderId: targetId,
          invoiceNo: item.invNo,
          refreshKey: Date.now(),
        });
        return;
      }

      // 2) Please Confirm Your Order -> Order Confirmation screen
      if (isOrderConfirmTitle(item.title)) {
        if (!targetId) return;

        if (isCancelled) {
          showAlert(
            "Cannot Proceed!",
            "This order has already been cancelled.",
            "error",
          );
          return;
        }

        if (item.isConfirmed) {
          showAlert(
            "Already Confirmed!",
            "You have already confirmed this order. You cannot make any further changes.",
            "warning",
          );
          return;
        }

        navigation.navigate("OrderConfirmation", {
          orderId: String(targetId),
        });
        return;
      }

      // 3) Payment Reminder !!! -> PaymentScreen (today only, before 6 PM)
      if (isPaymentReminderTitle(item.title)) {
        if (!targetId) return;

        if (isCancelled) {
          showAlert(
            "Cannot Proceed!",
            "This order has already been cancelled.",
            "error",
          );
          return;
        }

        // ── Date / time restriction ──
        const now = new Date();
        const createdDate = new Date(item.createdAt);
        const isTodayReminder =
          !isNaN(createdDate.getTime()) && isSameLocalDay(createdDate, now);

        if (!isTodayReminder) {
          showAlert(
            "Payment Closed!",
            "This payment reminder has expired. Payments can only be made on the day the order is placed.",
            "warning",
          );
          return;
        }

        if (now.getHours() >= PAYMENT_CUTOFF_HOUR) {
          showAlert(
            "Payment Closed!",
            "Payment is only available until 6:00 PM on the day the order is placed.",
            "warning",
          );
          return;
        }
        // ─────────────────────────────

        if (item.isPaid) {
          showAlert(
            "Already Paid!",
            "You have already completed the payment for this order.",
            "error",
          );
          return;
        }

        // Query server for fresh order payment status
        const queryId = item.processOrderId || item.orderId || targetId;
        try {
          const orderRes = await orderService.getOrderById(String(queryId));
          const order = orderRes.data?.order || orderRes.data?.data;

          if (orderRes.data?.status && order) {
            const isPaid =
              Number(order.isPaid) === 1 ||
              order.isPaid === true ||
              String(order.isPaid) === "1" ||
              order.status === "Paid";

            if (isPaid) {
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === item.id ? { ...n, isPaid: true } : n,
                ),
              );
              showAlert(
                "Already Paid!",
                "You have already completed the payment for this order.",
                "error",
              );
              return;
            }

            const orderFullTotal = parseFloat(
              order.fulltotal || order.fullTotal || 0,
            );
            const creditPaid = parseFloat(order.creditPaid || 0);
            const moneyPaid = parseFloat(order.moneyPaid || 0);
            const payableAmount =
              moneyPaid > 0
                ? moneyPaid
                : Math.max(0, orderFullTotal - creditPaid);

            navigation.navigate("PaymentScreen", {
              orderId: String(item.orderId || order.orderId || targetId),
              processOrderId:
                item.processOrderId || order.processOrderId || targetId,
              invoiceNo: item.invNo || order.invoiceNo,
              amount: payableAmount,
              title: "Pay Order",
            });
            return;
          }

          showAlert(
            "Order Unavailable",
            "Could not retrieve order details. Please try again later.",
            "error",
          );
          return;
        } catch (err) {
          console.warn("Failed to check order for payment reminder:", err);
          showAlert(
            "Network Error",
            "Failed to verify order payment status. Please check your internet connection.",
            "error",
          );
          return;
        }
      }

      // 4) Everything else -> Order Details
      if (targetId) {
        navigation.navigate("OrderDetails", {
          orderId: String(targetId),
        });
      }
    } finally {
      setItemLoadingId(null);
    }
  };

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    setShowMenu(false);
    setNotifications((previous) =>
      previous.map((n) => ({
        ...n,
        isRead: true,
      })),
    );
    // Clear badge globally across ALL tabs
    updateGlobalUnreadCount(0);
    socketService.emitLocalUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  // GROUP NOTIFICATIONS
  const todayNotifications = useMemo(
    () => notifications.filter((item) => item.group === "Today"),
    [notifications],
  );

  const yesterdayNotifications = useMemo(
    () => notifications.filter((item) => item.group === "Yesterday"),
    [notifications],
  );

  const earlierNotifications = useMemo(
    () => notifications.filter((item) => item.group === "Earlier"),
    [notifications],
  );

  // MESSAGE: bold invoice number (existing helper) + bold reason text.
  // "Reason :" label stays normal; everything after it on that line is bold,
  // whether or not the server wrapped it in quotes.
  const messageBaseStyle = {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  } as const;

  const messageBoldStyle = {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#111827",
  } as const;

  const renderMessageWithBoldReason = (message: string) => {
    const match = message.match(/^([\s\S]*?Reason\s*[:：]\s*)([^\n\r]+)([\s\S]*)$/i);

    if (!match) {
      return renderBoldInvoiceMessage(
        message,
        messageBaseStyle,
        messageBoldStyle,
      );
    }

    const [, before, reason, after] = match;
    return (
      <>
        {renderBoldInvoiceMessage(before, messageBaseStyle, messageBoldStyle)}
        <Text style={messageBoldStyle}>{reason.trim()}</Text>
        {after
          ? renderBoldInvoiceMessage(after, messageBaseStyle, messageBoldStyle)
          : null}
      </>
    );
  };

  // NOTIFICATION CARD
  const renderNotification = (item: UiNotificationItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        disabled={itemLoadingId !== null}
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

              <Text style={{ fontSize: 12, color: "#6B7280" }}>
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

            <Text style={{ fontSize: 12, color: "#6B7280" }}>{item.time}</Text>
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
          {renderMessageWithBoldReason(item.message)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroup = (
    label: string,
    list: UiNotificationItem[],
    last = false,
  ) =>
    list.length > 0 ? (
      <View style={{ marginBottom: last ? 0 : 6 }}>
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 10,
            marginTop: 4,
          }}
        >
          {label}
        </Text>
        {list.map(renderNotification)}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
            <Ionicons name="ellipsis-horizontal" size={20} color="#111827" />
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
              top: 50,
              right: 16,
              zIndex: 999,
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingVertical: 2,
              paddingHorizontal: 2,
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
              style={{ paddingVertical: 8, paddingHorizontal: 14 }}
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
      ) : notifications.length === 0 && !hasMore ? (
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
            You’ll get real-time updates regarding your orders and packages
            right here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={200}
          onLayout={(e) => {
            listHeightRef.current = e.nativeEvent.layout.height;
          }}
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) loadMore();
          }}
          // If the loaded content doesn't fill the screen, load the next page
          onContentSizeChange={(_w, h) => {
            if (hasMore && h < listHeightRef.current) loadMore();
          }}
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
          {renderGroup("Today", todayNotifications)}
          {renderGroup("Yesterday", yesterdayNotifications)}
          {renderGroup("Earlier", earlierNotifications, true)}

          {/* Pagination footer */}
          {isLoadingMore && (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#3E206D" />
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Bottom Navigation Bar */}
      <BottomNavigation activeScreen="Notification" navigation={navigation} />

      {/* Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        autoClose={false}
        showOkButton={true}
        okButtonText="OK"
        onOkPress={hideAlert}
        onClose={hideAlert}
      />

      {/* ─── ACTION LOADING OVERLAY ────────────────────────────────────── */}
      {itemLoadingId !== null && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.75)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <ActivityIndicator size="large" color="#FF8A00" />
          <Text
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#1E293B",
              fontWeight: "600",
            }}
          >
            Checking order details...
          </Text>
        </View>
      )}
    </View>
  );
};

export default Notifications;