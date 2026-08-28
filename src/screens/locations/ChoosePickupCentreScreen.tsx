import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";

type ChoosePickupCentreNavigationProp =
    StackNavigationProp<
        RootStackParamList,
        "ChoosePickupCentre"
    >;

interface Props {
    navigation: ChoosePickupCentreNavigationProp;
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
}) => {
    const [cityOpen, setCityOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState("");

    const [selectedCentre, setSelectedCentre] =
        useState<PickupCentre | null>(null);

    const cities = [
        "Colombo 02",
        "Colombo 03",
        "Kandy",
        "Gampaha",
        "Negombo",
    ];

    const pickupCentres: PickupCentre[] = [
        {
            id: 1,
            name: "Colombo 02 Centre",
            city: "Minuwangoda",
            district: "Gampaha",
            province: "Western",
            country: "Sri Lanka",
            status: "Open",
            openingTime: "08:00 AM",
            closingTime: "09:00 PM",
            latitude: 6.9271,
            longitude: 79.8612,
            mapImage:
                "https://maps.googleapis.com/maps/api/staticmap?center=6.9271,79.8612&zoom=14&size=600x400&maptype=roadmap",
        },
    ];

    const handleSelectCity = (city: string) => {
        setSelectedCity(city);
        setCityOpen(false);

        // Example:
        // Find centre according to selected city.
        const centre = pickupCentres.find(
            (item) =>
                item.name.toLowerCase().includes(
                    city.toLowerCase()
                )
        );

        if (centre) {
            setSelectedCentre(centre);
        } else {
            setSelectedCentre(null);
        }
    };

    const handleConfirm = () => {
        if (!selectedCentre) return;

        console.log(
            "Selected Pickup Centre:",
            selectedCentre
        );

        // Navigate / pass selected centre here
        //
        // navigation.navigate("NextScreen", {
        //     pickupCentre: selectedCentre,
        // });

        navigation.goBack();
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

                    {/* Dropdown */}

                    {cityOpen && (
                        <View
                            style={{
                                position: "absolute",
                                top: 53,
                                left: 0,
                                right: 0,

                                backgroundColor: "#FFFFFF",

                                borderRadius: 14,

                                borderWidth: 1,
                                borderColor: "#E0E0E0",

                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 3,
                                },
                                shadowOpacity: 0.15,
                                shadowRadius: 6,

                                elevation: 7,

                                overflow: "hidden",
                            }}
                        >
                            {cities.map((city) => (
                                <TouchableOpacity
                                    key={city}
                                    activeOpacity={0.7}
                                    onPress={() =>
                                        handleSelectCity(
                                            city
                                        )
                                    }
                                    style={{
                                        height: 45,

                                        paddingHorizontal: 15,

                                        justifyContent:
                                            "center",

                                        borderBottomWidth: 1,
                                        borderBottomColor:
                                            "#F0F0F0",
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color:
                                                "#222",
                                            fontWeight:
                                                selectedCity ===
                                                    city
                                                    ? "700"
                                                    : "400",
                                        }}
                                    >
                                        {city}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ================================================= */}
                {/* MAP */}
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
                            <Image
                                source={{
                                    uri: selectedCentre.mapImage,
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                resizeMode="cover"
                            />

                            {/* Map centre popup */}

                            <View
                                style={{
                                    position: "absolute",

                                    top: 63,
                                    left: 78,

                                    backgroundColor:
                                        "#FFFFFF",

                                    borderRadius: 9,

                                    paddingHorizontal: 10,
                                    paddingVertical: 8,

                                    shadowColor:
                                        "#000",
                                    shadowOffset: {
                                        width: 0,
                                        height: 2,
                                    },
                                    shadowOpacity:
                                        0.2,
                                    shadowRadius: 4,

                                    elevation: 5,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight:
                                            "700",
                                        color: "#111",
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
                                        alignItems:
                                            "center",
                                        marginTop: 5,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: "#FF8500",
                                            fontWeight:
                                                "700",
                                        }}
                                    >
                                        {
                                            selectedCentre.status
                                        }
                                    </Text>

                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: "#777",
                                            marginLeft: 6,
                                        }}
                                    >
                                        •{" "}
                                        {
                                            selectedCentre.openingTime
                                        }{" "}
                                        -{" "}
                                        {
                                            selectedCentre.closingTime
                                        }
                                    </Text>
                                </View>
                            </View>

                            {/* Marker */}

                            <View
                                style={{
                                    position:
                                        "absolute",

                                    top: 130,
                                    left: "53%",

                                    width: 30,
                                    height: 30,

                                    justifyContent:
                                        "center",
                                    alignItems:
                                        "center",
                                }}
                            >
                                <Ionicons
                                    name="location"
                                    size={32}
                                    color="#FF0000"
                                />
                            </View>

                            {/* Google Maps label */}

                            <Text
                                style={{
                                    position:
                                        "absolute",

                                    bottom: 6,
                                    right: 8,

                                    fontSize: 10,
                                    color: "#777",

                                    backgroundColor:
                                        "rgba(255,255,255,0.7)",
                                }}
                            >
                                Google Maps
                            </Text>
                        </>
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                justifyContent:
                                    "center",
                                alignItems:
                                    "center",
                                backgroundColor:
                                    "#DDF2F7",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#9A9A9A",
                                    fontSize: 12,
                                }}
                            >
                                Select a city to view
                                pickup centre
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
        </View>
    );
};

export default ChoosePickupCentre;