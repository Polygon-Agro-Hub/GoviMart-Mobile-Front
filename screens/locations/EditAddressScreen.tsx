import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { InputField } from "@/component/common/CustomField";
import { RouteProp } from "@react-navigation/native";
import LoadingPage from "@/component/common/LoadingPage";
import customerService from "@/services/customer/customer.service";
import AsyncStorage from "@react-native-async-storage/async-storage";

type EditAddressNavigationProp = StackNavigationProp<
    RootStackParamList,
    "EditAddress"
>;

type EditAddressRouteProp = RouteProp<RootStackParamList, "EditAddress">;

interface EditAddressProps {
    navigation: EditAddressNavigationProp;
    route: EditAddressRouteProp;
}

// DROPDOWN
const DropdownField = ({
    icon,
    label,
    value,
    open,
    setOpen,
    options,
    onSelect,
    highlighted = false,
}: {
    icon: keyof typeof Ionicons.glyphMap | any;
    label: string;
    value: string;
    open: boolean;
    setOpen: (value: boolean) => void;
    options: string[];
    onSelect: (value: string) => void;
    highlighted?: boolean;
}) => {
    return (
        <View
            style={{
                marginBottom: 12,
                zIndex: open ? 100 : 1,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOpen(!open)}
                style={{
                    height: 58,

                    borderWidth: highlighted ? 2 : 1,
                    borderColor: highlighted
                        ? "#0788FF"
                        : "#D9DEE5",

                    borderRadius: 30,

                    flexDirection: "row",
                    alignItems: "center",

                    paddingHorizontal: 11,

                    backgroundColor: "#FFFFFF",
                }}
            >
                {/* Icon */}

                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,

                        backgroundColor: "#000",

                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        solid
                        size={17}
                        color="#FFFFFF"
                    />
                </View>

                {/* Content */}

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
                            color: "#555",
                            lineHeight: 16,
                            marginBottom: 4,
                        }}
                    >
                        {label}
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 18,
                            color: "#111",
                            fontWeight: "500",
                        }}
                    >
                        {value}
                    </Text>
                </View>

                {/* Arrow */}

                <Ionicons
                    name={
                        open
                            ? "chevron-up"
                            : "chevron-down"
                    }
                    size={19}
                    color="#111"
                />
            </TouchableOpacity>

            {/* Dropdown Options */}

            {open && (
                <View
                    style={{
                        position: "absolute",

                        top: 62,
                        left: 0,
                        right: 0,

                        backgroundColor: "#FFFFFF",

                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E1E4E8",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,

                        elevation: 7,

                        overflow: "hidden",
                    }}
                >
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.7}
                            onPress={() => {
                                onSelect(option);
                                setOpen(false);
                            }}
                            style={{
                                minHeight: 44,
                                paddingHorizontal: 16,
                                justifyContent: "center",

                                borderBottomWidth: 1,
                                borderBottomColor: "#F1F1F1",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color:
                                        option === value
                                            ? "#000"
                                            : "#555",

                                    fontWeight:
                                        option === value
                                            ? "700"
                                            : "400",
                                }}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const EditAddress: React.FC<EditAddressProps> = ({
    navigation,
    route,
}) => {
    const addressParam = route.params?.address || {};

    const [saveAddressAs, setSaveAddressAs] = useState(addressParam.saveAs || "Home");
    const [title, setTitle] = useState(addressParam.title || "Mr");
    const [firstName, setFirstName] = useState(addressParam.fullName || "");
    const [mobileNumber1, setMobileNumber1] = useState(addressParam.phone1 || "");
    const [mobileNumber2, setMobileNumber2] = useState(addressParam.phone2 || "");
    const [buildingType, setBuildingType] = useState(addressParam.buildingType || "House");
    const [buildingNo, setBuildingNo] = useState(addressParam.buildingNo || addressParam.houseNo || "");
    const [streetName, setStreetName] = useState(addressParam.streetName || "");
    const [city, setCity] = useState(addressParam.city || "Colombo");
    const [phoneCode1, setPhoneCode1] = useState(addressParam.phonecode1 || "+94");
    const [phoneCode2, setPhoneCode2] = useState(addressParam.phonecode2 || "+94");
    const [buildingName, setBuildingName] = useState(addressParam.buildingName || "");
    const [unitNo, setUnitNo] = useState(addressParam.unitNo || "");
    const [floorNo, setFloorNo] = useState(addressParam.floorNo || "");
    const [latitude, setLatitude] = useState(addressParam.latitude || null);
    const [longitude, setLongitude] = useState(addressParam.longitude || null);

    const [titleOpen, setTitleOpen] = useState(false);
    const [buildingTypeOpen, setBuildingTypeOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [saveAddressOpen, setSaveAddressOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleFirstNameChange = (text: string) => {
        setFirstName(text);
    };

    const handleMobileNumber1Change = (text: string) => {
        // Allow numbers only
        const cleanedText = text.replace(/[^0-9]/g, "");
        setMobileNumber1(cleanedText);
    };

    const handleMobileNumber2Change = (text: string) => {
        // Allow numbers only
        const cleanedText = text.replace(/[^0-9]/g, "");
        setMobileNumber2(cleanedText);
    };

    const handleBuildingNoChange = (text: string) => {
        setBuildingNo(text);
    };

    const handleStreetNameChange = (text: string) => {
        setStreetName(text);
    };

    const titleOptions = ["Mr", "Mrs", "Ms", "Miss"];

    const buildingTypes = [
        "House",
        "Apartment",
    ];

    const cityOptions = [
        "Minuwangoda",
        "Gampaha",
        "Negombo",
        "Colombo",
        "Homagama",
    ];

    const saveAddressOptions = [
        "Home",
        "Office",
        "Parent's Home",
        "Other",
    ];

    const handleUpdateAddress = async () => {
        if (!saveAddressAs.trim()) {
            Alert.alert(
                "Required",
                "Save Address As is required."
            );
            return;
        }

        if (!firstName.trim()) {
            Alert.alert(
                "Required",
                "First Name is required."
            );
            return;
        }

        if (!mobileNumber1.trim()) {
            Alert.alert(
                "Required",
                "Mobile Number 1 is required."
            );
            return;
        }

        if (!buildingNo.trim()) {
            Alert.alert(
                "Required",
                "Building / House No is required."
            );
            return;
        }

        if (!streetName.trim()) {
            Alert.alert(
                "Required",
                "Street Name is required."
            );
            return;
        }

        if (!city.trim()) {
            Alert.alert(
                "Required",
                "Your City is required."
            );
            return;
        }

        if (!addressParam.id) {
            Alert.alert(
                "Error",
                "Invalid address. Please try again."
            );
            return;
        }

        try {
            setUpdating(true);

            const payload: any = {
                buildingType,
                saveAs: saveAddressAs,
                title,
                fullName: firstName,
                phonecode1: phoneCode1,
                phone1: mobileNumber1,
                phonecode2: phoneCode2,
                phone2: mobileNumber2,
                buildingNo,
                houseNo: buildingNo,
                streetName,
                city,
                buildingName: buildingName || "",
                unitNo: unitNo || "",
                floorNo: floorNo || "",
                latitude: latitude || "",
                longitude: longitude || "",
            };

            const response = await customerService.updateAddress(
                addressParam.id,
                payload
            );

            if (response.data) {
                Alert.alert(
                    "Success",
                    "Address updated successfully.",
                    [
                        {
                            text: "OK",
                            onPress: () => navigation.goBack(),
                        },
                    ]
                );
            }
        } catch (error) {
            console.log("failed to update address: ", error);
            Alert.alert(
                "Error",
                "Failed to update address. Please try again."
            );
        } finally {
            setUpdating(false);
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

            <CustomHeader
                title="Edit Address"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 11,
                        paddingTop: 10,
                        paddingBottom: 100,
                    }}
                >
                    {/* SAVE ADDRESS AS */}

                    <DropdownField
                        icon="bookmark"
                        label="Save Address As"
                        value={saveAddressAs}
                        open={saveAddressOpen}
                        setOpen={setSaveAddressOpen}
                        options={saveAddressOptions}
                        onSelect={setSaveAddressAs}
                    />

                    {/* TITLE + FIRST NAME */}

                    <View
                        style={{
                            flexDirection: "row",
                            gap: 8,
                            zIndex: titleOpen ? 100 : 1,
                        }}
                    >
                        <View style={{ flex: 0.8 }}>
                            <DropdownField
                                icon="user"
                                label="Title"
                                value={title}
                                open={titleOpen}
                                setOpen={setTitleOpen}
                                options={titleOptions}
                                onSelect={setTitle}
                            />
                        </View>

                        <View style={{ flex: 1.2 }}>
                            <InputField
                                icon="user"
                                label="Billing Name"
                                placeholder="Type Here"
                                value={firstName!}
                                onChangeText={handleFirstNameChange}
                                isIconThemeDark={true}
                            />
                        </View>
                    </View>

                    {/* MOBILE 1 */}

                    <InputField
                        icon="phone"
                        label="Mobile Number – 1 *"
                        value={mobileNumber1}
                        onChangeText={handleMobileNumber1Change}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    {/* MOBILE 2 */}

                    <InputField
                        icon="phone"
                        label="Mobile Number – 2 (Optional)"
                        value={mobileNumber2}
                        onChangeText={handleMobileNumber2Change}
                        keyboardType="phone-pad"
                        placeholder="07XXXXXXXX"
                        maxLength={10}
                    />

                    {/* BUILDING TYPE */}

                    <DropdownField
                        icon="building"
                        label="Building Type"
                        value={buildingType}
                        open={buildingTypeOpen}
                        setOpen={setBuildingTypeOpen}
                        options={buildingTypes}
                        onSelect={setBuildingType}
                    />

                    {/* HOUSE NO */}

                    <InputField
                        icon="building"
                        label="Building / House No"
                        value={buildingNo}
                        onChangeText={setBuildingNo}
                    />

                    {/* STREET */}

                    <InputField
                        icon="road"
                        label="Street Name"
                        value={streetName}
                        onChangeText={setStreetName}
                    />

                    {/* CITY */}

                    <DropdownField
                        icon="mountain-city"
                        label="Your City"
                        value={city}
                        open={cityOpen}
                        setOpen={setCityOpen}
                        options={cityOptions}
                        onSelect={setCity}
                    />

                    {/* GEO LOCATION */}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            console.log("Edit geo location");
                        }}
                        style={{
                            height: 58,

                            backgroundColor: "#FFF5E9",

                            borderRadius: 30,

                            flexDirection: "row",
                            alignItems: "center",

                            paddingHorizontal: 11,

                            marginBottom: 10,
                        }}
                    >
                        {/* Location */}

                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,

                                backgroundColor: "#FF9518",

                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <FontAwesome6
                                name="location-dot"
                                size={18}
                                color="#FFFFFF"
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
                                    fontSize: 11,
                                    color: "#777",
                                    lineHeight: 14,
                                }}
                            >
                                Geo Location
                            </Text>

                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 2,
                                }}
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={12}
                                    color="#FF9518"
                                />

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "#FF9518",
                                        marginLeft: 4,
                                        fontWeight: "500",
                                    }}
                                >
                                    Attached
                                </Text>
                            </View>
                        </View>

                        <FontAwesome6
                            name="pen"
                            size={18}
                            color="#FF9518"
                        />
                    </TouchableOpacity>
                </ScrollView>

                {updating && (
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
                        <LoadingPage message="Updating Address..." fullScreen={false} />
                    </View>
                )}

                {/* BOTTOM BUTTON */}

                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,

                        paddingHorizontal: 11,
                        paddingTop: 8,
                        paddingBottom:
                            Platform.OS === "ios" ? 18 : 10,

                        backgroundColor: "#FFFFFF",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: -3,
                        },
                        shadowOpacity: 0.08,
                        shadowRadius: 5,

                        elevation: 8,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleUpdateAddress}
                        disabled={updating}
                        style={{
                            height: 50,

                            borderRadius: 26,

                            backgroundColor: "#000",

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

                            opacity: updating ? 0.6 : 1,
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "800",
                            }}
                        >
                            {updating ? "Updating..." : "Update Address"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default EditAddress;