import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  BackHandler,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { ScrollView } from "react-native-gesture-handler";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import ConfirmationModal from "@/component/common/ConfirmationModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { store } from "@/store";
import { tokenStorage } from "@/utils/tokenStorage";

const getEffectiveToken = async (): Promise<string | null> => {
  return (
    store.getState().auth.token ||
    (await tokenStorage.getToken()) ||
    (await AsyncStorage.getItem("userToken"))
  );
};

type ExcludeListSummeryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ExcludeListSummery"
>;

interface ExcludeListSummeryProps {
  navigation: ExcludeListSummeryNavigationProp;
  route: RouteProp<RootStackParamList, "ExcludeListSummery">;
}

interface ExcludeCrop {
  excludeId: number;
  displayName: string;
  image: string;
}

interface PreferCrop {
  preId: number;
  displayName: string;
  image: string;
}



const ExcludeListSummery: React.FC<ExcludeListSummeryProps> = ({
  route,
  navigation,
}) => {
  const { customerId = 1002, name = "Kamal Perera", title = "Mr", phoneNumber = "+94771122300", cusId = "1002", id } =
    route.params || {};

  const [excludeCrops, setExcludeCrops] = useState<ExcludeCrop[]>([]);
  const [preferCrops, setPreferCrops] = useState<PreferCrop[]>([]);

  const [selectedExcludeIds, setSelectedExcludeIds] = useState<number[]>([]);
  const [selectedPreferIds, setSelectedPreferIds] = useState<number[]>([]);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    type: "prefer" | "exclude" | "bulk-prefer" | "bulk-exclude";
    message: string;
  } | null>(null);

  const nameParts = (name || "").trim().split(/\s+/);
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  const [customerName, setCustomerName] = useState<{
    firstName: string;
    lastName: string;
    title: string;
    cusId: string;
    phoneNumber: string;
  }>({
    firstName: initialFirstName,
    lastName: initialLastName,
    title: title || "",
    cusId: cusId || "",
    phoneNumber: phoneNumber || "",
  });

  const fetchLists = useCallback(async () => {
    try {
      const token = await getEffectiveToken();
      if (!token) {
        Alert.alert("Authentication Required", "Please log in to view customize packages summary.");
        navigation.navigate("ChooseAuth");
        return;
      }

      const includedRes = await axios.get(
        `${environment.API_BASE_URL}api/customer/marketplace/include-items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const excludedRes = await axios.get(
        `${environment.API_BASE_URL}api/customer/marketplace/excluded-items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const dbIncluded = includedRes.data.items || [];
      const dbExcluded = excludedRes.data.items || [];

      const formattedIncluded = dbIncluded.map((item: any) => ({
        preId: item.id,
        displayName: item.displayName,
        image: item.image,
      }));

      const formattedExcluded = dbExcluded.map((item: any) => ({
        excludeId: item.id,
        displayName: item.displayName,
        image: item.image,
      }));

      setPreferCrops(formattedIncluded);
      setExcludeCrops(formattedExcluded);

    } catch (error) {
      setExcludeCrops([]);
      setPreferCrops([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedExcludeIds([]);
      setSelectedPreferIds([]);
      fetchLists();
    }, [fetchLists]),
  );

  const toggleSelectExclude = (excludeId: number) => {
    setSelectedExcludeIds((prev) =>
      prev.includes(excludeId)
        ? prev.filter((id) => id !== excludeId)
        : [...prev, excludeId],
    );
  };

  const toggleSelectPrefer = (preId: number) => {
    setSelectedPreferIds((prev) =>
      prev.includes(preId)
        ? prev.filter((id) => id !== preId)
        : [...prev, preId],
    );
  };

  const toggleSelectAllExclude = () => {
    if (selectedExcludeIds.length === excludeCrops.length) {
      setSelectedExcludeIds([]);
    } else {
      setSelectedExcludeIds(excludeCrops.map((crop) => crop.excludeId));
    }
  };

  const toggleSelectAllPrefer = () => {
    if (selectedPreferIds.length === preferCrops.length) {
      setSelectedPreferIds([]);
    } else {
      setSelectedPreferIds(preferCrops.map((crop) => crop.preId));
    }
  };

  const deleteExcludeCrop = (excludeId: number) => {
    setItemToDelete({
      id: excludeId,
      type: "exclude",
      message: "Are you sure you want to delete this excluded item?",
    });
    setDeleteModalVisible(true);
  };

  const deletePreferCrop = (preId: number) => {
    setItemToDelete({
      id: preId,
      type: "prefer",
      message: "Are you sure you want to delete this preferred item?",
    });
    setDeleteModalVisible(true);
  };

  const deleteSelectedExcludeCrops = () => {
    if (selectedExcludeIds.length === 0) return;
    setItemToDelete({
      id: 0,
      type: "bulk-exclude",
      message: `Are you sure you want to delete the ${selectedExcludeIds.length} selected excluded item(s)?`,
    });
    setDeleteModalVisible(true);
  };

  const deleteSelectedPreferCrops = () => {
    if (selectedPreferIds.length === 0) return;
    setItemToDelete({
      id: 0,
      type: "bulk-prefer",
      message: `Are you sure you want to delete the ${selectedPreferIds.length} selected preferred item(s)?`,
    });
    setDeleteModalVisible(true);
  };

  const confirmDeleteAction = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);

    const { id, type } = itemToDelete;
    const token = await getEffectiveToken();

    try {
      if (type === "prefer") {
        const crop = preferCrops.find((c) => c.preId === id);
        if (crop && token) {
          await axios.post(
            `${environment.API_BASE_URL}api/customer/marketplace/delete-included`,
            { items: [crop.displayName] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        setPreferCrops((prev) => prev.filter((c) => c.preId !== id));
        setSelectedPreferIds((prev) => prev.filter((item) => item !== id));
      } else if (type === "exclude") {
        const crop = excludeCrops.find((c) => c.excludeId === id);
        if (crop && token) {
          await axios.post(
            `${environment.API_BASE_URL}api/customer/marketplace/delete-excluded`,
            { items: [crop.displayName] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        setExcludeCrops((prev) => prev.filter((c) => c.excludeId !== id));
        setSelectedExcludeIds((prev) => prev.filter((item) => item !== id));
      } else if (type === "bulk-prefer") {
        if (token) {
          const cropsToDelete = preferCrops
            .filter((c) => selectedPreferIds.includes(c.preId))
            .map((c) => c.displayName);
          if (cropsToDelete.length > 0) {
            await axios.post(
              `${environment.API_BASE_URL}api/customer/marketplace/delete-included`,
              { items: cropsToDelete },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        setPreferCrops((prev) =>
          prev.filter((crop) => !selectedPreferIds.includes(crop.preId))
        );
        setSelectedPreferIds([]);
      } else if (type === "bulk-exclude") {
        if (token) {
          const cropsToDelete = excludeCrops
            .filter((c) => selectedExcludeIds.includes(c.excludeId))
            .map((c) => c.displayName);
          if (cropsToDelete.length > 0) {
            await axios.post(
              `${environment.API_BASE_URL}api/customer/marketplace/delete-excluded`,
              { items: cropsToDelete },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        setExcludeCrops((prev) =>
          prev.filter((crop) => !selectedExcludeIds.includes(crop.excludeId))
        );
        setSelectedExcludeIds([]);
      }
    } catch (err: any) {
      console.error("Delete operation failed:", err);
      Alert.alert("Error", "Failed to delete item(s) from database.");
    }

    setItemToDelete(null);
  };

  const handleBackNavigation = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Profile");
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackNavigation();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [handleBackNavigation]),
  );

  const handleCompleteOnboarding = async () => {
    try {
      const token = await getEffectiveToken();
      if (token) {
        await axios.post(
          `${environment.API_BASE_URL}api/customer/update-user-status`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local AsyncStorage profile
        const profileStr = await AsyncStorage.getItem("userProfile");
        if (profileStr) {
          const profileObj = JSON.parse(profileStr);
          profileObj.firstTimeUser = 1;
          await AsyncStorage.setItem("userProfile", JSON.stringify(profileObj));
        }
      }

      Alert.alert("Success", "Package preferences configured successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Home") }
      ]);
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err);
      Alert.alert("Error", "Failed to update onboarding status. Please try again.");
    }
  };

  const fullTitle =
    customerName.firstName && customerName.lastName
      ? `${customerName.title}. ${customerName.firstName} ${customerName.lastName}`
      : "Kamal Perera";

  const Checkbox = ({
    checked,
    onPress,
  }: {
    checked: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity onPress={onPress} hitSlop={8}>
      <View
        className={`w-[22px] h-[22px] rounded-md border-[1.5px] items-center justify-center ${checked ? "border-[#374151] bg-[#374151]" : "border-[#9CA3AF] bg-white"
          }`}
      >
        {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <CustomHeader
        title={fullTitle}
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
        onBackPress={handleBackNavigation}
      />

      <View className="mx-auto w-full max-w-[500px]">
        <Text className="text-center text-black text-base -mt-[3px]">
          {customerName.firstName && customerName.lastName
            ? `Customer ID : ${customerName.cusId}`
            : "Customer ID : 1002"}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="flex-1 mb-24"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="mx-auto w-full max-w-[500px] px-6">
          {/* ---------------- Items prefer to include ---------------- */}
          <View className="mt-6 border border-gray-200 rounded-xl bg-white overflow-hidden">
            <View className="flex-row items-center gap-3 px-4 py-3 bg-[#E6F2E5]">
              <View className="w-8 h-8 rounded-full bg-white items-center justify-center border border-[#E6F2E5]">
                <Ionicons name="heart" size={16} color="#16A34A" />
              </View>
              <Text className="text-[#34C759] text-sm">
                Items prefer to Include
              </Text>
            </View>

            {preferCrops.length === 0 ? (
              <View className="items-center py-8">
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ExcludeListAdd", {
                      customerId: Number(customerId),
                    })
                  }
                  className="items-center justify-center"
                  activeOpacity={0.7}
                >
                  <View className="w-16 h-16 rounded-full border border-black items-center justify-center mb-2 bg-transparent">
                    <View className="w-12 h-12 rounded-full bg-black items-center justify-center">
                      <Ionicons name="add" size={28} color="white" />
                    </View>
                  </View>
                  <Text className="text-black font-bold text-sm">Add Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="px-4 pb-3">
                {selectedPreferIds.length > 0 && (
                  <View className="flex-row justify-end items-center gap-1 py-2">
                    <MaterialIcons name="delete" size={16} color="#FF000D" />
                    <TouchableOpacity onPress={deleteSelectedPreferCrops}>
                      <Text className="text-[#FF000D] text-xs font-semibold underline">
                        Delete Selected Items
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Checkbox
                      checked={preferCrops.length > 0 && selectedPreferIds.length === preferCrops.length}
                      onPress={toggleSelectAllPrefer}
                    />
                    <Text className="text-[#9CA3AF] text-xs">
                      Item ({String(preferCrops.length).padStart(2, "0")})
                    </Text>
                  </View>
                  <Text className="flex-1 text-center text-[#9CA3AF] text-xs">
                    Name
                  </Text>
                  <Text className="flex-1 text-right text-[#9CA3AF] text-xs">
                    Action
                  </Text>
                </View>

                {preferCrops.map((crop) => (
                  <View
                    key={crop.preId}
                    className="flex-row justify-between items-center py-3"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedPreferIds.includes(crop.preId)}
                        onPress={() => toggleSelectPrefer(crop.preId)}
                      />
                      <Image
                        source={{ uri: crop.image }}
                        className="w-8 h-8"
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      className="text-sm text-black flex-1 text-center"
                      numberOfLines={2}
                    >
                      {crop.displayName}
                    </Text>
                    <View className="flex-1 items-end">
                      <TouchableOpacity
                        onPress={() => deletePreferCrop(crop.preId)}
                      >
                        <MaterialIcons
                          name="delete"
                          size={22}
                          color="#FF000D"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ---------------- Items prefer to exclude ---------------- */}
          <View className="mt-6 border border-gray-200 rounded-xl bg-white overflow-hidden">
            <View className="flex-row items-center gap-3 px-4 py-3 bg-[#FDEEEE]">
              <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
                <Ionicons name="close" size={16} color="#DC2626" />
              </View>
              <Text className="text-[#DC2626] font-medium text-[15px]">
                Items prefer to exclude
              </Text>
            </View>

            {excludeCrops.length === 0 ? (
              <View className="items-center py-8">
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ExcludeListAdd", {
                      customerId: Number(customerId),
                    })
                  }
                  className="items-center justify-center"
                  activeOpacity={0.7}
                >
                  <View className="w-16 h-16 rounded-full border border-black items-center justify-center mb-2 bg-transparent">
                    <View className="w-12 h-12 rounded-full bg-black items-center justify-center">
                      <Ionicons name="add" size={28} color="white" />
                    </View>
                  </View>
                  <Text className="text-black font-bold text-sm">Add Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="px-4 pb-3">
                {selectedExcludeIds.length > 0 && (
                  <View className="flex-row justify-end items-center gap-1 py-2">
                    <MaterialIcons name="delete" size={16} color="#DC2626" />
                    <TouchableOpacity onPress={deleteSelectedExcludeCrops}>
                      <Text className="text-[#FF000D] text-xs font-semibold underline">
                        Delete Selected Items
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Checkbox
                      checked={excludeCrops.length > 0 && selectedExcludeIds.length === excludeCrops.length}
                      onPress={toggleSelectAllExclude}
                    />
                    <Text className="text-[#9CA3AF] text-xs">
                      Item ({String(excludeCrops.length).padStart(2, "0")})
                    </Text>
                  </View>
                  <Text className="flex-1 text-center text-[#9CA3AF] text-xs">
                    Name
                  </Text>
                  <Text className="flex-1 text-right text-[#9CA3AF] text-xs">
                    Action
                  </Text>
                </View>

                {excludeCrops.map((crop) => (
                  <View
                    key={crop.excludeId}
                    className="flex-row justify-between items-center py-3"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedExcludeIds.includes(crop.excludeId)}
                        onPress={() => toggleSelectExclude(crop.excludeId)}
                      />
                      <Image
                        source={{ uri: crop.image }}
                        className="w-8 h-8"
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      className="text-sm text-black flex-1 text-center"
                      numberOfLines={2}
                    >
                      {crop.displayName}
                    </Text>
                    <View className="flex-1 items-end">
                      <TouchableOpacity
                        onPress={() => deleteExcludeCrop(crop.excludeId)}
                      >
                        <MaterialIcons
                          name="delete"
                          size={22}
                          color="#FF0000"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 bg-white pt-4 pb-4 px-6 items-center">
        <TouchableOpacity
          onPress={handleCompleteOnboarding}
          activeOpacity={0.8}
          className="bg-black border-2 border-[#D9D9D9] rounded-full items-center justify-center shadow-sm h-[50px] w-full max-w-[500px]"
        >
          <Text className="text-white text-base font-bold">
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reusable Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Item"
        message={itemToDelete?.message || "Are you sure you want to delete this item? This action cannot be undone."}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default ExcludeListSummery;
