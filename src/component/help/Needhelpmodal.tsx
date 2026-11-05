import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface NeedHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

interface HelpCardProps {
  gradient: [string, string];
  borderColor: string;
  iconBg: string;
  iconRadius: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  titleColor: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
  descriptionColor: string;
  marginBottom: number;
}

const HelpCard: React.FC<HelpCardProps> = ({
  gradient,
  borderColor,
  iconBg,
  iconRadius,
  icon,
  iconColor,
  title,
  titleColor,
  badge,
  badgeBg,
  badgeColor,
  description,
  descriptionColor,
  marginBottom,
}) => (
  <View
    style={{
      borderColor,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom,
      flexDirection: "row",
      gap: 12,
      overflow: "hidden",
    }}
  >
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: iconRadius,
        backgroundColor: iconBg,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
      }}
    >
      <Ionicons name={icon} size={14} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Text style={{ fontWeight: "700", fontSize: 13, color: titleColor }}>
          {title}
        </Text>
        <View
          style={{
            backgroundColor: badgeBg,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "700", color: badgeColor }}>
            {badge}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: descriptionColor }}>
        {description}
      </Text>
    </View>
  </View>
);

const NeedHelpModal: React.FC<NeedHelpModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: 24,
            maxHeight: "88%",
            width: "100%",
            maxWidth: 500,
            alignSelf: "center",
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D1D5DB",
              marginBottom: 14,
            }}
          />

          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5 pb-3"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="information-circle" size={20} color="#111827" />
              </View>
              <Text className="text-black text-base font-bold">
                How Customization Works
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={26} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <HelpCard
              gradient={["#ECFDF5E6", "#ECFDF566"]}
              borderColor="#ECFDF5E5"
              iconBg="#10B981"
              iconRadius={11}
              icon="checkmark"
              iconColor="#fff"
              title="Prefer / Include (Green)"
              titleColor="#022C22"
              badge="PRIORITY"
              badgeBg="#A7F3D0B2"
              badgeColor="#064E3B"
              description="Select products you love and want to receive when you let us customize your package including special items you enjoy having."
              descriptionColor="#065F46E5"
              marginBottom={12}
            />

            <HelpCard
              gradient={["#FFF1F2E6", "#FFF1F266"]}
              borderColor="#FECDD3CC"
              iconBg="#881337"
              iconRadius={20}
              icon="close"
              iconColor="#fff"
              title="Exclude (Red)"
              titleColor="#4C0519"
              badge="NEVER SEND"
              badgeBg="#FECDD3B2"
              badgeColor="#881337"
              description="Select items you never want to receive (allergies, dislikes, diets). We guarantee they are completely omitted."
              descriptionColor="#9F1239E5"
              marginBottom={12}
            />

            <HelpCard
              gradient={["#F8FAFC", "#F8FAFC80"]}
              borderColor="#E2E8F0CC"
              iconBg="#334155"
              iconRadius={11}
              icon="remove"
              iconColor="#fff"
              title="Unmarked / Neutral"
              titleColor="#0F172A"
              badge="STANDARD"
              badgeBg="#E2E8F0"
              badgeColor="#475569"
              description="Items left off mean standard seasonal packing. We balance your box with no particular preference."
              descriptionColor="#475569"
              marginBottom={14}
            />

            <Text
              style={{
                textAlign: "center",
                fontSize: 11,
                fontStyle: "italic",
                color: "#6B7280",
                lineHeight: 16,
                paddingHorizontal: 8,
              }}
            >
              "We can only consider these preferences if you allow us to
              customize your package, subject to seasonal supply."
            </Text>
          </ScrollView>

          {/* Got it */}
          <View className="px-5 pt-3">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="bg-black rounded-full items-center justify-center h-[50px] flex-row"
              style={{ gap: 8 }}
            >
              <Text className="text-white text-base font-bold">Got it</Text>
              <Ionicons name="checkmark" size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NeedHelpModal;