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
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";

type AddAddressNavigationProp = StackNavigationProp<
    RootStackParamList,
    "AddNewAddress"
>;

interface AddAddressProps {
    navigation: AddAddressNavigationProp;
}

// INPUT FIELD

const InputField = ({
    icon,
    label,
    value,
    onChangeText,
    keyboardType = "default",
    placeholder,
    maxLength,
}: {
    icon: keyof typeof Ionicons.glyphMap | any;
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: "default" | "phone-pad" | "email-address";
    placeholder?: string;
    maxLength?: number;
}) => {
    return (
        <View
            style={{
                height: 58,
                borderWidth: 1,
                borderColor: "#D9DEE5",
                borderRadius: 30,

                flexDirection: "row",
                alignItems: "center",

                paddingHorizontal: 11,

                marginBottom: 12,

                backgroundColor: "#FFFFFF",
            }}
        >
            {/* Icon */}

            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#F2F2F6",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <FontAwesome6
                    name={icon}
                    solid
                    size={17}
                    color="#0000"
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
                        color: "#555",
                        lineHeight: 14,
                        marginBottom: 4,
                    }}
                >
                    {label}
                </Text>

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    maxLength={maxLength}
                    style={{
                        height: 21,
                        paddingVertical: 0,
                        fontSize: 14,
                        color: "#111",
                        fontWeight: "500",
                    }}
                />
            </View>
        </View>
    );
};

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
    icon?: keyof typeof Ionicons.glyphMap | any;
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

                {icon && <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,

                        backgroundColor: "#F2F2F6",

                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <FontAwesome6
                        name={icon}
                        solid
                        size={17}
                        color="#0000"
                    />
                </View>}

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

const AddNewAddress: React.FC<AddAddressProps> = ({
    navigation,
}) => {
    const [saveAddressAs, setSaveAddressAs] =
        useState("");
    const [title, setTitle] = useState("");
    const [titleOpen, setTitleOpen] = useState(false);

    const [billingName, setBillingName] =
        useState("");

    const [mobileNumber1, setMobileNumber1] =
        useState("");

    const [mobileNumber2, setMobileNumber2] =
        useState("");

    const [buildingType, setBuildingType] =
        useState("");

    const [geoLocationAttached, setGeoLocationAttached] =
        useState(false);
    const [buildingTypeOpen, setBuildingTypeOpen] =
        useState(false);
    const titleOptions = ["Mr", "Mrs", "Ms", "Miss"];
    const buildingTypes = [
        "House",
        "Apartment",
    ];

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


    // SAVE BUTTON


    const handleSaveAddress = () => {
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

        if (!geoLocationAttached) {
            Alert.alert(
                "Required",
                "Please attach your Geo Location.",
            );
            return;
        }

        const address = {
            saveAddressAs,
            billingName,
            mobileNumber1,
            mobileNumber2,
            buildingType,
            geoLocationAttached,
        };

        console.log(
            "New Address:",
            address,
        );

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
    };


    // RENDER

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
                        paddingBottom: 100,
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
                            gap: 8,
                        }}
                    >
                        {/* TITLE */}

                        <DropdownField
                            icon="user"
                            label="Title"
                            value={title}
                            open={titleOpen}
                            setOpen={setTitleOpen}
                            options={titleOptions}
                            onSelect={setTitle}
                        />

                        {/* BILLING NAME */}

                        <View
                            style={{
                                flex: 1.2,
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
                        placeholder="07XXXXXXXX"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />


                    {/* MOBILE 2 */}

                    <InputField
                        icon="phone"
                        label="Mobile Number - 2 (Optional)"
                        value={mobileNumber2}
                        onChangeText={handleMobileNumber2}
                        placeholder="07XXXXXXXX"
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

                    {/* ================================================= */}
                    {/* GEO LOCATION */}
                    {/* ================================================= */}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            // Replace this with your map/location screen
                            setGeoLocationAttached(true);
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
                                {geoLocationAttached
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
                                saveAddressAs &&
                                    billingName &&
                                    mobileNumber1 &&
                                    buildingType &&
                                    geoLocationAttached
                                    ? "#000000"
                                    : "#8FA1AA",

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