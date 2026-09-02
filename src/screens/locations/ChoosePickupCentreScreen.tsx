import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
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
                    if (mapped.length > 0) {
                        setSelectedCity(mapped[0].name);
                        setSelectedCentre(mapped[0]);
                    }
                }
            } catch (error) {
                console.error("Error fetching pickup centres:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCenters();
    }, []);

    const cities = pickupCentres.map((c) => c.name);

    const handleSelectCity = (cityName: string) => {
        setSelectedCity(cityName);
        setCityOpen(false);

        const centre = pickupCentres.find(
            (item) => item.name === cityName
        );

        if (centre) {
            setSelectedCentre(centre);
        } else {
            setSelectedCentre(null);
        }
    };

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
                    cityName: selectedCentre.city,
                    title: userProfile?.title || "Mr",
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
            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <View
                style={{
                    height: 60,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                {/* Back Button */}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                        navigation.goBack()
                    }
                    style={{
                        position: "absolute",
                        left: 17,

                        width: 42,
                        height: 42,

                        borderRadius: 21,

                        backgroundColor: "#FFFFFF",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 1,
                        },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,

                        elevation: 2,
                    }}
                >
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color="#000"
                    />
                </TouchableOpacity>

                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#111111",
                    }}
                >
                    Choose Pickup Centre
                </Text>
            </View>

            {/* ================================================= */}
            {/* CONTENT */}
            {/* ================================================= */}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 18,
                    paddingBottom: 120,
                }}
            >
                {/* Description */}

                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 14,
                        lineHeight: 19,
                        color: "#666875",
                        marginTop: 7,
                        marginBottom: 24,
                        paddingHorizontal: 20,
                    }}
                >
                    Select a centre to pick up your order
                    {"\n"}
                    on the delivery date.
                </Text>

                {/* ================================================= */}
                {/* CITY LABEL */}
                {/* ================================================= */}

                <Text
                    style={{
                        fontSize: 12,
                        color: "#555555",
                        fontWeight: "500",
                        marginBottom: 7,
                    }}
                >
                    Select Pickup Centre
                </Text>

                {/* ================================================= */}
                {/* CITY DROPDOWN */}
                {/* ================================================= */}

                <View
                    style={{
                        position: "relative",
                        zIndex: 100,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                            setCityOpen(!cityOpen)
                        }
                        style={{
                            height: 48,

                            borderWidth: 1,
                            borderColor:
                                selectedCentre
                                    ? "#FF8500"
                                    : "#FF8500",

                            borderRadius: 25,

                            flexDirection: "row",
                            alignItems: "center",

                            paddingHorizontal: 12,
                        }}
                    >
                        {/* Location Icon */}

                        <Ionicons
                            name="location"
                            size={20}
                            color="#000"
                        />

                        <Text
                            style={{
                                flex: 1,
                                fontSize: 14,
                                color: selectedCity
                                    ? "#111"
                                    : "#444",
                                fontWeight:
                                    selectedCity
                                        ? "600"
                                        : "400",
                                marginLeft: 9,
                            }}
                        >
                            {selectedCentre
                                ? selectedCentre.name
                                : "Select Your City"}
                        </Text>

                        <Ionicons
                            name={
                                cityOpen
                                    ? "chevron-up"
                                    : "chevron-down"
                            }
                            size={21}
                            color="#000"
                        />
                    </TouchableOpacity>
                </View>

                {/* ================================================= */}
                {/* MAP (Streetview) */}
                {/* ================================================= */}

                <View
                    style={{
                        height: 287,
                        marginTop: 17,
                        borderRadius: 9,
                        overflow: "hidden",
                        backgroundColor: "#E7EEF0",
                    }}
                >
                    {selectedCentre ? (
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

                {/* ================================================= */}
                {/* CENTRE DETAILS */}
                {/* ================================================= */}

                {selectedCentre && (
                    <View
                        style={{
                            marginTop: 18,

                            borderWidth: 1,
                            borderColor: "#DCE2E8",

                            borderRadius: 9,

                            padding: 11,

                            flexDirection: "row",
                        }}
                    >
                        {/* Location Circle */}

                        <View
                            style={{
                                width: 44,
                                height: 44,

                                borderRadius: 22,

                                backgroundColor:
                                    "#FFF4E7",

                                justifyContent:
                                    "center",
                                alignItems:
                                    "center",

                                marginRight: 10,
                                marginTop: 8,
                            }}
                        >
                            <Ionicons
                                name="location"
                                size={22}
                                color="#FF8A00"
                            />
                        </View>

                        {/* Details */}

                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <Text
                                style={{
                                    textAlign:
                                        "center",
                                    fontSize: 14,
                                    fontWeight:
                                        "700",
                                    color: "#111",
                                    marginBottom: 5,
                                }}
                            >
                                {
                                    selectedCentre.name
                                }
                            </Text>

                            <View
                                style={{
                                    flexDirection:
                                        "row",
                                }}
                            >
                                <Text
                                    style={{
                                        width: 54,
                                        fontSize: 12,
                                        color: "#60647A",
                                    }}
                                >
                                    City :
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#333",
                                    }}
                                >
                                    {
                                        selectedCentre.city
                                    }
                                </Text>
                            </View>

                            <View
                                style={{
                                    flexDirection:
                                        "row",
                                    marginTop: 3,
                                }}
                            >
                                <Text
                                    style={{
                                        width: 54,
                                        fontSize: 12,
                                        color: "#60647A",
                                    }}
                                >
                                    District :
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#333",
                                    }}
                                >
                                    {
                                        selectedCentre.district
                                    }
                                </Text>
                            </View>

                            <View
                                style={{
                                    flexDirection:
                                        "row",
                                    marginTop: 3,
                                }}
                            >
                                <Text
                                    style={{
                                        width: 54,
                                        fontSize: 12,
                                        color: "#60647A",
                                    }}
                                >
                                    Province :
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#333",
                                    }}
                                >
                                    {
                                        selectedCentre.province
                                    }
                                </Text>
                            </View>

                            <View
                                style={{
                                    flexDirection:
                                        "row",
                                    marginTop: 3,
                                }}
                            >
                                <Text
                                    style={{
                                        width: 54,
                                        fontSize: 12,
                                        color: "#60647A",
                                    }}
                                >
                                    Country :
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#333",
                                    }}
                                >
                                    {
                                        selectedCentre.country
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ================================================= */}
            {/* BOTTOM BUTTON */}
            {/* ================================================= */}

            <View
                style={{
                    position: "absolute",

                    bottom: 0,
                    left: 0,
                    right: 0,

                    height: 91,

                    backgroundColor: "#FFFFFF",

                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,

                    paddingHorizontal: 16,
                    paddingTop: 13,

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
                    activeOpacity={
                        selectedCentre ? 0.8 : 1
                    }
                    disabled={!selectedCentre}
                    onPress={handleConfirm}
                    style={{
                        height: 49,

                        borderRadius: 27,

                        backgroundColor:
                            selectedCentre
                                ? "#000000"
                                : "#8799A3",

                        justifyContent:
                            "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity:
                            selectedCentre
                                ? 0.18
                                : 0.08,
                        shadowRadius: 4,

                        elevation:
                            selectedCentre ? 4 : 2,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 15,
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