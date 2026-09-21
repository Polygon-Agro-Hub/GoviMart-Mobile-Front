import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { InputField } from "@/component/common/CustomField";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import customerService from "@/services/customer/customer.service";
import authService from "@/services/auth/auth.service";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import axios from "axios";

type AddAddressNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddNewAddress"
>;

type AddAddressRouteProp = RouteProp<
  RootStackParamList,
  "AddNewAddress"
>;

interface AddAddressProps {
  navigation: AddAddressNavigationProp;
  route: AddAddressRouteProp;
}

interface CityResult {
  id: number;
  city: string;
  district: string;
  province: string;
  isAvailable: boolean;
}

const SAVE_ADDRESS_AS_MAX_LENGTH = 20;

const FIELD_LABELS = {
  saveAddressAs: "Save Address As",
  title: "Title",
  billingName: "Billing Name",
  mobileNumber1: "Mobile Number 1",
  mobileNumber2: "Mobile Number 2",
  buildingType: "Building Type",
  houseNo: "Building / House No",
  streetName: "Street Name",
  city: "Your City",
  buildingNo: "Apartment / Building No",
  buildingName: "Apartment / Building Name",
  unitNo: "Flat / Unit Number",
  floorNo: "Floor Number",
} as const;

const requiredMessage = (label: string) => `${label} is required`;

const AddNewAddress: React.FC<AddAddressProps> = ({ navigation, route }) => {
  const fromCheckout = route.params?.fromCheckout;

  const [saveAddressAs, setSaveAddressAs] = useState("");
  const [title, setTitle] = useState("");
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [billingName, setBillingName] = useState("");
  const [mobileNumber1, setMobileNumber1] = useState("");
  const [mobileNumber2, setMobileNumber2] = useState("");
  const [phoneCode1, setPhoneCode1] = useState("+94");
  const [phoneCode2, setPhoneCode2] = useState("+94");
  const [buildingType, setBuildingType] = useState("");
  const [buildingNo, setBuildingNo] = useState("");
  const [streetName, setStreetName] = useState("");
  const [city, setCity] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [floorNo, setFloorNo] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [buildingTypeModalOpen, setBuildingTypeModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [allCities, setAllCities] = useState<CityResult[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);

  const titleOptions = ["Mr", "Mrs", "Ms", "Rev"];
  const buildingTypes = ["House", "Apartment"];

  // Error States
  const [saveAddressAsError, setSaveAddressAsError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [billingNameError, setBillingNameError] = useState("");
  const [mobileNumber1Error, setMobileNumber1Error] = useState("");
  const [mobileNumber2Error, setMobileNumber2Error] = useState("");
  const [buildingTypeError, setBuildingTypeError] = useState("");
  const [buildingNoError, setBuildingNoError] = useState("");
  const [buildingNameError, setBuildingNameError] = useState("");
  const [unitNoError, setUnitNoError] = useState("");
  const [floorNoError, setFloorNoError] = useState("");
  const [streetNameError, setStreetNameError] = useState("");
  const [cityError, setCityError] = useState("");
  const [geoLocationError, setGeoLocationError] = useState("");

  const isLocationRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    const loadCities = async () => {
      setLoadingCities(true);
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
            isAvailable: item.isAvailable === 1 || item.isAvailable === true,
          }));
          setAllCities(mapped);
        }
      } catch (err) {
        console.error("Error loading cities:", err);
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, []);

  // Clear any leftover selected coordinates on initial mount and unmount
  useEffect(() => {
    AsyncStorage.multiRemove(["selectedLatitude", "selectedLongitude"]).catch(
      (err) => console.error("Error clearing stale location on mount:", err)
    );
    return () => {
      AsyncStorage.multiRemove(["selectedLatitude", "selectedLongitude"]).catch(
        (err) => console.error("Error clearing stale location on unmount:", err)
      );
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLocationRequestedRef.current) {
        return;
      }

      const getSelectedLocation = async () => {
        try {
          const storedLatitude = await AsyncStorage.getItem("selectedLatitude");
          const storedLongitude =
            await AsyncStorage.getItem("selectedLongitude");

          if (storedLatitude && storedLongitude) {
            setLatitude(Number(storedLatitude));
            setLongitude(Number(storedLongitude));
            setGeoLocationError("");
            await AsyncStorage.multiRemove([
              "selectedLatitude",
              "selectedLongitude",
            ]);
          }
        } catch (error) {
          console.error("Error getting location:", error);
        } finally {
          isLocationRequestedRef.current = false;
        }
      };

      getSelectedLocation();
    }, []),
  );

  // String Helpers
  const stripLeadingSpace = (text: string) => text.replace(/^\s+/, "");

  const capitalizeWords = (text: string) =>
    stripLeadingSpace(text).replace(/\b\w/g, (char) => char.toUpperCase());

  const validatePhone = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, "");
    return /^0\d{9}$/.test(clean);
  };

  // Field Level Blur & Change Handlers
  const handleRequiredFieldBlur = (
    value: string,
    setError: (msg: string) => void,
    fieldLabel: string
  ) => {
    if (!value.trim()) {
      setError(requiredMessage(fieldLabel));
    }
  };

  const handleSaveAddressAsChange = (text: string) => {
    const stripped = stripLeadingSpace(text).slice(0, SAVE_ADDRESS_AS_MAX_LENGTH);
    const capitalized = capitalizeWords(stripped);
    setSaveAddressAs(capitalized);
    if (capitalized.trim()) {
      setSaveAddressAsError("");
    }
  };

  const handleBillingNameChange = (text: string) => {
    const stripped = stripLeadingSpace(text);
    const cleaned = stripped.replace(/[^A-Za-z\s]/g, "");
    const capitalized = capitalizeWords(cleaned);
    setBillingName(capitalized);
    if (capitalized.trim()) {
      setBillingNameError("");
    }
  };

  const handleMobile1Change = (text: string) => {
    const stripped = stripLeadingSpace(text);
    const cleaned = stripped.replace(/[^0-9]/g, "").slice(0, 10);
    setMobileNumber1(cleaned);

    if (!cleaned.trim()) {
      setMobileNumber1Error("");
    } else if (!validatePhone(cleaned)) {
      setMobileNumber1Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
    } else {
      setMobileNumber1Error("");
    }

    if (mobileNumber2.trim()) {
      if (cleaned.trim() && cleaned.trim() === mobileNumber2.trim()) {
        setMobileNumber2Error("Mobile Number 2 cannot be the same as Mobile Number 1");
      } else if (validatePhone(mobileNumber2.trim())) {
        setMobileNumber2Error("");
      }
    }
  };

  const handleMobile1Blur = () => {
    if (!mobileNumber1.trim()) {
      setMobileNumber1Error(requiredMessage(FIELD_LABELS.mobileNumber1));
    } else if (!validatePhone(mobileNumber1)) {
      setMobileNumber1Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
    } else {
      setMobileNumber1Error("");
    }

    if (mobileNumber2.trim() && mobileNumber1.trim() === mobileNumber2.trim()) {
      setMobileNumber2Error("Mobile Number 2 cannot be the same as Mobile Number 1");
    }
  };

  const handleMobile2Change = (text: string) => {
    const stripped = stripLeadingSpace(text);
    const cleaned = stripped.replace(/[^0-9]/g, "").slice(0, 10);
    setMobileNumber2(cleaned);

    if (!cleaned.trim()) {
      setMobileNumber2Error("");
    } else if (mobileNumber1.trim() && cleaned.trim() === mobileNumber1.trim()) {
      setMobileNumber2Error("Mobile Number 2 cannot be the same as Mobile Number 1");
    } else if (!validatePhone(cleaned)) {
      setMobileNumber2Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
    } else {
      setMobileNumber2Error("");
    }
  };

  const handleMobile2Blur = () => {
    if (mobileNumber2.trim()) {
      if (mobileNumber1.trim() && mobileNumber2.trim() === mobileNumber1.trim()) {
        setMobileNumber2Error("Mobile Number 2 cannot be the same as Mobile Number 1");
      } else if (!validatePhone(mobileNumber2)) {
        setMobileNumber2Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
      } else {
        setMobileNumber2Error("");
      }
    } else {
      setMobileNumber2Error("");
    }
  };

  const handleStreetNameChange = (text: string) => {
    const nextVal = capitalizeWords(stripLeadingSpace(text));
    setStreetName(nextVal);
    if (nextVal.trim()) {
      setStreetNameError("");
    }
  };

  const handleBuildingNoChange = (text: string) => {
    const nextVal = capitalizeWords(stripLeadingSpace(text));
    setBuildingNo(nextVal);
    if (nextVal.trim()) {
      setBuildingNoError("");
    }
  };

  const handleApartmentNameChange = (text: string) => {
    const nextVal = capitalizeWords(stripLeadingSpace(text));
    setApartmentName(nextVal);
    if (nextVal.trim()) {
      setBuildingNameError("");
    }
  };

  const handleUnitNoChange = (text: string) => {
    const nextVal = capitalizeWords(stripLeadingSpace(text));
    setUnitNo(nextVal);
    if (nextVal.trim()) {
      setUnitNoError("");
    }
  };

  const handleFloorNoChange = (text: string) => {
    const nextVal = capitalizeWords(stripLeadingSpace(text));
    setFloorNo(nextVal);
    if (nextVal.trim()) {
      setFloorNoError("");
    }
  };

  const handleSelectTitle = (value: string) => {
    setTitle(value);
    setTitleError("");
  };

  const handleSelectBuildingType = (value: string) => {
    setBuildingType(value);
    setBuildingTypeError("");
    setBuildingNoError("");
    setBuildingNameError("");
    setUnitNoError("");
    setFloorNoError("");
    setStreetNameError("");
  };

  const matchedCity = allCities.find(
    (item) => item.city.trim().toLowerCase() === city.trim().toLowerCase()
  );
  const isCityKnown = city.trim().length > 0 && !!matchedCity;
  const isCityDeliverable = isCityKnown && !!matchedCity?.isAvailable;

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
        onPress(item.value);
      }}
      activeOpacity={0.7}
    >
      <View>
        <Text className="text-base font-semibold text-gray-800">
          {item.label}
        </Text>
        {item.district ? (
          <Text className="text-xs text-gray-400 mt-0.5">{item.district}</Text>
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
        {isSelected && <Ionicons name="checkmark" size={20} color="#21202B" />}
      </View>
    </TouchableOpacity>
  );

  const renderCityField = () => (
    <View style={{ marginBottom: cityError ? 4 : 12 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          Keyboard.dismiss();
          if (!city.trim()) {
            setCityError(requiredMessage(FIELD_LABELS.city));
          }
          setCityModalOpen(true);
        }}
        style={{
          height: 67,
          borderWidth: cityError ? 1.5 : 1,
          borderColor: cityError ? "#FF3B30" : "#D9DEE5",
          borderRadius: 40,
          paddingHorizontal: 11,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
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
            name="mountain-city"
            solid
            size={17}
            color="#000000"
          />
        </View>

        <View style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}>
          <Text
            style={{
              fontSize: 14,
              color: "#555555",
              lineHeight: 19,
              marginBottom: 4,
            }}
          >
            Your City *
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 18,
              color: city ? "#111111" : "#9CA3AF",
              fontWeight: city ? "500" : "400",
            }}
          >
            {city || "Select From Here"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={19} color="#111111" style={{ marginRight: 6 }} />
      </TouchableOpacity>
      {cityError ? (
        <Text
          style={{
            color: "#FF3B30",
            fontSize: 12,
            marginLeft: 16,
            marginTop: 4,
          }}
        >
          {cityError}
        </Text>
      ) : null}

      {city.trim().length > 0 && isCityKnown && (
        isCityDeliverable ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#EEFAF3",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginTop: 8,
              borderWidth: 1,
              borderColor: "#D2ECE1",
            }}
          >
            <FontAwesome6
              name="circle-info"
              size={16}
              color="#059669"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#065F46",
                fontSize: 13,
                fontWeight: "600",
                flexShrink: 1,
              }}
            >
              Great news! We deliver to {city}!
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEF6ED",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginTop: 8,
              borderWidth: 1,
              borderColor: "#FFDCB5",
            }}
          >
            <FontAwesome6
              name="circle-info"
              size={16}
              color="#EC6821"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#EC6821",
                fontSize: 13,
                fontWeight: "600",
                flexShrink: 1,
              }}
            >
              Delivery not available in {city} yet, but we're working on it and coming to your area soon!
            </Text>
          </View>
        )
      )}
    </View>
  );

  // SAVE BUTTON HANDLER
  const handleSaveAddress = async () => {
    let hasError = false;
    let alertTitle = "Required";
    let alertMessage = "Please fill in all required fields.";

    setSaveAddressAsError("");
    setTitleError("");
    setBillingNameError("");
    setMobileNumber1Error("");
    setMobileNumber2Error("");
    setBuildingTypeError("");
    setBuildingNoError("");
    setBuildingNameError("");
    setUnitNoError("");
    setFloorNoError("");
    setStreetNameError("");
    setCityError("");
    setGeoLocationError("");

    if (!saveAddressAs.trim()) {
      setSaveAddressAsError(requiredMessage(FIELD_LABELS.saveAddressAs));
      hasError = true;
      alertTitle = "Required";
      alertMessage = "Please enter a save address name.";
    }

    if (!title.trim()) {
      setTitleError(requiredMessage(FIELD_LABELS.title));
      hasError = true;
      alertTitle = "Required";
      alertMessage = "Please select a title.";
    }

    if (!billingName.trim()) {
      setBillingNameError(requiredMessage(FIELD_LABELS.billingName));
      hasError = true;
      alertTitle = "Required";
      alertMessage = "Please enter the billing name.";
    }

    const p1 = mobileNumber1.trim();
    if (!p1) {
      setMobileNumber1Error(requiredMessage(FIELD_LABELS.mobileNumber1));
      hasError = true;
      alertTitle = "Required";
      alertMessage = "Mobile Number 1 is required.";
    } else if (!validatePhone(p1)) {
      setMobileNumber1Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
      hasError = true;
      alertTitle = "Invalid Phone Number";
      alertMessage = "Please enter a valid mobile number (format: 07XXXXXXXX).";
    }

    const p2 = mobileNumber2.trim();
    if (p2) {
      if (p1 && p1 === p2) {
        setMobileNumber2Error("Mobile Number 2 cannot be the same as Mobile Number 1");
        hasError = true;
        alertTitle = "Duplicate Phone Number";
        alertMessage = "Mobile Number 2 cannot be the same as Mobile Number 1.";
      } else if (!validatePhone(p2)) {
        setMobileNumber2Error("Please enter a valid mobile number (format: 07XXXXXXXX)");
        hasError = true;
        alertTitle = "Invalid Phone Number";
        alertMessage = "Please enter a valid second mobile number (format: 07XXXXXXXX).";
      }
    }

    if (!buildingType.trim()) {
      setBuildingTypeError(requiredMessage(FIELD_LABELS.buildingType));
      hasError = true;
      alertTitle = "Required";
      alertMessage = "Please select a building type.";
    }

    if (buildingType === "House") {
      if (!buildingNo.trim()) {
        setBuildingNoError(requiredMessage(FIELD_LABELS.houseNo));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the house or building number.";
      }
      if (!streetName.trim()) {
        setStreetNameError(requiredMessage(FIELD_LABELS.streetName));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the street name.";
      }
      if (!city.trim()) {
        setCityError(requiredMessage(FIELD_LABELS.city));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please select your city.";
      } else if (!isCityDeliverable) {
        setCityError("Delivery is not available in " + city + " yet.");
        hasError = true;
        alertTitle = "Not Deliverable";
        alertMessage =
          "Delivery not available in " +
          city +
          " yet, but we're working on it and coming to your area soon!";
      }
    } else if (buildingType === "Apartment") {
      if (!buildingNo.trim()) {
        setBuildingNoError(requiredMessage(FIELD_LABELS.buildingNo));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the apartment or building number.";
      }
      if (!apartmentName.trim()) {
        setBuildingNameError(requiredMessage(FIELD_LABELS.buildingName));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the apartment or building name.";
      }
      if (!unitNo.trim()) {
        setUnitNoError(requiredMessage(FIELD_LABELS.unitNo));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the flat or unit number.";
      }
      if (!floorNo.trim()) {
        setFloorNoError(requiredMessage(FIELD_LABELS.floorNo));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the floor number.";
      }
      if (!streetName.trim()) {
        setStreetNameError(requiredMessage(FIELD_LABELS.streetName));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please enter the street name.";
      }
      if (!city.trim()) {
        setCityError(requiredMessage(FIELD_LABELS.city));
        hasError = true;
        alertTitle = "Required";
        alertMessage = "Please select your city.";
      } else if (!isCityDeliverable) {
        setCityError("Delivery is not available in " + city + " yet.");
        hasError = true;
        alertTitle = "Not Deliverable";
        alertMessage =
          "Delivery not available in " +
          city +
          " yet, but we're working on it and coming to your area soon!";
      }
    }

    if (latitude === null || longitude === null) {
      setGeoLocationError("Geo location is required. Please pin your location before submitting.");
      hasError = true;
      if (!alertTitle || alertTitle === "Required") {
        alertTitle = "Geo Location Required";
        alertMessage = "Please add a geo location before submitting.";
      }
    }

    if (hasError) {
      const hasSpecificRequiredFieldError =
        !saveAddressAs.trim() ||
        !title.trim() ||
        !billingName.trim() ||
        !p1 ||
        !buildingType.trim() ||
        !buildingNo.trim() ||
        !streetName.trim() ||
        !city.trim() ||
        (buildingType === "Apartment" &&
          (!apartmentName.trim() || !unitNo.trim() || !floorNo.trim()));

      Alert.alert(
        hasSpecificRequiredFieldError ? "Required" : alertTitle,
        hasSpecificRequiredFieldError
          ? "Please fill in all required fields."
          : alertMessage
      );
      return;
    }

    try {
      setSaving(true);
      const cleanPhone1 = p1.startsWith("0") ? p1.slice(1) : p1;
      const cleanPhone2 = p2 ? (p2.startsWith("0") ? p2.slice(1) : p2) : "";

      const basePayload = {
        buildingType,
        saveAs: saveAddressAs,
        title,
        fullName: billingName,
        phonecode1: phoneCode1,
        phone1: cleanPhone1,
        phonecode2: phoneCode2,
        phone2: cleanPhone2,
        longitude: longitude!,
        latitude: latitude!,
        buildingNo,
        houseNo: buildingNo,
        streetName,
        city,
      };

      const payload =
        buildingType === "House"
          ? basePayload
          : {
              ...basePayload,
              buildingName: apartmentName,
              unitNo,
              floorNo,
            };

      const req = await customerService.addNewAddress(payload);

      if (req.data) {
        await AsyncStorage.multiRemove([
          "selectedLatitude",
          "selectedLongitude",
        ]);
        Alert.alert("Success", "Address saved successfully.", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.log("error from add new address: ", error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 409) {
          setSaveAddressAsError(
            "This name is already used. Please choose a different name."
          );
          Alert.alert(
            "Duplicate Name",
            "An address with this name already exists. Please use a different name."
          );
          return;
        }
      }
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* HEADER */}
      <CustomHeader
        title="Add New Address"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 11,
          paddingTop: 10,
          paddingBottom: 85,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.select({ ios: 20, android: 40 })}
        extraHeight={Platform.select({ ios: 20, android: 40 })}
      >
        {/* SAVE ADDRESS AS */}
        <InputField
          icon="bookmark"
          label="Save Address As *"
          value={saveAddressAs}
          onChangeText={handleSaveAddressAsChange}
          onBlur={() =>
            handleRequiredFieldBlur(
              saveAddressAs,
              setSaveAddressAsError,
              FIELD_LABELS.saveAddressAs
            )
          }
          placeholder="(e.g.: Home , Work..)"
          maxLength={SAVE_ADDRESS_AS_MAX_LENGTH}
          error={saveAddressAsError}
        />

        {/* TITLE + BILLING NAME */}
        <View style={{ flexDirection: "row", gap: 5 }}>
          {/* TITLE */}
          <View style={{ flex: 0.7 }}>
            <View style={{ marginBottom: titleError ? 4 : 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Keyboard.dismiss();
                  if (!title.trim()) {
                    setTitleError(requiredMessage(FIELD_LABELS.title));
                  }
                  setTitleModalOpen(true);
                }}
                style={{
                  height: 67,
                  borderWidth: titleError ? 1.5 : 1,
                  borderColor: titleError ? "#FF3B30" : "#D9DEE5",
                  borderRadius: 40,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 11,
                  backgroundColor: "#FFFFFF",
                }}
              >
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
                    name="user"
                    solid
                    size={17}
                    color="#000000"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#555555",
                      lineHeight: 19,
                      marginBottom: 4,
                    }}
                  >
                    Title *
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 18,
                      color: title ? "#111111" : "#9CA3AF",
                      fontWeight: title ? "500" : "400",
                    }}
                  >
                    {title || "Title"}
                  </Text>
                </View>

                <Ionicons name="chevron-down" size={19} color="#111111" style={{ marginRight: 6 }} />
              </TouchableOpacity>
              {titleError ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: "#FF3B30",
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {titleError}
                </Text>
              ) : null}
            </View>
          </View>

          {/* BILLING NAME */}
          <View style={{ flex: 1 }}>
            <InputField
              icon="user"
              label="Billing Name *"
              value={billingName}
              onChangeText={handleBillingNameChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  billingName,
                  setBillingNameError,
                  FIELD_LABELS.billingName
                )
              }
              placeholder="Type Here"
              autoCapitalize="words"
              error={billingNameError}
            />
          </View>
        </View>

        {/* MOBILE 1 */}
        <InputField
          icon="phone"
          label="Mobile Number - 1 *"
          value={mobileNumber1}
          onChangeText={handleMobile1Change}
          onBlur={handleMobile1Blur}
          placeholder="07XXXXXXXX"
          keyboardType="phone-pad"
          maxLength={10}
          error={mobileNumber1Error}
        />

        {/* MOBILE 2 */}
        <InputField
          icon="phone"
          label="Mobile Number - 2 (Optional)"
          value={mobileNumber2}
          onChangeText={handleMobile2Change}
          onBlur={handleMobile2Blur}
          placeholder="07XXXXXXXX"
          keyboardType="phone-pad"
          maxLength={10}
          error={mobileNumber2Error}
        />

        {/* BUILDING TYPE */}
        <View style={{ marginBottom: buildingTypeError ? 4 : 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Keyboard.dismiss();
              if (!buildingType.trim()) {
                setBuildingTypeError(requiredMessage(FIELD_LABELS.buildingType));
              }
              setBuildingTypeModalOpen(true);
            }}
            style={{
              height: 67,
              borderWidth: buildingTypeError ? 1.5 : 1,
              borderColor: buildingTypeError ? "#FF3B30" : "#D9DEE5",
              borderRadius: 40,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 11,
              backgroundColor: "#FFFFFF",
            }}
          >
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
                name="house"
                solid
                size={17}
                color="#000000"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#555555",
                  lineHeight: 19,
                  marginBottom: 4,
                }}
              >
                Building Type *
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  color: buildingType ? "#111111" : "#9CA3AF",
                  fontWeight: buildingType ? "500" : "400",
                }}
              >
                {buildingType || "Select From Here"}
              </Text>
            </View>

            <Ionicons name="chevron-down" size={19} color="#111111" style={{ marginRight: 6 }} />
          </TouchableOpacity>
          {buildingTypeError ? (
            <Text
              style={{
                fontSize: 12,
                color: "#FF3B30",
                marginTop: 4,
                marginLeft: 16,
              }}
            >
              {buildingTypeError}
            </Text>
          ) : null}
        </View>

        {/* ================= APARTMENT SPECIFIC FIELDS ================= */}
        {buildingType === "Apartment" && (
          <>
            <InputField
              icon="building"
              label="Apartment / Building No *"
              value={buildingNo}
              onChangeText={handleBuildingNoChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  buildingNo,
                  setBuildingNoError,
                  FIELD_LABELS.buildingNo
                )
              }
              placeholder="Type Here"
              error={buildingNoError}
            />
            <InputField
              icon="tag"
              label="Apartment / Building Name *"
              value={apartmentName}
              onChangeText={handleApartmentNameChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  apartmentName,
                  setBuildingNameError,
                  FIELD_LABELS.buildingName
                )
              }
              placeholder="e.g. Lotus Residencies"
              error={buildingNameError}
            />
            <InputField
              icon="hotel"
              label="Flat / Unit Number *"
              value={unitNo}
              onChangeText={handleUnitNoChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  unitNo,
                  setUnitNoError,
                  FIELD_LABELS.unitNo
                )
              }
              placeholder="Type Here"
              error={unitNoError}
            />
            <InputField
              icon="stairs"
              label="Floor Number *"
              value={floorNo}
              onChangeText={handleFloorNoChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  floorNo,
                  setFloorNoError,
                  FIELD_LABELS.floorNo
                )
              }
              placeholder="e.g. 3rd Floor"
              error={floorNoError}
            />
            <InputField
              icon="house"
              label="Street Name *"
              value={streetName}
              onChangeText={handleStreetNameChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  streetName,
                  setStreetNameError,
                  FIELD_LABELS.streetName
                )
              }
              placeholder="Type Here"
              error={streetNameError}
            />
            {renderCityField()}
          </>
        )}

        {/* ================= HOUSE SPECIFIC FIELDS ================= */}
        {buildingType === "House" && (
          <>
            <InputField
              icon="house"
              label="Building / House No *"
              value={buildingNo}
              onChangeText={handleBuildingNoChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  buildingNo,
                  setBuildingNoError,
                  FIELD_LABELS.houseNo
                )
              }
              placeholder="e.g 14/B"
              error={buildingNoError}
            />
            <InputField
              icon="road"
              label="Street Name *"
              value={streetName}
              onChangeText={handleStreetNameChange}
              onBlur={() =>
                handleRequiredFieldBlur(
                  streetName,
                  setStreetNameError,
                  FIELD_LABELS.streetName
                )
              }
              placeholder="Type Here"
              error={streetNameError}
            />
            {renderCityField()}
          </>
        )}

        {/* GEO LOCATION */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            try {
              await AsyncStorage.multiRemove([
                "selectedLatitude",
                "selectedLongitude",
              ]);
            } catch (e) {
              console.error("Error clearing coords before navigating:", e);
            }
            isLocationRequestedRef.current = true;
            navigation.navigate("SetLocation");
          }}
          style={{
            height: 67,
            borderRadius: 40,
            backgroundColor: "#FFF5E9",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 11,
            marginBottom: geoLocationError ? 4 : 12,
            borderWidth: 1,
            borderColor: geoLocationError ? "#FF3B30" : "#FFE0B2",
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
            <Ionicons name="location" size={19} color="#FFFFFF" />
          </View>

          {/* Text */}
          <View style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}>
            <Text
              style={{
                fontSize: 14,
                color: "#555555",
                lineHeight: 19,
                marginBottom: 4,
              }}
            >
              Geo Location *
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {latitude !== null && longitude !== null && (
                <View
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 100,
                    backgroundColor: "#FF9518",
                    marginRight: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome6 solid name="check" size={9} color="#FFFFFF" />
                </View>
              )}
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  color: "#FF9518",
                  fontWeight: "600",
                }}
              >
                {latitude !== null && longitude !== null
                  ? "Attached"
                  : "Click Here"}
              </Text>
            </View>
          </View>

          {/* Trailing icon: pencil when attached, chevron otherwise */}
          {latitude !== null && longitude !== null ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderColor: "#FF9518",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 6,
              }}
            >
              <FontAwesome6 solid name="pen" size={17} color="#FF9518" />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#FF9518" style={{ marginRight: 6 }} />
          )}
        </TouchableOpacity>
        {geoLocationError ? (
          <Text
            style={{
              color: "#FF3B30",
              fontSize: 12,
              marginLeft: 16,
              marginBottom: 12,
            }}
          >
            {geoLocationError}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      {/* SAVE BUTTON (ALWAYS ENABLED & CLEARLY VISIBLE) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 11,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 22 : 12,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSaveAddress}
          disabled={saving}
          style={{
            height: 50,
            borderRadius: 26,
            backgroundColor: "#000000",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 5,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            {saving
              ? "Saving..."
              : fromCheckout
              ? "Save & Continue"
              : "Save Address"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TITLE SEARCH MODAL (SEARCH HIDDEN) */}
      <GlobalSearchModal
        visible={titleModalOpen}
        onClose={() => setTitleModalOpen(false)}
        title="Select Title"
        data={titleOptions.map((t) => ({ label: t, value: t }))}
        selectedItems={title ? [title] : []}
        onSelect={(items) => {
          if (items && items[0]) {
            handleSelectTitle(items[0]);
          }
        }}
        showSearch={false}
        noResultsText="No titles found"
        multiSelect={false}
      />

      {/* BUILDING TYPE SEARCH MODAL (SEARCH HIDDEN) */}
      <GlobalSearchModal
        visible={buildingTypeModalOpen}
        onClose={() => setBuildingTypeModalOpen(false)}
        title="Select Building Type"
        data={buildingTypes.map((type) => ({ label: type, value: type }))}
        selectedItems={buildingType ? [buildingType] : []}
        onSelect={(items) => {
          if (items && items[0]) {
            handleSelectBuildingType(items[0]);
          }
        }}
        showSearch={false}
        noResultsText="No building types found"
        multiSelect={false}
      />

      {/* CITY SEARCH MODAL (SEARCH ACTIVE) */}
      <GlobalSearchModal
        visible={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title="Select Your City"
        data={cityModalData}
        selectedItems={city ? [city] : []}
        onSelect={(items) => {
          if (items && items[0]) {
            setCity(items[0]);
            setCityError("");
          }
        }}
        searchPlaceholder="Search city..."
        noResultsText="No cities found"
        multiSelect={false}
        searchKeys={["label"]}
        renderItem={renderCityItem}
        showSearch={true}
      />
    </View>
  );
};

export default AddNewAddress;
