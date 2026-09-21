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
import NoDataFound from "@/component/common/NoDataFound";
import ConfirmationModal from "@/component/common/ConfirmationModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    return parts.filter(p => p !== null && p !== undefined && String(p).trim() !== "").join(", ");
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
                            phone: formatPhone(item),
                            buildingType: item.buildingType,
                            raw: item,
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

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState<{ id: number; buildingType?: string } | null>(null);

    const handleDelete = (id: number, buildingType?: string) => {
        setAddressToDelete({ id, buildingType });
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;
        const { id, buildingType } = addressToDelete;
        setDeleteModalVisible(false);
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
            setAddressToDelete(null);
        }
    };

    const handleView = (address: Address) => {
        console.log("View address:", address);
        navigation.navigate("ViewLocation", { latitude: Number(address.raw!.latitude), longitude: Number(address.raw!.longitude), title: address.title });
    };

    const handleEdit = (address: Address) => {
        if (!address) return;
        navigation.navigate("EditAddress", { address: address.raw || address });
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
                    className="px-6"
                    contentContainerStyle={{
                        paddingTop: 12,
                        paddingBottom: 30,
                    }}
                >
                    {/* ================= ADD ADDRESS ================= */}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={async () => {
                            try {
                                await AsyncStorage.multiRemove([
                                    "selectedLatitude",
                                    "selectedLongitude",
                                ]);
                            } catch {}
                            navigation.navigate("AddNewAddress");
                        }}
                        style={{
                            height: 67,
                            borderRadius: 40,
                            backgroundColor: "#FFF5EA",
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 11,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: "#FFE0B2",
                        }}
                    >
                        {/* Plus Circle */}
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
                            <Ionicons
                                name="add"
                                size={22}
                                color="#FFFFFF"
                            />
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

                        {/* Arrow */}
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#111111"
                            style={{ marginRight: 6 }}
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
                                            fontSize: 16,
                                            fontWeight: "700",
                                            color: "#111111",
                                            marginBottom: 8,
                                        }}
                                    >
                                        {item.title}
                                    </Text>

                                    {/* Name */}

                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            marginBottom: 7,
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
                                                marginLeft: 8,
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
                                        <FontAwesome6
                                            name="location-dot"
                                            size={15}
                                            color="#000"
                                            style={{ marginTop: 2 }}
                                        />

                                        <Text
                                            style={{
                                                flex: 1,
                                                marginLeft: 8,
                                                fontSize: 13.5,
                                                lineHeight: 19,
                                                color: "#4A4D57",
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
                                                marginLeft: 8,
                                                fontSize: 13.5,
                                                color: "#4A4D57",
                                            }}
                                        >
                                            {item.phone}
                                        </Text>
                                    </View>
                                </View>

                                {/* ================= ACTION BAR ================= */}

                                <View
                                    style={{
                                        height: 36,

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
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: "#111",
                                                marginLeft: 6,
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
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: "#111",
                                                marginLeft: 6,
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
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: "#111",
                                                marginLeft: 6,
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
                            <Text style={{ alignSelf: "center", justifyContent: "center", marginTop: "20%" }}>
                                
                                    <NoDataFound message={"No saved addresses found"} />
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

            {/* Delete Address Confirmation Modal */}
            <ConfirmationModal
                visible={deleteModalVisible}
                title="Delete Address"
                message="Are you sure you want to delete this address?"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                iconName="trash-outline"
                iconColor="#DC2626"
                iconBgColor="bg-red-50"
                confirmButtonColor="#DC2626"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteModalVisible(false);
                    setAddressToDelete(null);
                }}
            />
        </View>
    );
};

export default SavedAddresses;