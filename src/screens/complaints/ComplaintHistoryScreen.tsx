import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    Modal,
    StyleSheet,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import complaintService from "@/services/complaint/complaint.service";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

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
    userId: number
}

const STATUS_COLORS: Record<string, string> = {
    Pending: "#FF9518",
    Resolved: "#16A34A",
    Rejected: "#DC2626",
};

const ComplaintHistory: React.FC<ComplaintHistoryProps> = ({
    navigation,
}) => {
    const user = useSelector(
        (state: RootState) => state.auth.userProfile
    );

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint>()

    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchComplaints = async () => {
                try {
                    setLoading(true);
                    const response =
                        await complaintService.getMyComplaints();
                    if (
                        response.data &&
                        response.data.status &&
                        response.data.data
                    ) {
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
        }, [])
    );

    const handleView = (id: number) => {
        navigation.navigate("ViewComplaint", { id });
    };
    const handleReply = (complaint: Complaint) => {
        setSelectedComplaint(complaint)
        console.log("Reply:", complaint);
        setModalVisible(true);
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
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <CustomHeader
                title="My Complaints"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            {loading ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <LoadingPage message="Loading Complaints..." fullScreen={false} />
                </View>
            ) : complaints.length === 0 ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 30,
                    }}
                >
                    <FontAwesome6
                        name="clipboard-list"
                        size={46}
                        color="#C7CDD4"
                    />
                    <Text
                        style={{
                            marginTop: 14,
                            fontSize: 15,
                            fontWeight: "700",
                            color: "#111",
                        }}
                    >
                        No complaints yet
                    </Text>
                    <Text
                        style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: "#7B7F91",
                            textAlign: "center",
                        }}
                    >
                        You haven't submitted any complaints. Tap below to
                        report an issue.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("ReportComplaint")}
                        style={{
                            marginTop: 18,
                            backgroundColor: "#000",
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 26,
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "700",
                            }}
                        >
                            Report a Complaint
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {complaints.map((complaint) => (
                        <View
                            key={complaint.id}
                            style={styles.complaintCard}
                        >
                            {/* Complaint ID */}
                            <Text style={styles.complaintId}>
                                #{complaint.refId}
                            </Text>

                            {/* Category */}
                            <Text style={styles.category}>
                                {complaint.categoryEnglish}
                            </Text>

                            {/* Sent Date */}
                            <Text style={styles.sentDate}>
                                Sent : {formatDate(complaint.createdAt)}
                            </Text>

                            {/* Bottom Actions */}
                            <View style={styles.actionsRow}>
                                {/* Status */}
                                {!(complaint.status == "Closed") ? (
                                    <View style={styles.waitingBadge}>
                                        <Ionicons
                                            name="hourglass"
                                            size={12}
                                            color="#111"
                                        />

                                        <Text style={styles.waitingText}>
                                            Waiting..
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ ...styles.closedBadge, marginRight: 6 }}>
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={13}
                                            color="#000"
                                        />

                                        <Text style={styles.closedText}>
                                            Closed
                                        </Text>
                                    </View>
                                )}

                                {/* View Complaint */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        handleView(complaint.id)
                                    }
                                    style={styles.blackButton}
                                >
                                    <Text style={styles.buttonText}>
                                        View Complaint
                                    </Text>
                                </TouchableOpacity>

                                {/* View Reply */}
                                <TouchableOpacity
                                    activeOpacity={
                                        complaint.reply ? 0.8 : 1
                                    }
                                    disabled={!complaint.reply}
                                    onPress={() =>
                                        handleReply(complaint)
                                    }
                                    style={[
                                        styles.replyButton,
                                        !complaint.reply &&
                                        styles.disabledReplyButton,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.replyText,
                                            !complaint.reply &&
                                            styles.disabledReplyText,
                                        ]}
                                    >
                                        View Reply
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent={false}
                onRequestClose={() => setModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "#FFFFFF",
                    }}
                >
                    {/* Close Button */}

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setModalVisible(false)}
                        style={styles.replyCloseButton}
                    >
                        <Ionicons
                            name="close"
                            size={17}
                            color="#FFFFFF"
                        />
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
                        <Text style={styles.replyTextInModal}>
                            Dear {user?.firstName}{" "}{user?.lastName},
                        </Text>

                        <Text style={styles.replyTextInModal}>
                            We are pleased to inform you that your{"\n"}
                            complaint has been resolved.
                        </Text>

                        <Text style={{fontWeight: 600,...styles.replyTextInModal}}>
                            {selectedComplaint?.reply!}
                        </Text>

                        <Text style={styles.replyTextInModal}>
                            If you have any further concerns or{"\n"}
                            questions, feel free to reach out.{"\n"}
                            Thank you for your patience and{"\n"}
                            understanding.
                        </Text>

                        <Text style={styles.replyTextInModal}>
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
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 30,
    },

    complaintCard: {
        width: "100%",

        minHeight: 132,

        borderWidth: 1,
        borderColor: "#DCE2E8",

        borderRadius: 19,

        paddingHorizontal: 23,
        paddingTop: 12,
        paddingBottom: 10,

        marginBottom: 16,

        backgroundColor: "#FFFFFF",
    },

    complaintId: {
        fontSize: 13,
        color: "#111111",

        marginBottom: 7,
    },

    category: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111111",

        marginBottom: 10,
    },

    sentDate: {
        fontSize: 12,
        color: "#666666",

        marginBottom: 10,
    },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",

        gap: 7,
    },

    waitingBadge: {
        height: 25,

        paddingHorizontal: 8,

        borderRadius: 5,

        backgroundColor: "#F4F4F4",

        flexDirection: "row",
        alignItems: "center",

        gap: 4,
    },

    waitingText: {
        fontSize: 11,
        color: "#333333",
    },

    closedBadge: {
        height: 25,

        paddingHorizontal: 8,

        borderRadius: 5,

        backgroundColor: "#E3FFEA",

        flexDirection: "row",
        alignItems: "center",

        gap: 4,
    },

    closedText: {
        fontSize: 11,
        color: "#111111",
    },

    blackButton: {
        height: 25,

        paddingHorizontal: 9,

        borderRadius: 5,

        backgroundColor: "#000000",

        justifyContent: "center",
        alignItems: "center",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.18,
        shadowRadius: 2,

        elevation: 3,
    },

    buttonText: {
        fontSize: 11,
        color: "#FFFFFF",
        fontWeight: "500",
    },

    replyButton: {
        height: 25,

        paddingHorizontal: 9,

        borderRadius: 5,

        backgroundColor: "#000000",

        justifyContent: "center",
        alignItems: "center",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.18,
        shadowRadius: 2,

        elevation: 3,
    },

    replyText: {
        fontSize: 11,
        color: "#FFFFFF",
        fontWeight: "500",
    },

    disabledReplyButton: {
        backgroundColor: "#9EADB5",
        shadowOpacity: 0,
        elevation: 0,
    },

    disabledReplyText: {
        color: "#FFFFFF",
    },
    replyCloseButton: {
        position: "absolute",

        top: 7,
        right: 9,

        width: 22,
        height: 22,

        borderRadius: 11,

        backgroundColor: "#000000",

        justifyContent: "center",
        alignItems: "center",

        zIndex: 100,
    },

    replyTextInModal: {
        fontSize: 15,
        lineHeight: 20,

        color: "#111111",

        marginBottom: 30,
    },

    viewReplyButton: {
        height: 28,

        paddingHorizontal: 12,

        borderRadius: 5,

        backgroundColor: "#000000",

        justifyContent: "center",
        alignItems: "center",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.18,
        shadowRadius: 2,

        elevation: 3,
    },

    viewReplyButtonText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "500",
    },
});
export default ComplaintHistory;
