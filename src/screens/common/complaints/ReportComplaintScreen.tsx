import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  BackHandler,
  Linking,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import complaintService from "@/services/complaint/complaint.service";
import * as ImagePicker from "expo-image-picker";
import GlobalSearchModal from "@/component/common/GlobalSearchModal";

type ReportComplaintNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReportComplaint"
>;

type ReportComplaintRouteProp = RouteProp<
  RootStackParamList,
  "ReportComplaint"
>;

interface ReportComplaintProps {
  navigation: ReportComplaintNavigationProp;
  route: ReportComplaintRouteProp;
}

interface ComplaintCategory {
  id: number;
  categoryEnglish: string;
  categorySinhala?: string;
  categoryTamil?: string;
}

const MAX_IMAGES = 6;

const ReportComplaint: React.FC<ReportComplaintProps> = ({ navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const CONTAINER_PADDING = 16;
  const IMAGE_GAP = 10;
  const NUM_COLUMNS = 3;
  // Dynamically calculate size so 3 images perfectly fill the container edge to edge
  const imageSize =
    (windowWidth - CONTAINER_PADDING * 2 - IMAGE_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [complain, setComplain] = useState("");
  const [images, setImages] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await complaintService.getComplaintCategories();
        if (response.data && response.data.status) {
          setCategories(response.data.data || []);
        }
      } catch (error) {
        console.log("failed to fetch complaint categories: ", error);
        Alert.alert("Error", "Failed to load complaint categories.");
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const categoryModalData = categories.map((cat) => ({
    label: cat.categoryEnglish,
    value: String(cat.id),
    categorySinhala: cat.categorySinhala,
    categoryTamil: cat.categoryTamil,
  }));

  const handleCategorySelect = (items: string[]) => {
    const value = items[0];
    if (!value) return;

    const found = categories.find((cat) => String(cat.id) === value);
    if (found) {
      setSelectedCategoryId(found.id);
      setSelectedCategoryName(found.categoryEnglish);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "ios") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (images.length + result.assets!.length > MAX_IMAGES) {
      Alert.alert(
        "Limit Reached",
        `You can attach up to ${MAX_IMAGES} images.`,
      );
      return;
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedPhotos = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      setImages((prev) => [...prev, ...selectedPhotos]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!selectedCategoryId) {
      Alert.alert("Required", "Please select a complaint category.");
      return;
    }

    if (!complain.trim() || complain.trim().length < 3) {
      Alert.alert(
        "Required",
        "Please describe your complaint (at least 3 characters).",
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData: any = new FormData();
      formData.append("complaicategoryId", String(selectedCategoryId));
      formData.append("complain", complain.trim());

      images.forEach((img) => {
        formData.append("images", {
          uri: img.uri,
          name: img.name,
          type: img.type,
        });
      });

      const response = await complaintService.createComplaint(formData);

      if (response.data && response.data.status) {
        Alert.alert(
          "Success",
          "Your complaint has been submitted successfully.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("ComplaintHistory"),
            },
          ],
        );
      } else {
        Alert.alert(
          "Error",
          response.data?.message ||
          "Failed to submit complaint. Please try again.",
        );
      }
    } catch (error: any) {
      console.log("failed to create complaint response data: ", error?.response?.data);
      console.log("failed to create complaint: ", error);
      const errorDetails = error?.response?.data?.errors;
      const errorMessage =
        (Array.isArray(errorDetails) ? errorDetails.join("\n") : null) ||
        error?.response?.data?.message ||
        "Failed to submit complaint. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        navigation.navigate("ComplaintHistory");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBack
      );

      return () => subscription.remove();
    }, [navigation])
  );

  if (loadingCategories) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <CustomHeader
          title="Report a Complaint"
          titleColor="black"
          showBackButton={true}
          navigation={navigation}
          onBackPress={() => navigation.navigate("ComplaintHistory")}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LoadingPage message="Loading..." fullScreen={false} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CustomHeader
        title="Report a Complaint"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.navigate("ComplaintHistory")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 120,
        }}
      >
        {/* ================================================= */}
        {/* COMPLAINT ICON */}
        {/* ================================================= */}

        <View
          style={{
            alignItems: "center",
            marginTop: 2,
          }}
        >
          <View
            style={{
              width: 55,
              height: 55,
              borderRadius: 26,
              backgroundColor: "#F3F3F7",

              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FontAwesome6 solid name="headset" size={29} color="#000" />
          </View>
        </View>

        {/* DESCRIPTION TEXT */}

        <Text
          style={{
            textAlign: "center",
            color: "#666",
            fontSize: 13.5,
            lineHeight: 19,

            marginTop: 16,
            marginHorizontal: 8,
            marginBottom: 26,
          }}
        >
          We're here to help. Please provide the details{"\n"}
          of your complaint below.
        </Text>

        {/* CATEGORY */}

        <View
          style={{
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCategoryModalVisible(true)}
            style={{
              height: 60,

              borderWidth: 1,
              borderColor: "#D9DEE4",

              borderRadius: 30,

              paddingHorizontal: 21,

              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#666",
                marginBottom: 3,
              }}
            >
              Complaint Category
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: selectedCategoryName ? "#111" : "#747990",
                fontWeight: selectedCategoryName ? "600" : "500",
              }}
            >
              {selectedCategoryName || "Select From Here"}
            </Text>

            <Ionicons
              name="chevron-down"
              size={19}
              color="#000"
              style={{
                position: "absolute",
                right: 18,
                top: 21,
              }}
            />
          </TouchableOpacity>
        </View>

        {/* CATEGORY SEARCH MODAL */}

        <GlobalSearchModal
          visible={categoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          title="Complaint Category"
          data={categoryModalData}
          selectedItems={selectedCategoryId ? [String(selectedCategoryId)] : []}
          onSelect={handleCategorySelect}
          searchPlaceholder="Search category..."
          noResultsText="No categories found"
          multiSelect={false}
          searchKeys={["label"]}
        />

        {/* DESCRIPTION */}

        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#111111",
            marginBottom: 8,
          }}
        >
          1. Description
        </Text>

        <View
          style={{
            height: 204,

            borderWidth: 1,
            borderColor: "#D9DEE4",

            borderRadius: 17,

            paddingHorizontal: 21,
            paddingTop: 13,

            marginBottom: 19,
          }}
        >
          <TextInput
            value={complain}
            onChangeText={setComplain}
            multiline
            textAlignVertical="top"
            placeholder="Please describe your issue in detail.."
            placeholderTextColor="#A0A0A0"
            style={{
              flex: 1,
              padding: 0,
              fontSize: 14.5,
              lineHeight: 20,
              color: "#111111",
              fontWeight: "500",
            }}
          />
        </View>

        {/* ================================================= */}
        {/* PHOTOS TITLE */}
        {/* ================================================= */}

        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#111111",
            marginBottom: 6,
          }}
        >
          2. Upload Photos (Optional)
        </Text>

        <Text
          style={{
            fontSize: 12.5,
            color: "#777",
            marginBottom: 12,
          }}
        >
          Limit : Up to 6 photos (JPG, PNG - Max 5MB each)
        </Text>

        {/* ================================================= */}
        {/* PHOTO LIST */}
        {/* ================================================= */}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: IMAGE_GAP,
            paddingBottom: 10,
          }}
        >
          {images.length < 6 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={pickImage}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 15,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "#D7DCE1",
                backgroundColor: "#F9FAFB",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FontAwesome6 name="camera" solid size={27} color="#000" />

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#747990",
                  marginTop: 5,
                }}
              >
                Add Photo
              </Text>
            </TouchableOpacity>
          )}

          {images.map((img, index) => (
            <View
              key={index}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 15,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: img.uri }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />

              <TouchableOpacity
                onPress={() => removeImage(index)}
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "rgba(0,0,0,0.65)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ================================================= */}
      {/* BOTTOM SUBMIT BUTTON */}
      {/* ================================================= */}

      <View
        style={{
          position: "absolute",

          left: 0,
          right: 0,
          bottom: 0,

          paddingHorizontal: 13,

          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 18 : 10,

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
          onPress={handleSubmit}
          style={{
            height: 50,

            borderRadius: 27,

            backgroundColor: "#000000",

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
          }}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              style={{
                color: "#FFFFFF",

                fontSize: 15.5,
                fontWeight: "800",
              }}
            >
              Submit Complaint
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ReportComplaint;
