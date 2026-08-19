import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
} from "react-native";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import customerService from "@/services/customer/customer.service";
import { useFocusEffect } from "@react-navigation/native";

type SavedAddressesNavigationProp = StackNavigationProp<
    RootStackParamList,
    "SavedAddresses"
>;

interface SavedAddressesProps {
    navigation: SavedAddressesNavigationProp;
}

interface Address {
    id: number;
    title: string;
    name: string;
    address: string;
    phone: string;
    buildingType?: string;
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
    return parts.filter(p => p !== null && p !== undefined && String(p).trim() !== "").join(", ");
};

const SavedAddresses: React.FC<SavedAddressesProps> = ({
    navigation,
}) => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    
    useFocusEffect(
        useCallback(() => {
            const fetchingSavedAddresses = async () => {
                try {
                    setLoading(true);
                    const response = await customerService.getSavedAddresses();
                    console.log("fetched saved addresses message: ", response.data.message);
                    if (!response.data.hasAddress || !response.data.result) {
                        setAddresses([]);
                    } else {
                        const mapped: Address[] = response.data.result.map((item: any) => ({
                            id: item.id,
                            title: item.saveAs || "Address",
                            name: item.fullName ? `${item.title ? item.title + '. ' : ''}${item.fullName}` : "No Name Provided",
                            address: formatAddress(item),
                            phone: item.phone1 ? `${item.phonecode1 || ''}${item.phone1}` : "No Phone Provided",
                            buildingType: item.buildingType,
                        }));
                        setAddresses(mapped);
                    }
                }
                catch (error) {
                    console.log("failed to fetching saved addresses: ", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchingSavedAddresses();
        }, [])
    );

    const handleDelete = (id: number, buildingType?: string) => {
        Alert.alert(
            "Delete Address",
            "Are you sure you want to delete this address?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            if (buildingType) {
                                await customerService.deleteAddress(id, buildingType);
                            }
                            setAddresses((current) =>
                                current.filter((item) => item.id !== id)
                            );
                            Alert.alert("Success", "Address deleted successfully.");
                        } catch (error) {
                            console.log("failed to delete address: ", error);
                            Alert.alert("Error", "Failed to delete address. Please try again.");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleView = (address: Address) => {
        console.log("View address:", address);
    };

    const handleEdit = (address: Address) => {
        if (!address) return;
        navigation.navigate("EditAddress");
        console.log("Edit address:", address);
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            <CustomHeader
                title="Saved Addresses"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            {/* ================= CONTENT ================= */}

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <LoadingPage message="Loading Saved Addresses..." fullScreen={false} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 11,
                        paddingTop: 12,
                        paddingBottom: 30,
                    }}
                >
                    {/* ================= ADD ADDRESS ================= */}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            console.log("Add new address");
                            navigation.navigate("AddNewAddress");
                        }}
                        style={{
                            height: 58,
                            borderRadius: 30,

                            backgroundColor: "#FFF5EA",

                            flexDirection: "row",
                            alignItems: "center",

                            paddingHorizontal: 10,

                            marginBottom: 16,
                        }}
                    >
                        {/* Plus Circle */}

                        <View
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,


                                justifyContent: "center",
                                alignItems: "center",

                            }}
                        >
                            <FontAwesome6
                                name="circle-plus"
                                size={30}
                                color="#0000"
                            />
                        </View>

                        {/* Text */}

                        <View
                            style={{
                                flex: 1,
                                marginLeft: 10,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "800",
                                    color: "#111",
                                }}
                            >
                                Add New Address
                            </Text>

                            <Text
                                style={{
                                    fontSize: 14,
                                    color: "#555A72",
                                    marginTop: 2,
                                }}
                            >
                                Save your delivery information
                            </Text>
                        </View>

                        {/* Arrow */}

                        <Ionicons
                            name="chevron-forward"
                            size={22}
                            color="#111"
                        />
                    </TouchableOpacity>

                    {/* ================= TITLE ================= */}

                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: "#111",
                            marginBottom: 11,
                        }}
                    >
                        Saved Addresses ({String(addresses.length).padStart(2, "0")})
                    </Text>

                    {/* ================= ADDRESS LIST ================= */}

                    {addresses.length > 0 ? (
                        addresses.map((item) => (
                            <View
                                key={item.id}
                                style={{
                                    width: "100%",
                                    borderRadius: 16,

                                    backgroundColor: "#FFFFFF",

                                    borderWidth: 1,
                                    borderColor: "#DCE2EA",

                                    marginBottom: 22,

                                    overflow: "hidden",
                                }}
                            >
                                {/* Address Details */}

                                <View
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingTop: 12,
                                        paddingBottom: 15,
                                    }}
                                >
                                    {/* Address Title */}

                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: "800",
                                            color: "#111",
                                            marginBottom: 7,
                                        }}
                                    >
                                        {item.title}
                                    </Text>

                                    {/* Name */}

                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            marginBottom: 6,
                                        }}
                                    >
                                        <FontAwesome6
                                            name="user"
                                            solid
                                            size={15}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                marginLeft: 7,
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: "#111",
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
                                            marginBottom: 6,
                                        }}
                                    >
                                        <FontAwesome6
                                            name="location-dot"
                                            size={15}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                flex: 1,
                                                marginLeft: 7,
                                                fontSize: 13,
                                                lineHeight: 16,
                                                color: "#555A72",
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
                                        }}
                                    >
                                        <FontAwesome6
                                            name="phone"
                                            size={14}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                marginLeft: 7,
                                                fontSize: 13,
                                                color: "#555A72",
                                            }}
                                        >
                                            {item.phone}
                                        </Text>
                                    </View>
                                </View>

                                {/* ================= ACTION BAR ================= */}

                                <View
                                    style={{
                                        height: 30,

                                        borderTopWidth: 1,
                                        borderTopColor: "#E8EBEF",

                                        flexDirection: "row",
                                        alignItems: "center",
                                    }}
                                >
                                    {/* VIEW */}

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleView(item)}
                                        style={{
                                            flex: 1,
                                            height: "100%",

                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <FontAwesome6
                                            name="map-location-dot"
                                            size={14}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#111",
                                                marginLeft: 7,
                                            }}
                                        >
                                            View
                                        </Text>
                                    </TouchableOpacity>

                                    {/* DIVIDER */}

                                    <View
                                        style={{
                                            width: 1,
                                            height: 22,
                                            backgroundColor: "#E8EBEF",
                                        }}
                                    />

                                    {/* EDIT */}

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleEdit(item)}
                                        style={{
                                            flex: 1,
                                            height: "100%",

                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <FontAwesome6
                                            name="pen"
                                            size={14}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#111",
                                                marginLeft: 7,
                                            }}
                                        >
                                            Edit
                                        </Text>
                                    </TouchableOpacity>

                                    {/* DIVIDER */}

                                    <View
                                        style={{
                                            width: 1,
                                            height: 22,
                                            backgroundColor: "#E8EBEF",
                                        }}
                                    />

                                    {/* DELETE */}

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleDelete(item.id, item.buildingType)}
                                        style={{
                                            flex: 1,
                                            height: "100%",

                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <FontAwesome6
                                            name="trash"
                                            size={14}
                                            color="#000"
                                        />

                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#111",
                                                marginLeft: 7,
                                            }}
                                        >
                                            Delete
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View>
                            <Text style={{ alignSelf: "center", justifyContent: "center", marginTop: 200 }}>
                                No saved addresses found
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Deleting Overlay */}
            {deleting && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 999,
                    }}
                >
                    <LoadingPage message="Deleting Address..." fullScreen={false} />
                </View>
            )}
        </View>
    );
};

export default SavedAddresses;