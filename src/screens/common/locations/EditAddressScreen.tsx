import React, { useCallback, useEffect, useState } from "react";
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
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import LoadingPage from "@/component/common/LoadingPage";
import customerService from "@/services/customer/customer.service";
import authService from "@/services/auth/auth.service";
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

interface CityResult {
    id: number;
    city: string;
    district: string;
    province: string;
    isAvailable: boolean;
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
    const [cityModalOpen, setCityModalOpen] = useState(false);
    const [allCities, setAllCities] = useState<CityResult[]>([]);
    const [saveAddressOpen, setSaveAddressOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadCities = async () => {
            try {
                const response = await authService.getCities();
                if (
                    response.data &&
                    response.data.status &&
                    Array.isArray(response.data.data)
                ) {
                    const mapped = response.data.data.map((item: any) => ({
                        id: item.id,
                        city: item.city,
                        district: item.district || "",
                        province: item.province || "",
                        isAvailable:
                            item.isAvailable === 1 || item.isAvailable === true,
                    }));
                    setAllCities(mapped);
                }
            } catch (err) {
                console.error("Error loading cities in EditAddress:", err);
            }
        };
        loadCities();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const getSelectedLocation = async () => {
                try {
                    const storedLatitude = await AsyncStorage.getItem(
                        "selectedLatitude"
                    );
                    const storedLongitude = await AsyncStorage.getItem(
                        "selectedLongitude"
                    );

                    if (storedLatitude && storedLongitude) {
                        setLatitude(Number(storedLatitude));
                        setLongitude(Number(storedLongitude));
                    }
                } catch (error) {
                    console.error("Error getting location in EditAddress:", error);
                }
            };

            getSelectedLocation();
        }, [])
    );

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

    const cityModalData = allCities.map((item) => ({
        label: item.city,
        value: item.city,
        district: item.district,
        province: item.province,
        isAvailable: item.isAvailable,
    }));

    const renderCityItem = (
        item: any,
        isSelected: boolean,
        index: number,
        isLast: boolean,
        onPress: (value: string) => void,
    ) => (
        <TouchableOpacity
            key={item.value}
            className={`px-5 py-3.5 flex-row items-center justify-between ${
                !isLast ? "border-b border-gray-100" : ""
            }`}
            onPress={() => {
                if (!item.isAvailable) {
                    Alert.alert(
                        "Coming Soon",
                        `Delivery is not available in ${item.label} yet, but we’re working on it and coming to your area soon!`,
                    );
                    return;
                }
                onPress(item.value);
            }}
            activeOpacity={0.7}
        >
            <View>
                <Text className="text-base font-semibold text-gray-800">
                    {item.label}
                </Text>
                {item.district ? (
                    <Text className="text-xs text-gray-400 mt-0.5">
                        {item.district}
                    </Text>
                ) : null}
            </View>
            <View className="flex-row items-center gap-x-2">
                <Text
                    className={`text-xs font-bold ${
                        item.isAvailable ? "text-[#2E7D32]" : "text-orange-400"
                    }`}
                >
                    {item.isAvailable ? "Available" : "Coming soon"}
                </Text>
                {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#21202B" />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderCityField = () => (
        <View style={{ marginBottom: cityError ? 4 : 12 }}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCityModalOpen(true)}
                style={{
                    height: 58,
                    borderWidth: 1,
                    borderColor: cityError ? "#FF3B30" : "#D9DEE4",
                    borderRadius: 29,
                    paddingHorizontal: 20,
                    justifyContent: "center",
                    backgroundColor: "#FFFFFF",
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FontAwesome6
                        name="mountain-city"
                        size={16}
                        color="#000000"
                        style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#888888",
                                marginBottom: 2,
                            }}
                        >
                            Your City
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: city ? "#000000" : "#A0A0A0",
                                fontWeight: "500",
                            }}
                        >
                            {city || "Select From Here"}
                        </Text>
                    </View>
                    <Ionicons
                        name="chevron-down"
                        size={18}
                        color="#000000"
                    />
                </View>
            </TouchableOpacity>
            {cityError ? (
                <Text
                    style={{
                        color: "#FF3B30",
                        fontSize: 12,
                        marginLeft: 20,
                        marginTop: 4,
                    }}
                >
                    {cityError}
                </Text>
            ) : null}
        </View>
    );

    const handleBuildingNoChange = (text: string) => {
        setBuildingNo(text);
        if (buildingNoError) setBuildingNoError("");
    };

    const handleStreetNameChange = (text: string) => {
        setStreetName(text);
        if (streetNameError) setStreetNameError("");
    };

    const titleOptions = ["Mr", "Mrs", "Ms", "Rev"];

    const buildingTypes = [
        "House",
        "Apartment",
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
                        placeholder="07XXXXXXXX"
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
                            <InputField
                                icon="road"
                                label="Street Name"
                                value={streetName}
                                onChangeText={handleStreetNameChange}
                                error={streetNameError}
                            />
                            {renderCityField()}
                        </>
                    )}

                    {buildingType === "House" && (
                        <>
                            <InputField
                                icon="building"
                                label="Building / House No"
                                value={buildingNo}
                                onChangeText={handleBuildingNoChange}
                                error={buildingNoError}
                            />
                            <InputField
                                icon="road"
                                label="Street Name"
                                value={streetName}
                                onChangeText={handleStreetNameChange}
                                error={streetNameError}
                            />
                            {renderCityField()}
                        </>
                    )}

                    {/* GEO LOCATION */}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            navigation.navigate("SetLocation");
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
                                    fontSize: 13,
                                    color: "#777",
                                    lineHeight: 16,
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
                                    size={13}
                                    color="#FF9518"
                                />

                                <Text
                                    style={{
                                        fontSize: 13,
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

            {/* CITY SEARCH MODAL */}
            <GlobalSearchModal
                visible={cityModalOpen}
                onClose={() => setCityModalOpen(false)}
                title="Select Your City"
                data={cityModalData}
                selectedItems={city ? [city] : []}
                onSelect={(items) => {
                    if (items && items[0]) {
                        setCity(items[0]);
                        if (cityError) setCityError("");
                    }
                }}
                searchPlaceholder="Search city..."
                noResultsText="No cities found"
                multiSelect={false}
                searchKeys={["label", "district", "province"]}
                renderItem={renderCityItem}
            />
        </View>
    );
};

export default EditAddress;