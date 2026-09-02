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
import { RootStackParamList } from "../../types/types";
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
        const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^\d.]/g, "")) || 0;
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

    const formatStatusDate = (dateString: string) => {
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
                        const priceNum = parseFloat(p.productPrice.replace(/[^\d.]/g, "")) || 0;
                        return {
                            id: idx + 1,
                            name: p.displayName,
                            quantity: 1,
                            price: priceNum,
                            items: p.products.map((prod: any) => ({
                                itemName: prod.typeName,
                                quantity: `${prod.qty} units`,
                                image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                            })),
                        };
                    });
                    setPackages(mappedPackages);
                }

                if (itemsRes.data && itemsRes.data.status) {
                    const mappedItems: CartItem[] = itemsRes.data.data.map((item: any, idx: number) => {
                        const priceNum = parseFloat(item.price) || 0;
                        const qty = parseFloat(item.qty) || 1;
                        return {
                            id: idx + 1,
                            name: item.displayName || "Unknown Item",
                            quantity: `${qty} ${item.unit || "units"}`,
                            price: priceNum * qty,
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
    const STATUS_STAGES = [
        "Ordered",
        "Processing",
        "Cancelled",
        "Out For Delivery",
        "Collected",
        "On the Way",
        "Hold",
        "Delivered",
        "Return",
        "Return Received"
    ];

    const getStatusItems = () => {
        const status = order?.processStatus || "Pending";
        const updateTime = formatStatusDate(order?.updatedAt || order?.createdAt);
        const orderTime = formatStatusDate(order?.createdAt);

        const isActive = (stage: string) => {
            const stages = STATUS_STAGES;
            const currentIdx = stages.indexOf(status);
            const stageIdx = stages.indexOf(stage);

            if (status === "Hold") {
                return stage === "Hold" || stageIdx <= stages.indexOf("Processing");
            }

            if (stage === "Hold") return false;

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
                date: isActive("Out For Delivery") ? updateTime : "",
                icon: "dolly",
                active: isActive("Out For Delivery"),
            },
            {
                title: "Collected",
                date: isActive("Collected") ? updateTime : "",
                icon: "truck",
                active: isActive("Collected"),
            },
            {
                title: "Cancelled",
                date: isActive("Cancelled") ? updateTime : "",
                icon: "close",
                active: isActive("Cancelled"),
            },
            {
                title: "On the Way",
                date: isActive("On the Way") ? updateTime : "",
                icon: "truck-fast",
                active: isActive("On the Way"),
            },
            {
                title: "Hold",
                date: status === "Hold" ? updateTime : "",
                icon: "pause",
                active: status === "Hold",
                description: status === "Hold" ? 'Reason: "On Hold"' : undefined,
            },
            {
                title: "Delivered",
                date: status === "Delivered" ? updateTime : "",
                icon: "check",
                active: status === "Delivered",
            },
            {
                title: "Return",
                date: isActive("Return") ? updateTime : "",
                icon: "arrows-rotate",
                active: isActive("Return"),
            },
            {
                title: "Return Received",
                date: isActive("Return Received") ? updateTime : "",
                icon: "arrows-rotate",
                active: isActive("Return Received"),
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
                            fontSize: 10,
                            color: "#747990",
                        }}
                    >
                        Order ID
                    </Text>

                    <Text
                        style={{
                            fontSize: 12,
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
                            marginTop: 7,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingRight: 7,
                                
                            }}
                        >
                            <View style={{ backgroundColor:"#000000", padding: 4, borderRadius: 999, width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
                            <FontAwesome6
                                name="calendar"
                                solid
                                size={10}
                                color="#FFFFFF"
                            
                            />
                            </View>

                            <Text
                                style={{
                                    fontSize: 10,
                                    marginLeft: 3,
                                }}
                            >
                                {formatDate(order?.sheduleDate || order?.scheduleDate)}
                            </Text>
                        </View>

                        <View
                            style={{
                                width: 1,
                                height: 13,
                                backgroundColor: "#DDE1E5",
                            }}
                        />

                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 7,
                            }}
                        >
                             <View style={{ backgroundColor:"#000000", padding: 4, borderRadius: 999, width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
                            <FontAwesome6
                                name="clock"
                                solid
                                size={8}
                                color="#FFFFFF"
                            
                            />
                            </View>

                            <Text
                                style={{
                                    fontSize: 10,
                                    marginLeft: 3,
                                }}
                            >
                                {order?.sheduleTime || order?.scheduleTime || "N/A"}
                            </Text>
                        </View>

                        <View
                            style={{
                                width: 1,
                                height: 13,
                                backgroundColor: "#DDE1E5",
                            }}
                        />

                        <View
                            style={{
                                flex: 1,
                                paddingLeft: 7,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: "#747990",
                                }}
                            >
                                Total
                            </Text>

                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                }}
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
                            key={status.title}
                            style={{
                                flexDirection: "row",
                                minHeight:
                                    index ===
                                        getStatusItems().length - 1
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
                                    flexDirection:
                                        "row",
                                    alignSelf:
                                        "flex-start",
                                    paddingLeft: 10,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: status.active ? "#111" : "#A5ABB9",
                                        fontWeight: "600",
                                    }}
                                >
                                    {status.title}
                                </Text>

                                {status.date ? (
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: "#5A5859",
                                            marginLeft: 5,
                                        }}
                                    >
                                        (At {status.date})
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
                        <Text style={{ fontSize: 12, fontWeight: "500", color: "#222" }}>
                            Store: {order.pickupInfo.centerName}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
                            Contact: {order.pickupInfo.contact01}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
                            Address: {[
                                order.pickupInfo.address?.street,
                                order.pickupInfo.address?.city,
                                order.pickupInfo.address?.district,
                            ].filter(Boolean).join(", ")}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: "#222", marginTop: 10 }}>
                            Pickup Person
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
                            Name: {order.pickupInfo.pickupPerson?.fullName}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
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
                        <Text style={{ fontSize: 12, fontWeight: "500", color: "#222" }}>
                            {order.deliveryInfo.fullName || "--"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
                            Phone: {order.deliveryInfo.phone || "--"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#5A5859", marginTop: 2 }}>
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
                                    fontSize: 12,
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
                                        fontSize: 10,
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
                                                pkg.items[0]?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
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
                                                fontSize: 12,
                                                fontWeight:
                                                    "500",
                                            }}
                                        >
                                            {pkg.name} (x
                                            {pkg.quantity})
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 12,
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
                                fontSize: 12,
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
                                            fontSize: 12,
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
                                                fontSize: 12,
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
                                                    fontSize: 10,
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
                                    backgroundColor:
                                        "#E1E7EE",
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
                                    backgroundColor:
                                        "#E1E7EE",
                                    marginVertical: 8,
                                }}
                            />
                        </>
                    )}

                    <SummaryRow
                        label="Product Discount"
                        value={`- Rs. ${formatAmount(parseFloat(order?.discount) || 0)}`}
                    />

                    <View
                        style={{
                            height: 1,
                            backgroundColor:
                                "#E1E7EE",
                            marginVertical: 8,
                        }}
                    />

                    <SummaryRow
                        label="Delivery Fee"
                        value={order?.delivaryMethod === 'PICKUP' ? "Rs. 0.00" : `+ Rs. ${formatAmount(parseFloat(order?.delivaryCharge || order?.deliveryCharge) || 0)}`}
                    />

                    {(parseFloat(order?.discount) || 0) > 0 && (
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#34C759",
                                marginTop: 4,
                                marginBottom: 4,
                            }}
                        >
                            *Applied Coupon Discount
                        </Text>
                    )}

                    <View
                        style={{
                            height: 1,
                            backgroundColor:
                                "#E1E7EE",
                            marginVertical: 3,
                        }}
                    />

                    <SummaryRow
                        label="Total"
                        value={`Rs. ${formatAmount(order?.fulltotal || order?.fullTotal || 0)}`}
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
                        Payment Summary
                    </Text>

                    <SummaryRow
                        label={`Paid with ${order?.paymentMethod || "Card"}`}
                        value={`Rs. ${formatAmount(order?.fulltotal || order?.fullTotal || 0)}`}
                        icon="credit-card"
                        iconColor="#0088FF"
                    />

                    <View
                        style={{
                            height: 1,
                            backgroundColor:
                                "#E1E7EE",
                            marginVertical: 8,
                        }}
                    />

                    <SummaryRow
                        label="Total"
                        value={`Rs. ${formatAmount(order?.fulltotal || order?.fullTotal || 0)}`}
                        bold
                    />
                </View>
            </ScrollView>

            {/* PACKAGE DETAILS MODAL */}
            <PackageModal visible={packageModalVisible} onVisible={setPackageModalVisible} packages={packages} />
        </View>
    );
};

export default OrderDetails;