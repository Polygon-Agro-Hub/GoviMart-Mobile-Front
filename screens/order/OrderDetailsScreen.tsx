import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,

} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { SummaryRow } from "@/component/order/SummaryRow";
import { PackageModal } from "@/component/order/PackageModal";
import { cartItems, packages } from "@/component/order/sampleData";

type OrderDetailsNavigationProp = StackNavigationProp<
    RootStackParamList,
    "OrderDetails"
>;

interface Props {
    navigation: OrderDetailsNavigationProp;
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



const OrderDetails: React.FC<Props> = ({ navigation }) => {
    const [packageModalVisible, setPackageModalVisible] =
        useState(false);

    const [selectedPackage, setSelectedPackage] =
        useState<Package | null>(null);

    const formatAmount = (amount: number) => {
        return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const openPackageDetails = () => {
        setPackageModalVisible(true);
    };

    const statusItems = [
        {
            title: "Ordered",
            date: "01:00 PM on Aug 02, 2026",
            icon: "cart",
            active: true,
        },
        {
            title: "Processing",
            date: "07:00 PM on Aug 03, 2026",
            icon: "sync",
            active: true,
        },
        {
            title: "Out For Delivery",
            date: "06:00 AM on Aug 05, 2026",
            icon: "car",
            active: true,
        },
        {
            title: "Collected",
            date: "08:00 AM on Aug 06, 2026",
            icon: "bag",
            active: true,
        },
        {
            title: "On the Way",
            date: "10:10 AM on Aug 06, 2026",
            icon: "navigate",
            active: true,
        },
        {
            title: "Hold",
            date: "11:00 AM on Aug 05, 2026",
            icon: "pause",
            active: true,
            description:
                'Reason: "Customer didn’t answered"',
        },
        {
            title: "Delivered",
            date: "11:10 AM on Aug 06, 2026",
            icon: "checkmark",
            active: true,
        },
    ];

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
                        [Invoice Number]
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
                            <Ionicons
                                name="location"
                                size={8}
                                color="#000"
                            />

                            <Text
                                style={{
                                    fontSize: 10,
                                    marginLeft: 3,
                                }}
                            >
                                Aug 06, 2026
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
                            <Ionicons
                                name="time"
                                size={8}
                                color="#000"
                            />

                            <Text
                                style={{
                                    fontSize: 10,
                                    marginLeft: 3,
                                }}
                            >
                                08:00 AM - 12:00 PM
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
                                Rs. 5,200.00
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

                    {statusItems.map((status, index) => (
                        <View
                            key={status.title}
                            style={{
                                flexDirection: "row",
                                minHeight:
                                    index ===
                                        statusItems.length - 1
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
                                            "#000",
                                        justifyContent:
                                            "center",
                                        alignItems:
                                            "center",
                                        zIndex: 2,
                                        marginBottom: 20
                                    }}
                                >
                                    <Ionicons
                                        name={
                                            status.icon as any
                                        }
                                        size={7}
                                        color="#FFF"
                                    />
                                </View>

                                {index !==
                                    statusItems.length -
                                    1 && (
                                        <View
                                            style={{
                                                position:
                                                    "absolute",
                                                top: 13,
                                                width: 1,
                                                height: 40,
                                                backgroundColor:
                                                    "#000",
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
                                        color: "#111",
                                        fontWeight: "600",
                                    }}
                                >
                                    {status.title}
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: "#5A5859",
                                        marginLeft: 5,
                                    }}
                                >
                                    (At{" "}
                                    {status.date})
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* PACKAGES */}

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
                                marginBottom: 6
                            }}
                        >
                            Packages (03)
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() =>
                                openPackageDetails()
                            }
                        >
                            <Text
                                style={{
                                    fontSize: 10,
                                    fontWeight: "600",
                                    textDecorationLine: "underline"
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
                            // onPress={() =>
                            //     // openPackageDetails(pkg)
                            // }
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
                                            pkg
                                                .items[0]
                                                ?.image,
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

                {/* ALA CARTE ITEMS */}
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
                        Ala Carte Items (02)
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

                    <SummaryRow
                        label="Packages"
                        value="Rs. 3,000.00"
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
                        label="Ala Carte Items"
                        value="Rs. 2,100.00"
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
                        label="Product Discount"
                        value="- Rs. 200.00"
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
                        value="+ Rs. 300.00"
                    />

                    <Text
                        style={{
                            fontSize: 12,
                            color: "#34C759",
                            marginTop: -1,
                            marginBottom: 8,
                        }}
                    >
                        *Applied Delivery Fee Coupon
                    </Text>

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
                        value="Rs. 5,200.00"
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
                        label="Paid By Credit"
                        value="Rs. 5,000.00"
                        icon="wallet"
                        iconColor="#AC7F5E"
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
                        label="Paid with Card"
                        value="Rs. 200.00"
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
                        value="Rs. 5,200.00"
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