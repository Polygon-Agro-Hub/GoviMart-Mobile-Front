import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import apiClient from "@/services/config-service/axio-config";
import {
  networkSimulator,
  NETWORK_PROFILES,
  NetworkProfileId,
  ENABLE_NETWORK_SIMULATOR,
} from "@/services/network/networkSimulator.service";

type DeveloperScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Developer"
>;

interface DeveloperScreenProps {
  navigation: DeveloperScreenNavigationProp;
}

const DeveloperScreen: React.FC<DeveloperScreenProps> = ({ navigation }) => {
  const [currentProfile, setCurrentProfile] = useState(
    networkSimulator.getCurrentProfile()
  );
  const [activeRequests, setActiveRequests] = useState(
    networkSimulator.getActiveRequestsCount()
  );
  const [testingRequest, setTestingRequest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = networkSimulator.subscribe(() => {
      setCurrentProfile(networkSimulator.getCurrentProfile());
      setActiveRequests(networkSimulator.getActiveRequestsCount());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeRequests > 0 || testingRequest) {
      progressAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: Math.max(1000, currentProfile.delayMs || 1000),
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [activeRequests, testingRequest, currentProfile.delayMs]);

  const selectProfile = (id: NetworkProfileId) => {
    networkSimulator.setProfile(id);
    setTestResult(null);
  };

  const runTestRequest = async () => {
    setTestingRequest(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      // Send a lightweight test request through apiClient (which uses network simulator)
      const res = await apiClient.get("marketplace/public-categories");
      const elapsed = Date.now() - startTime;
      setTestResult(`Success! Completed in ${elapsed} ms (HTTP ${res.status})`);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      const msg = err?.message || "Request failed";
      setTestResult(`Failed after ${elapsed} ms: ${msg}`);
    } finally {
      setTestingRequest(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Developer Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Environment Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server-outline" size={18} color="#000000" />
            <Text style={styles.cardTitle}>Environment Info</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Developer Mode:</Text>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>
                {environment.isDeveloper ? "ACTIVE (true)" : "INACTIVE (false)"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API Base URL:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {environment.API_BASE_URL}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Simulator Hook:</Text>
            <Text style={styles.infoValue}>
              {networkSimulator.isEnabled() ? "Active (Simulating speeds)" : "Inactive (Full high speed)"}
            </Text>
          </View>
        </View>

        {/* Network Speed Controller Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer-outline" size={18} color="#000000" />
            <Text style={styles.cardTitle}>Global Network Speed</Text>
          </View>

          <Text style={styles.cardDescription}>
            Select a network profile below. The delay and failure rate will be
            applied globally to all API requests across the entire app.
          </Text>

          {/* Speed Presets List */}
          {(Object.keys(NETWORK_PROFILES) as NetworkProfileId[]).map((key) => {
            const profile = NETWORK_PROFILES[key];
            const isSelected = currentProfile.id === key;

            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                onPress={() => selectProfile(key)}
                style={[
                  styles.profileOption,
                  isSelected && styles.profileOptionSelected,
                ]}
              >
                <View style={styles.profileLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={[
                        styles.profileLabel,
                        isSelected && styles.profileLabelSelected,
                      ]}
                    >
                      {profile.label}
                    </Text>
                    <Text style={styles.profileDesc}>
                      {profile.description}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Live Progress Bar Section */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Network Activity:{" "}
                <Text style={{ fontWeight: "700", color: "#111827" }}>
                  {activeRequests > 0 || testingRequest
                    ? `Active (${activeRequests + (testingRequest ? 1 : 0)} in-flight)`
                    : "Idle"}
                </Text>
              </Text>
              <Text style={styles.delayTag}>
                Delay: {currentProfile.delayMs} ms
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidth,
                    backgroundColor:
                      currentProfile.id === "normal"
                        ? "#10B981"
                        : currentProfile.id === "offline"
                        ? "#EF4444"
                        : "#F59E0B",
                    opacity: activeRequests > 0 || testingRequest ? 1 : 0,
                  },
                ]}
              />
            </View>
          </View>

          {/* Test Request Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={testingRequest}
            onPress={runTestRequest}
            style={[
              styles.testButton,
              testingRequest && { opacity: 0.6 },
            ]}
          >
            {testingRequest ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="play-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.testButtonText}>
              {testingRequest ? "Testing Request..." : "Send Test API Request"}
            </Text>
          </TouchableOpacity>

          {testResult && (
            <View
              style={[
                styles.resultCard,
                testResult.startsWith("Success")
                  ? styles.resultCardSuccess
                  : styles.resultCardError,
              ]}
            >
              <Text
                style={[
                  styles.resultText,
                  testResult.startsWith("Success")
                    ? styles.resultTextSuccess
                    : styles.resultTextError,
                ]}
              >
                {testResult}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Instructions */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>How to toggle Developer Mode:</Text>
          <Text style={styles.noteText}>
            To show or hide this Developer screen and the button in Profile, open{" "}
            <Text style={{ fontWeight: "700" }}>src/environment/environment.ts</Text>{" "}
            and set <Text style={{ fontWeight: "700" }}>isDeveloper: true</Text>{" "}
            or <Text style={{ fontWeight: "700" }}>false</Text>.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "60%",
  },
  badgeSuccess: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  profileOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  profileOptionSelected: {
    borderColor: "#000000",
    backgroundColor: "#F9FAFB",
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#000000",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000000",
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  profileLabelSelected: {
    color: "#000000",
    fontWeight: "700",
  },
  profileDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  activeTag: {
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: 10,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: "#4B5563",
  },
  delayTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  testButton: {
    height: 46,
    backgroundColor: "#000000",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  resultCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultCardSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  resultCardError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  resultText: {
    fontSize: 12,
    lineHeight: 18,
  },
  resultTextSuccess: {
    color: "#065F46",
    fontWeight: "600",
  },
  resultTextError: {
    color: "#991B1B",
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
});

export default DeveloperScreen;
