import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  BackHandler,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import InfoNoticeCard from "@/component/common/InfoNoticeCard";
import { SummaryRow } from "@/component/order/SummaryRow";
import { PackageModal } from "@/component/order/PackageModal";
import LoadingPage from "@/component/common/LoadingPage";
import orderService from "@/services/order/order.service";
import complaintService from "@/services/complaint/complaint.service";
import ComplaintReply from "@/component/complaint/ComplaintReply";

type OrderDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OrderDetails"
>;

type OrderDetailsRouteProp = RouteProp<RootStackParamList, "OrderDetails">;

interface Props {
  navigation: OrderDetailsNavigationProp;
  route: OrderDetailsRouteProp;
}

interface PackageItem {
  itemName: string;
  quantity: string;
  image: string;
}

interface Package {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  packageImage?: string;
  packingStatus?: string;
  items: PackageItem[];
}

interface CartItem {
  id: number;
  name: string;
  quantity: string;
  price: number;
  image: string;
  oldPrice?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const OrderDetails: React.FC<Props> = ({ navigation, route }) => {
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [packageModalVisible, setPackageModalVisible] = useState(false);

  // Complaint linked to this order (null when none)
  const [complaint, setComplaint] = useState<any>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);

  const formatAmount = (amount: number | string) => {
    const num =
      typeof amount === "number"
        ? amount
        : parseFloat(
            String(amount || "")
              .replace(/Rs\.?/gi, "")
              .replace(/LKR/gi, "")
              .replace(/,/g, "")
              .trim(),
          ) || 0;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Parses a price-ish value (number, "Rs. 1,200.00", null) into a plain
  // number, or null if there's nothing there.
  const parsePriceValue = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    const parsed = parseFloat(
      String(value)
        .replace(/Rs\.?/gi, "")
        .replace(/LKR/gi, "")
        .replace(/,/g, "")
        .trim(),
    );
    return isNaN(parsed) ? null : parsed;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatStatusDate = (dateString?: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProcessingDateAndTimeString = (
    deliveryDateString?: string | Date | null,
  ) => {
    if (!deliveryDateString) return "07:00 PM";
    const date = new Date(deliveryDateString);
    if (isNaN(date.getTime())) return "07:00 PM";
    const procDate = new Date(date);
    procDate.setDate(procDate.getDate() - 3);
    const formattedDate = procDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${formattedDate}, 07:00 PM`;
  };

  const isPackageDispatched =
    packages.length > 0 &&
    packages.some((pkg) => {
      const status = (pkg.packingStatus || "").trim();
      return status.toLowerCase() === "dispatch";
    });

  const openPackageDetails = () => {
    if (!isPackageDispatched) return;
    setPackageModalVisible(true);
  };

  // ─── COMPLAINT BUTTON LOGIC ────────────────────────────────────────────────

  const invoiceNo =
    order?.invoiceNo || order?.invoiceNumber || order?.invNo || undefined;

  // "Report an Issue": only Delivered / Picked up orders, within 24h of deliveredTime
  const normalizedOrderStatus = String(
    order?.processStatus || order?.status || "",
  )
    .trim()
    .toLowerCase();

  const isDeliveredOrPickedUp = ["delivered", "picked up", "pickedup"].includes(
    normalizedOrderStatus,
  );

  const canReportIssue = (() => {
    // deliveredTime = processorders.deliveredTime (delivery) or
    // pickuporders.handOverTime (pickup, mapped by the backend)
    const deliveredRaw = order?.deliveredTime;
    if (!isDeliveredOrPickedUp || !deliveredRaw) return false;
    const deliveredAt = new Date(deliveredRaw).getTime();
    if (isNaN(deliveredAt)) return false;
    const diff = Date.now() - deliveredAt;
    return diff >= 0 && diff <= DAY_MS;
  })();

  const complaintStatus = String(complaint?.status || "")
    .trim()
    .toLowerCase();
  const hasComplaint = !!complaint;
  const isComplaintClosed = hasComplaint && complaintStatus === "closed";
  const isComplaintOpen = hasComplaint && !isComplaintClosed;

  const handleReportIssue = () => {
    navigation.navigate("ReportComplaint" as any, {
      orderId,
      invoiceNo,
    });
  };

  const handleBack = useCallback(() => {
  navigation.navigate("OrderHistory");
}, [navigation]);

useFocusEffect(
  useCallback(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleBack]),
);

  const handleViewComplaint = () => {
    if (!complaint?.id) return;
    navigation.navigate("ViewComplaint" as any, {
      id: complaint.id,
      orderId,
    });
  };

  useEffect(() => {
    const fetchAllOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [orderRes, packagesRes, itemsRes] = await Promise.all([
          orderService.getOrderById(orderId),
          orderService.getOrderPackages(orderId),
          orderService.getOrderAdditionalItems(orderId),
        ]);

        if (orderRes.data && orderRes.data.status) {
          setOrder(orderRes.data.order);
        }

        if (packagesRes.data && packagesRes.data.status) {
          const rawPackages: any[] = packagesRes.data.data;
          const packageMap = new Map<string, Package>();

          rawPackages.forEach((p: any) => {
            const key = String(p.packageId || p.displayName);
            const priceNum =
              typeof p.priceNum === "number"
                ? p.priceNum
                : typeof p.productPrice === "number"
                  ? p.productPrice
                  : parseFloat(
                      String(p.productPrice || "")
                        .replace(/Rs\.?/i, "")
                        .replace(/,/g, "")
                        .trim(),
                    ) || 0;
            const qty = parseFloat(p.packageQty || p.qty || p.quantity) || 1;

            if (packageMap.has(key)) {
              const existing = packageMap.get(key)!;
              existing.quantity += qty;
            } else {
              packageMap.set(key, {
                id: packageMap.size + 1,
                name: p.displayName,
                quantity: qty,
                price: priceNum,
                image:
                  p.packageImage ||
                  p.image ||
                  (p.products && p.products[0]?.image) ||
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                packageImage: p.packageImage || p.image,
                packingStatus: p.packingStatus,
                items: (p.products || []).map((prod: any) => {
                  const qtyNum =
                    parseFloat(String(prod.qty ?? prod.quantity ?? 0)) || 0;
                  return {
                    itemName: prod.itemName || prod.typeName || "Item",
                    quantity: `${qtyNum} kg`,
                    image:
                      prod.image ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                  };
                }),
              });
            }
          });

          setPackages(Array.from(packageMap.values()));
        }

        if (itemsRes.data && itemsRes.data.status) {
          const mappedItems: CartItem[] = itemsRes.data.data.map(
            (item: any, idx: number) => {
              const priceNum = parsePriceValue(item.price) ?? 0;

              const originalPriceNum =
                parsePriceValue(item.normalPrice) ??
                parsePriceValue(item.originalPrice) ??
                parsePriceValue(item.oldPrice) ??
                parsePriceValue(item.actualPrice) ??
                parsePriceValue(item.comPrice);

              const hasDiscount =
                originalPriceNum != null && originalPriceNum > priceNum;

              const qty = parseFloat(item.qty) || 1;
              return {
                id: idx + 1,
                name: item.displayName || "Unknown Item",
                quantity: `${qty} ${item.unit || "units"}`,
                price: priceNum,
                oldPrice: hasDiscount ? originalPriceNum! : undefined,
                image:
                  item.image ||
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
              };
            },
          );
          setCartItems(mappedItems);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrderDetails();
  }, [orderId]);

  // Re-fetch the complaint every time this screen gains focus so the button
  // updates right after a complaint is submitted / closed.
  useFocusEffect(
    useCallback(() => {
      if (!invoiceNo) return;
      let active = true;
      (async () => {
        try {
          // Uses the existing my-complaints API (newest first) and matches the
          // saved description prefix: "Complaint regarding Invoice No : INV<br/>"
          const res = await complaintService.getMyComplaints();
          const prefix = `Complaint regarding Invoice No : ${invoiceNo}\n`;
          const list: any[] = res.data?.status ? res.data.data || [] : [];
          const found =
            list.find((c) =>
              String(c?.complain || "")
                .replace(/<br\s*\/?>/gi, "\n") // legacy rows saved with <br/>
                .replace(/\r\n/g, "\n")
                .startsWith(prefix),
            ) || null;
          if (active) setComplaint(found);
        } catch (e) {
          if (active) setComplaint(null);
        }
      })();
      return () => {
        active = false;
      };
    }, [invoiceNo]),
  );

  const NORMAL_STAGES = [
    "Ordered",
    "Processing",
    "Out For Delivery",
    "Collected",
    "On the way",
    "Delivered",
  ];

  // Cancelled during REVIEW => Ordered > Processing > Cancelled
  //   (orders.isPackage = 1 AND orders.isFinalizeImdt = 0)
  // Cancelled during ORDER CONFIRMATION => Ordered > Cancelled
  // NOTE: the column name is `isFinalizeImdt` (no "d"), matching the DB table.
  const isCancelledDuringReview = () =>
    Number(order?.isPackage) === 1 && Number(order?.isFinalizeImdt) === 0;

  const getStatusItems = () => {
    const isPickup =
      (
        order?.delivaryMethod ||
        order?.deliveryMethod ||
        order?.deliveryType ||
        ""
      ).toUpperCase() === "PICKUP";
    const status = order?.processStatus || "Pending";
    const updateTime = formatStatusDate(order?.updatedAt || order?.createdAt);
    const orderTime = formatStatusDate(order?.createdAt);
    const processingTime = getProcessingDateAndTimeString(
      order?.sheduleDate || order?.scheduleDate || order?.deliveryDate,
    );
    const packTimeFormatted = formatStatusDate(order?.packTime);
    const outForDeliveryTime = packTimeFormatted || updateTime;
    const returnTime = formatStatusDate(order?.returnTime || order?.updatedAt);
    const returnReasonText =
      order?.returnNote || order?.returnReason || "Customer didn't answer.";

    // --- PICKUP DELIVERY METHOD FLOW ---
    if (isPickup) {
      const PICKUP_STAGES = [
        "Ordered",
        "Processing",
        "Ready to Pickup",
        "Picked up",
      ];

      const isPickupActive = (stage: string) => {
        let normalizedStatus = status;
        if (status === "Pending") normalizedStatus = "Ordered";
        if (status === "Confirmed") normalizedStatus = "Processing";
        if (status === "Out For Delivery") normalizedStatus = "Ready to Pickup";
        if (status === "Delivered") normalizedStatus = "Picked up";

        const currentIdx = PICKUP_STAGES.indexOf(normalizedStatus);
        const stageIdx = PICKUP_STAGES.indexOf(stage);

        return stageIdx !== -1 && currentIdx >= stageIdx;
      };

      const readyToPickupTime = packTimeFormatted || updateTime;
      const pickedUpTime = formatStatusDate(order?.deliveredTime) || updateTime;

      if (status === "Return" || status === "Return Received") {
        const pickupReturnReason =
          order?.returnNote ||
          order?.returnReason ||
          "Customer did not picked up the order during the day.";

        const schedDate = formatDate(order?.sheduleDate || order?.scheduleDate);
        const schedTime = order?.sheduleTime || order?.scheduleTime;
        const pickupReturnTime =
          schedDate !== "N/A"
            ? `${schedDate}${schedTime ? `, ${schedTime}` : ""}`
            : returnTime || updateTime;

        return [
          {
            title: "Ordered",
            date: orderTime || "Just now",
            icon: "cart-shopping",
            active: true,
          },
          {
            title: "Processing",
            date: processingTime,
            icon: "box-open",
            active: true,
          },
          {
            title: "Ready to Pickup",
            date: readyToPickupTime,
            icon: "bag-shopping",
            active: true,
          },
          {
            title: "Returned",
            date: pickupReturnTime,
            icon: "xmark",
            active: true,
            description: `Reason : ${pickupReturnReason}`,
          },
        ];
      }

      if (status === "Cancelled" || status?.toLowerCase() === "cancelled") {
        const showProcessing = isCancelledDuringReview();
        return [
          {
            title: "Ordered",
            date: orderTime || "Just now",
            icon: "cart-shopping",
            active: true,
          },
          ...(showProcessing
            ? [
                {
                  title: "Processing",
                  date: processingTime,
                  icon: "box-open",
                  active: true,
                },
              ]
            : []),
          {
            title: "Cancelled",
            date: "",
            icon: "xmark",
            active: true,
          },
        ];
      }

      return [
        {
          title: "Ordered",
          date: orderTime || "Just now",
          icon: "cart-shopping",
          active: true,
        },
        {
          title: "Processing",
          date: isPickupActive("Processing") ? processingTime : "",
          icon: "box-open",
          active: isPickupActive("Processing"),
        },
        {
          title: "Ready to Pickup",
          date: isPickupActive("Ready to Pickup") ? readyToPickupTime : "",
          icon: "bag-shopping",
          active: isPickupActive("Ready to Pickup"),
        },
        {
          title: "Picked up",
          date: isPickupActive("Picked up") ? pickedUpTime : "",
          icon: "check",
          active: isPickupActive("Picked up"),
        },
      ];
    }

    // --- DELIVERY FLOW ---

    const holdHistory: Array<{
      holdTime?: string | Date | null;
      restartedTime?: string | Date | null;
      holdReason?: string;
    }> = order?.holdHistory || [];

    if (status === "Hold" || holdHistory.length > 0) {
      const outTime = formatStatusDate(
        order?.packTime || order?.outDlvrDate || order?.driverCollectedTime,
      );
      const collectedTime = formatStatusDate(order?.driverCollectedTime);
      const onTheWayTime = formatStatusDate(order?.driverStartTime);
      const isHoldNow = status === "Hold";
      const isCompletedOrDelivered =
        status === "Delivered" || status === "Completed";
      const isReturnOrReturned =
        status === "Return" || status === "Return Received";

      const holdItems: Array<{
        title: string;
        date: string;
        icon: string;
        active: boolean;
        description?: string;
      }> = [
        {
          title: "Ordered",
          date: orderTime || "Just now",
          icon: "cart-shopping",
          active: true,
        },
        {
          title: "Processing",
          date: processingTime,
          icon: "box-open",
          active: true,
        },
        {
          title: "Out For Delivery",
          date: outTime || updateTime,
          icon: "dolly",
          active: true,
        },
        {
          title: "Collected",
          date: collectedTime || updateTime,
          icon: "truck",
          active: true,
        },
        {
          title: "On the way",
          date: onTheWayTime || updateTime,
          icon: "truck-fast",
          active: true,
        },
      ];

      holdHistory.forEach((hld) => {
        holdItems.push({
          title: "Hold",
          date: formatStatusDate(hld.holdTime || null) || updateTime,
          icon: "pause",
          active: true,
          description: `Reason : ${hld.holdReason || "On Hold"}`,
        });
        if (hld.restartedTime) {
          holdItems.push({
            title: "On the way",
            date: formatStatusDate(hld.restartedTime as any),
            icon: "truck-fast",
            active: true,
          });
        }
      });

      if (isHoldNow && holdHistory.length === 0) {
        holdItems.push({
          title: "Hold",
          date: updateTime,
          icon: "pause",
          active: true,
          description: "Reason : On Hold",
        });
      }

      if (isCompletedOrDelivered) {
        holdItems.push({
          title: "Delivered",
          date: formatStatusDate(order?.deliveredTime) || updateTime,
          icon: "check",
          active: true,
        });
      } else if (
        !isHoldNow &&
        (status === "On the way" || order?.drvStatus === "On the way")
      ) {
        const lastItem = holdItems[holdItems.length - 1];
        if (!lastItem || lastItem.title !== "On the way") {
          holdItems.push({
            title: "On the way",
            date: updateTime,
            icon: "truck-fast",
            active: true,
          });
        }
        holdItems.push({
          title: "Delivered",
          date: "",
          icon: "check",
          active: false,
        });
      } else if (isReturnOrReturned) {
        const returnTimeFormatted = formatStatusDate(
          order?.returnTime || order?.updatedAt,
        );
        const returnReason =
          order?.returnNote || order?.returnReason || "Customer didn't answer.";
        holdItems.push({
          title: "Returned",
          date: returnTimeFormatted || updateTime,
          icon: "xmark",
          active: true,
          description: `Reason : ${returnReason}`,
        });
      }

      return holdItems;
    }

    if (status === "Return" || status === "Return Received") {
      const collectedTime =
        formatStatusDate(order?.driverCollectedTime) || updateTime;
      const onTheWayTime =
        formatStatusDate(order?.driverStartTime) || updateTime;
      return [
        {
          title: "Ordered",
          date: orderTime || "Just now",
          icon: "cart-shopping",
          active: true,
        },
        {
          title: "Processing",
          date: processingTime,
          icon: "box-open",
          active: true,
        },
        {
          title: "Out For Delivery",
          date: outForDeliveryTime,
          icon: "dolly",
          active: true,
        },
        {
          title: "Collected",
          date: collectedTime,
          icon: "truck",
          active: true,
        },
        {
          title: "On the way",
          date: onTheWayTime,
          icon: "truck-fast",
          active: true,
        },
        {
          title: "Returned",
          date: returnTime || updateTime,
          icon: "xmark",
          active: true,
          description: `Reason : ${returnReasonText}`,
        },
      ];
    }

    if (status === "Cancelled" || status?.toLowerCase() === "cancelled") {
      const showProcessing = isCancelledDuringReview();
      return [
        {
          title: "Ordered",
          date: orderTime || "Just now",
          icon: "cart-shopping",
          active: true,
        },
        ...(showProcessing
          ? [
              {
                title: "Processing",
                date: processingTime,
                icon: "box-open",
                active: true,
              },
            ]
          : []),
        {
          title: "Cancelled",
          date: "",
          icon: "xmark",
          active: true,
        },
      ];
    }

    const isActive = (stage: string) => {
      let normalizedStatus = status;
      if (status === "Pending") normalizedStatus = "Ordered";
      if (status === "Confirmed") normalizedStatus = "Processing";

      const currentIdx = NORMAL_STAGES.indexOf(normalizedStatus);
      const stageIdx = NORMAL_STAGES.indexOf(stage);

      return stageIdx !== -1 && currentIdx >= stageIdx;
    };

    return [
      {
        title: "Ordered",
        date: orderTime || "Just now",
        icon: "cart-shopping",
        active: true,
      },
      {
        title: "Processing",
        date: isActive("Processing") ? processingTime : "",
        icon: "box-open",
        active: isActive("Processing"),
      },
      {
        title: "Out For Delivery",
        date: isActive("Out For Delivery") ? outForDeliveryTime : "",
        icon: "dolly",
        active: isActive("Out For Delivery"),
      },
      {
        title: "Collected",
        date: isActive("Collected")
          ? formatStatusDate(order?.driverCollectedTime) || updateTime
          : "",
        icon: "truck",
        active: isActive("Collected"),
      },
      {
        title: "On the way",
        date: isActive("On the way")
          ? formatStatusDate(order?.driverStartTime) || updateTime
          : "",
        icon: "truck-fast",
        active: isActive("On the way"),
      },
      {
        title: "Delivered",
        date: isActive("Delivered")
          ? formatStatusDate(order?.deliveredTime) || updateTime
          : "",
        icon: "check",
        active: isActive("Delivered"),
      },
    ];
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <CustomHeader
  showBackButton
  navigation={navigation}
  title="Order Details"
  onBackPress={handleBack}
/>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingPage message="Loading Order Details..." fullScreen={false} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* HEADER */}

      <CustomHeader
  showBackButton
  navigation={navigation}
  title="Order Details"
  onBackPress={handleBack}
/>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 15,
          paddingTop: 3,
          paddingBottom: 30,
        }}
      >
        {/* ORDER ID */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E8",
            borderRadius: 20,
            paddingHorizontal: 13,
            paddingTop: 15,
            paddingBottom: 15,
            marginBottom: 15,
          }}
        >
          {/* ORDER ID + COMPLAINT BUTTON */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 12, color: "#747990" }}>Order ID</Text>

              <Text
                style={{
                  fontSize: 15,
                  color: "#111",
                  fontWeight: "600",
                  marginTop: 3,
                }}
              >
                #{invoiceNo || "N/A"}
              </Text>
            </View>

            {/* 1) No complaint yet + Delivered/Picked up within 24h */}
            {!hasComplaint && canReportIssue && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReportIssue}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FDECEF",
                  borderRadius: 99,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons name="help-circle" size={14} color="#B3202F" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color: "#B3202F",
                    marginLeft: 4,
                  }}
                >
                  Report an Issue
                </Text>
              </TouchableOpacity>
            )}

            {/* 2) Complaint opened (not closed) */}
            {isComplaintOpen && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleViewComplaint}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F3F3F7",
                  borderRadius: 99,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="hourglass" size={12} color="#000" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color: "#111",
                    marginLeft: 4,
                  }}
                >
                  Complaint Under Review
                </Text>
              </TouchableOpacity>
            )}

            {/* 3) Complaint closed */}
            {isComplaintClosed && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setReplyModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#000",
                  borderRadius: 99,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="information-circle" size={13} color="#FFF" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color: "#FFF",
                    marginLeft: 4,
                  }}
                >
                  View Complaint Reply
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            {/* Delivery / Pickup Date */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 4,
              }}
            >
              <Ionicons name="calendar-outline" size={11} color="#64748B" />
              <Text
                style={{
                  fontSize: 9,
                  color: "#475569",
                  fontWeight: "500",
                  marginLeft: 3,
                }}
              >
                {formatDate(order?.sheduleDate || order?.scheduleDate)}
              </Text>
            </View>

            <View
              style={{
                width: 1,
                height: 12,
                backgroundColor: "#E2E8F0",
              }}
            />

            {/* Time Slot / Pickup Time */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 4,
              }}
            >
              <Ionicons name="time-outline" size={11} color="#64748B" />
              <Text
                style={{
                  fontSize: 9,
                  color: "#475569",
                  fontWeight: "500",
                  marginLeft: 3,
                }}
              >
                {order?.sheduleTime || order?.scheduleTime || "N/A"}
              </Text>
            </View>

            <View
              style={{
                width: 1,
                height: 12,
                backgroundColor: "#E2E8F0",
              }}
            />

            {/* Total */}
            <View
              style={{
                flex: 1,
                paddingLeft: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  color: "#64748B",
                  fontWeight: "500",
                }}
              >
                Total
              </Text>

              <Text
                style={{
                  fontSize: 10,
                  color: "#0F172A",
                  fontWeight: "700",
                }}
                numberOfLines={1}
              >
                Rs. {formatAmount(order?.fulltotal || order?.fullTotal || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* ORDER STATUS */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E8",
            borderRadius: 20,
            paddingHorizontal: 13,
            paddingTop: 13,
            paddingBottom: 0,
            marginBottom: 17,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#111",
              marginBottom: 15,
            }}
          >
            Order Status
          </Text>

          {getStatusItems().map((status, index) => {
            const desc = (status as any).description;
            const isReason =
              typeof desc === "string" && /^Reason\s*:/i.test(desc);
            const rawBody = isReason
              ? desc.replace(/^Reason\s*:\s*/i, "")
              : desc;
            const cleanReasonBody = isReason
              ? rawBody.replace(/^[“"'\s]+|[”"'\s]+$/g, "")
              : desc;

            return (
              <View
                key={`${status.title}-${index}`}
                style={{
                  flexDirection: "row",
                  minHeight: (status as any).description
                    ? 46
                    : index === getStatusItems().length - 1
                      ? 21
                      : 27,
                  marginBottom: index === getStatusItems().length - 1 ? 14 : 6,
                }}
              >
                {/* Timeline */}

                <View
                  style={{
                    width: 18,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      backgroundColor: status.active ? "#000" : "#E2E5EB",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 2,
                    }}
                  >
                    <FontAwesome6
                      name={status.icon as any}
                      size={8}
                      color="#FFF"
                    />
                  </View>

                  {index !== getStatusItems().length - 1 && (
                    <View
                      style={{
                        position: "absolute",
                        top: 13,
                        bottom: -10,
                        width: 1,
                        backgroundColor: status.active ? "#000" : "#E2E5EB",
                      }}
                    />
                  )}
                </View>

                {/* Status text */}

                <View
                  style={{
                    flex: 1,
                    alignSelf: "flex-start",
                    paddingLeft: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: status.active ? "#111" : "#A5ABB9",
                        fontWeight: "600",
                      }}
                    >
                      {status.title}
                    </Text>

                    {status.date ? (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#5A5859",
                          marginLeft: 5,
                        }}
                      >
                        (At {status.date})
                      </Text>
                    ) : null}
                  </View>

                  {desc ? (
                    isReason ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          marginTop: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#5A5859",
                          }}
                        >
                          Reason : "
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#5A5859",
                            flex: 1,
                            flexShrink: 1,
                          }}
                        >
                          {cleanReasonBody}"
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#5A5859",
                          marginTop: 3,
                        }}
                      >
                        {desc}
                      </Text>
                    )
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* PACKAGES */}
        {packages.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#DDE3E8",
              borderRadius: 20,
              paddingHorizontal: 13,
              paddingTop: 13,
              paddingBottom: 13,
              marginBottom: 17,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Packages ({packages.length})
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!isPackageDispatched}
                onPress={() => openPackageDetails()}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isPackageDispatched ? "#000000" : "#A0AEC0",
                    textDecorationLine: "underline",
                  }}
                >
                  View Details
                </Text>
              </TouchableOpacity>
            </View>

            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                activeOpacity={0.7}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#ECEFF2",
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{
                      uri:
                        pkg.image ||
                        pkg.packageImage ||
                        pkg.items[0]?.image ||
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                    }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 20,
                      marginRight: 10,
                    }}
                  />

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                      }}
                    >
                      {pkg.name} {pkg.quantity > 1 ? `(X${pkg.quantity})` : ""}
                    </Text>

                    <Text
                      style={{
                        fontSize: 13,
                        marginTop: 2,
                      }}
                    >
                      Rs. {formatAmount(pkg.price)}
                      {pkg.quantity > 1 ? ` x ${pkg.quantity} = ` : ""}
                      {pkg.quantity > 1 ? (
                        <Text
                          style={{
                            fontWeight: "600",
                          }}
                        >
                          Rs. {formatAmount(pkg.price * pkg.quantity)}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ALA CARTE ITEMS */}
        {cartItems.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#DDE3E8",
              borderRadius: 20,
              paddingHorizontal: 13,
              paddingTop: 13,
              paddingBottom: 13,
              marginBottom: 17,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Ala Carte Items ({cartItems.length})
            </Text>

            {cartItems.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: "#ECEFF2",
                }}
              >
                <Image
                  source={{
                    uri: item.image,
                  }}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 20,
                    marginRight: 10,
                  }}
                />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#5A5859",
                      marginTop: 2,
                    }}
                  >
                    {item.quantity}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Rs. {formatAmount(item.price)}
                    </Text>

                    {item.oldPrice && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#5A5859",
                          textDecorationLine: "line-through",
                          marginLeft: 4,
                        }}
                      >
                        Rs. {formatAmount(item.oldPrice)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* PRICE DIFFERENCE NOTICE BOX */}
        <InfoNoticeCard
          message="Please note that the total amount on the delivery date may differ from the amount shown on the order date. If there is any price difference, the final amount applicable on the delivery date will be charged later."
          containerStyle={{
            marginBottom: 17,
          }}
        />

        {/* SUMMARY */}
        {(() => {
          const isFreeDeliveryCoupon = Boolean(
            order?.isCoupon &&
            ((order?.couponType &&
              String(order.couponType).toLowerCase().includes("free")) ||
              (order?.couponType &&
                String(order.couponType).toLowerCase().includes("delivery"))),
          );
          const productDiscount = parseFloat(order?.discount || 0);
          const couponDiscount =
            Boolean(order?.isCoupon) && !isFreeDeliveryCoupon
              ? parseFloat(order?.couponValue || 0)
              : 0;
          const orderFullTotal = parseFloat(
            order?.fulltotal || order?.fullTotal || 0,
          );
          const creditPaid = parseFloat(order?.creditPaid || 0);
          const moneyPaid = parseFloat(order?.moneyPaid || 0);
          const paymentMethodLower = (order?.paymentMethod || "").toLowerCase();
          const isCashOrder = paymentMethodLower === "cash";
          const isCardOrder =
            paymentMethodLower === "card" || paymentMethodLower === "payhere";
          const isCreditOrder =
            paymentMethodLower === "credit" ||
            (creditPaid > 0 && moneyPaid === 0 && !isCashOrder && !isCardOrder);
          const isPaid = Number(order?.isPaid) === 1;

          const cashRemainingAmount = Math.max(0, orderFullTotal - creditPaid);

          const cardRemainingAmount =
            moneyPaid > 0
              ? moneyPaid
              : Math.max(0, orderFullTotal - creditPaid);

          const status = order?.processStatus || order?.status || "Pending";
          const isOrderCancelled =
            status === "Cancelled" ||
            status.toLowerCase() === "cancelled" ||
            (order?.processStatus || "").toLowerCase() === "cancelled" ||
            (order?.status || "").toLowerCase() === "cancelled";
          const isOrderReturned =
            status === "Return" || status === "Return Received";
          const totalPaidByCustomer = isCardOrder ? orderFullTotal : creditPaid;
          const handlingFee = parseFloat(order?.returnHandlingFee || 350);
          const deliveryFeeDeduction = parseFloat(
            order?.curDlvrCharge ||
              order?.delivaryCharge ||
              order?.deliveryCharge ||
              300,
          );
          const restoredCredit =
            totalPaidByCustomer > 0
              ? totalPaidByCustomer - handlingFee - deliveryFeeDeduction
              : -handlingFee;

          const paymentSummaryTotal = isOrderReturned
            ? isCardOrder
              ? orderFullTotal
              : creditPaid
            : orderFullTotal;

          const isPickup =
            (
              order?.delivaryMethod ||
              order?.deliveryMethod ||
              order?.deliveryType ||
              ""
            ).toUpperCase() === "PICKUP";

          return (
            <>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#DDE3E8",
                  borderRadius: 20,
                  paddingHorizontal: 13,
                  paddingTop: 13,
                  paddingBottom: 13,
                  marginBottom: isOrderCancelled ? 0 : 17,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 15,
                  }}
                >
                  Summary
                </Text>

                {packages.length > 0 && (
                  <>
                    <SummaryRow
                      label="Packages"
                      value={`Rs. ${formatAmount(packages.reduce((acc, p) => acc + p.price * p.quantity, 0))}`}
                    />
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 8,
                      }}
                    />
                  </>
                )}

                {cartItems.length > 0 && (
                  <>
                    <SummaryRow
                      label="Ala Carte Items"
                      value={`Rs. ${formatAmount(cartItems.reduce((acc, item) => acc + item.price, 0))}`}
                    />
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 8,
                      }}
                    />
                  </>
                )}

                {productDiscount > 0 && (
                  <>
                    <SummaryRow
                      label="Product Discount"
                      value={`- Rs. ${formatAmount(productDiscount)}`}
                    />
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 8,
                      }}
                    />
                  </>
                )}

                {couponDiscount > 0 && (
                  <>
                    <SummaryRow
                      label="Coupon Discount"
                      value={`- Rs. ${formatAmount(couponDiscount)}`}
                    />
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 8,
                      }}
                    />
                  </>
                )}

                {!isPickup && (
                  <>
                    <SummaryRow
                      label="Delivery Fee"
                      value={
                        isFreeDeliveryCoupon
                          ? "+ Rs. 0.00"
                          : `+ Rs. ${formatAmount(parseFloat(order?.delivaryCharge || order?.deliveryCharge) || 0)}`
                      }
                    />

                    {isFreeDeliveryCoupon && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#34C759",
                          marginTop: 2,
                          marginBottom: 4,
                        }}
                      >
                        *Applied Delivery Fee Coupon
                      </Text>
                    )}

                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E1E7EE",
                        marginVertical: 6,
                      }}
                    />
                  </>
                )}

                <SummaryRow
                  label="Total"
                  value={`Rs. ${formatAmount(orderFullTotal)}`}
                  bold
                />
              </View>

              {/* PAYMENT SUMMARY */}
              {!isOrderCancelled && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#DDE3E8",
                    borderRadius: 20,
                    paddingHorizontal: 13,
                    paddingTop: 13,
                    paddingBottom: 13,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 15,
                    }}
                  >
                    Payment Summery
                  </Text>

                  {(creditPaid > 0 || isCreditOrder) && (
                    <SummaryRow
                      label="Paid By Polygon Wallet"
                      value={`Rs. ${formatAmount(creditPaid > 0 ? creditPaid : orderFullTotal)}`}
                      icon="wallet"
                      iconColor="#8D5B4C"
                    />
                  )}

                  {isCardOrder && cardRemainingAmount > 0 && (
                    <SummaryRow
                      label={isPaid ? "Paid with Card" : "Pay with Card"}
                      value={`Rs. ${formatAmount(cardRemainingAmount)}`}
                      icon="credit-card"
                      iconColor="#0088FF"
                    />
                  )}

                  {isCashOrder &&
                    (isOrderReturned || cashRemainingAmount > 0) && (
                      <SummaryRow
                        label={
                          isOrderReturned || isPaid
                            ? "Paid with Cash"
                            : "Pay with Cash"
                        }
                        value={
                          isOrderReturned
                            ? "Rs. 0.00"
                            : `Rs. ${formatAmount(cashRemainingAmount)}`
                        }
                        icon="money-bill-wave"
                        iconColor="#00B83D"
                        valueColor={
                          isOrderReturned || isPaid ? "#00B83D" : "#FF9114"
                        }
                      />
                    )}

                  {!isCardOrder &&
                    !isCashOrder &&
                    !isCreditOrder &&
                    creditPaid === 0 && (
                      <SummaryRow
                        label={`Paid with ${order?.paymentMethod || "Card"}`}
                        value={`Rs. ${formatAmount(orderFullTotal)}`}
                        icon="credit-card"
                        iconColor="#0088FF"
                      />
                    )}

                  <View style={{ height: 4 }} />

                  <SummaryRow
                    label="Total"
                    value={`Rs. ${formatAmount(paymentSummaryTotal)}`}
                    bold
                  />
                </View>
              )}

              {/* ORDER SUMMARY DUE TO RETURN */}
              {isOrderReturned && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#EF4444",
                    borderRadius: 20,
                    paddingHorizontal: 13,
                    paddingTop: 13,
                    paddingBottom: 13,
                    marginTop: 17,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#EF4444",
                      marginBottom: 15,
                    }}
                  >
                    Order Summery Due to Return
                  </Text>

                  <SummaryRow
                    label="Total Pay By Customer"
                    value={`Rs. ${formatAmount(totalPaidByCustomer)}`}
                  />

                  <SummaryRow
                    label="Handling Fee Deduction"
                    value={`- Rs. ${formatAmount(handlingFee)}`}
                    valueColor="#EF4444"
                  />

                  {totalPaidByCustomer > 0 && (
                    <SummaryRow
                      label="Delivery Fee Deduction"
                      value={`- Rs. ${formatAmount(deliveryFeeDeduction)}`}
                      valueColor="#EF4444"
                    />
                  )}

                  <View style={{ height: 6 }} />

                  <SummaryRow
                    label="Restored Credit"
                    value={
                      restoredCredit < 0
                        ? `- Rs. ${formatAmount(Math.abs(restoredCredit))}`
                        : `Rs. ${formatAmount(restoredCredit)}`
                    }
                    valueColor={restoredCredit < 0 ? "#EF4444" : "#00B83D"}
                    bold
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#5A5859"
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "#5A5859",
                        lineHeight: 16,
                      }}
                    >
                      {restoredCredit < 0
                        ? "Check your profile to view your credit balance. Please clear any negative balance before making your next purchase."
                        : "Check your profile to view your credit balance. Use it on your next purchase."}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ height: 25 }} />
            </>
          );
        })()}
      </ScrollView>

      {/* PACKAGE DETAILS MODAL */}
      <PackageModal
        visible={packageModalVisible}
        onVisible={setPackageModalVisible}
        packages={packages}
      />

      {/* COMPLAINT REPLY MODAL */}
      <ComplaintReply
        visible={replyModalVisible}
        onClose={() => setReplyModalVisible(false)}
        reply={complaint?.reply}
        replyTime={complaint?.replyTime}
      />
    </View>
  );
};

export default OrderDetails;
