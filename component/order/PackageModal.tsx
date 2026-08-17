import { Ionicons } from "@expo/vector-icons"
import { Image, Modal, Text, TouchableOpacity, View } from "react-native"
interface PackageItem {
    itemName: string;
    quantity: string;
    image: string;
}
interface Package {
    id: number;
    name: string;
    quantity: number;
    price: number;
    items: PackageItem[];
}
interface PackageModalProps {
    visible: boolean,
    onVisible: (bool: boolean) => void,
    packages: Package[]
}

export const PackageModal = ({ visible, onVisible, packages }: PackageModalProps) => {
    {/* PACKAGE DETAILS MODAL */ }
    return (<Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
            onVisible(false)
        }
    >
        <View
            style={{
                flex: 1,
                backgroundColor:
                    "rgba(0,0,0,0.35)",
                justifyContent: "center",
                paddingHorizontal: 12,

            }}
        >
            <View
                style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 9,
                    maxHeight: "72%",
                    padding: 10,
                }}
            >
                {/* Modal Header */}

                <View
                    style={{
                        flexDirection:
                            "row",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        marginBottom: 10,
                        marginTop: 5
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight:
                                "600",
                        }}
                    >
                        Packages (03)
                    </Text>

                    <TouchableOpacity
                        onPress={() =>
                            onVisible(
                                false
                            )
                        }
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 99,
                            backgroundColor:
                                "#000",
                            justifyContent:
                                "center",
                            alignItems:
                                "center",
                        }}
                    >
                        <Ionicons
                            name="close"
                            size={9}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                </View>

                {/* Selected package */}

                {packages && packages.map((pkg) => (
                    <View
                        key={pkg.id}
                        style={{
                            borderWidth: 1,
                            borderColor:
                                "#DDE3E8",
                            borderRadius: 20,
                            paddingHorizontal:
                                10,
                            paddingVertical:
                                12,
                            marginBottom: 13
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight:
                                    "600",
                                marginBottom:
                                    8,
                            }}
                        >
                            {
                                pkg.name
                            }{" "}
                            (x
                            {
                                pkg.quantity
                            }
                            )
                        </Text>

                        {pkg.items.map(
                            (
                                item,
                                index
                            ) => (
                                <View
                                    key={`${item.itemName}-${index}`}
                                    style={{
                                        flexDirection:
                                            "row",
                                        alignItems:
                                            "center",
                                        paddingVertical:
                                            10,
                                        borderTopWidth:
                                            index ===
                                                0
                                                ? 1
                                                : 1,
                                        borderTopColor:
                                            "#ECEFF2",
                                    }}
                                >
                                    <Image
                                        source={{
                                            uri: item.image,
                                        }}
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 15,
                                            marginRight: 12,
                                        }}
                                    />

                                    <View
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight:
                                                    "500",
                                            }}
                                        >
                                            {
                                                item.itemName
                                            }
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color:
                                                    "#5A5859",
                                                marginTop:
                                                    1,
                                            }}
                                        >
                                            {
                                                item.quantity
                                            }
                                        </Text>
                                    </View>
                                </View>
                            )
                        )}
                    </View>
                ))}
            </View>
        </View>
    </Modal>)
}