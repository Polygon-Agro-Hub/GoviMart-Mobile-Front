import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/common/CustomHeader";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";
import axios from "axios";
import { environment } from "@/environment/environment";

type DeliveryLocationNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DeliveryLocation"
>;

interface DeliveryLocationProps {
  navigation: DeliveryLocationNavigationProp;
}

interface CityResult {
  id: number;
  city: string;
  district: string;
  province: string;
  isAvailable: boolean;
}

type CityStatus = "idle" | "available" | "unavailable";

const DeliveryLocation: React.FC<DeliveryLocationProps> = ({ navigation }) => {
  const [allCities, setAllCities] = useState<CityResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [status, setStatus] = useState<CityStatus>("idle");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isButtonDisabled = status === "unavailable";

  // Fetch all cities on mount
  useEffect(() => {
    const loadCities = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${environment.API_BASE_URL}api/auth/cities`);
        if (response.data && response.data.status && Array.isArray(response.data.data)) {
          const mapped = response.data.data.map((city: any) => ({
            id: city.id,
            city: city.city,
            district: city.district || "",
            province: city.province || "",
            isAvailable: city.isAvailable === 1 || city.isAvailable === true,
          }));
          setAllCities(mapped);
        }
      } catch (err) {
        console.error("Error loading cities on mount:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCities();
  }, []);

  const handleConfirm = () => {
    if (!selectedCity) {
      setValidationError("Please select your city first.");
      return;
    }
    if (!selectedCity.isAvailable) {
      setValidationError(`Delivery not available in ${selectedCity.city} yet, but we’re working on it and coming to your area soon!`);
      return;
    }
    navigation.navigate("SignUp", { nearestCity: selectedCity.city, cityId: selectedCity.id });
  };

  const renderCityItem = (
    item: any,
    isSelected: boolean,
    index: number,
    isLast: boolean,
    onPress: (value: string) => void
  ) => (
    <TouchableOpacity
      className={`px-5 py-3.5 flex-row items-center justify-between ${!isLast ? "border-b border-gray-100" : ""
        }`}
      onPress={() => onPress(item.value)}
      activeOpacity={0.7}
    >
      <View>
        <Text className="text-base font-semibold text-gray-800">{item.label}</Text>
        {item.district ? (
          <Text className="text-xs text-gray-400 mt-0.5">{item.district}</Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-x-2">
        <Text
          className={`text-xs font-bold ${item.isAvailable ? "text-[#2E7D32]" : "text-orange-400"
            }`}
        >
          {item.isAvailable ? "Available" : "Coming soon"}
        </Text>
        {isSelected && (
          <MaterialIcons name="check" size={20} color="#21202B" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Header Bar */}
      <CustomHeader title="Delivery Location" showBackButton={false} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top small location icon (always visible) */}
        <View className="items-center mt-6">
          <LottieView
            source={require("@/assets/json/auth/location-icon.json")}
            autoPlay
            loop
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
        </View>

        {/* Info Box */}
        <View className="mx-6 px-4 py-5 rounded-2xl bg-[#F3F3F3] mt-4">
          <View className="flex-row items-center">
            <View className="mr-2">
              <FontAwesome6 name="circle-info" size={14} color="black" />
            </View>
            <Text className="font-bold text-black text-sm">
              Why we need your actual city?
            </Text>
          </View>
          <Text className="text-xs text-[#5A5859] mt-3 leading-relaxed">
            We're expanding islandwide! Please select your current city
            carefully. You won't be able to change it until after your first
            successful delivery. If your city isn't available yet, stay tuned,
            we'll be there soon!
          </Text>
        </View>

        {/* Selection Prompt */}
        <Text className="text-center text-base font-bold text-black mt-8">
          Please select your location
        </Text>

        {/* Select City Input Field */}
        <TouchableOpacity
          className="mx-6 mt-4 border border-[#E4EBF2] bg-white px-5 rounded-full flex-row items-center justify-between h-[50px]"
          activeOpacity={isLoading ? 1 : 0.8}
          onPress={() => setIsModalOpen(true)}
          disabled={isLoading}
        >
          <View className="flex-row items-center">
            <View className="mr-3">
              {isLoading ? (
                <ActivityIndicator size="small" color="black" />
              ) : (
                <FontAwesome6 name="location-dot" size={18} color="black" />
              )}
            </View>
            <Text className={`text-sm  ${selectedCity ? "text-black" : "text-black"}`}>
              {isLoading ? "Loading cities..." : (selectedCity ? selectedCity.city : "Select Your City")}
            </Text>
          </View>
          {!isLoading && <FontAwesome6 name="chevron-down" size={16} color="black" />}
        </TouchableOpacity>

        {/* Status banners & validation errors */}
        <View className="mx-6">
          {status === "unavailable" && selectedCity && (
            <View
              className="mt-3 flex-row items-center gap-x-2 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "#FFF5E9" }}
            >
              <FontAwesome6 name="circle-exclamation" size={16} color="#FF9114" />
              <Text className="text-sm font-semibold flex-1" style={{ color: "#FF9114" }}>
                Delivery not available in {selectedCity.city} yet, but we’re working on it and coming to your area soon!
              </Text>
            </View>
          )}

          {validationError && (
            <View className="mt-3 flex-row items-center gap-x-2 px-1">
              <FontAwesome6 name="circle-exclamation" size={14} color="#E02424" />
              <Text className="text-sm text-[#E02424] flex-1">
                {validationError}
              </Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 5,

            elevation: 6,
            backgroundColor: isButtonDisabled ? "#7F919C" : "#000000"
          }}
          className="mx-6 mt-6 rounded-full items-center justify-center h-[50px]"
          activeOpacity={isButtonDisabled ? 1 : 0.8}
          onPress={handleConfirm}
          disabled={isButtonDisabled}
        >
          <Text className="text-white text-base font-bold">Continue</Text>
        </TouchableOpacity>

        {/* Need Help link */}
        <TouchableOpacity
          className="mt-6 self-center"
          activeOpacity={0.7}
          onPress={() => setIsHelpModalOpen(true)}
        >
          <Text className="text-sm font-semibold text-[#0085FF] underline">
            Need Help?
          </Text>
        </TouchableOpacity>

        {/* Already have an account link */}
        <View className="flex-row items-center justify-center mt-6 mb-8">
          <Text className="text-xs text-[#3F3F3F]">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Login")}
          >
            <Text className="text-xs font-bold text-[#0085FF] underline">
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
   

      {/* Fixed Bottom Lottie (city.json) */}
      <View className="w-full h-[180px]">
        <LottieView
          source={require("@/assets/json/auth/city.json")}
          autoPlay
          loop
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
         </ScrollView>

      {/* Cities GlobalSearchModal */}
      <GlobalSearchModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Your City"
        searchPlaceholder="Search your city..."
        noResultsText="City not found."
        data={allCities.map(c => ({ label: c.city, value: String(c.id), ...c }))}
        selectedItems={selectedCity ? [String(selectedCity.id)] : []}
        onSelect={(items) => {
          if (items.length > 0) {
            const found = allCities.find(c => String(c.id) === items[0]);
            if (found) {
              setSelectedCity(found);
              setStatus(found.isAvailable ? "available" : "unavailable");
              setValidationError(null);
            }
          }
        }}
        searchKeys={["label"]}
        renderItem={renderCityItem}
      />

      {/* Help Popup Modal (Glassmorphic design) */}
      <Modal
        visible={isHelpModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsHelpModalOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="p-6 rounded-3xl items-center shadow-lg w-full max-w-sm"
            style={{
              backgroundColor: "#FFFFFF"
            }}
          >
            {/* Phone Icon */}
            <View className="w-12 h-12 rounded-full bg-[#0085FF]/10 items-center justify-center mb-4">
              <MaterialIcons name="phone" size={24} color="#0085FF" />
            </View>

            {/* Title & description */}
            <Text className="font-bold text-lg text-black text-center mb-2">
              Need Assistance?
            </Text>
            <Text className="text-sm text-[#4E4E4E] text-center mb-6 leading-relaxed">
              Our customer support hotline is available 24/7. Tap below to place a direct call.
            </Text>

            {/* Action Buttons */}
            <View className="w-full gap-y-3">
              {/* Call Button */}
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL("tel:+94770111999");
                  setIsHelpModalOpen(false);
                }}
                activeOpacity={0.8}
                className="py-3.5 rounded-full items-center justify-center shadow-sm"
                style={{ backgroundColor: "#0085FF" }}
              >
                <Text className="text-white font-bold text-base">
                  Call (+94) 770111999
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setIsHelpModalOpen(false)}
                activeOpacity={0.8}
                className="py-3.5 rounded-full items-center justify-center"
                style={{ backgroundColor: "#9599A2" }}
              >
                <Text className="font-bold text-base" style={{ color: "#000000" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeliveryLocation;
