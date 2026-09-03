import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import complaintService from "@/services/complaint/complaint.service";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import NoDataFound from "@/component/common/NoDataFound";
import AddButton from "@/component/common/AddButton";

type ComplaintHistoryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ComplaintHistory"
>;

interface ComplaintHistoryProps {
  navigation: ComplaintHistoryNavigationProp;
}

interface Complaint {
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
  userId: number;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#FF9518",
  Resolved: "#16A34A",
  Rejected: "#DC2626",
};

const ComplaintHistory: React.FC<ComplaintHistoryProps> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.auth.userProfile);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint>();

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchComplaints = async () => {
        try {
          setLoading(true);
          const response = await complaintService.getMyComplaints();
          if (response.data && response.data.status && response.data.data) {
            setComplaints(response.data.data);
          } else {
            setComplaints([]);
          }
        } catch (error) {
          console.log("failed to fetch complaints: ", error);
          setComplaints([]);
        } finally {
          setLoading(false);
        }
      };
      fetchComplaints();
    }, []),
  );

  const handleView = (id: number) => {
    navigation.navigate("ViewComplaint", { id });
  };

  const handleReply = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setModalVisible(true);
  };

  const handleAddComplaint = () => {
    navigation.navigate("ReportComplaint");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title="Complaint History"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <LoadingPage message="Loading Complaints..." fullScreen={false} />
        </View>
      ) : complaints.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <NoDataFound message={"No Complain Found"} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 30,
          }}
        >
          {complaints.map((complaint) => (
            <View
              key={complaint.id}
              className="w-full min-h-[132px] border border-[#DCE2E8] rounded-[19px] px-[23px] pt-3 pb-2.5 mb-4 bg-white"
            >
              {/* Complaint ID */}
              <Text className="text-[13px] text-[#111111] mb-[7px]">
                #{complaint.refId}
              </Text>

              {/* Category */}
              <Text className="text-sm font-bold text-[#111111] mb-2.5">
                {complaint.categoryEnglish}
              </Text>

              {/* Sent Date */}
              <Text className="text-xs text-[#666666] mb-2.5">
                Sent : {formatDate(complaint.createdAt)}
              </Text>

              {/* Bottom Actions */}
              <View className="flex-row items-center gap-[7px]">
                {/* Status */}
                {!(complaint.status === "Closed") ? (
                  <View className="h-[25px] px-2 rounded-[5px] bg-[#F4F4F4] flex-row items-center gap-1">
                    <Ionicons name="hourglass" size={12} color="#111" />
                    <Text className="text-[11px] text-[#333333]">
                      Waiting..
                    </Text>
                  </View>
                ) : (
                  <View className="h-[25px] px-2 rounded-[5px] bg-[#E3FFEA] flex-row items-center gap-1 mr-1.5">
                    <Ionicons name="checkmark-circle" size={13} color="#000" />
                    <Text className="text-[11px] text-[#111111]">Closed</Text>
                  </View>
                )}

                {/* View Complaint */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleView(complaint.id)}
                  className="h-[25px] px-[9px] rounded-[5px] bg-black justify-center items-center shadow-md"
                  style={{ elevation: 3 }}
                >
                  <Text className="text-[11px] text-white font-medium">
                    View Complaint
                  </Text>
                </TouchableOpacity>

                {/* View Reply */}
                <TouchableOpacity
                  activeOpacity={complaint.reply ? 0.8 : 1}
                  disabled={!complaint.reply}
                  onPress={() => handleReply(complaint)}
                  className={`h-[25px] px-[9px] rounded-[5px] justify-center items-center shadow-md ${
                    complaint.reply ? "bg-black" : "bg-[#9EADB5]"
                  }`}
                  style={{
                    elevation: complaint.reply ? 3 : 0,
                  }}
                >
                  <Text className="text-[11px] text-white font-medium">
                    View Reply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      {!loading && <AddButton onPress={handleAddComplaint} />}

      {/* Reply Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 mt-10 bg-white">
          {/* Close Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalVisible(false)}
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

            <Text className="text-[15px] leading-5 text-[#111111] mb-[30px] ">
              {selectedComplaint?.reply!}
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
              {formatDate(selectedComplaint?.replyTime!)}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ComplaintHistory;
