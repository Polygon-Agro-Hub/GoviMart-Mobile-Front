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
import { InputField, DropdownField } from "@/component/common/CustomField";
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

    const [saveAddressAsError, setSaveAddressAsError] = useState("");
    const [titleError, setTitleError] = useState("");
    const [firstNameError, setFirstNameError] = useState("");
    const [mobileNumber1Error, setMobileNumber1Error] = useState("");
    const [mobileNumber2Error, setMobileNumber2Error] = useState("");
    const [buildingTypeError, setBuildingTypeError] = useState("");
    const [buildingNoError, setBuildingNoError] = useState("");
    const [streetNameError, setStreetNameError] = useState("");
    const [cityError, setCityError] = useState("");

    const handleSaveAddressAsChange = (value: string) => {
        setSaveAddressAs(value);
        if (saveAddressAsError) setSaveAddressAsError("");
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        if (titleError) setTitleError("");
    };

    const handleFirstNameChange = (text: string) => {
        // Alphabetic characters and spaces only
        const cleaned = text.replace(
            /[^A-Za-z ]/g,
            "",
        );
        setFirstName(cleaned);
        if (firstNameError) setFirstNameError("");
    };

    const handleMobileNumber1Change = (text: string) => {
        // Allow numbers only
        const cleanedText = text.replace(/[^0-9]/g, "");
        setMobileNumber1(cleanedText);
        if (mobileNumber1Error) setMobileNumber1Error("");
    };

    const handleMobileNumber2Change = (text: string) => {
        // Allow numbers only
        const cleanedText = text.replace(/[^0-9]/g, "");
        setMobileNumber2(cleanedText);
        if (mobileNumber2Error) setMobileNumber2Error("");
    };

    const handleBuildingTypeChange = (value: string) => {
        setBuildingType(value);
        if (buildingTypeError) setBuildingTypeError("");
        setBuildingNoError("");
    };

    const handleBuildingNoChange = (text: string) => {
        setBuildingNo(text);
        if (buildingNoError) setBuildingNoError("");
    };

    const handleStreetNameChange = (text: string) => {
        setStreetName(text);
        if (streetNameError) setStreetNameError("");
    };

    const handleCityChange = (value: string) => {
        setCity(value);
        if (cityError) setCityError("");
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
        setSaveAddressAsError("");
        setTitleError("");
        setFirstNameError("");
        setMobileNumber1Error("");
        setMobileNumber2Error("");
        setBuildingTypeError("");
        setBuildingNoError("");
        setStreetNameError("");
        setCityError("");

        let hasError = false;

        if (!saveAddressAs.trim()) {
            setSaveAddressAsError("Save Address As is required.");
            hasError = true;
        }

        if (!title.trim()) {
            setTitleError("Title is required.");
            hasError = true;
        }

        if (!firstName.trim()) {
            setFirstNameError("Billing Name is required.");
            hasError = true;
        }

        if (!mobileNumber1.trim()) {
            setMobileNumber1Error("Mobile Number 1 is required.");
            hasError = true;
        } else if (!/^\d{9}$/.test(mobileNumber1)) {
            setMobileNumber1Error("Invalid phone number. Must be 9 digits.");
            hasError = true;
        }

        if (mobileNumber2.trim() && !/^\d{9}$/.test(mobileNumber2)) {
            setMobileNumber2Error("Invalid phone number. Must be 9 digits.");
            hasError = true;
        }

        if (!buildingType.trim()) {
            setBuildingTypeError("Building Type is required.");
            hasError = true;
        }

        if (!buildingNo.trim()) {
            setBuildingNoError("Building / House No is required.");
            hasError = true;
        }

        if (!streetName.trim()) {
            setStreetNameError("Street Name is required.");
            hasError = true;
        }

        if (!city.trim()) {
            setCityError("Your City is required.");
            hasError = true;
        }

        if (!addressParam.id) {
            Alert.alert(
                "Error",
                "Invalid address. Please try again."
            );
            return;
        }

        if (hasError) {
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
                        onSelect={handleSaveAddressAsChange}
                        error={saveAddressAsError}
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
                                onSelect={handleTitleChange}
                                error={titleError}
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
                                error={firstNameError}
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
                        error={mobileNumber1Error}
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
                        error={mobileNumber2Error}
                    />

                    {/* BUILDING TYPE */}

                    <DropdownField
                        icon="building"
                        label="Building Type"
                        value={buildingType}
                        open={buildingTypeOpen}
                        setOpen={setBuildingTypeOpen}
                        options={buildingTypes}
                        onSelect={handleBuildingTypeChange}
                        error={buildingTypeError}
                    />

                    {/* BUILDING DETAILS */}

                    {buildingType === "Apartment" && (
                        <>
                            <InputField
                                icon="road"
                                label="Apartment / Building No"
                                value={buildingNo}
                                onChangeText={handleBuildingNoChange}
                                placeholder="Type Here"
                                error={buildingNoError}
                            />
                            <InputField
                                icon="road"
                                label="Apartment / Building Name"
                                value={buildingName}
                                onChangeText={setBuildingName}
                                placeholder="e.g 14/B"
                            />
                            <InputField
                                icon="road"
                                label="Flat / Unit Number"
                                value={unitNo}
                                onChangeText={setUnitNo}
                                placeholder="Type Here"
                            />
                            <InputField
                                icon="road"
                                label="Floor Number"
                                value={floorNo}
                                onChangeText={setFloorNo}
                                placeholder="e.g. 3rd Floor"
                            />
                        </>
                    )}

                    {buildingType === "House" && (
                        <InputField
                            icon="building"
                            label="Building / House No"
                            value={buildingNo}
                            onChangeText={handleBuildingNoChange}
                            error={buildingNoError}
                        />
                    )}

                    {/* STREET */}

                    <InputField
                        icon="road"
                        label="Street Name"
                        value={streetName}
                        onChangeText={handleStreetNameChange}
                        error={streetNameError}
                    />

                    {/* CITY */}

                    <DropdownField
                        icon="mountain-city"
                        label="Your City"
                        value={city}
                        open={cityOpen}
                        setOpen={setCityOpen}
                        options={cityOptions}
                        onSelect={handleCityChange}
                        error={cityError}
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