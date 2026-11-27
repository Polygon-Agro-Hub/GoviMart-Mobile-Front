import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

type TermsConditionsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TermsConditions"
>;

interface TermsConditionsProps {
  navigation: TermsConditionsNavigationProp;
}

/* ----------------------------- Types ----------------------------- */
type Block = {
  title?: string;
  body?: string;
  bullets?: { bold: string; text: string }[];
  note?: { title: string; body: string; highlight?: string };
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
      "In these Terms, the following capitalized terms have the meanings set forth below:",
    blocks: [
      {
        title: "“App”",
        body: "Refers to the Polygon mobile software application made available via iOS App Store and other authorized platforms.",
      },
      {
        title: "“User, you, or your”",
        body: "Refers to any registered individual or business entity that browses, orders, or interacts through the App.",
      },
      {
        title: "“Products”",
        body: "Refers to fresh vegetables, farm fruits, essentials, curated subscription boxes, and packaged goods sold via the platform.",
      },
      {
        title: "“Polygon Wallet”",
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
          title: "Please Note :",
          body: "As stated inside the App: You must carefully select your current city during your first order, ",
          highlight:
            "as you will not be able to change it until after your first successful delivery.",
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
        body: "The App and products are provided “as is” without warranties of uninterrupted service or error-free availability.",
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
  <View className="flex-row items-center mb-2">
    <View className="bg-[#DCFCE7] rounded-full w-6 h-6 items-center justify-center mr-2.5">
      <Text className="text-[#15803D] text-[10px] font-bold">{number}</Text>
    </View>
    <Text className="flex-1 text-base font-bold text-[#111C2D]">{title}</Text>
  </View>
);

/* Outer container — fill #EEF3FF @ 80%, no border, radius 16, padding 14, gap 10 */
const CardContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <View
    className="rounded-2xl"
    style={{
      backgroundColor: "rgba(238, 243, 255, 0.8)",
      padding: 14,
      gap: 10,
    }}
  >
    {children}
  </View>
);

/* Inner white card */
const BlockCard: React.FC<{ block: Block }> = ({ block }) => {
  if (block.note) {
    return (
      <View className="bg-[#E9F9EF] border border-[#BBF0CF] rounded-xl p-3.5 flex-row items-start">
        <Ionicons
          name="information-circle"
          size={16}
          color="#166534"
          style={{ marginTop: 1 }}
        />
        <View className="flex-1 ml-2">
          <Text className="text-xs font-bold text-[#10B981] mb-1.5">
            {block.note.title}
          </Text>
          <Text className="text-xs font-semibold text-[#166534] leading-5">
            {block.note.body}
            {block.note.highlight ? (
              <Text className="font-bold underline">
                {block.note.highlight}
              </Text>
            ) : null}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className="bg-white rounded-xl p-3.5"
      style={{
        shadowColor: "#1E3A8A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {block.title ? (
        <Text className="text-[13px] font-bold text-[#111C2D] mb-1">
          {block.title}
        </Text>
      ) : null}

      {block.body ? (
        <Text className="text-xs text-[#494A65] font-medium leading-[18px]">
          {block.body}
        </Text>
      ) : null}

      {block.bullets?.map((b, i) => (
        <View key={i} className="flex-row items-start mt-1">
          <Text className="text-xs text-[#494A65] leading-[18px] mr-2">•</Text>
          <Text className="flex-1 text-xs text-[#494A65] font-medium leading-[18px]">
            <Text className="text-[#111C2D] font-bold">{b.bold}</Text>
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
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          paddingTop: 8,
        }}
      >
        {/* Intro Card */}
        <View className="bg-[#EEF3FF] border border-[#E4EBF2] rounded-2xl p-4 mb-5">
          <Text className="text-3xl font-bold text-[#111C2D] mb-3">
            Terms & Conditions for Polygon
          </Text>

          {/* Date Pills */}
          <View className="flex-row flex-wrap mb-3">
            <View className="flex-row items-center bg-white rounded-full px-3 py-1.5 mr-2 mb-2">
              <Ionicons name="calendar-outline" size={14} color="#1E3A8A" />
              <Text className="text-xs text-[#494A65] font-medium ml-1.5">
                <Text className="font-bold text-[#494A65]">
                  Effective Date :{" "}
                </Text>
                September 22, 2026
              </Text>
            </View>

            <View className="flex-row items-center bg-white rounded-full px-3 py-1.5 mb-2">
              <Ionicons name="calendar-outline" size={14} color="#1E3A8A" />
              <Text className="text-xs text-[#494A65] font-medium ml-1.5">
                <Text className="font-bold text-[#494A65]">
                  Last Updated :{" "}
                </Text>
                September 22, 2026
              </Text>
            </View>
          </View>

          <Text className="text-[11px] text-black font-medium leading-5 mb-2.5">
            Welcome to Polygon. These Terms and Conditions ("Terms") govern your
            access to and use of the Polygon mobile application (the "App") and
            the services provided through it (collectively, the "Services").
          </Text>
          <Text className="text-[11px] text-black font-medium leading-5 mb-2.5">
            The App and Services are operated by Polygon Holdings (Pvt) Ltd
            ("Polygon," "we," "us," or "our"), located at No. 46/42, Nawam
            Mawatha, Colombo 02, Sri Lanka.
          </Text>
          <Text className="text-[11px] text-black font-medium leading-5">
            By registering for an account, accessing, or using the App, you
            agree to be bound by these Terms. If you do not agree to these
            Terms, you must not use the App. Your use of the App is also
            governed by our Privacy Policy, which is incorporated into these
            Terms by reference.
          </Text>
        </View>

        {/* Sections 01 - 11 */}
        {SECTIONS.map((section) => (
          <View key={section.number} className="mb-6">
            <SectionHeader number={section.number} title={section.title} />
            {section.intro ? (
              <Text className="text-[13px] text-[#494A65] font-medium leading-5 mb-3">
                {section.intro}
              </Text>
            ) : null}

            <CardContainer>
              {section.blocks.map((block, idx) => (
                <BlockCard key={idx} block={block} />
              ))}
            </CardContainer>
          </View>
        ))}

        {/* 12 Contact Us */}
        <View className="mb-6">
          <SectionHeader number="12" title="Contact Us" />
          <Text className="text-[13px] text-[#494A65] font-medium leading-5 mb-3">
            If you have questions, feedback, or legal inquiries regarding these
            Terms and Conditions, please contact us at:
          </Text>

        
            <View className="flex-row">
              {/* Email Button */}
              <TouchableOpacity
                onPress={handleEmailPress}
                activeOpacity={0.8}
                className="bg-black rounded-xl flex-1 py-3.5 px-3 flex-row items-center justify-center mr-2"
              >
                <Ionicons name="mail-outline" size={16} color="white" />
                <Text className="text-white font-semibold text-xs ml-2">
                  info@polygon.lk
                </Text>
              </TouchableOpacity>

              {/* Phone Button */}
              <TouchableOpacity
                onPress={handlePhonePress}
                activeOpacity={0.8}
                className="bg-white border border-[#E4EBF2] rounded-xl flex-1 py-3.5 px-3 flex-row items-center justify-center shadow-sm"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#E4EBF2",
                  borderWidth: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Ionicons name="call-outline" size={16} color="black" />
                <Text className="text-black font-semibold text-xs ml-2">
                  011 431 3433
                </Text>
              </TouchableOpacity>
            </View>

            {/* Physical Office Card */}
            <View className="bg-white rounded-xl p-3.5 flex-row mt-3 items-start">
              <FontAwesome
                name="building"
                size={20}
                color="black"
                style={{ marginTop: 2 }}
              />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-[#64748B] font-medium">
                  Physical Office
                </Text>
                <Text className="text-xs text-[#111C2D]  mt-0.5 leading-5">
                  No. 46/42, Nawam Mawatha, Colombo 02, Sri Lanka
                </Text>
              </View>
            </View>
          
        </View>
      </ScrollView>
    </View>
  );
};

export default TermsConditionsScreen;