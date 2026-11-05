import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import authService from "@/services/auth/auth.service";
import BRDocumentUploader from "@/component/common/BRDocumentUploader";
import CustomHeader from "@/component/common/CustomHeader";

type Props = StackScreenProps<
  RootStackParamList,
  "VerificationUnsuccessful"
>;

const formatReviewDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const day = d.getDate();
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const month = monthNames[d.getMonth()];

    return `${time}, ${ordinal(day)} ${month}`;
  } catch {
    return dateStr;
  }
};

const extractDocName = (url?: string | null) => {
  if (!url) return "BR_Certificate_Scan.jpg";
  try {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || "BR_Certificate_Scan.jpg";
  } catch {
    return "BR_Certificate_Scan.jpg";
  }
};

const VerificationUnsuccessfulScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { userId, brImg, approvedAt } = route.params || {};

  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState("");

  const previousDocName = extractDocName(brImg);
  const formattedDate = formatReviewDate(approvedAt);

  const handleResubmit = async () => {
    if (!selectedFile) {
      setFileError("Please upload a new Business Registration (BR) document.");
      Alert.alert(
        "Document Required",
        "Please select a new Business Registration (BR) document before submitting."
      );
      return;
    }
    setFileError("");

    if (!userId) {
      Alert.alert("Error", "User session information missing. Please sign in again.");
      navigation.navigate("Login");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("userId", String(userId));
      formData.append("brDocument", {
        uri:
          Platform.OS === "android"
            ? selectedFile.uri
            : selectedFile.uri.replace("file://", ""),
        name: selectedFile.name || "BR_Certificate_Scan.jpg",
        type: selectedFile.mimeType || "application/octet-stream",
      } as any);

      const res = await authService.resubmitWholesaleBR(formData);
      if (res.data?.success) {
        Alert.alert(
          "Documents Resubmitted Successfully",
          "Your Business Registration documents have been submitted for review.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("Login");
              },
            },
          ]
        );
      } else {
        Alert.alert("Submission Failed", res.data?.message || "Failed to submit document.");
      }
    } catch (err: any) {
      console.error("Resubmit BR error:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to resubmit document.";
      Alert.alert("Error", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Custom Common Header with Back Button (No Title) */}
      <CustomHeader
        title=""
        showBackButton={true}
        navigation={navigation}
        style={{ paddingTop: 0, paddingBottom: 0 }}
        containerStyle={{ marginTop: -6 }}
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("Login");
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 0,
          paddingBottom: 32,
        }}
      >

        {/* Status Icon */}
        <View style={{ alignItems: "center", marginTop: 0 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: "#FFF1F2",
              borderWidth: 1.5,
              borderColor: "#FFE4E6",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={38}
              color="#F43F5E"
            />
            {/* Small red close badge on bottom-right */}
            <View
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#E11D48",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#FFFFFF",
              }}
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0F172A",
            textAlign: "center",
            marginTop: 18,
          }}
        >
          Verification Unsuccessful
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 13,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 20,
            marginTop: 10,
            paddingHorizontal: 8,
          }}
        >
          Your wholesale account application could not be approved due to issues found with the submitted documentation.
        </Text>

        {/* Review Status Card */}
        <View
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            padding: 16,
            marginTop: 24,
          }}
        >
          {/* Row 1: Review Status */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
              Review Status
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFE4E6CC",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#BE123C",
                  marginRight: 6,
                }}
              />
              <Text
                style={{
                  color: "#BE123C",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Action Required
              </Text>
            </View>
          </View>

          {/* Row 2: Reviewed Date */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
              Reviewed Date
            </Text>
            <Text
              style={{
                color: "#0F172A",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {formattedDate}
            </Text>
          </View>

          {/* Row 3: Submitted Document */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "500" }}>
              Submitted Document
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: "#00C8B3",
                fontSize: 13,
                fontWeight: "600",
                maxWidth: "55%",
                textDecorationLine: "underline",
                textDecorationColor: "#A7F3D0",
              }}
            >
              {previousDocName}
            </Text>
          </View>
        </View>

        {/* Reusable BR Document Uploader Component */}
        <BRDocumentUploader
          selectedFile={selectedFile}
          onFileSelect={(file) => {
            setSelectedFile(file);
            if (file) setFileError("");
          }}
          error={fileError}
          containerStyle={{ marginTop: 24 }}
        />
      </ScrollView>

      {/* Resubmit Documents Button Aligned to Screen Bottom */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 8 : 16,
          backgroundColor: "#FFFFFF",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={submitting}
          onPress={handleResubmit}
          style={{
            backgroundColor: "#000000",
            borderRadius: 999,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Resubmit Documents
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VerificationUnsuccessfulScreen;
