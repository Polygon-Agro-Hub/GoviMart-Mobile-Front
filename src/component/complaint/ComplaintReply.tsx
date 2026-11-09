import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface ComplaintReplyProps {
  visible: boolean;
  onClose: () => void;
  reply?: string | null;
  replyTime?: string | null;
}

const formatReplyDate = (dateString?: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
};

const formatComplaintText = (text?: string | null): string => {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
};

const ComplaintReply: React.FC<ComplaintReplyProps> = ({
  visible,
  onClose,
  reply,
  replyTime,
}) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className="flex-1 mt-10 bg-white">
        {/* Close Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          className="absolute top-[7px] right-2.5 w-[22px] h-[22px] rounded-full bg-black justify-center items-center z-[100]"
        >
          <Ionicons name="close" size={17} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Reply Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 21,
            paddingTop: 31,
            paddingBottom: 40,
          }}
        >
          <Text className="text-[15px] leading-5 text-[#111111] mb-[30px]">
            Dear {user?.firstName} {user?.lastName},
          </Text>

          <Text className="text-[15px] leading-5 text-[#111111] mb-[30px]">
            We are pleased to inform you that your{"\n"}
            complaint has been resolved.
          </Text>

          <Text className="text-[15px] leading-[22px] text-[#111111] mb-[30px]">
            {formatComplaintText(reply) || "No reply available."}
          </Text>

          <Text className="text-[15px] leading-5 text-[#111111] mb-[30px]">
            If you have any further concerns or{"\n"}
            questions, feel free to reach out.{"\n"}
            Thank you for your patience and{"\n"}
            understanding.
          </Text>

          <Text className="text-[15px] leading-5 text-[#111111] mb-[30px]">
            Sincerely,{"\n"}
            Polygon Customer Support Team{"\n"}
            {formatReplyDate(replyTime)}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default ComplaintReply;