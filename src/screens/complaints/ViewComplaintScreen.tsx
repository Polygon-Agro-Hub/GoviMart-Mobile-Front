import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import complaintService from "@/services/complaint/complaint.service";

type ViewComplaintNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ViewComplaint"
>;

type ViewComplaintRouteProp = RouteProp<RootStackParamList, "ViewComplaint">;

interface ViewComplaintProps {
  navigation: ViewComplaintNavigationProp;
  route: ViewComplaintRouteProp;
}

interface ComplaintDetail {
  id: number;
  refId: string;
  categoryEnglish?: string;
  complain: string;
  reply?: string | null;
  status: string;
  replyBy?: string | null;
  replyTime?: string | null;
  createdAt: string;
  images?: { id: number; image: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#FF9518",
  Resolved: "#16A34A",
  Rejected: "#DC2626",
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const ViewComplaint: React.FC<ViewComplaintProps> = ({ navigation, route }) => {
  const complaintId = route.params?.id;
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!complaintId) {
      setLoading(false);
      setComplaint(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await complaintService.getComplaintDetails(
          Number(complaintId),
        );
        if (response.data && response.data.status && response.data.data) {
          setComplaint(response.data.data);
          console.log("fetched Conplaint details: ", response.data.data);
        } else {
          setComplaint(null);
        }
      } catch (error) {
        console.log("failed to fetch complaint details: ", error);
        Alert.alert("Error", "Failed to load complaint details.");
        setComplaint(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [complaintId]);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <CustomHeader
          title="View Complaint"
          titleColor="black"
          showBackButton={true}
          navigation={navigation}
        />
        <View className="flex-1 justify-center items-center">
          <LoadingPage message="Loading..." fullScreen={false} />
        </View>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View className="flex-1 bg-white">
        <CustomHeader
          title="View Complaint"
          titleColor="black"
          showBackButton={true}
          navigation={navigation}
        />
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-sm text-[#555555]">Complaint not found.</Text>
        </View>
      </View>
    );
  }

  const isClosed = complaint.status === "Closed";

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <CustomHeader
        title="View Complaint"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 30,
        }}
      >
        {/* COMPLAINT DETAILS CARD */}

        <View className="border border-[#DCE2E8] rounded-2xl px-3 pt-[7px] pb-3.5 bg-white mb-3.5">
          {/* Complaint ID */}

          <View className="px-1.5 py-[7px] border-b border-[#EEF0F2]">
            <Text className="text-xs text-[#676771] mb-[5px]">
              Complaint ID
            </Text>

            <Text className="text-sm text-black font-semibold mb-1">
              {complaint.refId}
            </Text>

            <Text className="text-xs text-[#5A5859]">
              Sent : {formatDate(complaint.createdAt)}
            </Text>
          </View>

          {/* Category */}

          <View className="px-1.5 py-[7px] border-b border-[#EEF0F2]">
            <Text className="text-xs text-[#676771] mb-[5px]">Category</Text>

            <Text className="text-sm text-black font-semibold mb-1">
              {complaint.categoryEnglish || "Complaint"}
            </Text>
          </View>

          {/* Description */}

          <View className="px-1.5 py-[7px] border-b border-[#EEF0F2]">
            <Text className="text-xs text-[#676771] mb-[5px]">Description</Text>

            <Text className="text-sm leading-4 text-black font-medium">
              {complaint.complain}
            </Text>
          </View>

          {/* Photos */}

          <View className="px-1.5 py-[7px] pb-0">
            <Text className="text-xs text-[#676771] mb-[5px]">
              Photos ({complaint.images?.length})
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 8,
              }}
            >
              {complaint.images?.map((photo, index) => (
                <TouchableOpacity
                  key={`${photo.id}-${index}`}
                  activeOpacity={0.9}
                  className="w-20 h-20 rounded-[10px] overflow-hidden mr-3"
                >
                  <Image
                    source={{ uri: photo.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ================================================= */}
        {/* STATUS TIMELINE CARD */}
        {/* ================================================= */}

        <View className="border border-[#DCE2E8] rounded-2xl px-2.5 py-3.5 bg-white relative">
          {/* Connecting line */}

          <View className="absolute left-6 top-[42px] bottom-[43px] w-px bg-[#DDE1E5]" />

          {/* COMPLAINT SUBMITTED */}

          <View className="flex-row min-h-[64px] mb-5">
            <View className="w-[35px] h-[35px] rounded-full justify-center items-center z-10 bg-black">
              <FontAwesome6
                name="paper-plane"
                solid
                size={19}
                color="#FFFFFF"
              />
            </View>

            <View className="flex-1 ml-2.5 pt-px">
              <Text className="text-sm text-black font-semibold mb-[3px]">
                Complaint Submitted
              </Text>

              <Text className="text-xs text-[#5A5859] leading-[14px]">
                Your complaint has been submitted.
              </Text>

              <Text className="text-xs text-[#5A5859] mt-0.5">
                At {formatTime(complaint.createdAt)} on{" "}
                {formatDate(complaint.createdAt)}
              </Text>
            </View>
          </View>

          {/* UNDER REVIEW */}

          <View className="flex-row min-h-[64px] mb-5">
            <View className="w-[35px] h-[35px] rounded-full justify-center items-center z-10 bg-black">
              <Ionicons name="hourglass" size={19} color="#FFFFFF" />
            </View>

            <View className="flex-1 ml-2.5 pt-px">
              <Text className="text-sm text-black font-semibold mb-[3px]">
                Under Review
              </Text>

              <Text className="text-xs text-[#5A5859] leading-[14px]">
                We are reviewing your complaint.
              </Text>
            </View>
          </View>

          {/* PENDING RESOLUTION */}

          <View className="flex-row min-h-[64px] mb-0">
            <View
              className={`w-[35px] h-[35px] rounded-full justify-center items-center z-10 ${
                isClosed ? "bg-black" : "bg-[#F0F1F4]"
              }`}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={16}
                color={isClosed ? "#F0F1F4" : "#000000"}
              />
            </View>

            <View className="flex-1 ml-2.5 pt-px">
              <Text className="text-sm text-black font-semibold mb-[3px]">
                {isClosed ? "Complaint Closed." : "Pending Resolution"}
              </Text>

              <Text className="text-xs text-[#5A5859] leading-[14px]">
                {isClosed
                  ? "Please view the reply from our team for more details."
                  : "Our team will get back to you soon."}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ViewComplaint;
