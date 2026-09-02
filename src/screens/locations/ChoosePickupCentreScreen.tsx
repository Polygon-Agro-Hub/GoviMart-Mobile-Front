import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../types/types";
import orderService from "@/services/order/order.service";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import CustomHeader from "@/component/common/CustomHeader";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

type ChoosePickupCentreNavigationProp =
    StackNavigationProp<
        RootStackParamList,
        "ChoosePickupCentre"
    >;

type ChoosePickupCentreRouteProp =
    RouteProp<
        RootStackParamList,
        "ChoosePickupCentre"
    >;

interface Props {
    navigation: ChoosePickupCentreNavigationProp;
    route: ChoosePickupCentreRouteProp;
}

interface PickupCentre {
    id: number;
    name: string;
    city: string;
    district: string;
    province: string;
    country: string;
    status: string;
    openingTime: string;
    closingTime: string;
    latitude: number;
    longitude: number;
    mapImage: string;
}

const ChoosePickupCentre: React.FC<Props> = ({
    navigation,
    route,
}) => {
    const [cityOpen, setCityOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState("");
    const [loading, setLoading] = useState(true);
    const [pickupCentres, setPickupCentres] = useState<PickupCentre[]>([]);

    const [selectedCentre, setSelectedCentre] =
        useState<PickupCentre | null>(null);

    const userProfile = useSelector((state: RootState) => state.auth.userProfile);

    useEffect(() => {
        const fetchCenters = async () => {
            try {
                setLoading(true);
                const response = await orderService.getPickupCenters();
                if (response.data && response.data.status && Array.isArray(response.data.data)) {
                    const mapped: PickupCentre[] = response.data.data.map((item: any) => ({
                        id: item.centerId || item.id,
                        name: item.centerName || item.name || "Pickup Centre",
                        city: item.city || "",
                        district: item.district || "",
                        province: item.province || "",
                        country: item.country || "Sri Lanka",
                        status: "Open",
                        openingTime: "08:00 AM",
                        closingTime: "09:00 PM",
                        latitude: parseFloat(item.latitude) || 6.9271,
                        longitude: parseFloat(item.longitude) || 79.8612,
                        mapImage: `https://maps.googleapis.com/maps/api/staticmap?center=${item.latitude || 6.9271},${item.longitude || 79.8612}&zoom=14&size=600x400&maptype=roadmap`,
                    }));
                    setPickupCentres(mapped);
                    // Keep unselected by default so user sees "Select Your City"
                }
            } catch (error) {
                console.error("Error fetching pickup centres:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCenters();
    }, []);

    const handleConfirm = () => {
        if (!selectedCentre) return;

        const currentContext = route.params?.orderContext || {
            grandTotal: 0,
            packageTotal: 0,
            productTotal: 0,
            discount: 0,
        };

        const userFullName = userProfile
            ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
            : "";

        navigation.navigate("ScheduleOrder", {
            orderContext: {
                ...currentContext,
                deliveryMethod: "pickup",
                checkoutDetails: {
                    ...(currentContext.checkoutDetails || {}),
                    deliveryMethod: "pickup",
                    centerId: selectedCentre.id,
                    centreName: selectedCentre.name,
                    fullName: userFullName || undefined,
                    phone1: userProfile?.phoneNumber || undefined,
                    phoneCode1: "+94",
                },
            },
        });
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* ─── CUSTOM HEADER ─────────────────────────────────────────────── */}
            <CustomHeader
                title="Choose Pickup Centre"
                titleColor="#0F172A"
                showBackButton={true}
                navigation={navigation}
            />

            {/* ─── SCROLLABLE CONTENT ────────────────────────────────────────── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 6,
                    paddingBottom: 120,
                }}
            >
                {/* Description */}
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 14,
                        lineHeight: 20,
                        color: "#64748B",
                        marginBottom: 20,
                        paddingHorizontal: 16,
                    }}
                >
                    Select a centre to pick up your order{"\n"}on the delivery date.
                </Text>

                {/* City Dropdown Label */}
                <Text
                    style={{
                        fontSize: 13,
                        color: "#475569",
                        fontWeight: "600",
                        marginBottom: 8,
                    }}
                >
                    Select Pickup Centre
                </Text>

                {/* City Dropdown Button */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCityOpen(true)}
                    style={{
                        height: 50,
                        borderWidth: 1.5,
                        borderColor: "#FF8A00",
                        borderRadius: 25,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        backgroundColor: "#FFFFFF",
                    }}
                >
                    <Ionicons
                        name="location-sharp"
                        size={20}
                        color="#000000"
                    />

                    <Text
                        style={{
                            flex: 1,
                            fontSize: 15,
                            color: selectedCentre ? "#0F172A" : "#64748B",
                            fontWeight: selectedCentre ? "700" : "500",
                            marginLeft: 10,
                        }}
                    >
                        {selectedCentre ? selectedCentre.name : "Select Your City"}
                    </Text>

                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color="#000000"
                    />
                </TouchableOpacity>

                {/* Map View Container */}
                <View
                    style={{
                        height: 287,
                        marginTop: 17,
                        borderRadius: 9,
                        overflow: "hidden",
                        backgroundColor: "#E7EEF0",
                    }}
                >
                    {loading ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#DDF2F7",
                            }}
                        >
                            <ActivityIndicator size="large" color="#FF8A00" />
                        </View>
                    ) : selectedCentre ? (
                        <>
                            <MapView
                                key={`map-${selectedCentre.id}-${selectedCentre.latitude}-${selectedCentre.longitude}`}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                mapType="standard"
                                initialRegion={{
                                    latitude: selectedCentre.latitude,
                                    longitude: selectedCentre.longitude,
                                    latitudeDelta: 0.012,
                                    longitudeDelta: 0.012,
                                }}
                                region={{
                                    latitude: selectedCentre.latitude,
                                    longitude: selectedCentre.longitude,
                                    latitudeDelta: 0.012,
                                    longitudeDelta: 0.012,
                                }}
                                showsUserLocation={false}
                                showsMyLocationButton={false}
                                showsCompass={true}
                                toolbarEnabled={false}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: selectedCentre.latitude,
                                        longitude: selectedCentre.longitude,
                                    }}
                                    title={selectedCentre.name}
                                    description={`${selectedCentre.city}, ${selectedCentre.district}`}
                                >
                                    <View
                                        style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Ionicons
                                            name="location-sharp"
                                            size={36}
                                            color="#FF0000"
                                        />
                                    </View>
                                </Marker>
                            </MapView>

                            {/* Map centre popup badge overlay */}
                            <View
                                style={{
                                    position: "absolute",
                                    top: 12,
                                    left: 12,
                                    right: 12,
                                    backgroundColor: "#FFFFFF",
                                    borderRadius: 9,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    shadowColor: "#000",
                                    shadowOffset: {
                                        width: 0,
                                        height: 2,
                                    },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 4,
                                    elevation: 5,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "700",
                                        color: "#111",
                                    }}
                                >
                                    {selectedCentre.name}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginTop: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: "#FF8500",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {selectedCentre.status}
                                    </Text>

                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: "#777",
                                            marginLeft: 6,
                                        }}
                                    >
                                        • {selectedCentre.openingTime} - {selectedCentre.closingTime}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#DDF2F7",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#9A9A9A",
                                    fontSize: 12,
                                }}
                            >
                                Select a city to view pickup centre
                            </Text>
                        </View>
                    )}
                </View>

                {/* ─── CENTRE DETAILS / ADDRESS SECTION (Hidden if not selected) ─── */}
                {selectedCentre && (
                    <View
                        style={{
                            marginTop: 18,
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E2E8F0",
                            borderRadius: 16,
                            padding: 16,
                            flexDirection: "row",
                            alignItems: "center", // VERTICALLY CENTERED!
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        {/* Map Pin Icon Circle — Vertically Centered */}
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: "#FFF4E8",
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 14,
                            }}
                        >
                            <Ionicons
                                name="location-sharp"
                                size={24}
                                color="#FF8A00"
                            />
                        </View>

                        {/* Details */}
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: "#0F172A",
                                    marginBottom: 5,
                                }}
                            >
                                {selectedCentre.name}
                            </Text>

                            <Text style={{ fontSize: 12, color: "#000000", lineHeight: 18 }}>
                                <Text style={{ color: "#494A65" }}>City : </Text>
                                {selectedCentre.city || "N/A"}
                            </Text>

                            <Text style={{ fontSize: 12, color: "#000000", lineHeight: 18 }}>
                                <Text style={{ color: "#494A65" }}>District : </Text>
                                {selectedCentre.district || "N/A"}
                            </Text>

                            <Text style={{ fontSize: 12, color: "#000000", lineHeight: 18 }}>
                                <Text style={{ color: "#494A65" }}>Province : </Text>
                                {selectedCentre.province || "N/A"}
                            </Text>

                            <Text style={{ fontSize: 12, color: "#000000", lineHeight: 18 }}>
                                <Text style={{ color: "#494A65" }}>Country : </Text>
                                {selectedCentre.country || "Sri Lanka"}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ─── BOTTOM CONFIRM BUTTON ─────────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 24,
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: 0.08,
                    shadowRadius: 5,
                    elevation: 10,
                }}
            >
                <TouchableOpacity
                    activeOpacity={selectedCentre ? 0.85 : 1}
                    disabled={!selectedCentre}
                    onPress={handleConfirm}
                    style={{
                        height: 52,
                        borderRadius: 26,
                        backgroundColor:
                            selectedCentre
                                ? "#000000"
                                : "#8799A3", // Matches disabled grey button in image
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: selectedCentre ? 0.18 : 0.05,
                        shadowRadius: 4,
                        elevation: selectedCentre ? 4 : 1,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 16,
                            fontWeight: "700",
                            letterSpacing: 0.3,
                        }}
                    >
                        Confirm Pickup Centre
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ─── GLOBAL SEARCH MODAL FOR PICKUP CENTRES ─────────────────────── */}
            <GlobalSearchModal
                visible={cityOpen}
                onClose={() => setCityOpen(false)}
                title="Select Pickup Centre"
                searchPlaceholder="Search centre or city..."
                data={pickupCentres.map((c) => ({
                    label: `${c.name} (${c.city})`,
                    value: String(c.id),
                    city: c.city,
                    name: c.name,
                }))}
                searchKeys={["label", "name", "city"]}
                selectedItems={selectedCentre ? [String(selectedCentre.id)] : []}
                onSelect={(selectedValues) => {
                    if (selectedValues.length > 0) {
                        const id = Number(selectedValues[0]);
                        const centre = pickupCentres.find((c) => c.id === id);
                        if (centre) {
                            setSelectedCentre(centre);
                            setSelectedCity(centre.name);
                        }
                    }
                }}
            />
        </View>
    );
};

export default ChoosePickupCentre;