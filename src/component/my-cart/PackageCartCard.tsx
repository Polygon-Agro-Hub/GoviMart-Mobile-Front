import React from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import productService from "@/services/product/product.service";

interface PackageItem {
    id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    totalItems: number;
    isUnavailable?: boolean;
    packageType?: string | null;
    endDate?: string | null;
}

const getValidityText = (endDateStr?: string | null): string | null => {
    if (!endDateStr) return null;
    try {
        let year: number;
        let month: number;
        let day: number;

        const str = String(endDateStr).trim();
        if (str.includes("-")) {
            const parts = str.split("T")[0].split(" ")[0].split("-");
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            const d = new Date(str);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        }

        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        // Valid till [Expire Date] - 2 days
        const cutoffDate = new Date(year, month, day);
        cutoffDate.setDate(cutoffDate.getDate() - 2);

        const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];

        const displayDay = cutoffDate.getDate();
        const displayMonth = monthNames[cutoffDate.getMonth()];

        return `Valid till ${displayDay}, ${displayMonth}`;
    } catch (err) {
        console.error("Error calculating validity date:", err);
        return null;
    }
};

interface Props {
    item: PackageItem;

    onIncrease: (id: number) => void;
    onDecrease: (id: number) => void;
    onDelete: (id: number) => void;
}

const PackageCartCard: React.FC<Props> = ({
    item,
    onIncrease,
    onDecrease,
    onDelete,
}) => {
    const isMinimum = item.quantity <= 1;
    const isUnavailable = !!item.isUnavailable;

    const [livePackageType, setLivePackageType] = React.useState<string | null>(item.packageType || null);
    const [liveEndDate, setLiveEndDate] = React.useState<string | null>(item.endDate || null);

    React.useEffect(() => {
        if (item.packageType) setLivePackageType(item.packageType);
        if (item.endDate) setLiveEndDate(item.endDate);

        if (!item.packageType || !item.endDate) {
            productService
                .getPackageDetails(item.id)
                .then((res) => {
                    if (res?.data) {
                        const returnedType =
                            res.data.packageType || res.data.packageInfo?.packageType;
                        const returnedEndDate =
                            res.data.endDate || res.data.packageInfo?.endDate;
                        if (returnedType && !item.packageType) setLivePackageType(returnedType);
                        if (returnedEndDate && !item.endDate) setLiveEndDate(returnedEndDate);
                    }
                })
                .catch(() => {});
        }
    }, [item.id, item.packageType, item.endDate]);

    const effectiveType = item.packageType || livePackageType;
    const effectiveEndDate = item.endDate || liveEndDate;

    const isOneTimePackage = (() => {
        const type = (effectiveType || "").trim().toLowerCase();
        return type === "one time" || type === "one-time" || type.includes("one");
    })();

    const validityText = React.useMemo(() => {
        return getValidityText(effectiveEndDate);
    }, [effectiveEndDate]);

    const formatPrice = (value: number) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const activeColor = isUnavailable ? "#FF383C" : "#111";
    const borderColor = isUnavailable ? "#FF383C" : "#E1E7EE";

    return (
        <View
            style={{
                backgroundColor: "#FFF",
                borderRadius: 20,
                padding: 20,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: borderColor,
            }}
        >
            {/* TOP */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                {/* Package Image */}
                <Image
                    source={{ uri: item.image }}
                    style={{
                        width: 62,
                        height: 62,
                        borderRadius: 14,
                    }}
                />

                {/* Package Details */}
                <View
                    style={{
                        flex: 1,
                        marginLeft: 12,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "600",
                            color: activeColor,
                        }}
                    >
                        {item.name}
                    </Text>

                    <Text
                        style={{
                            marginTop: 4,
                            fontSize: 17,
                            fontWeight: "700",
                            color: activeColor,
                        }}
                    >
                        Rs. {formatPrice(item.price * item.quantity)}
                    </Text>
                </View>

                {/* DELETE */}
                <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    activeOpacity={0.8}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#FFF",
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: isUnavailable ? "#FF383C" : "#E1E7EE",
                    }}
                >
                    <FontAwesome6
                        name="trash"
                        size={15}
                        color={isUnavailable ? "#FF383C" : "#000"}
                    />
                </TouchableOpacity>
            </View>

            {/* VALIDITY PILL FOR ONE TIME PACKAGE */}
            {!isUnavailable && isOneTimePackage && !!validityText && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#E3FFEA",
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        marginTop: 12,
                        alignSelf: "flex-start",
                    }}
                >
                    <Ionicons name="time" size={15} color="#000" />
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#000",
                            marginLeft: 6,
                        }}
                    >
                        {validityText}
                    </Text>
                </View>
            )}

            {/* DIVIDER */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: !isUnavailable && isOneTimePackage && !!validityText ? 14 : 16,
                    marginBottom: 16,
                    marginHorizontal: -20,
                }}
            >
                <View style={{ flex: 1, height: 1, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row" }}>
                        {Array.from({ length: 100 }).map((_, index) => (
                            <View
                                key={index}
                                style={{
                                    width: 4,
                                    height: 1,
                                    backgroundColor: isUnavailable ? "#FF383C" : "#E1E7EE",
                                    marginRight: 4,
                                }}
                            />
                        ))}
                    </View>
                </View>
            </View>

            {/* BOTTOM */}
            {isUnavailable ? (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#FF383C",
                        }}
                    >
                        Qty : <Text style={{ fontWeight: "700" }}>{item.quantity}</Text>
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#FF383C",
                        }}
                    >
                        No longer available
                    </Text>
                </View>
            ) : (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    {/* TOTAL ITEMS */}
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#777",
                            }}
                        >
                            Total Items:{" "}
                        </Text>
                        {item.totalItems != null && item.totalItems > 0 ? (
                            <Text
                                style={{
                                    color: "#111",
                                    fontWeight: "600",
                                    fontSize: 14,
                                }}
                            >
                                {item.totalItems}
                            </Text>
                        ) : (
                            <ActivityIndicator size="small" color="#FF9114" style={{ marginLeft: 2 }} />
                        )}
                    </View>

                    <View style={{ flex: 1 }} />

                    {/* Stepper with #F3F3F3 background */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#F3F3F3",
                            borderRadius: 20,
                            paddingHorizontal: 4,
                            paddingVertical: 4,
                        }}
                    >
                        {/* MINUS / TRASH */}
                        {!isMinimum ? (
                            <TouchableOpacity
                                onPress={() => onDecrease(item.id)}
                                activeOpacity={0.8}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: "#000",
                                }}
                            >
                                <Ionicons name="remove" size={16} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => onDecrease(item.id)}
                                activeOpacity={0.8}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: "#D9D9D9",
                                }}
                            >
                                <FontAwesome6 name="trash" size={13} color="#FFF" />
                            </TouchableOpacity>
                        )}

                        {/* QUANTITY */}
                        <Text
                            style={{
                                minWidth: 36,
                                textAlign: "center",
                                fontSize: 15,
                                fontWeight: "700",
                                color: "#111",
                                paddingHorizontal: 10,
                            }}
                        >
                            {item.quantity}
                        </Text>

                        {/* PLUS */}
                        <TouchableOpacity
                            onPress={() => onIncrease(item.id)}
                            activeOpacity={0.8}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: "#000",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Ionicons name="add" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

export default PackageCartCard;