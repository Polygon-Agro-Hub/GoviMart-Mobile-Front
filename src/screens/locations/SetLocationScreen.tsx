import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";
import OpenStreetMap from "@/component/common/OpenStreetMap";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LocationAccess from "@/screens/permission/LocationAccess";

type SetLocationNavigationProp = StackNavigationProp<
    RootStackParamList,
    "SetLocation"
>;

interface Props {
    navigation: SetLocationNavigationProp;
}

const SetLocation: React.FC<Props> = ({ navigation }) => {
    // Default fallback location (Sri Lanka center)
    const initialLocation = {
        latitude: 6.9271,
        longitude: 79.8612,
    };

    const [selectedLocation, setSelectedLocation] = useState({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
    });

    const [loadingLocation, setLoadingLocation] = useState(false);
    const [showPermissionUI, setShowPermissionUI] = useState(false);

    // Fetch user location
    const fetchLocation = async (showAlertOnError = false) => {
        try {
            setLoadingLocation(true);

            const hasServices = await Location.hasServicesEnabledAsync();
            if (!hasServices) {
                if (showAlertOnError) {
                    Alert.alert(
                        "Location Services Disabled",
                        "Please enable GPS / Location services on your device to fetch your location."
                    );
                }
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                if (showAlertOnError) {
                    setShowPermissionUI(true);
                }
                return;
            }

            // Try fast last known location first
            let location = await Location.getLastKnownPositionAsync({});
            if (!location) {
                location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            }

            if (location && location.coords) {
                const { latitude, longitude } = location.coords;
                setSelectedLocation({ latitude, longitude });
            }
        } catch (error) {
            console.error("Current location error:", error);
            if (showAlertOnError) {
                Alert.alert(
                    "Location Error",
                    "Unable to get your current location. Please make sure GPS is enabled or tap directly on the map."
                );
            }
        } finally {
            setLoadingLocation(false);
        }
    };

    // Auto-fetch on mount or load previously selected
    useEffect(() => {
        const initLocation = async () => {
            try {
                const storedLat = await AsyncStorage.getItem("selectedLatitude");
                const storedLng = await AsyncStorage.getItem("selectedLongitude");
                if (storedLat && storedLng) {
                    const lat = Number(storedLat);
                    const lng = Number(storedLng);
                    setSelectedLocation({ latitude: lat, longitude: lng });
                } else {
                    const perm = await Location.getForegroundPermissionsAsync();
                    if (perm.status === "granted") {
                        fetchLocation(false);
                    } else {
                        setShowPermissionUI(true);
                    }
                }
            } catch {
                fetchLocation(false);
            }
        };
        initLocation();
    }, []);

    // MAP LOCATION SELECT
    const handleLocationSelect = (coord: { latitude: number; longitude: number }) => {
        setSelectedLocation(coord);
    };

    // CURRENT LOCATION BUTTON
    const handleCurrentLocation = async () => {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") {
            setShowPermissionUI(true);
            return;
        }
        fetchLocation(true);
    };

    // CONFIRM
    const handleConfirmLocation = async () => {
        try {
            const latitude = selectedLocation?.latitude;
            const longitude = selectedLocation?.longitude;

            if (
                latitude === undefined ||
                longitude === undefined
            ) {
                console.log("Location not selected");
                return;
            }

            console.log("Selected Location:", {
                latitude,
                longitude,
            });

            // Save location
            await AsyncStorage.setItem(
                "selectedLatitude",
                latitude.toString()
            );

            await AsyncStorage.setItem(
                "selectedLongitude",
                longitude.toString()
            );

            // Go back to AddNewAddress
            navigation.goBack();
        } catch (error) {
            console.error(
                "Error saving selected location:",
                error
            );
        }
    };

    if (showPermissionUI) {
        return (
            <LocationAccess
                onPermissionGranted={async () => {
                    setShowPermissionUI(false);
                    await fetchLocation(true);
                }}
                onClose={() => setShowPermissionUI(false)}
                onNotNow={() => setShowPermissionUI(false)}
            />
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
                navigation={navigation}
                showBackButton={true}
                title="Set Location"
                titleColor="black"
            />

            {/* INSTRUCTION */}
            <View
                style={{
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 30,
                    paddingBottom: 10,
                    backgroundColor: "#FFFFFF",
                }}
            >
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 13,
                        lineHeight: 19,
                        color: "#7A7D88",
                    }}
                >
                    Tap on the map to select the exact delivery location.
                </Text>
            </View>

            {/* MAP */}
            <View
                style={{
                    flex: 1,
                }}
            >
                <OpenStreetMap
                    latitude={selectedLocation.latitude}
                    longitude={selectedLocation.longitude}
                    zoom={16}
                    interactive={true}
                    pinColor="#000000"
                    onLocationSelect={handleLocationSelect}
                />
            </View>

            {/* BOTTOM ACTIONS */}
            <View
                style={{
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 11,
                    paddingTop: 10,
                    paddingBottom: Platform.OS === "ios" ? 18 : 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 5,
                    elevation: 6,
                }}
            >
                {/* Current Location (Same height and design as Geo Location button) */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCurrentLocation}
                    disabled={loadingLocation}
                    style={{
                        height: 67,
                        borderRadius: 40,
                        backgroundColor: "#F2F2F6",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 11,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: "#000000",
                    }}
                >
                    {/* Icon */}
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
                        {loadingLocation ? (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                            />
                        ) : (
                            <Ionicons
                                name="locate"
                                size={19}
                                color="#FFFFFF"
                            />
                        )}
                    </View>

                    {/* Text */}
                    <View
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            justifyContent: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#000000",
                                lineHeight: 19,
                                marginBottom: 4,
                            }}
                        >
                            Fetch My Current Location
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                lineHeight: 18,
                                color: "#494A65",
                            }}
                        >
                            {loadingLocation
                                ? "Detecting GPS..."
                                : "Use GPS to get your exact location"}
                        </Text>
                    </View>

                </TouchableOpacity>

                {/* Confirm Button (Same width, height, position, and styling as Save & Continue) */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleConfirmLocation}
                    style={{
                        height: 50,
                        borderRadius: 26,
                        backgroundColor: "#000000",
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.15,
                        shadowRadius: 5,
                        elevation: 4,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 14,
                            fontWeight: "700",
                        }}
                    >
                        Confirm Selected Location
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SetLocation;