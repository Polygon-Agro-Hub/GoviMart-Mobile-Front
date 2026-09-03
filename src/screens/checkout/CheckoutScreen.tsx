import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList, SavedAddress } from "@/types/types";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/common/CustomHeader";
import OrderSummary from "@/component/common/OrderSummary";

type CheckoutScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    "CheckoutScreen"
>;

type CheckoutScreenRouteProp = RouteProp<
    RootStackParamList,
    "CheckoutScreen"
>;

interface Props {
    navigation: CheckoutScreenNavigationProp;
    route: CheckoutScreenRouteProp;
}

interface AddressItem {
    id: number;
    title: string;
    name: string;
    address: string;
    phone: string;
    buildingType?: string;
    raw?: any;
}

const formatAddress = (item: any) => {
    const parts: string[] = [];
    if (item.buildingType === "Apartment") {
        if (item.unitNo) parts.push(`Unit ${item.unitNo}`);
        if (item.floorNo) parts.push(`Floor ${item.floorNo}`);
        if (item.buildingName) parts.push(item.buildingName);
        if (item.buildingNo) parts.push(item.buildingNo);
    } else {
        if (item.houseNo) parts.push(item.houseNo);
    }
    if (item.streetName) parts.push(item.streetName);
    if (item.city) parts.push(item.city);
    return parts.filter((p) => p !== null && p !== undefined && String(p).trim() !== "").join(", ");
};

const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "";
    const p = String(phone).trim();
    if (!p || p === "null" || p === "undefined") return "";
    if (p.startsWith("+") || p.startsWith("0")) return p;
    return `0${p}`;
};

const formatPhone = (item: any) => {
    const phones: string[] = [];
    const p1 = formatPhoneNumber(item.phone1);
    if (p1) phones.push(p1);
    const p2 = formatPhoneNumber(item.phone2);
    if (p2) phones.push(p2);
    return phones.length > 0 ? phones.join(", ") : "No Phone Provided";
};

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
    const orderContext = route.params?.orderContext;
    const [addresses, setAddresses] = useState<AddressItem[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [cities, setCities] = useState<any[]>([]);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await orderService.getDeliveryCities();
                if (res.data && res.data.status && Array.isArray(res.data.data)) {
                    setCities(res.data.data);
                }
            } catch (err) {
                console.error("Error fetching delivery cities:", err);
            }
        };
        fetchCities();
    }, []);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const loadAddresses = async () => {
                try {
                    setLoading(true);
                    const response = await customerService.getSavedAddresses();
                    if (!isActive) return;

                    if (!response.data.hasAddress || !response.data.result) {
                        setAddresses([]);
                        setSelectedAddressId(null);
                    } else {
                        const mapped: AddressItem[] = response.data.result.map((item: any) => ({
                            id: item.id,
                            title: item.saveAs || "Address",
                            name: item.fullName
                                ? `${item.title ? item.title + ". " : ""}${item.fullName}`
                                : "No Name Provided",
                            address: formatAddress(item),
                            phone: formatPhone(item),
                            buildingType: item.buildingType,
                            raw: item,
                        }));
                        setAddresses(mapped);
                        if (mapped.length > 0 && selectedAddressId === null) {
                            setSelectedAddressId(mapped[0].id);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching saved addresses:", error);
                } finally {
                    if (isActive) setLoading(false);
                }
            };

            loadAddresses();
            return () => {
                isActive = false;
            };
        }, [])
    );

    const formatAmount = (amount: number) => {
        return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleProceed = () => {
        if (!selectedAddressId) {
            Alert.alert("Select Address", "Please select a delivery address to proceed.");
            return;
        }

        const selected = addresses.find((a) => a.id === selectedAddressId);
        if (!selected || !selected.raw) {
            Alert.alert("Error", "Selected address details could not be found.");
            return;
        }

        const raw = selected.raw;
        const addressCity = (raw.city || "").toLowerCase().trim();

        // Find delivery charge and companycenterId from cities table
        let deliveryCharge = 300; // default fallback
        let companycenterId = 1;

        const matchedCity = cities.find(
            (c: any) => (c.city || "").toLowerCase().trim() === addressCity
        );
        if (matchedCity) {
            deliveryCharge = parseFloat(matchedCity.charge) || 300;
            companycenterId = matchedCity.companycenterId || 1;
        }

        const currentGrandTotal = orderContext?.grandTotal || 0;
        const currentPackageTotal = orderContext?.packageTotal || 0;
        const currentProductTotal = orderContext?.productTotal || 0;
        const currentDiscount = orderContext?.discount || 0;

        const updatedContext = {
            ...orderContext,
            grandTotal: currentGrandTotal,
            packageTotal: currentPackageTotal,
            productTotal: currentProductTotal,
            discount: currentDiscount,
            deliveryCharge,
            deliveryMethod: "home" as const,
            checkoutDetails: {
                ...(orderContext?.checkoutDetails || {}),
                deliveryMethod: "home" as const,
                title: raw.title || "Mr",
                fullName: raw.fullName || "",
                phoneCode1: raw.phonecode1 || "94",
                phone1: raw.phone1 || "",
                phoneCode2: raw.phonecode2 || "",
                phone2: raw.phone2 || "",
                buildingType: (raw.buildingType || "House").toLowerCase() as "house" | "apartment",
                cityName: raw.city || "",
                companycenterId,
                houseNo: raw.houseNo || "",
                street: raw.streetName || "",
                buildingNo: raw.buildingNo || "",
                buildingName: raw.buildingName || "",
                flatNumber: raw.unitNo || "",
                floorNumber: raw.floorNo || "",
                saveAs: raw.saveAs || "Home",
                geoLatitude: raw.latitude ? parseFloat(raw.latitude) : undefined,
                geoLongitude: raw.longitude ? parseFloat(raw.longitude) : undefined,
            },
        };

        navigation.navigate("ScheduleOrder", {
            orderContext: updatedContext,
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            {/* ─── HEADER ──────────────────────────────────────────────────────── */}
            <CustomHeader
                title="Checkout"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            {/* ─── CONTENT ─────────────────────────────────────────────────────── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 220,
                }}
            >
                {/* Add New Address Card */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("AddNewAddress", { fromCheckout: true })}
                    style={{
                        height: 67,
                        borderRadius: 40,
                        backgroundColor: "#FFF5EA",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 11,
                        borderWidth: 1,
                        borderColor: "#FFE0B2",
                    }}
                >
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "#000000",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: "#111111",
                                lineHeight: 19,
                                marginBottom: 4,
                            }}
                        >
                            Add New Address
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                lineHeight: 18,
                                color: "#666A7D",
                            }}
                        >
                            Save your delivery information
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#111111" style={{ marginRight: 6 }} />
                </TouchableOpacity>

                {/* Section Title */}
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: "#111111",
                        marginTop: 22,
                        marginBottom: 12,
                    }}
                >
                    Saved Addresses ({addresses.length === 0 ? "0" : addresses.length.toString().padStart(2, "0")})
                </Text>

                {/* Addresses List or Empty State */}
                {loading ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                        <ActivityIndicator size="small" color="#000000" />
                    </View>
                ) : addresses.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                        <LottieView
                            source={require("@/assets/json/address/no-address.json")}
                            style={{ width: 180, height: 180 }}
                            autoPlay
                            loop
                        />
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748B", marginTop: 8 }}>
                            No saved addresses
                        </Text>
                    </View>
                ) : (
                    addresses.map((item) => {
                        const isSelected = selectedAddressId === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.9}
                                onPress={() => setSelectedAddressId(item.id)}
                                style={{
                                    backgroundColor: "#FFFFFF",
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: "#E1E7EE",
                                    padding: 14,
                                    marginBottom: 14,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 3,
                                    elevation: 1,
                                }}
                            >
                                {/* Top Row: Title + Radio */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "700",
                                            color: "#111111",
                                        }}
                                    >
                                        {item.title}
                                    </Text>

                                    <View
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 11,
                                            backgroundColor: isSelected ? "#000000" : "#FFFFFF",
                                            borderWidth: isSelected ? 0 : 1.5,
                                            borderColor: "#000000",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                        )}
                                    </View>
                                </View>

                                {/* Name */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 7,
                                    }}
                                >
                                    <Ionicons
                                        name="person"
                                        size={15}
                                        color="#333333"
                                        style={{ width: 20 }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: "600",
                                            color: "#222222",
                                        }}
                                    >
                                        {item.name}
                                    </Text>
                                </View>

                                {/* Address */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "flex-start",
                                        marginBottom: 7,
                                    }}
                                >
                                    <Ionicons
                                        name="location"
                                        size={16}
                                        color="#333333"
                                        style={{ width: 20, marginTop: 1 }}
                                    />
                                    <Text
                                        style={{
                                            flex: 1,
                                            fontSize: 13.5,
                                            color: "#4A4D57",
                                            lineHeight: 19,
                                        }}
                                    >
                                        {item.address}
                                    </Text>
                                </View>

                                {/* Phone */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="call"
                                        size={15}
                                        color="#333333"
                                        style={{ width: 20 }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 13.5,
                                            color: "#4A4D57",
                                        }}
                                    >
                                        {item.phone}
                                    </Text>
                                </View>

                                {/* Divider */}
                                <View
                                    style={{
                                        height: 1,
                                        backgroundColor: "#F2F4F7",
                                        marginVertical: 6,
                                    }}
                                />

                                {/* View on map */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        if (item.raw?.latitude && item.raw?.longitude) {
                                            navigation.navigate("ViewLocation", {
                                                latitude: parseFloat(item.raw.latitude),
                                                longitude: parseFloat(item.raw.longitude),
                                                title: item.title,
                                            });
                                        } else {
                                            Alert.alert("Location", "No GPS coordinates saved for this address.");
                                        }
                                    }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingTop: 4,
                                    }}
                                >
                                    <FontAwesome6
                                        name="map-location-dot"
                                        size={16}
                                        color="#111111"
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "600",
                                            color: "#111111",
                                        }}
                                    >
                                        View on map
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* ─── FIXED BOTTOM SUMMARY & BUTTON ──────────────────────────────── */}
            <OrderSummary
                packageTotal={orderContext?.packageTotal || 0}
                productTotal={orderContext?.productTotal || 0}
                discount={orderContext?.discount || 0}
                grandTotal={orderContext?.grandTotal || 0}
                buttonText="Proceed to Checkout"
                disabled={!selectedAddressId}
                onCheckout={handleProceed}
                containerStyle={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    marginBottom: 0,
                }}
            />
        </SafeAreaView>
    );
};

export default CheckoutScreen;
