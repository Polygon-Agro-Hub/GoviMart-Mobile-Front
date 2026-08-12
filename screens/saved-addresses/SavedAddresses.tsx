import React from "react";
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
}

const SavedAddresses: React.FC<SavedAddressesProps> = ({
    navigation,
}) => {
    const [addresses, setAddresses] = React.useState<Address[]>([
        {
            id: 1,
            title: "Home",
            name: "Mr. Namal Perera",
            address: "18/34 Road, Homagama, Sri Lanka",
            phone: "0701122500",
        },
        {
            id: 2,
            title: "Parent’s Home",
            name: "Mr. Amal Perera",
            address: "11/B, Diyagama Road, Homagama, Sri Lanka",
            phone: "0701122500",
        },
    ]);

    const handleDelete = (id: number) => {
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
                    onPress: () => {
                        setAddresses((current) =>
                            current.filter((item) => item.id !== id)
                        );
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
        navigation.navigate("EditAddress",);
        console.log("Edit address:", address);
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* ================= HEADER ================= */}

            <View
                style={{
                    height: 58,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 12,
                }}
            >
                {/* Back Button */}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.goBack()}
                    style={{
                        position: "absolute",
                        left: 12,

                        width: 38,
                        height: 38,
                        borderRadius: 19,

                        backgroundColor: "#FFFFFF",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 2,
                        },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,

                        elevation: 2,
                    }}
                >
                    <Ionicons
                        name="chevron-back"
                        size={22}
                        color="#111"
                    />
                </TouchableOpacity>

                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#111",
                    }}
                >
                    Saved Addresses
                </Text>
            </View>

            {/* ================= CONTENT ================= */}

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

                {addresses.map((item) => (
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
                                onPress={() => handleDelete(item.id)}
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
                ))}
            </ScrollView>
        </View>
    );
};

export default SavedAddresses;