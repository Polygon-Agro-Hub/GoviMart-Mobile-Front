import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";

type ViewLocationRouteProp = RouteProp<
    RootStackParamList,
    "ViewLocation"
>;

type ViewLocationNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ViewLocation"
>;

interface Props {
    navigation: ViewLocationNavigationProp;
    route: ViewLocationRouteProp;
}

const ViewLocation: React.FC<Props> = ({
    navigation,
    route,
}) => {
    const { latitude, longitude } = route.params;

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            <StatusBar
                backgroundColor="#FFFFFF"
                barStyle="dark-content"
            />

            {/* Header */}
            {/* replace navigation props address name */}
            <CustomHeader title="Home address 1 " showBackButton navigation={navigation} />


            {/* Map */}
            <View
                style={{
                    flex: 1,
                }}
            >
                <MapView
                    style={{
                        flex: 1,
                    }}
                    initialRegion={{
                        latitude: latitude,
                        longitude: longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                >
                    <Marker
                        coordinate={{
                            latitude: latitude,
                            longitude: longitude,
                        }}
                        anchor={{
                            x: 0.5,
                            y: 1,
                        }}
                    >
                        <View
                            style={{
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Ionicons
                                name="location-sharp"
                                size={35}
                                color="#000"
                            />
                        </View>
                    </Marker>
                </MapView>
            </View>
        </View>
    );
};

export default ViewLocation;