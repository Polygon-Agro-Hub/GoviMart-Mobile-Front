import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import MapView, {
    Marker,
    MapPressEvent,
    Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SetLocationNavigationProp = StackNavigationProp<
    RootStackParamList,
    "SetLocation"
>;

interface Props {
    navigation: SetLocationNavigationProp;
}

const SetLocation: React.FC<Props> = ({ navigation }) => {
    // Initial location
    const initialRegion: Region = {
        latitude: 9.455,
        longitude: 80.0,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
    };

    const [selectedLocation, setSelectedLocation] = useState({
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
    });

    const [region, setRegion] =
        useState<Region>(initialRegion);

    const [loadingLocation, setLoadingLocation] =
        useState(false);

    // MAP PRESS
    const handleMapPress = (event: MapPressEvent) => {
        const { latitude, longitude } =
            event.nativeEvent.coordinate;

        setSelectedLocation({
            latitude,
            longitude,
        });
    };

    // CURRENT LOCATION
    const handleCurrentLocation = async () => {
        try {
            setLoadingLocation(true);

            const { status } =
                await Location.requestForegroundPermissionsAsync();

            if (status !== "granted") {
                Alert.alert(
                    "Location Permission",
                    "Please allow location permission to use your current location."
                );

                return;
            }

            const location =
                await Location.getCurrentPositionAsync({
                    accuracy:
                        Location.Accuracy.High,
                });

            const latitude =
                location.coords.latitude;

            const longitude =
                location.coords.longitude;

            const newRegion: Region = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            setSelectedLocation({
                latitude,
                longitude,
            });

            setRegion(newRegion);
        } catch (error) {
            console.error(
                "Current location error:",
                error
            );

            Alert.alert(
                "Location Error",
                "Unable to get your current location."
            );
        } finally {
            setLoadingLocation(false);
        }
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

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >

            {/* HEADER */}
            <CustomHeader navigation={navigation} showBackButton title="Set Location" />

            {/* INSTRUCTION */}
            <View
                style={{
                    height: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 30,
                }}
            >
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 13,
                        lineHeight: 20,
                        color: "#7A7D88",
                    }}
                >
                    Tap on the map to select the exact
                    {"\n"}
                    delivery location.
                </Text>
            </View>

            {/* MAP */}
            <View
                style={{
                    flex: 1,
                }}
            >
                <MapView
                    style={{

                        height: 550
                    }}
                    initialRegion={initialRegion}
                    region={region}
                    onRegionChangeComplete={(
                        newRegion
                    ) => {
                        setRegion(newRegion);
                    }}
                    onPress={handleMapPress}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    toolbarEnabled={false}
                >
                    {/* Selected Location */}
                    <Marker
                        coordinate={
                            selectedLocation
                        }
                        anchor={{
                            x: 0.5,
                            y: 0.5,
                        }}
                    >
                        <View
                            style={{
                                justifyContent:
                                    "center",
                                alignItems:
                                    "center",
                            }}
                        >
                            <Ionicons
                                name="location"
                                size={33}
                                color="#000000"
                            />
                        </View>
                    </Marker>
                </MapView>
            </View>

            {/* BOTTOM ACTIONS */}
            <View
                style={{
                    backgroundColor: "#FFFFFF",

                    paddingHorizontal: 9,
                    paddingTop: 9,
                    paddingBottom: 10,
                }}
            >
                {/* Current Location */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={
                        handleCurrentLocation
                    }
                    disabled={loadingLocation}
                    style={{
                        height: 58,

                        borderWidth: 1,
                        borderColor: "#111111",

                        borderRadius: 99,

                        backgroundColor: "#F5F4F7",

                        flexDirection: "row",
                        alignItems: "center",

                        paddingHorizontal: 9,

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 1,
                        },
                        shadowOpacity: 0.08,
                        shadowRadius: 3,

                        elevation: 2,
                    }}
                >
                    {/* Icon */}
                    <View
                        style={{
                            width: 23,
                            height: 23,

                            borderRadius: 12,

                            backgroundColor: "#000",

                            justifyContent: "center",
                            alignItems: "center",

                            marginRight: 8,
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
                                size={13}
                                color="#FFFFFF"
                            />
                        )}
                    </View>

                    {/* Text */}
                    <View
                        style={{
                            flex: 1,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                color: "#111",
                                fontWeight: "600",
                            }}
                        >
                            Fetch My Current Location
                        </Text>

                        <Text
                            style={{
                                fontSize: 7,
                                color: "#777",
                                marginTop: 1,
                            }}
                        >
                            Use GPS to get your exact location
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Confirm */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={
                        handleConfirmLocation
                    }
                    style={{
                        height: 58,

                        marginTop: 10,

                        borderRadius: 99,

                        backgroundColor: "#000000",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.18,
                        shadowRadius: 4,

                        elevation: 4,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 11,
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