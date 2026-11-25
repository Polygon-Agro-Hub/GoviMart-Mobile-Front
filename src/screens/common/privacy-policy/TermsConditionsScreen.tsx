import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
  StyleSheet,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import { Ionicons } from "@expo/vector-icons";

type TermsConditionsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TermsConditions"
>;

interface TermsConditionsProps {
  navigation: TermsConditionsNavigationProp;
}

/* ----------------------------- Theme ----------------------------- */
const COLORS = {
  primary: "#1E3A8A",
  text: "#374151",
  heading: "#111827",
  cardBg: "#F3F6FF",
  cardBorder: "#E2E8F8",
  badgeBg: "#DCFCE7",
  badgeText: "#15803D",
  noteBg: "#ECFDF5",
  noteBorder: "#BBF7D0",
  noteTitle: "#166534",
  white: "#FFFFFF",
};

/* ----------------------------- Types ----------------------------- */
type Block = {
  title?: string;
  body?: string;
  bullets?: { bold: string; text: string }[];
  note?: { title: string; body: string };
};

type Section = {
  number: string;
  title: string;
  intro?: string;
  blocks: Block[];
};

/* ----------------------------- Content ----------------------------- */
const SECTIONS: Section[] = [
  {
    number: "01",
    title: "Definitions",
    intro:
      'In these Terms, the following capitalized terms have the meanings set forth below:',
    blocks: [
      {
        title: '"App"',
        body: "Refers to the Polygon mobile software application made available via iOS App Store and other authorized platforms.",
      },
      {
        title: '"User, you, or your"',
        body: "Refers to any registered individual or business entity that browses, orders, or interacts through the App.",
      },
      {
        title: '"Products"',
        body: "Refers to fresh vegetables, farm fruits, essentials, curated subscription boxes, and packaged goods sold via the platform.",
      },
      {
        title: '"Polygon Wallet"',
        body: "An integrated in-app stored value system enabling instant refunds, loyalty credits, and seamless checkout payments.",
      },
    ],
  },
  {
    number: "02",
    title: "Eligibility & Accounts",
    intro:
      "Users must register a verified personal profile to make purchases, redeem vouchers, and manage active deliveries.",
    blocks: [
      {
        title: "2.1 Age Requirement",
        body: "You must be at least 18 years of age (or legal age of majority in your jurisdiction) to enter into binding purchase contracts.",
      },
      {
        title: "2.2 Account Types & Verification",
        body: "You agree to provide true, accurate, and up-to-date mobile contact information and residential address during onboarding.",
      },
      {
        title: "2.3 Account Security",
        body: "You are solely responsible for maintaining the confidentiality of your credentials and all activities occurring under your account.",
      },
      {
        title: "2.4 Account Deletion",
        body: "You may request the deletion of your account and personal profile at any time through the App settings or by contacting customer support.",
      },
    ],
  },
  {
    number: "03",
    title: "Location Services & Delivery",
    intro:
      "Polygon utilizes location telemetry and designated service hubs to ensure items arrive fresh and on schedule.",
    blocks: [
      {
        title: "3.1 Location Data",
        body: "Real-time GPS permissions are requested to match your address with our nearest fulfillment hub and calculate live driver ETA.",
      },
      {
        title: "3.2 City Selection",
        body: "Orders are bound to designated regional coverage zones. Ensure you select your current residential municipal boundary accurately.",
      },
      {
        note: {
          title: "Please Note:",
          body: "As stated inside the App: You must carefully select your current city during your first order, as you will not be able to change it until after your first successful delivery.",
        },
      },
    ],
  },
  {
    number: "04",
    title: "Products & Pricing",
    intro:
      "We pride ourselves on direct farm-to-table quality, accurate grading, and transparent pricing across all listed lines.",
    blocks: [
      {
        title: "4.1 Sourcing & Freshness",
        body: "Farm produce weight and sizing can naturally vary. Polygon guarantees weight ranges within standard industry margins.",
      },
      {
        title: "4.2 Pricing Structure",
        body: "Prices are displayed in Sri Lankan Rupees (LKR) and include applicable taxes unless specifically delineated at final checkout.",
      },
      {
        title: "4.3 Catalog Accuracy",
        body: "In the event of an unintended typographical pricing mistake, Polygon reserves the right to cancel or amend unfulfilled orders.",
      },
    ],
  },
  {
    number: "05",
    title: "Payments",
    intro:
      "Polygon offers flexible and secure checkout methods for quick and hassle-free grocery procurement.",
    blocks: [
      {
        title: "5.1 Accepted Payment Methods",
        bullets: [
          { bold: "Cash on Delivery (COD)", text: " upon doorstep handover." },
          {
            bold: "Cash on Pickup",
            text: " from authorized Distribution Centres.",
          },
          {
            bold: "Online Cards (Visa & Mastercard)",
            text: " processed via Payments.lk.",
          },
          {
            bold: "Polygon Wallet",
            text: " using available in-app balance.",
          },
        ],
      },
      {
        title: "5.2 Payment Gateway Fee",
        body: "Third-party payment gateways (e.g., Payments.lk) may apply standard bank merchant surcharges or settlement fees.",
      },
      {
        title: "5.3 Fraud Prevention",
        body: "We maintain real-time automated fraud detection. Questionable or unverified card transactions will be held or refunded immediately.",
      },
    ],
  },
  {
    number: "06",
    title: "Refunds, Returns & Wallet",
    intro:
      "Due to the perishable nature of agricultural produce, special refund and claim guidelines apply to maintain food safety standards.",
    blocks: [
      {
        title: "6.1 Refund Method",
        body: "Approved quality claims are credited immediately back to your Polygon Wallet or reversed to your card within 5–7 business days.",
      },
      {
        title: "6.2 Cancellations & Handling Fees",
        body: "Orders already packed or out for delivery may not be cancelled without an applicable restocking and perishability deduction fee.",
      },
      {
        title: "6.3 Wallet Expiration & Fees",
        body: "Polygon Wallet funds never expire and bear zero inactivity or maintenance fees while your account remains active.",
      },
      {
        title: "6.4 Chargebacks & Disputes",
        body: "Please notify our support hotline regarding discrepancies prior to filing formal bank payment disputes to expedite resolutions.",
      },
    ],
  },
  {
    number: "07",
    title: "Intellectual Property",
    intro:
      "All proprietary rights, software code, graphic elements, trademarks, and service names are protected under Sri Lankan and international IP law.",
    blocks: [
      {
        title: "7.1 Proprietary Ownership",
        body: "All rights, title, and interest in the App, including logos, visual interface, and algorithms belong solely to Polygon Holdings (Pvt) Ltd.",
      },
      {
        title: "7.2 Limited End-User License",
        body: "We grant you a personal, revocable, non-exclusive, non-transferable license to install and run the App strictly for personal grocery ordering.",
      },
    ],
  },
  {
    number: "08",
    title: "User Conduct & Prohibited Activities",
    intro:
      "You agree to utilize Polygon in complete compliance with applicable laws, ethical trading principles, and respectful community standards.",
    blocks: [
      {
        title: "Prohibited Conduct",
        body: "You may not engage in reverse engineering, fraudulent promotion claims, multiple account exploitation, harassment of delivery agents, or data scraping.",
      },
      {
        title: "Enforcement & Suspension",
        body: "Polygon reserves the unconditional right to suspend, terminate, or ban accounts caught abusing discount vouchers or fabricating refund incidents.",
      },
    ],
  },
  {
    number: "09",
    title: "Liability & Warranties",
    intro:
      "Please review the following disclaimers regarding service uptime, operational guarantees, and liability limits.",
    blocks: [
      {
        title: "9.1 Indemnification",
        body: "You agree to defend, indemnify, and hold harmless Polygon against claims, damages, and expenses arising from your violation of these Terms.",
      },
      {
        title: "9.2 Disclaimer of Warranties",
        body: 'The App and products are provided "as is" without warranties of uninterrupted service or error-free availability.',
      },
      {
        title: "9.3 Limitation of Liability",
        body: "Polygon's total cumulative liability for any verified claim shall not exceed the total price paid by you for the specific affected order.",
      },
    ],
  },
  {
    number: "10",
    title: "Governing Law & Disputes",
    intro:
      "These Terms are construed in accordance with the legal framework and commercial statutes of the Democratic Socialist Republic of Sri Lanka.",
    blocks: [
      {
        title: "10.1 Applicable Jurisdiction",
        body: "Any legal proceedings, actions, or court enforcement arising out of these Terms shall be instituted exclusively in courts in Colombo, Sri Lanka.",
      },
      {
        title: "10.2 Amicable Resolution",
        body: "Parties agree to seek an informal resolution in good faith via direct customer arbitration prior to filing formal litigation.",
      },
    ],
  },
  {
    number: "11",
    title: "Modifications to Terms",
    intro:
      "We may update or amend our Terms & Conditions periodically to reflect regulatory adjustments, technological updates, or new feature rollouts.",
    blocks: [
      {
        body: "Substantial revisions will be announced via in-app push notification or banner appeals. Continued use of the App following any update constitutes full acceptance of revised terms.",
      },
    ],
  },
];

/* ----------------------------- Small components ----------------------------- */
const SectionHeader: React.FC<{ number: string; title: string }> = ({
  number,
  title,
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{number}</Text>
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const BlockCard: React.FC<{ block: Block }> = ({ block }) => {
  if (block.note) {
    return (
      <View style={styles.noteBox}>
        <View style={styles.noteHeader}>
          <Ionicons
            name="information-circle"
            size={16}
            color={COLORS.noteTitle}
          />
          <Text style={styles.noteTitle}>{block.note.title}</Text>
        </View>
        <Text style={styles.noteBody}>{block.note.body}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {block.title ? <Text style={styles.cardTitle}>{block.title}</Text> : null}
      {block.body ? <Text style={styles.cardBody}>{block.body}</Text> : null}
      {block.bullets?.map((b, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.cardBody}>
            <Text style={styles.bold}>{b.bold}</Text>
            {b.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

/* ----------------------------- Screen ----------------------------- */
const TermsConditionsScreen: React.FC<TermsConditionsProps> = ({
  navigation,
}) => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:info@polygon.lk");
  };

  const handlePhonePress = () => {
    Linking.openURL("tel:0114313433");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          paddingTop: 8,
        }}
      >
        {/* Intro card */}
        <View style={styles.introCard}>
          <Text style={styles.mainTitle}>Terms & Conditions for Polygon</Text>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={styles.dateText}>
              <Text style={styles.bold}>Effective Date : </Text>September 22,
              2026
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.primary} />
            <Text style={styles.dateText}>
              <Text style={styles.bold}>Last Updated : </Text>September 22, 2026
            </Text>
          </View>

          <Text style={[styles.cardBody, styles.introSpacing]}>
            Welcome to Polygon. These Terms and Conditions ("Terms") govern your
            access to and use of the Polygon mobile application (the "App") and
            the services provided through it (collectively, the "Services").
          </Text>
          <Text style={[styles.cardBody, styles.introSpacing]}>
            The App and Services are operated by Polygon Holdings (Pvt) Ltd
            ("Polygon," "we," "us," or "our"), located at No. 46/42, Nawam
            Mawatha, Colombo 02, Sri Lanka.
          </Text>
          <Text style={[styles.cardBody, styles.introSpacing]}>
            By registering for an account, accessing, or using the App, you
            agree to be bound by these Terms. If you do not agree to these
            Terms, you must not use the App. Your use of the App is also
            governed by our Privacy Policy, which is incorporated into these
            Terms by reference.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.number} style={styles.section}>
            <SectionHeader number={section.number} title={section.title} />
            {section.intro ? (
              <Text style={styles.sectionIntro}>{section.intro}</Text>
            ) : null}
            {section.blocks.map((block, idx) => (
              <BlockCard key={idx} block={block} />
            ))}
          </View>
        ))}

        {/* 12 Contact Us */}
        <View style={styles.section}>
          <SectionHeader number="12" title="Contact Us" />
          <Text style={styles.sectionIntro}>
            If you have questions, feedback, or legal inquiries regarding these
            Terms and Conditions, please contact us at:
          </Text>

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleEmailPress}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={16} color={COLORS.white} />
              <Text style={styles.emailText}>info@polygon.lk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.phoneButton}
              onPress={handlePhonePress}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={16} color={COLORS.heading} />
              <Text style={styles.phoneText}>011 431 3433</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.officeRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.officeText}>
              <Text style={styles.bold}>Physical Office:{"\n"}</Text>
              No. 46/42, Nawam Mawatha, Colombo 02, Sri Lanka
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  introCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dateText: { fontSize: 13, color: COLORS.text },
  introSpacing: { marginTop: 10 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: COLORS.badgeText },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.heading,
  },
  sectionIntro: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 12,
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 6,
  },
  cardBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  },
  bold: { fontWeight: "700", color: COLORS.heading },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  bulletDot: { fontSize: 14, lineHeight: 20, color: COLORS.primary },

  noteBox: {
    backgroundColor: COLORS.noteBg,
    borderWidth: 1,
    borderColor: COLORS.noteBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  noteTitle: { fontSize: 13, fontWeight: "700", color: COLORS.noteTitle },
  noteBody: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    color: COLORS.noteTitle,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.heading,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emailText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  phoneText: { color: COLORS.heading, fontSize: 13, fontWeight: "600" },

  officeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  officeText: { flex: 1, fontSize: 13, lineHeight: 20, color: COLORS.text },
});

export default TermsConditionsScreen;