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

import { RootStackParamList } from "../../types/types";
import { DropdownField, InputField } from "@/component/common/CustomField";
import CustomHeader from "@/component/common/CustomHeader";


type MyAccountNavigationProp = StackNavigationProp<
    RootStackParamList,
    "MyAccount"
>;

interface MyAccountProps {
    navigation: MyAccountNavigationProp;
}

const MyAccount: React.FC<MyAccountProps> = ({ navigation }) => {

    const [title, setTitle] = useState("Mr");
    const [firstName, setFirstName] = useState("Anjula");
    const [lastName, setLastName] = useState("Kariyawasam");
    const [code, setCode] = useState("+94");
    const [mobileNumber, setMobileNumber] = useState("781122800");
    const [email, setEmail] = useState("anjula@gmail.com");
    const [titleOpen, setTitleOpen] = useState(false);
    const [codeOpen, setCodeOpen] = useState(false);
    const [moreMenuVisible, setMoreMenuVisible] = useState(false);


    const titleOptions = [
        "Mr",
        "Mrs",
        "Ms",
    ];

    const codeOptions = [
        "+94",
        "+91",
        "+65",
    ];

    // UPDATE ACCOUNT
    const handleUpdate = () => {
        Alert.alert(
            "Success",
            "Your account information has been updated.",
        );
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingBottom: 120,
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
                                }}
                                icon="user"
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
                                onChangeText={setFirstName}
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
                            onChangeText={setLastName}
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
                                value={code}
                                open={codeOpen}
                                setOpen={setCodeOpen}
                                options={codeOptions}
                                onSelect={(value: string) => {
                                    setCode(value);
                                    setCodeOpen(false);
                                }}
                                icon="flag"
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
                                onChangeText={setMobileNumber}
                                keyboardType="phone-pad"
                                maxLength={9}
                            />
                        </View>
                    </View>

                    {/* EMAIL */}
                    <InputField
                        icon="house"
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />
                </View>
            </ScrollView>

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
                    style={{
                        width: "100%",
                        height: 52,

                        borderRadius: 27,

                        backgroundColor: "#8B9DA7",

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
                        Update Account Info
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default MyAccount;