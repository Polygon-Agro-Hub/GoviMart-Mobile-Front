import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  networkSimulator,
  NETWORK_PROFILES,
  NetworkProfileId,
  ENABLE_NETWORK_SIMULATOR,
} from "@/services/network/networkSimulator.service";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NETWORK SPEED CONTROL BAR & PROGRESS INDICATOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a live in-app widget to adjust global network speed and visualizes
 * ongoing API requests with an animated progress bar.
 *
 * Easily removable:
 * 1. Set ENABLE_NETWORK_SIMULATOR = false in networkSimulator.service.ts
 *    OR remove <NetworkSpeedControlBar /> from HomeScreen.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const NetworkSpeedControlBar: React.FC = () => {
  if (!ENABLE_NETWORK_SIMULATOR) return null;

  const [currentProfile, setCurrentProfile] = useState(
    networkSimulator.getCurrentProfile()
  );
  const [activeRequests, setActiveRequests] = useState(
    networkSimulator.getActiveRequestsCount()
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to simulator updates
    const unsubscribe = networkSimulator.subscribe(() => {
      setCurrentProfile(networkSimulator.getCurrentProfile());
      setActiveRequests(networkSimulator.getActiveRequestsCount());
    });
    return unsubscribe;
  }, []);

  // Animate progress bar when requests are active
  useEffect(() => {
    if (activeRequests > 0) {
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
  }, [activeRequests, currentProfile.delayMs]);

  const selectProfile = (id: NetworkProfileId) => {
    networkSimulator.setProfile(id);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // When collapsed, show small floating pill
  if (isCollapsed) {
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.collapsedPill}
          onPress={() => setIsCollapsed(false)}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  currentProfile.id === "normal"
                    ? "#10B981"
                    : currentProfile.id === "offline"
                    ? "#EF4444"
                    : "#F59E0B",
              },
            ]}
          />
          <Text style={styles.collapsedText}>
            Net: {currentProfile.shortLabel}
          </Text>
          {activeRequests > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeRequests}</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  currentProfile.id === "normal"
                    ? "#10B981"
                    : currentProfile.id === "offline"
                    ? "#EF4444"
                    : "#F59E0B",
              },
            ]}
          />
          <Text style={styles.headerTitle}>Network Speed Control</Text>
          <Text style={styles.headerSubtitle}>(Global Simulation)</Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsCollapsed(true)}
          style={styles.collapseBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.collapseBtnText}>Hide</Text>
          <Ionicons name="chevron-up" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Speed Profile Selector Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buttonsRow}
      >
        {(Object.keys(NETWORK_PROFILES) as NetworkProfileId[]).map((key) => {
          const profile = NETWORK_PROFILES[key];
          const isSelected = currentProfile.id === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => selectProfile(key)}
              style={[
                styles.profileButton,
                isSelected && styles.profileButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.profileButtonText,
                  isSelected && styles.profileButtonTextActive,
                ]}
              >
                {profile.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Description & Status Text */}
      <View style={styles.statusRow}>
        <Text style={styles.descriptionText} numberOfLines={1}>
          {currentProfile.description}
        </Text>
        {activeRequests > 0 ? (
          <Text style={styles.requestCountText}>
            Active: {activeRequests} call{activeRequests > 1 ? "s" : ""}
          </Text>
        ) : (
          <Text style={styles.idleText}>Idle</Text>
        )}
      </View>

      {/* Live Animated Progress Bar */}
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
              opacity: activeRequests > 0 ? 1 : 0,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  collapseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  collapseBtnText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  profileButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  profileButtonTextActive: {
    color: "#FFFFFF",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 10,
    color: "#6B7280",
    flex: 1,
  },
  requestCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    marginLeft: 6,
  },
  idleText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  collapsedContainer: {
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  collapsedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    gap: 6,
  },
  collapsedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  activeBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default NetworkSpeedControlBar;
