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
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import customerService from "@/services/customer/customer.service";
import authService from "@/services/auth/auth.service";

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

const AddNewAddress: React.FC<AddAddressProps> = ({ navigation, route }) => {
  const fromCheckout = route.params?.fromCheckout;

  const [saveAddressAs, setSaveAddressAs] = useState("");
  const [title, setTitle] = useState("Mr");
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

  const titleOptions = ["Mr", "Mrs", "Ms", "Rev"];
  const buildingTypes = ["House", "Apartment"];

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

  const [saveAddressAsError, setSaveAddressAsError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [billingNameError, setBillingNameError] = useState("");
  const [mobileNumber1Error, setMobileNumber1Error] = useState("");
  const [mobileNumber2Error, setMobileNumber2Error] = useState("");
  const [buildingTypeError, setBuildingTypeError] = useState("");
  const [buildingNoError, setBuildingNoError] = useState("");
  const [streetNameError, setStreetNameError] = useState("");
  const [cityError, setCityError] = useState("");

  useFocusEffect(
    useCallback(() => {
      const getSelectedLocation = async () => {
        try {
          const storedLatitude = await AsyncStorage.getItem("selectedLatitude");
          const storedLongitude =
            await AsyncStorage.getItem("selectedLongitude");

          if (storedLatitude && storedLongitude) {
            setLatitude(Number(storedLatitude));
            setLongitude(Number(storedLongitude));
          }
        } catch (error) {
          console.error("Error getting location:", error);
        }
      };

      getSelectedLocation();
    }, []),
  );

  // HANDLERS

  const handleSaveAddressAs = (text: string) => {
    setSaveAddressAs(text);
    if (saveAddressAsError) setSaveAddressAsError("");
  };

  const handleBillingName = (text: string) => {
    // Alphabetic characters and spaces only
    const cleaned = text.replace(/[^A-Za-z ]/g, "");
    setBillingName(cleaned);
    if (billingNameError) setBillingNameError("");
  };

  const handleMobileNumber1 = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMobileNumber1(cleaned);
    if (mobileNumber1Error) setMobileNumber1Error("");
  };

  const handleMobileNumber2 = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMobileNumber2(cleaned);
    if (mobileNumber2Error) setMobileNumber2Error("");
  };

  const handleStreetName = (text: string) => {
    setStreetName(text);
    if (streetNameError) setStreetNameError("");
  };

  const handleBuildingNo = (text: string) => {
    setBuildingNo(text);
    if (buildingNoError) setBuildingNoError("");
  };

  const handleSelectTitle = (value: string) => {
    setTitle(value);
    if (titleError) setTitleError("");
  };

  const handleSelectBuildingType = (value: string) => {
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
        onPress={() => setCityModalOpen(true)}
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
    </View>
  );

  // SAVE BUTTON

  const handleSaveAddress = async () => {
    setSaveAddressAsError("");
    setTitleError("");
    setBillingNameError("");
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

    if (!billingName.trim()) {
      setBillingNameError("Billing Name is required.");
      hasError = true;
    }

    const p1 = mobileNumber1.trim();
    if (!p1) {
      setMobileNumber1Error("Mobile Number 1 is required.");
      hasError = true;
    } else if (!/^(0\d{9}|\d{9})$/.test(p1)) {
      setMobileNumber1Error("Invalid phone number. e.g. 07XXXXXXXX");
      hasError = true;
    }

    const p2 = mobileNumber2.trim();
    if (p2 && !/^(0\d{9}|\d{9})$/.test(p2)) {
      setMobileNumber2Error("Invalid phone number. e.g. 07XXXXXXXX");
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

    if (hasError) {
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert("Required", "Please attach your Geo Location.");
      return;
    }

    try {
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
        longitude,
        latitude,
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
        console.log("Address added successfully:", req.data.insertId);
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
    }
  };

  const setBackgroundColor = () => {
    if (
      saveAddressAs.trim() &&
      title.trim() &&
      billingName.trim() &&
      mobileNumber1.trim() &&
      buildingType.trim() &&
      buildingNo.trim() &&
      streetName.trim() &&
      city.trim()
    ) {
      return "black";
    }
    return "#8FA1AA";
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            error={saveAddressAsError}
          />

          {/* TITLE + BILLING NAME */}

          <View style={{ flexDirection: "row", gap: 5 }}>
            {/* TITLE */}
            <View style={{ flex: 0.7 }}>
              <View style={{ marginBottom: titleError ? 4 : 12 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTitleModalOpen(true)}
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
                        fontWeight: "500",
                      }}
                    >
                      {title || "Select"}
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
                label="Billing Name"
                value={billingName}
                onChangeText={handleBillingName}
                placeholder="Type Here"
                error={billingNameError}
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
            error={mobileNumber1Error}
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
            error={mobileNumber2Error}
          />

          {/* BUILDING TYPE */}

          <View style={{ marginBottom: buildingTypeError ? 4 : 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setBuildingTypeModalOpen(true)}
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
                  name="building"
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

          {/* type == apartment => specific fields (only rendered AFTER a building type is picked) */}

          {buildingType === "Apartment" && (
            <>
              <InputField
                icon="road"
                label="Apartment / Building No"
                value={buildingNo}
                onChangeText={handleBuildingNo}
                placeholder="Type Here"
                error={buildingNoError}
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
              />
              <InputField
                icon="road"
                label="Street Name"
                value={streetName}
                onChangeText={handleStreetName}
                placeholder="Type Here"
                error={streetNameError}
              />
              {renderCityField()}
            </>
          )}

          {buildingType === "House" && (
            <>
              <InputField
                icon="house"
                label="Building / House No"
                value={buildingNo}
                onChangeText={handleBuildingNo}
                placeholder="e.g 14/B"
                error={buildingNoError}
              />
              <InputField
                icon="road"
                label="Street Name"
                value={streetName}
                onChangeText={handleStreetName}
                placeholder="Type Here"
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
              height: 67,
              borderRadius: 40,
              backgroundColor: "#FFF5E9",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 11,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#FFE0B2",
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
                Geo Location
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {latitude !== null && longitude !== null && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#FF9518",
                      marginRight: 6,
                    }}
                  />
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
                  borderWidth: 1,
                  borderColor: "#FF9518",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 6,
                }}
              >
                <Ionicons name="pencil" size={15} color="#FF9518" />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#FF9518" style={{ marginRight: 6 }} />
            )}
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
            paddingBottom: Platform.OS === "ios" ? 18 : 10,
            backgroundColor: "#FFFFFF",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSaveAddress}
            style={{
              height: 50,
              borderRadius: 26,
              backgroundColor: setBackgroundColor(),
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
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {fromCheckout ? "Save & Continue" : "Save Address"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* TITLE SEARCH MODAL */}
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
        searchPlaceholder="Search title..."
        noResultsText="No titles found"
        multiSelect={false}
        searchKeys={["label"]}
      />

      {/* BUILDING TYPE SEARCH MODAL */}
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
        searchPlaceholder="Search building type..."
        noResultsText="No building types found"
        multiSelect={false}
        searchKeys={["label"]}
      />

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

export default AddNewAddress;
