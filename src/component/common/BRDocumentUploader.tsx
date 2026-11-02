import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

export interface BRDocumentUploaderProps {
  selectedFile: DocumentPicker.DocumentPickerAsset | null;
  onFileSelect: (file: DocumentPicker.DocumentPickerAsset | null) => void;
  error?: string;
  containerStyle?: any;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace(/\.0$/, "");
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
  return `${mb} MB`;
};

const getExtensionLabel = (name?: string, mimeType?: string) => {
  if (mimeType?.includes("pdf") || name?.toLowerCase().endsWith(".pdf")) {
    return "PDF";
  }
  if (name) {
    const ext = name.split(".").pop()?.toUpperCase();
    if (ext) return ext;
  }
  return "JPG";
};

export const BRDocumentUploader: React.FC<BRDocumentUploaderProps> = ({
  selectedFile,
  onFileSelect,
  error,
  containerStyle,
}) => {
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const isPdf =
    selectedFile?.mimeType === "application/pdf" ||
    selectedFile?.name?.toLowerCase().endsWith(".pdf");

  const extLabel = getExtensionLabel(selectedFile?.name, selectedFile?.mimeType);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/heic",
          "image/heif",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const maxBytes = 10 * 1024 * 1024; // 10MB
        if (file.size && file.size > maxBytes) {
          Alert.alert(
            "File Too Large",
            "Selected file exceeds the 10MB limit. Please upload a file under 10MB."
          );
          return;
        }
        onFileSelect(file);
      }
    } catch (err: any) {
      console.error("Document pick error:", err);
      Alert.alert("Error", "Failed to select document. Please try again.");
    }
  };

  return (
    <View style={containerStyle}>
      {/* Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#0F172A",
          }}
        >
          Business Registration (BR)
        </Text>
        <View
          style={{
            backgroundColor: "#FFF5F7",
            borderColor: "#FF2D55",
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: "#FF2D55",
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            Required document
          </Text>
        </View>
      </View>

      {/* Main Body: Upload Box OR Preview Card */}
      {!selectedFile ? (
        // State 1: Dropzone / Upload Box
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickDocument}
          style={{
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: error ? "#EF4444" : "#FF9114",
            backgroundColor: error ? "#FEF2F2" : "#FFFBF7",
            borderRadius: 18,
            paddingVertical: 22,
            paddingHorizontal: 16,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#FF9114",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
              shadowColor: "#FFD7AA80",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Ionicons name="cloud-upload-outline" size={26} color="#FFFFFF" />
          </View>

          <Text style={{ fontSize: 13, textAlign: "center" }}>
            <Text style={{ color: "#FF9114", fontWeight: "700" }}>
              Click to upload
            </Text>
            <Text style={{ color: "#334155", fontWeight: "600" }}>
              {" "}or drag and drop
            </Text>
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
              marginTop: 10,
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={13}
              color="#475569"
              style={{ marginRight: 5 }}
            />
            <Text
              style={{
                color: "#475569",
                fontSize: 11,
                fontWeight: "500",
              }}
            >
              PDF, JPG, PNG, HEIC • Max 10MB
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        // State 2 & 3: File Selected Preview Card
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {/* Top Half: Visual Preview Banner */}
          {isPdf ? (
            // PDF Document Visual
            <View
              style={{
                width: "100%",
                height: 132,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* PDF Format Badge */}
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  backgroundColor: "#E11D48",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <FontAwesome5
                  name="file-pdf"
                  size={10}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  PDF
                </Text>
              </View>

              {/* PDF Document Illustration Sheet */}
              <View
                style={{
                  width: 140,
                  height: 90,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  padding: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                  justifyContent: "space-between",
                }}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#FFE4E6",
                        borderRadius: 4,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        marginRight: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: "#E11D48",
                          fontSize: 8,
                          fontWeight: "800",
                        }}
                      >
                        PDF
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        width: 36,
                        backgroundColor: "#E2E8F0",
                        borderRadius: 2,
                      }}
                    />
                  </View>

                  {/* Green checkmark */}
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: "#10B981",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                </View>

                {/* Placeholder Content Lines */}
                <View style={{ gap: 4 }}>
                  <View
                    style={{
                      height: 3,
                      width: "85%",
                      backgroundColor: "#F1F5F9",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      height: 3,
                      width: "70%",
                      backgroundColor: "#F1F5F9",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      height: 3,
                      width: "90%",
                      backgroundColor: "#F1F5F9",
                      borderRadius: 2,
                    }}
                  />
                </View>

                {/* Footer text */}
                <Text
                  style={{
                    fontSize: 8,
                    color: "#94A3B8",
                    textAlign: "right",
                  }}
                >
                  PDF Document
                </Text>
              </View>
            </View>
          ) : (
            // Image Visual Banner
            <View
              style={{
                width: "100%",
                height: 132,
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#0F172A",
              }}
            >
              <Image
                source={{ uri: selectedFile.uri }}
                style={{ width: "100%", height: 132 }}
                resizeMode="cover"
              />

              {/* Top-left format badge */}
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  backgroundColor: "rgba(0, 0, 0, 0.75)",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  {extLabel}
                </Text>
              </View>

              {/* Tap to preview button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setImageModalVisible(true)}
                style={{
                  position: "absolute",
                  alignSelf: "center",
                  top: 48,
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons
                  name="eye-outline"
                  size={15}
                  color="#0F172A"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: "#0F172A",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  Tap to preview
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Half: File Info & Change / Delete Actions */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Left Info */}
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                {selectedFile.name}
              </Text>
              <Text style={{ fontSize: 11, marginTop: 3 }}>
                <Text style={{ color: "#64748B" }}>
                  {formatFileSize(selectedFile.size)} •{" "}
                </Text>
                <Text style={{ color: "#0D9488", fontWeight: "600" }}>
                  Ready to submit
                </Text>
              </Text>
            </View>

            {/* Right Buttons: Change & Trash */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Change Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickDocument}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Ionicons
                  name="sync-outline"
                  size={14}
                  color="#0F172A"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#0F172A",
                  }}
                >
                  Change
                </Text>
              </TouchableOpacity>

              {/* Trash Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onFileSelect(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error message */}
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, paddingHorizontal: 4 }}>
          <MaterialIcons name="error" size={13} color="#EF4444" style={{ marginRight: 5 }} />
          <Text style={{ color: "#EF4444", fontSize: 12 }}>{error}</Text>
        </View>
      ) : null}

      {/* Image Preview Modal (for image files) */}
      {!isPdf && selectedFile && (
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setImageModalVisible(false)}
              style={{
                position: "absolute",
                top: 48,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedFile.uri }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default BRDocumentUploader;

