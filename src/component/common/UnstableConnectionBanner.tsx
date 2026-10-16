import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsConnectionUnstable } from "@/services/network/connectionStatus.service";

interface UnstableConnectionBannerProps {
  /** Optional override to force show or hide banner */
  visible?: boolean;
  /** Custom warning message */
  message?: string;
  /** Custom style overrides */
  style?: any;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UNSTABLE CONNECTION BANNER
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays a sleek dark pill/capsule banner immediately below the header
 * whenever the connection is unstable, slow (2G/slow 3G), or offline.
 *
 * Features:
 * - Static clean dark capsule with subtle shadow
 * - Refined compact letters (12.2px)
 * - Animated blinking effect for the warning icon ONLY
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const UnstableConnectionBanner: React.FC<UnstableConnectionBannerProps> = ({
  visible: overrideVisible,
  message = "Unstable Connection. Try a new location.",
  style,
}) => {
  const isAutoUnstable = useIsConnectionUnstable();
  const shouldShow = overrideVisible !== undefined ? overrideVisible : isAutoUnstable;

  const anim = useRef(new Animated.Value(shouldShow ? 1 : 0)).current;
  const iconBlinkAnim = useRef(new Animated.Value(0)).current;

  // Slide in / collapse animation
  useEffect(() => {
    Animated.timing(anim, {
      toValue: shouldShow ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [shouldShow]);

  // Continuous blinking effect for the warning icon ONLY
  useEffect(() => {
    let blinkLoop: Animated.CompositeAnimation | null = null;
    if (shouldShow) {
      blinkLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(iconBlinkAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(iconBlinkAnim, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      blinkLoop.start();
    } else {
      iconBlinkAnim.setValue(0);
    }
    return () => {
      if (blinkLoop) {
        blinkLoop.stop();
      }
    };
  }, [shouldShow]);

  // When not showing and animation is finished, don't take up any space
  if (!shouldShow && (anim as any)._value === 0) {
    return null;
  }

  const maxHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  // Warning icon blinking opacity (blinks between 0.35 and 1.0)
  const iconOpacity = iconBlinkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          maxHeight,
          opacity: anim,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={styles.pillContainer}>
        {/* Blinking Warning Icon Only */}
        <Animated.View style={{ opacity: iconOpacity }}>
          <Ionicons
            name="warning"
            size={16}
            color="#FF9A00"
            style={styles.icon}
          />
        </Animated.View>

        {/* Refined clean text */}
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 5,
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181D24", 
    borderRadius: 9999,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12.2,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

export default UnstableConnectionBanner;
