import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";

import { RootStackParamList } from "../../types/types";
import { DropdownField, InputField } from "@/component/common/CustomField";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import customerService from "@/services/customer/customer.service";


type MyAccountNavigationProp = StackNavigationProp<
    RootStackParamList,
    "MyAccount"
>;

interface MyAccountProps {
    navigation: MyAccountNavigationProp;
}

const MyAccount: React.FC<MyAccountProps> = ({ navigation }) => {

    const [title, setTitle] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [mobileCode, setMobileCode] = useState("+94");
    const [mobileNumber, setMobileNumber] = useState("");
    const [email, setEmail] = useState("");
    const [companyName, setCompanyName] = useState("")
    const [compnayMobile, setCompanyMobile] = useState("")
    const [companyMobileCode, setCompanyMobileCode] = useState("")
    const [titleOpen, setTitleOpen] = useState(false);
    const [mobileCodeOpen, setMobileCodeOpen] = useState(false);
    const [comCodeOpen, setComCodeOpen] = useState(false);
    const [moreMenuVisible, setMoreMenuVisible] = useState(false);
    const [firstNameError, setFirstNameError] = useState("");
    const [lastNameError, setLastNameError] = useState("");
    const [codeError, setCodeError] = useState("");
    const [titleError, setTitleError] = useState("");
    const [mobileNumberError, setMobileNumberError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [companyMobileError, setCompanyMobileError] = useState("");
    const [updating, setUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalMobileCode, setOriginalMobileCode] = useState("");
    const [originalMobileNumber, setOriginalMobileNumber] = useState("");

    useFocusEffect(
        React.useCallback(() => {
            const fetchAcccountDetails = async () => {
                try {
                    setIsLoading(true)
                    const response = await customerService.getAccountDetails()
                    if (response.data && response.data.data) {
                        const data = response.data.data
                        if (data.title) setTitle(data.title)
                        if (data.firstName) setFirstName(data.firstName)
                        if (data.lastName) setLastName(data.lastName)
                        if (data.phoneCode) setMobileCode(data.phoneCode)
                        if (data.phoneNumber) setMobileNumber(data.phoneNumber)
                        if (data.email) setEmail(data.email)
                        if (data.companyName) setCompanyName(data.companyName)
                        if (data.companyPhoneCode) setCompanyMobileCode(data.companyPhoneCode)
                        if (data.companyPhone) setCompanyMobile(data.companyPhone)

                        setOriginalMobileCode(data.phoneCode || "")
                        setOriginalMobileNumber(data.phoneNumber || "")
                    }
                    console.log("acc details fetchihng success: ", response.data.data)
                }

                catch (error) {
                    console.log("error fetching acc details: ", error)
                }
                finally {
                    setIsLoading(false)
                }
            }
            fetchAcccountDetails()
        }, [])
    )

    const titleOptions = [
        "Mr",
        "Mrs",
        "Ms",
    ];

    const mobilecodeOptions = [
        "+94",
        "+91",
        "+65",
    ];
    const companycodeOptions = [
        "+94",
        "+91",
        "+65",
    ];

    // UPDATE ACCOUNT
    const handleUpdate = async () => {
        if (updating) return;

        setFirstNameError("");
        setLastNameError("");
        setMobileNumberError("");
        setEmailError("");
        setTitleError("");
        setCodeError("");
        setCompanyMobileError("");

        let hasError = false;

        if (!title.trim()) {
            setTitleError("Title is required");
            hasError = true;
        }

        if (!firstName.trim()) {
            setFirstNameError("First name is required");
            hasError = true;
        } else if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
            setFirstNameError("First name must contain only letters");
            hasError = true;
        }

        if (!lastName.trim()) {
            setLastNameError("Last name is required");
            hasError = true;
        } else if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
            setLastNameError("Last name must contain only letters");
            hasError = true;
        }

        if (!mobileCode.trim()) {
            setCodeError("Code is required");
            hasError = true;
        }

        if (!mobileNumber.trim()) {
            setMobileNumberError("Mobile number is required");
            hasError = true;
        } else if (!/^\d{9}$/.test(mobileNumber)) {
            setMobileNumberError("Invalid phone number");
            hasError = true;
        }

        if (!email.trim()) {
            setEmailError("Email is required");
            hasError = true;
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            setEmailError("Invalid email address");
            hasError = true;
        }

        if (compnayMobile.trim() && !/^\d{9}$/.test(compnayMobile)) {
            setCompanyMobileError("Invalid phone number");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            setUpdating(true);

            const payload = {
                title,
                firstName,
                lastName,
                phoneCode: mobileCode,
                phoneNumber: mobileNumber,
                email,
                companyName,
                companyPhoneCode: companyMobileCode || mobileCode,
                companyPhone: compnayMobile,
            };

            const phoneChanged =
                mobileNumber.trim() !== originalMobileNumber.trim() ||
                mobileCode !== originalMobileCode;

            if (phoneChanged) {
                const otpResponse = await customerService.sendPhoneChangeOtp({
                    phoneCode: mobileCode,
                    phoneNumber: mobileNumber,
                });

                const otpData = otpResponse.data;

                if (otpData && otpData.status) {
                    navigation.navigate("SignUpOTP", {
                        phoneCode: mobileCode,
                        phoneNumber: mobileNumber,
                        method: otpData.method || "sms",
                        referenceId: otpData.referenceId,
                        signupToken: otpData.signupToken,
                        flow: "changePhone",
                        accountDetails: payload,
                    });
                } else {
                    Alert.alert(
                        "Error",
                        otpData?.message || "Failed to send verification code."
                    );
                }
            } else {
                const response = await customerService.updateUserDetails(payload);

                if (response.data) {
                    Alert.alert(
                        "Success",
                        "Your account information has been updated.",
                        [
                            {
                                text: "OK",
                                onPress: () => navigation.goBack(),
                            },
                        ]
                    );
                }
            }
        } catch (error) {
            console.log("failed to update account: ", error);
            Alert.alert(
                "Error",
                "Failed to update account. Please try again."
            );
        } finally {
            setUpdating(false);
        }
    };

    // CHANGE PROFILE IMAGE
    const handleChangeProfileImage = () => {
        console.log("Change profile image");
    };


    // DELELE OPTION
    const handleMore = () => {
        console.log("More options");
        setMoreMenuVisible(!moreMenuVisible)
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            {/* HEADER */}
            <View
                style={{
                    height: 60,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                <CustomHeader navigation={navigation} title="My Account" showBackButton={true} />

                {/* Delete ellipsis */}


                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleMore}
                    style={{
                        position: "absolute",
                        right: 10,
                        top: 9,

                        width: 36,
                        height: 36,

                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Ionicons
                        name="ellipsis-vertical"
                        size={22}
                        color="#000"
                    />
                </TouchableOpacity>

                {/* Dropdown */}

                {moreMenuVisible && (
                    <View
                        style={{
                            position: "absolute",
                            top: 38,
                            right: 5,

                            width: 150,

                            backgroundColor: "#FFFFFF",
                            borderRadius: 12,

                            paddingVertical: 5,

                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 3,
                            },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,

                            elevation: 8,

                            borderWidth: 1,
                            borderColor: "#EEEEEE",
                        }}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {

                                navigation.navigate("DeleteAccount");
                                setMoreMenuVisible(false)
                            }}
                            style={{
                                height: 32,
                                paddingHorizontal: 14,
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >

                            <Text
                                style={{
                                    marginLeft: 10,
                                    fontSize: 13,
                                    fontWeight: "500",
                                    color: "#FF3B42",
                                }}
                            >
                                Delete Account
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

            </View>


            {isLoading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <LoadingPage message="Loading Account..." fullScreen={false} />
                </View>
            ) : (<ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingBottom: 200,
                }}
            >

                {/* PROFILE IMAGE */}
                <View
                    style={{
                        alignItems: "center",
                        marginTop: 2,
                        marginBottom: 40,
                    }}
                >
                    <View
                        style={{
                            width: 78,
                            height: 78,
                            position: "relative",
                        }}
                    >
                        <Image
                            source={{
                                uri:
                                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
                            }}
                            style={{
                                width: 93,
                                height: 93,
                                borderRadius: 999,
                                backgroundColor: "#D9D9D9",
                            }}
                        />

                        {/* Edit Image */}

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleChangeProfileImage}
                            style={{
                                position: "absolute",
                                right: -10,
                                bottom: -13,

                                width: 28,
                                height: 28,

                                borderRadius: 13,

                                backgroundColor: "#000000",

                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <FontAwesome6
                                name="pen"
                                size={14}
                                color="#FFFFFF"
                                solid
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FORM */}
                <View
                    style={{
                        width: "100%",
                    }}
                >
                    {/* TITLE + FIRST NAME */}
                    <View
                        style={{
                            flexDirection: "row",
                            width: "100%",
                            marginBottom: 14,
                        }}
                    >
                        {/* Title */}

                        <View
                            style={{
                                width: "39%",
                                marginRight: 8,
                            }}
                        >
                            <DropdownField
                                label="Title"
                                value={title}
                                open={titleOpen}
                                setOpen={setTitleOpen}
                                options={titleOptions}
                                onSelect={(value: string) => {
                                    setTitle(value);
                                    setTitleOpen(false);
                                    if (titleError) { setTitleError("") }
                                }}
                                icon="user"
                                error={titleError}
                            />
                        </View>

                        {/* First Name */}

                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <InputField
                                icon="user"
                                label="First Name"
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text.replace(/[^a-zA-Z\s]/g, ""));

                                    // Optional: remove error while typing
                                    if (firstNameError) {
                                        setFirstNameError("");
                                    }
                                }}
                                error={firstNameError}
                            />
                        </View>
                    </View>

                    {/* LAST NAME */}

                    <View
                        style={{
                            marginBottom: 14,
                        }}
                    >
                        <InputField
                            icon="user"
                            label="Last Name"
                            value={lastName}
                            onChangeText={(text) => {
                                setLastName(text.replace(/[^a-zA-Z\s]/g, ""))
                                if (lastNameError) {
                                    setLastNameError("")
                                }
                            }}
                            error={lastNameError}
                        />
                    </View>

                    {/* CODE + MOBILE */}
                    <View
                        style={{
                            flexDirection: "row",
                            width: "100%",
                            marginBottom: 14,
                        }}
                    >
                        {/* Code */}

                        <View
                            style={{
                                width: "39%",
                                marginRight: 8,
                            }}
                        >
                            <DropdownField
                                label="Code"
                                value={mobileCode}
                                open={mobileCodeOpen}
                                setOpen={setMobileCodeOpen}
                                options={mobilecodeOptions}
                                onSelect={(value: string) => {
                                    setMobileCode(value);
                                    setMobileCodeOpen(false);
                                    if (codeError) { setCodeError("") }
                                }}
                                icon="flag"
                                error={codeError}
                            />
                        </View>

                        {/* Mobile Number */}

                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <InputField
                                icon="phone"
                                label="Mobile Number"
                                value={mobileNumber}
                                onChangeText={(text) => {
                                    setMobileNumber(text)
                                    if (mobileNumberError) {
                                        setMobileNumberError("")
                                    }
                                }}
                                keyboardType="phone-pad"
                                maxLength={9}
                                error={mobileNumberError}
                            />
                        </View>
                    </View>

                    {/* EMAIL */}
                    <InputField
                        icon="house"
                        label="Email"
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            if (emailError) {
                                setEmailError("")
                            }
                        }}
                        keyboardType="email-address"
                        error={emailError}
                    />
                    {/* Company name */}
                    <InputField
                        icon="building"
                        label="Company"
                        value={companyName}
                        onChangeText={(text) => {
                            setCompanyName(text);
                        }}
                    />

                    {/* COM CODE + Companay MOBILE */}
                    <View
                        style={{
                            flexDirection: "row",
                            width: "100%",
                            marginBottom: 14,
                        }}
                    >
                        {/* com Code */}

                        <View
                            style={{
                                width: "39%",
                                marginRight: 8,
                            }}
                        >
                            <DropdownField
                                label="Code"
                                value={companyMobileCode}
                                open={comCodeOpen}
                                setOpen={setComCodeOpen}
                                options={companycodeOptions}
                                onSelect={(value: string) => {
                                    setCompanyMobileCode(value);
                                    setComCodeOpen(false);
                                    // if (codeError) { setCodeError("") }
                                }}
                                icon="flag"
                            // error={codeError}
                            />
                        </View>

                        {/*  com Mobile Number */}

                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <InputField
                                icon="phone"
                                label="Company  "
                                value={compnayMobile}
                                onChangeText={(text) => {
                                    setCompanyMobile(text)
                                    if (companyMobileError) {
                                        setCompanyMobileError("")
                                    }
                                }}
                                keyboardType="phone-pad"
                                maxLength={9}
                                error={companyMobileError}
                            />
                        </View>
                    </View>

                </View>
            </ScrollView>)}

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
                    <LoadingPage message="Updating Account..." fullScreen={false} />
                </View>
            )}

            {/* BOTTOM UPDATE BUTTON */}
            <View
                style={{
                    position: "absolute",

                    left: 0,
                    right: 0,
                    bottom: 0,

                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 12,

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
                    onPress={handleUpdate}
                    disabled={updating}
                    style={{
                        width: "100%",
                        height: 52,

                        borderRadius: 27,

                        backgroundColor: updating ? "#8B9DA7" : "#000",

                        justifyContent: "center",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 2,
                        },
                        shadowOpacity: 0.12,
                        shadowRadius: 4,

                        elevation: 3,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 14,
                            fontWeight: "700",
                            letterSpacing: 0.2,
                        }}
                    >
                        {updating ? "Updating..." : "Update Account Info"}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default MyAccount;