import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { SummaryRow } from "@/component/order/SummaryRow";
import { PackageModal } from "@/component/order/PackageModal";
import LoadingPage from "@/component/common/LoadingPage";
import orderService from "@/services/order/order.service";

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



const OrderDetails: React.FC<Props> = ({ navigation, route }) => {
    const orderId = route.params?.orderId;

    const [order, setOrder] = useState<any>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [packageModalVisible, setPackageModalVisible] =
        useState(false);

    const [selectedPackage, setSelectedPackage] =
        useState<Package | null>(null);

    const formatAmount = (amount: number | string) => {
        const num =
            typeof amount === "number"
                ? amount
                : parseFloat(
                      String(amount || "")
                          .replace(/Rs\.?/gi, "")
                          .replace(/LKR/gi, "")
                          .replace(/,/g, "")
                          .trim()
                  ) || 0;
        return num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
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

    const openPackageDetails = () => {
        setPackageModalVisible(true);
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
                    // console.log("Fetched Order:", orderRes.data.order);
                    setOrder(orderRes.data.order);
                }

                if (packagesRes.data && packagesRes.data.status) {
                    const mappedPackages: Package[] = packagesRes.data.data.map((p: any, idx: number) => {
                        const priceNum = typeof p.priceNum === "number"
                            ? p.priceNum
                            : (typeof p.productPrice === "number"
                                ? p.productPrice
                                : parseFloat(String(p.productPrice || "").replace(/Rs\.?/i, "").replace(/,/g, "").trim()) || 0);
                        return {
                            id: idx + 1,
                            name: p.displayName,
                            quantity: 1,
                            price: priceNum,
                            image: p.packageImage || p.image || (p.products && p.products[0]?.image) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                            packageImage: p.packageImage || p.image,
                            items: (p.products || []).map((prod: any) => ({
                                itemName: prod.itemName || prod.typeName || "Item",
                                quantity: prod.quantity || `${prod.qty} units`,
                                image: prod.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                            })),
                        };
                    });
                    setPackages(mappedPackages);
                }

                if (itemsRes.data && itemsRes.data.status) {
                    const mappedItems: CartItem[] = itemsRes.data.data.map((item: any, idx: number) => {
                        const priceNum = typeof item.price === "number"
                            ? item.price
                            : parseFloat(String(item.price || "").replace(/Rs\.?/i, "").replace(/,/g, "").trim()) || 0;
                        const qty = parseFloat(item.qty) || 1;
                        return {
                            id: idx + 1,
                            name: item.displayName || "Unknown Item",
                            quantity: `${qty} ${item.unit || "units"}`,
                            price: priceNum,
                            image: item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                        };
                    });
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
    const NORMAL_STAGES = [
        "Ordered",
        "Processing",
        "Out For Delivery",
        "Collected",
        "On the way",
        "Delivered"
    ];

    const getStatusItems = () => {
        const isPickup = (order?.delivaryMethod || order?.deliveryType || "").toUpperCase() === "PICKUP";
        const status = order?.processStatus || "Pending";
        const updateTime = formatStatusDate(order?.updatedAt || order?.createdAt);
        const orderTime = formatStatusDate(order?.createdAt);
        const packTimeFormatted = formatStatusDate(order?.packTime);
        const outForDeliveryTime = packTimeFormatted || updateTime;
        const returnTime = formatStatusDate(order?.returnTime || order?.updatedAt);
        const returnReasonText = order?.returnNote || order?.returnReason || "Customer didn't answer.";

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
                const pickupReturnReason = order?.returnNote || order?.returnReason || "Customer did not picked up the order during the day.";
                return [
                    {
                        title: "Ordered",
                        date: orderTime || "Just now",
                        icon: "cart-shopping",
                        active: true,
                    },
                    {
                        title: "Processing",
                        date: updateTime,
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
                        date: returnTime || updateTime,
                        icon: "xmark",
                        active: true,
                        description: `Reason : "${pickupReturnReason}"`,
                    },
                ];
            }

            if (status === "Cancelled") {
                return [
                    {
                        title: "Ordered",
                        date: orderTime || "Just now",
                        icon: "cart-shopping",
                        active: true,
                    },
                    {
                        title: "Processing",
                        date: updateTime,
                        icon: "box-open",
                        active: true,
                    },
                    {
                        title: "Cancelled",
                        date: updateTime,
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
                    date: isPickupActive("Processing") ? updateTime : "",
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

        // If order had any hold history or is on hold, construct a dynamic timeline with all stages including Hold, restarted On the way, and Returned/Delivered
        const holdHistory: Array<{ holdTime?: string | Date | null; restartedTime?: string | Date | null; holdReason?: string }> = order?.holdHistory || [];

        if (status === "Hold" || holdHistory.length > 0) {
            const outTime = formatStatusDate(order?.packTime || order?.outDlvrDate || order?.driverCollectedTime);
            const collectedTime = formatStatusDate(order?.driverCollectedTime);
            const onTheWayTime = formatStatusDate(order?.driverStartTime);
            const isHoldNow = status === "Hold";
            const isCompletedOrDelivered = status === "Delivered" || status === "Completed";
            const isReturnOrReturned = status === "Return" || status === "Return Received";

            const holdItems: Array<{ title: string; date: string; icon: string; active: boolean; description?: string }> = [
                {
                    title: "Ordered",
                    date: orderTime || "Just now",
                    icon: "cart-shopping",
                    active: true,
                },
                {
                    title: "Processing",
                    date: updateTime,
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

            // Add each hold event (and restarted "On the way" step)
            holdHistory.forEach((hld) => {
                holdItems.push({
                    title: "Hold",
                    date: formatStatusDate(hld.holdTime || null) || updateTime,
                    icon: "pause",
                    active: true,
                    description: `Reason : "${hld.holdReason || "On Hold"}"`,
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

            // If status is currently Hold but holdHistory had no items
            if (isHoldNow && holdHistory.length === 0) {
                holdItems.push({
                    title: "Hold",
                    date: updateTime,
                    icon: "pause",
                    active: true,
                    description: 'Reason : "On Hold"',
                });
            }

            // If the order has progressed past Hold to Delivered / Completed
            if (isCompletedOrDelivered) {
                holdItems.push({
                    title: "Delivered",
                    date: formatStatusDate(order?.deliveredTime) || updateTime,
                    icon: "check",
                    active: true,
                });
            } else if (!isHoldNow && (status === "On the way" || order?.drvStatus === "On the way")) {
                // If currently On the way and the last item in holdItems is not "On the way"
                const lastItem = holdItems[holdItems.length - 1];
                if (!lastItem || lastItem.title !== "On the way") {
                    holdItems.push({
                        title: "On the way",
                        date: updateTime,
                        icon: "truck-fast",
                        active: true,
                    });
                }
                // Also show inactive Delivered stage if it's currently on the way
                holdItems.push({
                    title: "Delivered",
                    date: "",
                    icon: "check",
                    active: false,
                });
            } else if (isReturnOrReturned) {
                const returnTimeFormatted = formatStatusDate(order?.returnTime || order?.updatedAt);
                const returnReason = order?.returnNote || order?.returnReason || "Customer didn't answer.";
                holdItems.push({
                    title: "Returned",
                    date: returnTimeFormatted || updateTime,
                    icon: "xmark",
                    active: true,
                    description: `Reason : "${returnReason}"`,
                });
            }

            return holdItems;
        }

        if (status === "Return" || status === "Return Received") {
            const collectedTime = formatStatusDate(order?.driverCollectedTime) || updateTime;
            const onTheWayTime = formatStatusDate(order?.driverStartTime) || updateTime;
            return [
                {
                    title: "Ordered",
                    date: orderTime || "Just now",
                    icon: "cart-shopping",
                    active: true,
                },
                {
                    title: "Processing",
                    date: updateTime,
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
                    description: `Reason : "${returnReasonText}"`,
                },
            ];
        }

        if (status === "Cancelled") {
            return [
                {
                    title: "Ordered",
                    date: orderTime || "Just now",
                    icon: "cart-shopping",
                    active: true,
                },
                {
                    title: "Processing",
                    date: updateTime,
                    icon: "box-open",
                    active: true,
                },
                {
                    title: "Cancelled",
                    date: updateTime,
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
                date: isActive("Processing") ? updateTime : "",
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
                date: isActive("Collected") ? (formatStatusDate(order?.driverCollectedTime) || updateTime) : "",
                icon: "truck",
                active: isActive("Collected"),
            },
            {
                title: "On the way",
                date: isActive("On the way") ? (formatStatusDate(order?.driverStartTime) || updateTime) : "",
                icon: "truck-fast",
                active: isActive("On the way"),
            },
            {
                title: "Delivered",
                date: isActive("Delivered") ? (formatStatusDate(order?.deliveredTime) || updateTime) : "",
                icon: "check",
                active: isActive("Delivered"),
            },
        ];
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
                <CustomHeader showBackButton navigation={navigation} title="Order Details" />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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

            <CustomHeader showBackButton navigation={navigation} title="Order Details" />

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
                    <Text
                        style={{
                            fontSize: 12,
                            color: "#747990",
                        }}
                    >
                        Order ID
                    </Text>

                    <Text
                        style={{
                            fontSize: 15,
                            color: "#111",
                            fontWeight: "600",
                            marginTop: 3,
                        }}
                    >
                        #{order?.invoiceNo || order?.invoiceNumber || order?.invNo || "N/A"}
                    </Text>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 8,
                        }}
                    >
                        {/* Delivery Date */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingRight: 4,
                            }}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={11}
                                color="#64748B"
                            />
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

                        {/* Time Slot */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 4,
                            }}
                        >
                            <Ionicons
                                name="time-outline"
                                size={11}
                                color="#64748B"
                            />
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

                    {getStatusItems().map((status, index) => (
                        <View
                            key={`${status.title}-${index}`}
                            style={{
                                flexDirection: "row",
                                minHeight:
                                    (status as any).description
                                        ? 46
                                        : index === getStatusItems().length - 1
                                            ? 21
                                            : 27,
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
                                        backgroundColor:
                                            status.active ? "#000" : "#E2E5EB",
                                        justifyContent:
                                            "center",
                                        alignItems:
                                            "center",
                                        zIndex: 2,
                                        marginBottom: 20,
                                    }}
                                >
                                    <FontAwesome6
                                        name={
                                            status.icon as any
                                        }
                                        size={8}
                                        color="#FFF"
                                    />
                                </View>

                                {index !==
                                    getStatusItems().length -
                                    1 && (
                                        <View
                                            style={{
                                                position:
                                                    "absolute",
                                                top: 13,
                                                width: 1,
                                                height: 40,
                                                backgroundColor:
                                                    status.active ? "#000" : "#E2E5EB",
                                            }}
                                        />
                                    )}
                            </View>

                            {/* Status text */}

                            <View
                                style={{
                                    flex: 1,
                                    alignSelf:
                                        "flex-start",
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

                                {(status as any).description ? (
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: "#5A5859",
                                            marginTop: 3,
                                        }}
                                    >
                                        {(status as any).description}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>

                {/* DELIVERY / PICKUP INFORMATION */}
                {order?.delivaryMethod === 'PICKUP' && order?.pickupInfo ? (
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
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 8 }}>
                            Pickup Store Information
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#222" }}>
                            Store: {order.pickupInfo.centerName}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Contact: {order.pickupInfo.contact01}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Address: {[
                                order.pickupInfo.address?.street,
                                order.pickupInfo.address?.city,
                                order.pickupInfo.address?.district,
                            ].filter(Boolean).join(", ")}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#222", marginTop: 10 }}>
                            Pickup Person
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Name: {order.pickupInfo.pickupPerson?.fullName}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Phone: {order.pickupInfo.pickupPerson?.phone1}
                        </Text>
                    </View>
                ) : order?.delivaryMethod === 'DELIVERY' && order?.deliveryInfo ? (
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
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 8 }}>
                            Delivery Address
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#222" }}>
                            {order.deliveryInfo.fullName || "--"}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Phone: {order.deliveryInfo.phone || "--"}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#5A5859", marginTop: 2 }}>
                            Address: {order.deliveryInfo.buildingType === "Apartment" ? (
                                `Flat ${order.deliveryInfo.flatNo}, Floor ${order.deliveryInfo.floorNo}, Building ${order.deliveryInfo.buildingNo} (${order.deliveryInfo.buildingName}), ${order.deliveryInfo.street}, ${order.deliveryInfo.city}`
                            ) : (
                                `${order.deliveryInfo.houseNo || ""}, ${order.deliveryInfo.streetName || ""}, ${order.deliveryInfo.city || ""}`
                            )}
                        </Text>
                    </View>
                ) : null}

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
                                justifyContent:
                                    "space-between",
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
                                onPress={() => openPackageDetails()}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "600",
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
                                    borderTopColor:
                                        "#ECEFF2",
                                    paddingVertical: 10,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection:
                                            "row",
                                        alignItems:
                                            "center",
                                    }}
                                >
                                    <Image
                                        source={{
                                            uri:
                                                pkg.image || pkg.packageImage || pkg.items[0]?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
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
                                                fontWeight:
                                                    "500",
                                            }}
                                        >
                                            {pkg.name} (x
                                            {pkg.quantity})
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 13,
                                                marginTop: 2,
                                            }}
                                        >
                                            Rs.{" "}
                                            {formatAmount(
                                                pkg.price
                                            )} x{" "}
                                            {pkg.quantity} =
                                            {" "}
                                            <Text
                                                style={{
                                                    fontWeight:
                                                        "600",
                                                }}
                                            >
                                                Rs.{" "}
                                                {formatAmount(
                                                    pkg.price *
                                                    pkg.quantity
                                                )}
                                            </Text>
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
                                    flexDirection:
                                        "row",
                                    alignItems: "center",
                                    paddingVertical: 10,
                                    borderTopWidth: 1,
                                    borderTopColor:
                                        "#ECEFF2",
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
                                            fontWeight:
                                                "500",
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
                                            flexDirection:
                                                "row",
                                            alignItems:
                                                "center",
                                            marginTop: 1,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight:
                                                    "600",
                                            }}
                                        >
                                            Rs.{" "}
                                            {formatAmount(
                                                item.price
                                            )}
                                        </Text>

                                        {item.oldPrice && (
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color:
                                                        "#5A5859",
                                                    textDecorationLine:
                                                        "line-through",
                                                    marginLeft: 4,
                                                }}
                                            >
                                                Rs.{" "}
                                                {formatAmount(
                                                    item.oldPrice
                                                )}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* SUMMARY */}
                {(() => {
                    const isFreeDeliveryCoupon = Boolean(
                        order?.isCoupon && (
                            (order?.couponType && String(order.couponType).toLowerCase().includes("free")) ||
                            (order?.couponType && String(order.couponType).toLowerCase().includes("delivery"))
                        )
                    );
                    const productDiscount = parseFloat(order?.discount || 0);
                    const couponDiscount = Boolean(order?.isCoupon) && !isFreeDeliveryCoupon ? parseFloat(order?.couponValue || 0) : 0;
                    const orderFullTotal = parseFloat(order?.fulltotal || order?.fullTotal || 0);
                    const creditPaid = parseFloat(order?.creditPaid || 0);
                    const moneyPaid = parseFloat(order?.moneyPaid || 0);
                    const paymentMethodLower = (order?.paymentMethod || "").toLowerCase();
                    const isCashOrder = paymentMethodLower === "cash";
                    const isCardOrder = paymentMethodLower === "card" || paymentMethodLower === "payhere";
                    const isCreditOrder = paymentMethodLower === "credit" || (creditPaid > 0 && moneyPaid === 0 && !isCashOrder && !isCardOrder);
                    const isPaid = Number(order?.isPaid) === 1;

                    // Remaining cash amount: fullTotal - creditPaid (as specified by user, since processorders.amount is 0 until paid)
                    const cashRemainingAmount = Math.max(0, orderFullTotal - creditPaid);

                    // Remaining card amount: moneyPaid if > 0, else fullTotal - creditPaid
                    const cardRemainingAmount = moneyPaid > 0 ? moneyPaid : Math.max(0, orderFullTotal - creditPaid);

                    // Return calculations
                    const status = order?.processStatus || order?.status || "Pending";
                    const isOrderReturned = status === "Return" || status === "Return Received";
                    const totalPaidByCustomer = isCardOrder ? orderFullTotal : creditPaid;
                    const handlingFee = parseFloat(order?.returnHandlingFee || 350);
                    const deliveryFeeDeduction = parseFloat(order?.curDlvrCharge || order?.delivaryCharge || order?.deliveryCharge || 300);
                    const restoredCredit = totalPaidByCustomer > 0
                        ? (totalPaidByCustomer - handlingFee - deliveryFeeDeduction)
                        : -handlingFee;

                    const paymentSummaryTotal = isOrderReturned
                        ? (isCardOrder ? orderFullTotal : creditPaid)
                        : orderFullTotal;

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
                                    marginBottom: 17,
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

                                <SummaryRow
                                    label="Delivery Fee"
                                    value={
                                        order?.delivaryMethod === 'PICKUP'
                                            ? "Rs. 0.00"
                                            : (isFreeDeliveryCoupon ? "+ Rs. 0.00" : `+ Rs. ${formatAmount(parseFloat(order?.delivaryCharge || order?.deliveryCharge) || 0)}`)
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

                                <SummaryRow
                                    label="Total"
                                    value={`Rs. ${formatAmount(orderFullTotal)}`}
                                    bold
                                />
                            </View>

                            {/* PAYMENT SUMMARY */}
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

                                {/* Paid By Credit */}
                                {(creditPaid > 0 || isCreditOrder) && (
                                    <SummaryRow
                                        label="Paid By Credit"
                                        value={`Rs. ${formatAmount(creditPaid > 0 ? creditPaid : orderFullTotal)}`}
                                        icon="wallet"
                                        iconColor="#8D5B4C"
                                    />
                                )}

                                {/* Paid with Card */}
                                {isCardOrder && cardRemainingAmount > 0 && (
                                    <SummaryRow
                                        label="Paid with Card"
                                        value={`Rs. ${formatAmount(cardRemainingAmount)}`}
                                        icon="credit-card"
                                        iconColor="#0088FF"
                                    />
                                )}

                                {/* Cash Row:
                                    If returned: always show "Paid with Cash", "Rs. 0.00", in green (#00B83D).
                                    If not returned: show "Paid with Cash" (green) if isPaid, else "Pay with Cash" (orange).
                                */}
                                {isCashOrder && (isOrderReturned || cashRemainingAmount > 0) && (
                                    <SummaryRow
                                        label={isOrderReturned || isPaid ? "Paid with Cash" : "Pay with Cash"}
                                        value={isOrderReturned ? "Rs. 0.00" : `Rs. ${formatAmount(cashRemainingAmount)}`}
                                        icon="money-bill-wave"
                                        iconColor="#00B83D"
                                        valueColor={isOrderReturned || isPaid ? "#00B83D" : "#FF9114"}
                                    />
                                )}

                                {/* Fallback if none of the above matched */}
                                {!isCardOrder && !isCashOrder && !isCreditOrder && creditPaid === 0 && (
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
            <PackageModal visible={packageModalVisible} onVisible={setPackageModalVisible} packages={packages} />
        </View>
    );
};

export default OrderDetails;