import React from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/types";
import CustomHeader from "@/component/common/CustomHeader";

type ViewComplaintNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ViewComplaint"
>;

interface ViewComplaintProps {
    navigation: ViewComplaintNavigationProp;
}

interface ComplaintData {
    id: number;
    category: string;
    description: string;
    sentAt: string;
    photos: string[];
}

const ViewComplaint: React.FC<ViewComplaintProps> = ({
    navigation,
}) => {
    const complaint: ComplaintData = {
        id: 123,
        category: "Payment Failed",
        description:
            "I was charged for the order but the payment failed and the order was not placed. Please check and refund my money.",
        sentAt: "At 11:00AM on July 2, 2026",
        photos: [
            "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300",
            "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=301",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
        ],
    };

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
                            {complaint.id}
                        </Text>

                        <Text style={styles.date}>
                            Sent : {complaint.sentAt}
                        </Text>
                    </View>

                    {/* Category */}

                    <View style={styles.detailSection}>
                        <Text style={styles.label}>
                            Category
                        </Text>

                        <Text style={styles.value}>
                            {complaint.category}
                        </Text>
                    </View>

                    {/* Description */}

                    <View style={styles.detailSection}>
                        <Text style={styles.label}>
                            Description
                        </Text>

                        <Text style={styles.description}>
                            {complaint.description}
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
                            Photos ({complaint.photos.length})
                        </Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingTop: 8,
                            }}
                        >
                            {complaint.photos.map(
                                (photo, index) => (
                                    <TouchableOpacity
                                        key={`${photo}-${index}`}
                                        activeOpacity={0.9}
                                        style={styles.photoWrapper}
                                    >
                                        <Image
                                            source={{ uri: photo }}
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
                            <Ionicons
                                name="paper-plane"
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
                                At 11:00AM on July 2, 2026.
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

                    {/* ================================================= */}
                    {/* PENDING RESOLUTION */}
                    {/* ================================================= */}

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
                                    backgroundColor: "#F0F1F4",
                                },
                            ]}
                        >
                            <Ionicons
                                name="chatbubble-ellipses"
                                size={16}
                                color="#000000"
                            />
                        </View>

                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>
                                Pending Resolution
                            </Text>

                            <Text style={styles.timelineDescription}>
                                Our team will get back to you soon.
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

        marginBottom: 9,
    },

    timelineIcon: {
        width: 30,
        height: 30,

        borderRadius: 15,

        justifyContent: "center",
        alignItems: "center",

        zIndex: 2,
    },

    timelineContent: {
        flex: 1,

        marginLeft: 6,

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