import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { DropdownField, InputField } from "@/component/common/CustomField";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import customerService from "@/services/customer/customer.service";

type AddAddressNavigationProp = StackNavigationProp<
    RootStackParamList,
    "AddNewAddress"
>;

interface AddAddressProps {
    navigation: AddAddressNavigationProp;
}

const AddNewAddress: React.FC<AddAddressProps> = ({
    navigation,
}) => {
    const [saveAddressAs, setSaveAddressAs] = useState("");
    const [title, setTitle] = useState("");
    const [titleOpen, setTitleOpen] = useState(false);
    const [billingName, setBillingName] = useState("");
    const [mobileNumber1, setMobileNumber1] = useState("");
    const [mobileNumber2, setMobileNumber2] = useState("");
    const [phoneCode1, setPhoneCode1] = useState("+94")
    const [phoneCode2, setPhoneCode2] = useState("+94")
    const [buildingType, setBuildingType] = useState("");
    const [buildingNo, setBuildingNo] = useState("")
    const [streetName, setStreetName] = useState("")
    const [city, setCity] = useState("")
    const [apartmentName, setApartmentName] = useState("")
    const [unitNo, setUnitNo] = useState("")
    const [floorNo, setFloorNo] = useState("")
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [geoLocationAttached, setGeoLocationAttached] = useState(false);
    const [buildingTypeOpen, setBuildingTypeOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false)
    const titleOptions = ["Mr", "Mrs", "Ms", "Miss"];
    const buildingTypes = [
        "House",
        "Apartment",
    ];
    const cityOptions = ["Colombo", "Ampara", "Walpola", "Matale", "Badulla"]

    useFocusEffect(
        useCallback(() => {
            const getSelectedLocation = async () => {
                try {
                    const latitude = await AsyncStorage.getItem(
                        "selectedLatitude"
                    );

                    const longitude = await AsyncStorage.getItem(
                        "selectedLongitude"
                    );

                    if (latitude && longitude) {
                        console.log("Latitude:", latitude);
                        console.log("Longitude:", longitude);

                        setLatitude(Number(latitude));
                        setLongitude(Number(longitude));
                    }
                } catch (error) {
                    console.error(
                        "Error getting location:",
                        error
                    );
                }
            };

            getSelectedLocation();
        }, [])
    );

    // HANDLERS

    const handleSaveAddressAs = (text: string) => {
        setSaveAddressAs(text);
    };

    const handleBillingName = (text: string) => {
        // Alphabetic characters and spaces only
        const cleaned = text.replace(
            /[^A-Za-z ]/g,
            "",
        );

        setBillingName(cleaned);
    };

    const handleMobileNumber1 = (text: string) => {
        const cleaned = text.replace(
            /[^0-9]/g,
            "",
        );

        setMobileNumber1(cleaned);
    };

    const handleMobileNumber2 = (text: string) => {
        const cleaned = text.replace(
            /[^0-9]/g,
            "",
        );

        setMobileNumber2(cleaned);
    };
    const handleStreetName = (text: string) => {
        setStreetName(text)
    }
    const handleBuildingNo = (text: string) => {
        setBuildingNo(text)
    }

    const handleCity = (text: string) => {
        setCity(text)
    }


    // SAVE BUTTON


    const handleSaveAddress = async () => {

        if (!saveAddressAs.trim()) {
            Alert.alert(
                "Required",
                "Save Address As is required.",
            );
            return;
        }

        if (!billingName.trim()) {
            Alert.alert(
                "Required",
                "Billing Name is required.",
            );
            return;
        }

        if (!mobileNumber1.trim()) {
            Alert.alert(
                "Required",
                "Mobile Number 1 is required.",
            );
            return;
        }

        if (!buildingType.trim()) {
            Alert.alert(
                "Required",
                "Building Type is required.",
            );
            return;
        }

        if (!(latitude && longitude)) {
            Alert.alert(
                "Required",
                "Please attach your Geo Location.",
            );
            return;
        }
        try {
            if (buildingType === "House") {
                const payload = {
                    buildingType: buildingType,
                    saveAs: saveAddressAs,
                    title: title,
                    fullName: billingName,
                    phonecode1: phoneCode1,
                    phone1: mobileNumber1,
                    phonecode2: phoneCode2,
                    phone2: mobileNumber2,
                    longitude,
                    latitude,
                    buildingNo,
                    houseNo: buildingNo,
                    streetName,
                    city,
                }
                const req = await customerService.addNewAddress(payload)

                if (req.data) {
                    console.log("address added sucessfully.", req.data.insertId)
                    await AsyncStorage.multiRemove([
                        "selectedLatitude",
                        "selectedLongitude",
                    ]);
                    Alert.alert(
                        "Success",
                        "Address saved successfully.",
                        [
                            {
                                text: "OK",
                                onPress: () => navigation.goBack(),
                            },
                        ],
                    );
                }
            }
            else {
                const payload = {
                    buildingType: buildingType,
                    saveAs: saveAddressAs,
                    title: title,
                    fullName: billingName,
                    phonecode1: phoneCode1,
                    phone1: mobileNumber1,
                    phonecode2: phoneCode2,
                    phone2: mobileNumber2,
                    longitude,
                    latitude,
                    buildingNo,
                    buildingName: apartmentName,
                    unitNo,
                    floorNo,
                    houseNo: buildingNo,
                    streetName,
                    city,
                }
                const req = await customerService.addNewAddress(payload)
                if (req.data) {
                    await AsyncStorage.multiRemove([
                        "selectedLatitude",
                        "selectedLongitude",
                    ]);
                    Alert.alert(
                        "Success",
                        "Address saved successfully.",
                        [
                            {
                                text: "OK",
                                onPress: () => navigation.goBack(),
                            },
                        ],
                    );
                }


            }
        }
        catch (error) {
            console.log("error from add new address: ", error)
        }

    };

    const setBackgroundColor = () => {
        if (saveAddressAs &&
            billingName &&
            mobileNumber1 &&
            buildingType ) {
            return "black"
        }
        else { return "#8FA1AA" }
    }


    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* HEADER */}

            <CustomHeader
                title="Add New Address"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            <KeyboardAvoidingView
                style={{
                    flex: 1,
                }}
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
                        paddingBottom: 220,
                    }}
                >

                    {/* SAVE ADDRESS AS */}


                    <InputField
                        icon="bookmark"
                        label="Save Address As"
                        value={saveAddressAs}
                        onChangeText={handleSaveAddressAs}
                        placeholder="(e.g.: Home , Work..)"
                    />

                    {/* TITLE + BILLING NAME */}

                    <View
                        style={{
                            flexDirection: "row",
                            gap: 5
                        }}
                    >
                        {/* TITLE */}
                        <View
                            style={{
                                flex: 0.7,
                            }}
                        >
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

                        {/* BILLING NAME */}

                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <InputField
                                icon="user"
                                label="Billing Name"
                                value={billingName}
                                onChangeText={handleBillingName}
                                placeholder="Type Here"
                            />
                        </View>
                    </View>

                    {/* MOBILE 1 */}

                    <InputField
                        icon="phone"
                        label="Mobile Number - 1 *"
                        value={mobileNumber1}
                        onChangeText={handleMobileNumber1}
                        prefix={phoneCode1}
                        placeholder="7XXXXXXXX"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />


                    {/* MOBILE 2 */}

                    <InputField
                        icon="phone"
                        label="Mobile Number - 2 (Optional)"
                        value={mobileNumber2}
                        prefix={phoneCode2}
                        onChangeText={handleMobileNumber2}
                        placeholder="7XXXXXXXX"
                        keyboardType="phone-pad"
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
                    {/*type == apartment => specific fileds*/}

                    {buildingType == "Apartment" && <>
                        <InputField
                            icon="road"
                            label="Apartment / Building No"
                            value={buildingNo}
                            onChangeText={setBuildingNo}
                            placeholder="Type Here"
                        />
                        <InputField
                            icon="road"
                            label="Apartment / Building Name"
                            value={apartmentName}
                            onChangeText={setApartmentName}
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
                        /></>}

                    {buildingType === "House" &&
                        <InputField
                            icon="house"
                            label="Building / House No"
                            value={buildingNo}
                            onChangeText={handleBuildingNo}
                            placeholder="e.g 14/B"
                        />}
                    <InputField
                        icon="road"
                        label="Street Name"
                        value={streetName}
                        onChangeText={handleStreetName}
                        placeholder="Type Here"
                    />
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
                            navigation.navigate("SetLocation")
                        }}
                        style={{
                            height: 58,

                            borderRadius: 30,

                            backgroundColor: "#FFF5E9",

                            flexDirection: "row",
                            alignItems: "center",

                            paddingHorizontal: 10,

                            marginBottom: 12,
                        }}
                    >
                        {/* Location Icon */}

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
                            <Ionicons
                                name="location"
                                size={19}
                                color="#FFFFFF"
                            />
                        </View>

                        {/* Text */}

                        <View
                            style={{
                                flex: 1,
                                marginLeft: 8,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: "#555",
                                    marginBottom: 3,
                                }}
                            >
                                Geo Location
                            </Text>

                            <Text
                                style={{
                                    fontSize: 11,
                                    color: "#FF9518",
                                    fontWeight: "500",
                                }}
                            >
                                {(latitude && longitude) != null
                                    ? "Attached"
                                    : "Click Here"}
                            </Text>
                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#FF9518"
                        />
                    </TouchableOpacity>
                </ScrollView>

                {/* SAVE BUTTON */}

                <View
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,

                        paddingHorizontal: 11,
                        paddingTop: 8,
                        paddingBottom:
                            Platform.OS === "ios"
                                ? 18
                                : 10,

                        backgroundColor: "#FFFFFF",
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleSaveAddress}
                        style={{
                            height: 50,

                            borderRadius: 26,

                            backgroundColor:
                               setBackgroundColor(),

                            justifyContent: "center",
                            alignItems: "center",

                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 3,
                            },
                            shadowOpacity: 0.15,
                            shadowRadius: 5,

                            elevation: 4,
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "700",
                            }}
                        >
                            Save Address
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default AddNewAddress;