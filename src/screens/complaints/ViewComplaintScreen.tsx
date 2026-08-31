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

const ViewComplaint: React.FC<ViewComplaintProps> = ({
    navigation,
    route,
}) => {
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
                    Number(complaintId)
                );
                if (response.data && response.data.status && response.data.data) {
                    setComplaint(response.data.data);
                    console.log("fetched Conplaint details: ", response.data.data)
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
            <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
                <CustomHeader
                    title="View Complaint"
                    titleColor="black"
                    showBackButton={true}
                    navigation={navigation}
                />
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <LoadingPage message="Loading..." fullScreen={false} />
                </View>
            </View>
        );
    }

    if (!complaint) {
        return (
            <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
                <CustomHeader
                    title="View Complaint"
                    titleColor="black"
                    showBackButton={true}
                    navigation={navigation}
                />
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 30,
                    }}
                >
                    <Text style={{ fontSize: 14, color: "#555" }}>
                        Complaint not found.
                    </Text>
                </View>
            </View>
        );
    }

    const statusColor = STATUS_COLORS[complaint.status] || "#6B7280";

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <CustomHeader
                title="View Complaint"
                titleColor="black"
                showBackButton={true}
                navigation={navigation}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* COMPLAINT DETAILS CARD */}

                <View style={styles.detailsCard}>
                    {/* Complaint ID */}

                    <View style={styles.detailSection}>
                        <Text style={styles.label}>
                            Complaint ID
                        </Text>

                        <Text style={styles.value}>
                            {complaint.refId}
                        </Text>

                        <Text style={styles.date}>
                            Sent : {formatDate(complaint.createdAt)}
                        </Text>
                    </View>

                    {/* Category */}

                    <View style={styles.detailSection}>
                        <Text style={styles.label}>
                            Category
                        </Text>

                        <Text style={styles.value}>
                            {complaint.categoryEnglish || "Complaint"}
                        </Text>
                    </View>

                    {/* Description */}

                    <View style={styles.detailSection}>
                        <Text style={styles.label}>
                            Description
                        </Text>

                        <Text style={styles.description}>
                            {complaint.complain}
                        </Text>
                    </View>

                    {/* Photos */}

                    <View
                        style={[
                            styles.detailSection,
                            {
                                borderBottomWidth: 0,
                                paddingBottom: 0,
                            },
                        ]}
                    >
                        <Text style={styles.label}>
                            Photos ({complaint.images?.length})
                        </Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingTop: 8,
                            }}
                        >
                            {complaint.images?.map(
                                (photo, index) => (
                                    <TouchableOpacity
                                        key={`${photo}-${index}`}
                                        activeOpacity={0.9}
                                        style={styles.photoWrapper}
                                    >
                                        <Image
                                            source={{ uri: photo.image }}
                                            style={styles.photo}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ),
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* ================================================= */}
                {/* STATUS TIMELINE CARD */}
                {/* ================================================= */}

                <View style={styles.timelineCard}>
                    {/* Connecting line */}

                    <View style={styles.timelineLine} />

                    {/* COMPLAINT SUBMITTED */}

                    <View style={styles.timelineItem}>
                        <View
                            style={[
                                styles.timelineIcon,
                                {
                                    backgroundColor: "#000000",
                                },
                            ]}
                        >
                            <FontAwesome6
                                name="paper-plane"
                                solid
                                size={19}
                                color="#FFFFFF"
                            />
                        </View>

                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>
                                Complaint Submitted
                            </Text>

                            <Text style={styles.timelineDescription}>
                                Your complaint has been submitted.
                            </Text>

                            <Text style={styles.timelineDate}>
                                At {formatTime(complaint.createdAt)} on {formatDate(complaint.createdAt)}
                            </Text>
                        </View>
                    </View>

                    {/* UNDER REVIEW */}

                    <View style={styles.timelineItem}>
                        <View
                            style={[
                                styles.timelineIcon,
                                {
                                    backgroundColor: "#000000",
                                },
                            ]}
                        >
                            <Ionicons
                                name="hourglass"
                                size={19}
                                color="#FFFFFF"
                            />
                        </View>

                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>
                                Under Review
                            </Text>

                            <Text style={styles.timelineDescription}>
                                We are reviewing your complaint.
                            </Text>
                        </View>
                    </View>

                    {/* PENDING RESOLUTION */}

                    <View
                        style={[
                            styles.timelineItem,
                            {
                                marginBottom: 0,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.timelineIcon,
                                {
                                    backgroundColor: complaint.status == "Closed" ? "#000000" : "#F0F1F4",
                                },
                            ]}
                        >
                            <Ionicons
                                name="chatbubble-ellipses"
                                size={16}
                                color={complaint.status == "Closed" ? "#F0F1F4" : "#000000"}
                            />
                        </View>

                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>
                                {complaint.status == "Closed" ? "Complaint Closed." : "Pending Resolution"}
                            </Text>

                            <Text style={styles.timelineDescription}>
                                {complaint.status == "Closed" ? "Please view the reply from our team for more details." : "Our team will get back to you soon."}Our team will get back to you soon.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 30,
    },

    // DETAILS CARD

    detailsCard: {
        borderWidth: 1,
        borderColor: "#DCE2E8",
        borderRadius: 16,

        paddingHorizontal: 12,
        paddingTop: 7,
        paddingBottom: 14,

        backgroundColor: "#FFFFFF",

        marginBottom: 14,
    },

    detailSection: {
        paddingHorizontal: 6,
        paddingVertical: 7,

        borderBottomWidth: 1,
        borderBottomColor: "#EEF0F2",
    },

    label: {
        fontSize: 12,
        color: "#676771",

        marginBottom: 5,
    },

    value: {
        fontSize: 14,
        color: "#0000",
        fontWeight: "600",

        marginBottom: 4,
    },

    date: {
        fontSize: 12,
        color: "#5A5859",
    },

    description: {
        fontSize: 14,
        lineHeight: 16,

        color: "#000000",
        fontWeight: "500",
    },


    // PHOTOS

    photoWrapper: {
        width: 80,
        height: 80,

        borderRadius: 10,

        overflow: "hidden",

        marginRight: 12,
    },

    photo: {
        width: "100%",
        height: "100%",
    },

    // TIMELINE

    timelineCard: {
        borderWidth: 1,
        borderColor: "#DCE2E8",

        borderRadius: 16,

        paddingHorizontal: 10,
        paddingVertical: 13,

        backgroundColor: "#FFFFFF",

        position: "relative",
    },

    timelineLine: {
        position: "absolute",

        left: 24,

        top: 42,
        bottom: 43,

        width: 1,

        backgroundColor: "#DDE1E5",
    },

    timelineItem: {
        flexDirection: "row",

        minHeight: 64,

        marginBottom: 20,
    },

    timelineIcon: {
        width: 35,
        height: 35,

        borderRadius: 999,

        justifyContent: "center",
        alignItems: "center",

        zIndex: 2,
    },

    timelineContent: {
        flex: 1,

        marginLeft: 10,

        paddingTop: 1,
    },

    timelineTitle: {
        fontSize: 14,
        color: "#000000",
        fontWeight: "600",

        marginBottom: 3,
    },

    timelineDescription: {
        fontSize: 12,
        color: "#5A5859",

        lineHeight: 14,
    },

    timelineDate: {
        fontSize: 12,
        color: "#5A5859",

        marginTop: 2,
    },
});

export default ViewComplaint;
