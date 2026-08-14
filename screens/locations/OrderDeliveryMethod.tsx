import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import LottieView from "lottie-react-native";

type NavigationProp = StackNavigationProp<
    RootStackParamList,
    "OrderDeliveryMethod"
>;

interface Props {
    navigation: NavigationProp;
}

type DeliveryMethod = "pickup" | "delivery";

const OrderDeliveryMethod: React.FC<Props> = ({
    navigation,
}) => {
    const [deliveryMethod, setDeliveryMethod] =
        useState<DeliveryMethod>("pickup");

    const handleContinue = () => {
        if (deliveryMethod === "pickup") {
            console.log("Pick up from Centre");
        } else {
            console.log("Deliver to My Location");
        }

        // Example:
        // navigation.navigate("PaymentMethod");
    };

    return (
        <SafeAreaView
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
                    height: 55,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.goBack()}
                    style={{
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
                        size={25}
                        color="#000"
                    />
                </TouchableOpacity>
            </View>

            {/* ================================================= */}
            {/* CONTENT */}
            {/* ================================================= */}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 22,
                    paddingBottom: 130,
                }}
            >
                {/* ================================================= */}
                {/* TITLE */}
                {/* ================================================= */}

                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 18,
                        lineHeight: 26,
                        fontWeight: "800",
                        color: "#111",
                        marginHorizontal: 30,
                    }}
                >
                    How would you like to receive
                    {"\n"}
                    your order?
                </Text>

                {/* ================================================= */}
                {/* DESCRIPTION */}
                {/* ================================================= */}

                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 17,
                        color: "#60647A",
                        marginTop: 15,
                        marginHorizontal: 25,
                    }}
                >
                    Choose the option that works best for you.
                    {"\n"}
                    You can pick it up from our centre or get it
                    {"\n"}
                    delivered to your location.
                </Text>

                {/* ================================================= */}
                {/* PICKUP */}
                {/* ================================================= */}

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                        setDeliveryMethod("pickup")
                    }
                    style={{
                        marginTop: 24,

                        minHeight: 104,

                        borderWidth: 1,
                        borderColor:
                            deliveryMethod === "pickup"
                                ? "#FF8A00"
                                : "#DDE3E9",

                        borderRadius: 19,

                        paddingHorizontal: 10,
                        paddingVertical: 11,

                        backgroundColor: "#FFFFFF",
                    }}
                >
                    {/* Check */}

                    <View
                        style={{
                            position: "absolute",
                            right: 8,
                            top: 9,

                            width: 18,
                            height: 18,
                            borderRadius: 9,

                            backgroundColor:
                                deliveryMethod === "pickup"
                                    ? "#000"
                                    : "#FFFFFF",

                            borderWidth:
                                deliveryMethod === "pickup"
                                    ? 0
                                    : 2,

                            borderColor: "#000",

                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {deliveryMethod === "pickup" && (
                            <Ionicons
                                name="checkmark"
                                size={12}
                                color="#FFFFFF"
                            />
                        )}
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                        }}
                    >
                        {/* Illustration */}

                        <View
                            style={{
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 10,
                            }}
                        >

                            <LottieView
                                        source={require("@/assets/json/delivery.json")}
                                        autoPlay
                                        loop={false}
                                        style={{ width: 50, height: 50 }}
                                      />
                        </View>

                        {/* Content */}

                        <View
                            style={{
                                flex: 1,
                                paddingRight: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "800",
                                    color: "#111",
                                }}
                            >
                                Pick up from Centre
                            </Text>

                            <Text
                                style={{
                                    fontSize: 11,
                                    lineHeight: 15,
                                    color: "#666A7D",
                                    marginTop: 4,
                                }}
                            >
                                Pick your order on the delivery date from
                                {"\n"}
                                our centre.
                            </Text>

                            {/* Tags */}

                            <View
                                style={{
                                    flexDirection: "row",
                                    marginTop: 6,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",

                                        backgroundColor:
                                            "#FFF4E8",

                                        borderRadius: 3,

                                        paddingHorizontal: 5,
                                        paddingVertical: 3,

                                        marginRight: 5,
                                    }}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={11}
                                        color="#111"
                                    />

                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 3,
                                        }}
                                    >
                                        On Delivery Date
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",

                                        backgroundColor:
                                            "#FFF4E8",

                                        borderRadius: 3,

                                        paddingHorizontal: 5,
                                        paddingVertical: 3,
                                    }}
                                >
                                    <Ionicons
                                        name="location"
                                        size={11}
                                        color="#111"
                                    />

                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 3,
                                        }}
                                    >
                                        From Our Centre
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* ================================================= */}
                {/* DELIVERY */}
                {/* ================================================= */}

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                        setDeliveryMethod("delivery")
                    }
                    style={{
                        marginTop: 20,

                        minHeight: 104,

                        borderWidth: 1,
                        borderColor:
                            deliveryMethod === "delivery"
                                ? "#FF8A00"
                                : "#DDE3E9",

                        borderRadius: 19,

                        paddingHorizontal: 10,
                        paddingVertical: 11,

                        backgroundColor: "#FFFFFF",
                    }}
                >
                    {/* Radio */}

                    <View
                        style={{
                            position: "absolute",
                            right: 8,
                            top: 9,

                            width: 18,
                            height: 18,
                            borderRadius: 9,

                            backgroundColor:
                                deliveryMethod === "delivery"
                                    ? "#000"
                                    : "#FFFFFF",

                            borderWidth:
                                deliveryMethod === "delivery"
                                    ? 0
                                    : 2,

                            borderColor: "#000",

                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {deliveryMethod === "delivery" && (
                            <Ionicons
                                name="checkmark"
                                size={12}
                                color="#FFFFFF"
                            />
                        )}
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                        }}
                    >
                        {/* Illustration */}

                        <View
                            style={{
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 10,
                            }}
                        >
                         
                         <LottieView
                                        source={require("@/assets/json/delivery-2.json")}
                                        autoPlay
                                        loop={false}
                                        style={{ width: 50, height: 50,}}
                                      />
                        </View>

                        {/* Content */}

                        <View
                            style={{
                                flex: 1,
                                paddingRight: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "800",
                                    color: "#111",
                                }}
                            >
                                Deliver to My Location
                            </Text>

                            <Text
                                style={{
                                    fontSize: 11,
                                    lineHeight: 15,
                                    color: "#666A7D",
                                    marginTop: 4,
                                }}
                            >
                                We'll deliver your order to your selected
                                {"\n"}
                                delivery address.
                            </Text>

                            {/* Tags */}

                            <View
                                style={{
                                    flexDirection: "row",
                                    marginTop: 6,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",

                                        backgroundColor:
                                            "#FFF4E8",

                                        borderRadius: 3,

                                        paddingHorizontal: 5,
                                        paddingVertical: 3,

                                        marginRight: 5,
                                    }}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={11}
                                        color="#111"
                                    />

                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 3,
                                        }}
                                    >
                                        On Delivery Date
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",

                                        backgroundColor:
                                            "#FFF4E8",

                                        borderRadius: 3,

                                        paddingHorizontal: 5,
                                        paddingVertical: 3,
                                    }}
                                >
                                    <Ionicons
                                        name="location"
                                        size={11}
                                        color="#111"
                                    />

                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 3,
                                        }}
                                    >
                                        To your Location
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* ================================================= */}
                {/* SAFE & RELIABLE */}
                {/* ================================================= */}

                <View
                    style={{
                        marginTop: 37,

                        minHeight: 67,

                        borderRadius: 18,

                        backgroundColor: "#FFF9EF",

                        paddingHorizontal: 11,
                        paddingVertical: 12,

                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    {/* Shield */}

                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,

                            backgroundColor: "#FFF0CE",

                            justifyContent: "center",
                            alignItems: "center",

                            marginRight: 10,
                        }}
                    >
                        <Ionicons
                            name="shield-half"
                            size={17}
                            color="#000"
                        />
                    </View>

                    <View
                        style={{
                            flex: 1,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "800",
                                color: "#111",
                            }}
                        >
                            Safe & Reliable
                        </Text>

                        <Text
                            style={{
                                fontSize: 10,
                                color: "#6B6B6B",
                                marginTop: 4,
                            }}
                        >
                            Your order is packed fresh and handled with
                            care.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* ================================================= */}
            {/* CONTINUE BUTTON */}
            {/* ================================================= */}

            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,

                    paddingHorizontal: 14,
                    paddingBottom: 12,
                    paddingTop: 8,

                    backgroundColor: "#FFFFFF",
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleContinue}
                    style={{
                        height: 48,

                        backgroundColor: "#000000",

                        borderRadius: 25,

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.18,
                        shadowRadius: 5,

                        elevation: 5,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "800",
                        }}
                    >
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default OrderDeliveryMethod;