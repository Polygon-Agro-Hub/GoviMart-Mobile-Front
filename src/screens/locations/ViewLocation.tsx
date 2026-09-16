import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OpenStreetMap from "@/component/common/OpenStreetMap";
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
    const { latitude, longitude, title } = route.params;

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
            <CustomHeader title={title} showBackButton navigation={navigation} />


            {/* Map */}
            <View
                style={{
                    flex: 1,
                }}
            >
                <OpenStreetMap
                    latitude={latitude}
                    longitude={longitude}
                    zoom={15}
                    interactive={true}
                    pinColor="#000000"
                    markers={[{
                        latitude,
                        longitude,
                        title: title || "Delivery Location",
                        color: "#000000"
                    }]}
                />
            </View>
        </View>
    );
};

export default ViewLocation;