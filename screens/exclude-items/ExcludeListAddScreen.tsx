import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  BackHandler,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { TextInput } from "react-native-gesture-handler";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import NoDataFound from "@/component/common/NoDataFound";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import ToggleSwitch from "@/component/common/ToggleSwitch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

type ExcludeListAddNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ExcludeListAdd"
>;

interface CustomerData {
  name?: string;
  title?: string;
  number?: string;
  cusId?: number | string;
  id?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

interface RouteParams {
  customerId?: number;
  name?: string;
  title?: string;
  number?: string;
  id?: number;
}

interface ExcludeListAddProps {
  navigation: ExcludeListAddNavigationProp;
  route: RouteProp<RootStackParamList, "ExcludeListAdd">;
}

interface Crop {
  id: number;
  displayName: string;
  image: string;
  isIncluded?: boolean;
  isExcluded?: boolean;
}

interface CropRowProps {
  item: Crop;
  isIncluded: boolean;
  isExcluded: boolean;
  onToggleInclude: (cropId: number) => void;
  onToggleExclude: (cropId: number) => void;
}



const CropRow = React.memo(
  ({
    item,
    isIncluded,
    isExcluded,
    onToggleInclude,
    onToggleExclude,
  }: CropRowProps) => {
    return (
      <View className="flex-row justify-between items-center my-1 px-6 mb-2">
        <View className="flex-row items-center gap-4 flex-1">
          <Image
            source={{ uri: item.image }}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
          <Text
            className="text-black text-base font-medium flex-1"
            numberOfLines={2}
          >
            {item.displayName}
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 20 }}>
          <ToggleSwitch
            isOn={isIncluded}
            onColor="#22C55E"
            offColor="#D9D9D9"
            size="medium"
            onToggle={() => onToggleInclude(item.id)}
          />
          <ToggleSwitch
            isOn={isExcluded}
            onColor="#EF4444"
            offColor="#D9D9D9"
            size="medium"
            onToggle={() => onToggleExclude(item.id)}
          />
        </View>
      </View>
    );
  },
);

const ExcludeListAdd: React.FC<ExcludeListAddProps> = ({
  route,
  navigation,
}) => {
  const { customerId = 1002, name, title, number, id } =
    (route.params as RouteParams) || {};

  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);

  const [selectedIncludeCrops, setSelectedIncludeCrops] = useState<number[]>([]);
  const [selectedExcludeCrops, setSelectedExcludeCrops] = useState<number[]>([]);

  const [initialIncludeIds, setInitialIncludeIds] = useState<number[]>([]);
  const [initialExcludeIds, setInitialExcludeIds] = useState<number[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerDataLoading, setCustomerDataLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const toggleInclude = useCallback((cropId: number) => {
    setSelectedExcludeCrops((prev) => prev.filter((id) => id !== cropId));
    setSelectedIncludeCrops((prev) =>
      prev.includes(cropId)
        ? prev.filter((id) => id !== cropId)
        : [...prev, cropId],
    );
  }, []);

  const toggleExclude = useCallback((cropId: number) => {
    setSelectedIncludeCrops((prev) => prev.filter((id) => id !== cropId));
    setSelectedExcludeCrops((prev) =>
      prev.includes(cropId)
        ? prev.filter((id) => id !== cropId)
        : [...prev, cropId],
    );
  }, []);

  const getCurrentCustomerData = () => {
    if (customerData) {
      const fullName =
        `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim();

      return {
        name: fullName || name || "",
        title: customerData.title || title || "",
        number: customerData.phoneNumber || number || "",
        id: customerData.id?.toString() || id?.toString() || "",
        customerId: customerData.cusId?.toString() || customerId.toString(),
      };
    }
    return {
      name: name || "",
      title: title || "",
      number: number || "",
      id: id?.toString() || "",
      customerId: customerId.toString(),
    };
  };

  const handleBackPress = useCallback(() => {
    navigation.navigate("ChooseAuth");
    return true;
  }, [navigation]);

  const fetchCropsAndPreferences = useCallback(async () => {
    try {
      setListLoading(true);
      setCustomerDataLoading(true);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Authentication Required", "Please log in to customize packages.");
        setCustomerDataLoading(false);
        setListLoading(false);
        navigation.navigate("ChooseAuth");
        return;
      }

      try {
        const profileRes = await axios.get(
          `${environment.API_BASE_URL}api/customer/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (profileRes.data && profileRes.data.status) {
          setCustomerData(profileRes.data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch customer profile:", err);
      }

      const suggestionsRes = await axios.get(
        `${environment.API_BASE_URL}api/customer/marketplace/suggestions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const excludedRes = await axios.get(
        `${environment.API_BASE_URL}api/customer/marketplace/excluded-items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const includedRes = await axios.get(
        `${environment.API_BASE_URL}api/customer/marketplace/include-items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const dbSuggestions = suggestionsRes.data.items || [];
      const dbExcluded = excludedRes.data.items || [];
      const dbIncluded = includedRes.data.items || [];

      const formattedCrops: Crop[] = dbSuggestions.map((item: any) => ({
        id: item.id,
        displayName: item.displayName,
        image: item.image,
      }));

      const includedIds = dbIncluded.map((item: any) => item.id);
      const excludedIds = dbExcluded.map((item: any) => item.id);

      setCrops(formattedCrops);
      setFilteredCrops(formattedCrops);
      setSelectedIncludeCrops(includedIds);
      setSelectedExcludeCrops(excludedIds);
      setInitialIncludeIds(includedIds);
      setInitialExcludeIds(excludedIds);

    } catch (error: any) {
      console.error("Error loading crops and preferences:", error);
      Alert.alert(
        "Connection Error",
        "Failed to connect to backend. Falling back to local data."
      );
      setCrops([]);
      setFilteredCrops([]);
      setSelectedIncludeCrops([]);
      setSelectedExcludeCrops([]);
      setInitialIncludeIds([]);
      setInitialExcludeIds([]);
    } finally {
      setCustomerDataLoading(false);
      setListLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCropsAndPreferences();
  }, [fetchCropsAndPreferences]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        // Allow navigation
      });

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => {
        unsubscribe();
        backHandler.remove();
      };
    }, [navigation, handleBackPress]),
  );

  const handlesubmitexcludelist = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        const addedIncludes = selectedIncludeCrops.filter(id => !initialIncludeIds.includes(id));
        const deletedIncludes = initialIncludeIds.filter(id => !selectedIncludeCrops.includes(id));
        const addedExcludes = selectedExcludeCrops.filter(id => !initialExcludeIds.includes(id));
        const deletedExcludes = initialExcludeIds.filter(id => !selectedExcludeCrops.includes(id));

        const getCropNames = (ids: number[]) => {
          return crops.filter(c => ids.includes(c.id)).map(c => c.displayName);
        };

        const addIncludeNames = getCropNames(addedIncludes);
        const delIncludeNames = getCropNames(deletedIncludes);
        const addExcludeNames = getCropNames(addedExcludes);
        const delExcludeNames = getCropNames(deletedExcludes);

        const authHeaders = { Authorization: `Bearer ${token}` };

        if (addIncludeNames.length > 0) {
          await axios.post(`${environment.API_BASE_URL}api/customer/marketplace/add-include-items`, 
            { items: addIncludeNames }, { headers: authHeaders }
          );
        }
        if (delIncludeNames.length > 0) {
          await axios.post(`${environment.API_BASE_URL}api/customer/marketplace/delete-included`, 
            { items: delIncludeNames }, { headers: authHeaders }
          );
        }
        if (addExcludeNames.length > 0) {
          await axios.post(`${environment.API_BASE_URL}api/customer/marketplace/exclude-items`, 
            { items: addExcludeNames }, { headers: authHeaders }
          );
        }
        if (delExcludeNames.length > 0) {
          await axios.post(`${environment.API_BASE_URL}api/customer/marketplace/delete-excluded`, 
            { items: delExcludeNames }, { headers: authHeaders }
          );
        }
      }
      
      const currentData = getCurrentCustomerData();
      navigation.navigate("ExcludeListSummery", {
        customerId: Number(customerId),
        name: currentData.name,
        title: currentData.title,
        phoneNumber: currentData.number,
        cusId: currentData.customerId,
        id: Number(currentData.id) || undefined,
      });
    } catch (err: any) {
      console.error("Failed to submit excludelist changes:", err);
      Alert.alert("Submission Error", "Failed to save excludelist preferences to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    let cleanedQuery = query;

    cleanedQuery = cleanedQuery.replace(/[^a-zA-Z0-9\s]/g, "");

    if (cleanedQuery.length > 0 && cleanedQuery[0] === " ") {
      cleanedQuery = cleanedQuery.replace(/^\s+/, "");
    }

    cleanedQuery = cleanedQuery.replace(/\s+/g, " ");

    setSearchQuery(cleanedQuery);
    setSearchError(null);

    if (cleanedQuery === "") {
      setFilteredCrops(crops);
    } else {
      const filtered = crops.filter((crop) =>
        crop.displayName.toLowerCase().includes(cleanedQuery.toLowerCase()),
      );
      setFilteredCrops(filtered);

      if (filtered.length === 0) {
        setSearchError("No products found matching your search");
      }
    }
  };

  const handleNavigateIfNoCropsSelected = () => {
    if (
      selectedIncludeCrops.length === 0 &&
      selectedExcludeCrops.length === 0
    ) {
      const currentData = getCurrentCustomerData();
      navigation.navigate("ExcludeListSummery", {
        customerId: Number(customerId),
        name: currentData.name,
        title: currentData.title,
        phoneNumber: currentData.number,
        cusId: currentData.customerId,
        id: Number(currentData.id) || undefined,
      });
    } else {
      handlesubmitexcludelist();
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setSearchQuery("");
      setSearchError(null);
      if (crops.length > 0) {
        setFilteredCrops(crops);
      }
      fetchCropsAndPreferences();
    });

    return unsubscribe;
  }, [navigation, crops, fetchCropsAndPreferences]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  if (listLoading) {
    return (
      <View className="flex-1 bg-white">
        <CustomHeader
          title="Customize Packages"
          titleColor="black"
          showBackButton={true}
          navigation={navigation}
          onBackPress={handleBackPress}
        />
        <View className="flex-1 justify-center items-center">
          <LoadingPage message="Loading Item List..." fullScreen={false} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
    >
      <View className="flex-1 bg-white">
        <CustomHeader
          title="Customize Packages"
          titleColor="black"
          showBackButton={true}
          navigation={navigation}
          onBackPress={handleBackPress}
        />

        <View className="flex-1 mx-auto w-full max-w-[500px]">
          <View className="px-5">
            <Text className="text-center text-sm text-gray-500">
              Choose items the customer would prefer to include or exclude from
              the package. An item cannot be both preferred and excluded.
            </Text>
          </View>

          <View className="px-6 my-6">
            <View className="relative">
              <TextInput
                className="p-3 pl-4 pr-12 flex-row justify-between items-center rounded-full bg-[#F2F2F6] text-black font-semibold"
                style={{ borderWidth: 0 }}
                placeholder="Search Products.."
                placeholderTextColor="#5A5859"
                value={searchQuery}
                onFocus={() => setIsKeyboardVisible(true)}
                onChangeText={handleSearch}
              />

              <Ionicons
                name="search"
                size={24}
                color="black"
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  marginTop: -12,
                }}
              />
            </View>
          </View>

          {searchError && (
            <View className="flex-1 justify-center items-center">
              <NoDataFound message={searchError} />
            </View>
          )}

          {/* Column headers */}
          <View className="flex-row justify-between items-center px-6 mb-2">
            <Text className="text-black text-sm font-semibold">Product</Text>
            <View className="flex-row items-center" style={{ gap: 20 }}>
              <View style={{ width: 52, alignItems: "center" }}>
                <Text className="text-green-600 text-sm font-semibold" style={{ textAlign: "center" }}>
                  Include
                </Text>
              </View>
              <View style={{ width: 52, alignItems: "center" }}>
                <Text className="text-red-500 text-sm font-semibold" style={{ textAlign: "center" }}>
                  Exclude
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-1">
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredCrops}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item }) => (
                <CropRow
                  item={item}
                  isIncluded={selectedIncludeCrops.includes(item.id)}
                  isExcluded={selectedExcludeCrops.includes(item.id)}
                  onToggleInclude={toggleInclude}
                  onToggleExclude={toggleExclude}
                />
              )}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              removeClippedSubviews={Platform.OS === "android"}
            />
          </View>
        </View>
      </View>

      {!isKeyboardVisible && (
        <View className="absolute bottom-0 left-0 right-0 bg-white pt-4 pb-4 px-6 items-center">
          <TouchableOpacity
            onPress={handleNavigateIfNoCropsSelected}
            disabled={loading}
            activeOpacity={0.8}
            className="bg-black border-2 border-[#D9D9D9] rounded-full items-center justify-center shadow-sm h-[50px] w-full max-w-[500px]"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-base font-bold">
                Verify
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default ExcludeListAdd;
