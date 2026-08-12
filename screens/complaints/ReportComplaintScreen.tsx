import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Alert,
    Platform,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";

type ReportComplaintNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ReportComplaint"
>;

interface ReportComplaintProps {
    navigation: ReportComplaintNavigationProp;
}

const ReportComplaint: React.FC<ReportComplaintProps> = ({
    navigation,
}) => {
    const [category, setCategory] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [description, setDescription] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);

    const categories = [
        "Product Quality",
        "Missing Item",
        "Damaged Product",
        "Wrong Product",
        "Delivery Issue",
        "Payment Issue",
        "Other",
    ];

    // =====================================================
    // PICK PHOTOS
    // =====================================================

    const handleAddPhoto = async () => {
        if (photos.length >= 6) {
            Alert.alert(
                "Photo Limit",
                "You can upload a maximum of 6 photos.",
            );
            return;
        }

        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                "Permission Required",
                "Please allow photo library access to upload photos.",
            );
            return;
        }

        const remainingPhotos = 6 - photos.length;

        const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsMultipleSelection: true,
                selectionLimit: remainingPhotos,
                quality: 0.8,
            });

        if (!result.canceled) {
            const selectedPhotos = result.assets.map(
                (asset) => asset.uri,
            );

            setPhotos((previous) => [
                ...previous,
                ...selectedPhotos,
            ]);
        }
    };

    // =====================================================
    // REMOVE PHOTO
    // =====================================================

    const handleRemovePhoto = (index: number) => {
        setPhotos((previous) =>
            previous.filter((_, i) => i !== index),
        );
    };

    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = () => {
        if (!category.trim()) {
            Alert.alert(
                "Required",
                "Please select a complaint category.",
            );
            return;
        }

        if (!description.trim()) {
            Alert.alert(
                "Required",
                "Please enter a description.",
            );
            return;
        }

        const complaintData = {
            category,
            description: description.trim(),
            photos,
        };

        console.log(
            "Complaint:",
            complaintData,
        );

        Alert.alert(
            "Complaint Submitted",
            "Your complaint has been submitted successfully.",
            [
                {
                    text: "OK",
                    onPress: () => navigation.navigate("ComplaintHistory"),
                },
            ],
        );
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

            <CustomHeader
                title="Report a Complaint"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 13,
                    paddingTop: 8,
                    paddingBottom: 100,
                }}
            >
                {/* ================================================= */}
                {/* COMPLAINT ICON */}
                {/* ================================================= */}

                <View
                    style={{
                        alignItems: "center",
                        marginTop: 2,
                    }}
                >
                    <View
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 26,
                            backgroundColor: "#F3F3F7",

                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome6
                            solid
                            name="headset"
                            size={29}
                            color="#000"
                        />
                    </View>
                </View>

                {/* DESCRIPTION TEXT */}

                <Text
                    style={{
                        textAlign: "center",
                        color: "#666",
                        fontSize: 12,
                        lineHeight: 16,

                        marginTop: 16,
                        marginHorizontal: 8,
                        marginBottom: 29,
                    }}
                >
                    We're here to help. Please provide the details{"\n"}
                    of your complaint below.
                </Text>

                {/* CATEGORY */}

                <View
                    style={{
                        position: "relative",
                        zIndex: 100,
                        marginBottom: categoryOpen ? 8 : 20,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                            setCategoryOpen(!categoryOpen)
                        }
                        style={{
                            height: 60,

                            borderWidth: 1,
                            borderColor: "#D9DEE4",

                            borderRadius: 30,

                            paddingHorizontal: 21,

                            justifyContent: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#333",
                                marginBottom: 5,
                            }}
                        >
                            Complaint Category
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: "#111",
                                fontWeight: "500",
                            }}
                        >
                            {category || "Select Category"}
                        </Text>

                        <Ionicons
                            name={
                                categoryOpen
                                    ? "chevron-up"
                                    : "chevron-down"
                            }
                            size={19}
                            color="#000"
                            style={{
                                position: "absolute",
                                right: 18,
                                top: 21,
                            }}
                        />
                    </TouchableOpacity>

                    {/* Category Dropdown */}

                    {categoryOpen && (
                        <View
                            style={{
                                position: "absolute",
                                top: 65,
                                left: 0,
                                right: 0,

                                backgroundColor: "#FFFFFF",

                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: "#E0E3E7",

                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 3,
                                },
                                shadowOpacity: 0.12,
                                shadowRadius: 6,

                                elevation: 8,

                                overflow: "hidden",
                            }}
                        >
                            {categories.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setCategory(item);
                                        setCategoryOpen(false);
                                    }}
                                    style={{
                                        minHeight: 43,
                                        paddingHorizontal: 18,
                                        justifyContent: "center",

                                        borderBottomWidth: 1,
                                        borderBottomColor: "#F1F1F1",
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: "#111",
                                            fontWeight:
                                                category === item
                                                    ? "500"
                                                    : "400",
                                        }}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* DESCRIPTION */}

                <Text
                    style={{
                        fontSize: 14,
                        color: "#0000",
                        marginBottom: 8,
                    }}
                >
                    1. Description
                </Text>

                <View
                    style={{
                        height: 204,

                        borderWidth: 1,
                        borderColor: "#D9DEE4",

                        borderRadius: 17,

                        paddingHorizontal: 21,
                        paddingTop: 13,

                        marginBottom: 19,
                    }}
                >
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                        placeholder="Please describe your issue in detail.."
                        placeholderTextColor="#A0A0A0"
                        style={{
                            flex: 1,
                            padding: 0,
                            fontSize: 14,
                            lineHeight: 18,
                            color: "#0000",
                            fontWeight: "500"
                        }}
                    />
                </View>

                {/* ================================================= */}
                {/* PHOTOS TITLE */}
                {/* ================================================= */}

                <Text
                    style={{
                        fontSize: 14,
                        color: "#111",
                        marginBottom: 6,
                    }}
                >
                    2. Upload Photos (Optional)
                </Text>

                <Text
                    style={{
                        fontSize: 11,
                        color: "#777",
                        marginBottom: 12,
                    }}
                >
                    Limit : Up to 6 photos (JPG, PNG - Max 5MB each)
                </Text>

                {/* ================================================= */}
                {/* PHOTO LIST */}
                {/* ================================================= */}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingRight: 5,
                    }}
                >
                    {photos.length < 6 && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleAddPhoto}
                            style={{
                                width: 100,
                                height: 100,
                                borderRadius: 15,
                                borderWidth: 1,
                                borderStyle: "dashed",
                                borderColor: "#D7DCE1",
                                backgroundColor: "#F9FAFB",
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 7,
                            }}
                        >
                            <FontAwesome6
                                name="camera"
                                solid
                                size={27}
                                color="#000"
                            />

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#747990",
                                    marginTop: 5,
                                }}
                            >
                                Add Photo
                            </Text>
                        </TouchableOpacity>
                    )}

                    {photos.map((uri, index) => (
                        <View
                            key={`${uri}-${index}`}
                            style={{
                                width: 100,
                                height: 100,
                                borderRadius: 15,
                                overflow: "hidden",
                                marginRight: 7,
                            }}
                        >
                            <Image
                                source={{ uri }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                resizeMode="cover"
                            />

                            <TouchableOpacity
                                onPress={() =>
                                    handleRemovePhoto(index)
                                }
                                style={{
                                    position: "absolute",
                                    top: 5,
                                    right: 5,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor:
                                        "rgba(0,0,0,0.65)",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons
                                    name="close"
                                    size={14}
                                    color="#FFF"
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </ScrollView>

            {/* ================================================= */}
            {/* BOTTOM SUBMIT BUTTON */}
            {/* ================================================= */}

            <View
                style={{
                    position: "absolute",

                    left: 0,
                    right: 0,
                    bottom: 0,

                    paddingHorizontal: 13,

                    paddingTop: 8,
                    paddingBottom:
                        Platform.OS === "ios" ? 18 : 10,

                    backgroundColor: "#FFFFFF",

                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: 0.08,
                    shadowRadius: 5,

                    elevation: 8,
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSubmit}
                    style={{
                        height: 50,

                        borderRadius: 27,

                        backgroundColor: "#000000",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.18,
                        shadowRadius: 5,

                        elevation: 4,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",

                            fontSize: 14,
                            fontWeight: "800",
                        }}
                    >
                        Submit Complaint
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ReportComplaint;