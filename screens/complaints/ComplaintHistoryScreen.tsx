import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";

type ComplaintHistoryNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ComplaintHistory"
>;

interface ComplaintHistoryProps {
    navigation: ComplaintHistoryNavigationProp;
}

interface Complaint {
    id: number;
    category: string;
    sentAt: string;
    status: "Waiting" | "Closed";
    canReply: boolean;
}

const ComplaintHistory: React.FC<ComplaintHistoryProps> = ({
    navigation,
}) => {
    const complaints: Complaint[] = [
        {
            id: 1,
            category: "Finance Issue",
            sentAt: "At 11:00AM on July 2, 2026",
            status: "Waiting",
            canReply: false,
        },
        {
            id: 2,
            category: "Finance Issue",
            sentAt: "At 11:00AM on July 2, 2026",
            status: "Closed",
            canReply: true,
        },
    ];
    const complaint = {
        id: 123,
        userName: "Nalin Dies",
        category: "Payment Failed",
        description:
            "I was charged for the order but the payment failed and the order was not placed. Please check and refund my money.",
        sentAt: "At 11:00AM on July 2, 2026",

        reply: {
            message: ` 
We understand that pricing is influenced
by market trends and company policies,
but we urge [Company Name] to
consider reviewing the current pricing
structure. Offering more equitable
compensation would not only support
farmers' livelihoods but also ensure the
continued supply of top-quality crops to
your company. An investment in fair
pricing today would cultivate loyalty
and sustainability that benefits both
sides for the long term.`,
            date: "2024/09/08",
        },
    };
    const [modalVisible, setModalVisible] = useState<boolean>(false);

    const handleViewComplaint = (complaint: Complaint) => {
        console.log("View Complaint:", complaint);

        navigation.navigate("ViewComplaint");
    };

    const handleReply = (complaint: Complaint) => {
        console.log("Reply:", complaint);
        setModalVisible(true);
        // navigation.navigate("ComplaintReply", {
        //   complaintId: complaint.id,
        // });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <CustomHeader
                title="Complaint History"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

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
                            #[Complaint ID]
                        </Text>

                        {/* Category */}
                        <Text style={styles.category}>
                            {complaint.category}
                        </Text>

                        {/* Sent Date */}
                        <Text style={styles.sentDate}>
                            Sent : {complaint.sentAt}
                        </Text>

                        {/* Bottom Actions */}
                        <View style={styles.actionsRow}>
                            {/* Status */}
                            {complaint.status === "Waiting" ? (
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
                                <View style={styles.closedBadge}>
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
                                    handleViewComplaint(complaint)
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
                                    complaint.canReply ? 0.8 : 1
                                }
                                disabled={!complaint.canReply}
                                onPress={() =>
                                    handleReply(complaint)
                                }
                                style={[
                                    styles.replyButton,
                                    !complaint.canReply &&
                                    styles.disabledReplyButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.replyText,
                                        !complaint.canReply &&
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
            {/* REPLY MODAL */}

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
                            Dear {complaint.userName},
                        </Text>

                        <Text style={styles.replyTextInModal}>
                            We are pleased to inform you that your{"\n"}
                            complaint has been resolved.
                        </Text>

                        <Text style={styles.replyTextInModal}>
                            {complaint.reply.message}
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
                            {complaint.reply.date}
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

        backgroundColor: "#DFFFF0",

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