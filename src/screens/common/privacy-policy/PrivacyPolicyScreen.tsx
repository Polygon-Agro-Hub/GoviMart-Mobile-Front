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
import CustomHeader from "@/component/common/CustomHeader";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

type PrivacyPolicyNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PrivacyPolicy"
>;

interface PrivacyPolicyProps {
  navigation: PrivacyPolicyNavigationProp;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyProps> = ({ navigation }) => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:info@polygon.lk");
  };

  const handlePhonePress = () => {
    Linking.openURL("tel:0114313433");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <CustomHeader
        title="Privacy Policy"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
        backgroundColor="#FFFFFF"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          paddingTop: 8,
        }}
      >
        {/* Top Header Card */}
        <View
          style={{
            backgroundColor: "#F2F6FF",
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text className="text-2xl font-black text-black mb-3">
            Privacy Policy for Polygon
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-4">
            <View className="bg-white rounded-full px-3 py-1.5 flex-row items-center border border-[#E2E8F0] shadow-sm">
              <Ionicons name="calendar-outline" size={14} color="#5A5859" />
              <Text className="text-xs text-[#5A5859] font-medium ml-1.5">
                Effective Date : September 22, 2026
              </Text>
            </View>

            <View className="bg-white rounded-full px-3 py-1.5 flex-row items-center border border-[#E2E8F0] shadow-sm">
              <Ionicons name="calendar-outline" size={14} color="#5A5859" />
              <Text className="text-xs text-[#5A5859] font-medium ml-1.5">
                Last Updated : September 22, 2026
              </Text>
            </View>
          </View>

          <Text className="text-xs text-[#334155] leading-relaxed mb-3">
            <Text className="font-bold text-black">
              Polygon Holdings PVT Ltd (“we,” “our,” or “us”)
            </Text>{" "}
            operates the Polygon mobile application (the “App”). We are committed
            to protecting your privacy. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use
            our App.
          </Text>

          <Text className="text-xs text-[#334155] leading-relaxed">
            Please read this Privacy Policy carefully. By downloading, accessing,
            or using the App, you agree to the collection and use of information
            in accordance with this policy.
          </Text>
        </View>

        {/* Main White Box (Contains Sections 01 through 09) */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
          }}
        >
          {/* 01: Information We Collect */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">01</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Information We Collect
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed mb-4">
              We collect several types of information to provide and improve our
              services to you, specifically to facilitate the ordering and delivery
              of fresh fruits, vegetables, and curated packages.
            </Text>

            {/* Sub-section A */}
            <View
              style={{
                backgroundColor: "#F2F6FF",
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text className="text-sm font-bold text-black mb-3">
                A. Personal Data Provided by You
              </Text>

              {/* Account Information */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Account Information
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  When you register, we collect your name, mobile number, and email
                  address.
                </Text>
              </View>

              {/* Profile Data */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Profile Data
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We may collect your profile picture and package preferences.
                </Text>
              </View>

              {/* Address & Location Data */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Address & Location Data
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We collect your selected city and specific delivery addresses.
                </Text>
              </View>

              {/* Please Note Callout (2-column: icon on left, text aligned on right) */}
              <View className="bg-[#E8F8EE] rounded-2xl p-4 mb-2.5 border border-[#C6F0D4] flex-row items-start">
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#166534"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1 ml-2.5">
                  <Text className="text-xs font-bold text-[#166534] mb-1">
                    Please Note :
                  </Text>
                  <Text className="text-xs text-[#166534] leading-relaxed">
                    As stated inside the App: You must carefully select your
                    current city,{" "}
                    <Text className="font-bold">
                      as you will not be able to change it until after your first
                      successful delivery.
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Transaction Data */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Transaction Data
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  Details about the products you purchase, your cart contents (Ala
                  Carte items, Packages), and order history.
                </Text>
              </View>

              {/* Payment Information */}
              <View className="bg-white rounded-2xl p-4 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Payment Information
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  If you choose to pay via credit card, your payment details are
                  processed by our secure third-party payment gateways. We do not
                  store your full credit card details on our servers. If you choose
                  Cash on Delivery (COD), we record the transaction amount and
                  delivery status.
                </Text>
              </View>
            </View>

            {/* Sub-section B */}
            <View
              style={{
                backgroundColor: "#F2F6FF",
                borderRadius: 20,
                padding: 16,
              }}
            >
              <Text className="text-sm font-bold text-black mb-3">
                B. Automatically Collected Data
              </Text>

              {/* Device Information */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Device Information
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We may collect information about your mobile device, including the
                  hardware model, operating system version, and unique device
                  identifiers.
                </Text>
              </View>

              {/* Usage Data */}
              <View className="bg-white rounded-2xl p-4 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Usage Data
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  Information on how you interact with the App, such as which
                  categories you browse (Veggies, Fruits, Cereal), search queries,
                  and notification interactions.
                </Text>
              </View>
            </View>
          </View>

          {/* 02: How We Use Your Information */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">02</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                How We Use Your Information
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed mb-4">
              We use the collected information for various purposes, including to:
            </Text>

            <View
              style={{
                backgroundColor: "#F2F6FF",
                borderRadius: 20,
                padding: 16,
              }}
            >
              {/* 1 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Process and Fulfill Orders
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  To process your purchases, manage your 'My Cart,' and facilitate
                  either Pickup from Centre or Delivery to your Location.
                </Text>
              </View>

              {/* 2 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Manage Your Account
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  To manage your profile, update passwords, track your Credit
                  Balance, and manage saved addresses.
                </Text>
              </View>

              {/* 3 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Communicate with You
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  To send you order updates, OTPs, and notifications regarding order
                  processing, delivery status, and 'Action Required' alerts for
                  package finalization.
                </Text>
              </View>

              {/* 4 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Improve Our Services
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  To understand how users interact with the App so we can enhance
                  our product offerings, pricing, and user experience.
                </Text>
              </View>

              {/* 5 */}
              <View className="bg-white rounded-2xl p-4 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Security
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  To verify your identity, prevent fraud, and ensure the security of
                  our App (e.g., enforcing strong password creation).
                </Text>
              </View>
            </View>
          </View>

          {/* 03: Disclosure of Your Information */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">03</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Disclosure of Your Information
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed mb-4">
              We do not sell your personal data. We may share your information in
              the following situations:
            </Text>

            <View
              style={{
                backgroundColor: "#F2F6FF",
                borderRadius: 20,
                padding: 16,
              }}
            >
              {/* 1 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Service Providers
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We share your delivery address and contact number with our delivery
                  drivers to fulfill your order.
                </Text>
              </View>

              {/* 2 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Payment Processors
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We share necessary transaction data with credit card processing
                  partners to complete your purchase.
                </Text>
              </View>

              {/* 3 */}
              <View className="bg-white rounded-2xl p-4 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Legal Requirements
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  We may disclose your information if required to do so by law or
                  in response to valid requests by public authorities.
                </Text>
              </View>
            </View>
          </View>

          {/* 04: Location Data */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">04</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Location Data
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed">
              Polygon requires access to your location to determine if you are
              within our delivery zones and to provide accurate delivery
              estimates. You can enable or disable location services at any time
              through your mobile device settings. However, disabling location
              services may prevent you from using certain features, such as
              selecting your delivery city or receiving deliveries.
            </Text>
          </View>

          {/* 05: Security of Your Data */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">05</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Security of Your Data
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed">
              We use administrative, technical, and physical security measures to
              protect your personal information. We require strong passwords (a
              mix of letters, numbers, and symbols) and store your data on secure
              servers. While we strive to protect your data, no method of
              transmission over the internet is 100% secure.
            </Text>
          </View>

          {/* 06: Your Rights and Choices */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">06</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Your Rights and Choices
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed mb-4">
              Depending on your location, you may have the following rights
              regarding your personal data:
            </Text>

            <View
              style={{
                backgroundColor: "#F2F6FF",
                borderRadius: 20,
                padding: 16,
              }}
            >
              {/* 1 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Access and Update
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  You can review and update your personal information (including
                  password and saved addresses) directly through the 'My Account'
                  section of the App.
                </Text>
              </View>

              {/* 2 */}
              <View className="bg-white rounded-2xl p-4 mb-2.5 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Delete Account
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  You may request the deletion of your account and personal data by
                  contacting us. Please note that we may retain certain
                  transaction records as required by law.
                </Text>
              </View>

              {/* 3 */}
              <View className="bg-white rounded-2xl p-4 border border-[#E8EEF8]">
                <Text className="text-xs font-bold text-black mb-1">
                  Notifications
                </Text>
                <Text className="text-xs text-[#5A5859] leading-relaxed">
                  You can manage your alert preferences via your device's
                  notification settings.
                </Text>
              </View>
            </View>
          </View>

          {/* 07: Children's Privacy */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">07</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Children's Privacy
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed">
              Our App is not intended for use by children under the age of 13 (or
              16 in certain jurisdictions). We do not knowingly collect
              personally identifiable information from children. If we discover
              that a child has provided us with personal information, we will
              delete it immediately.
            </Text>
          </View>

          {/* 08: Changes to This Privacy Policy */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">08</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Changes to This Privacy Policy
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed">
              We may update our Privacy Policy from time to time to reflect changes
              in our practices or for other operational, legal, or regulatory
              reasons. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the 'Last Updated' date.
            </Text>
          </View>

          {/* 09: Contact Us */}
          <View>
            <View className="flex-row items-center mb-2.5">
              <View className="w-8 h-8 rounded-xl bg-[#E8F8EE] items-center justify-center mr-3">
                <Text className="text-xs font-bold text-[#16A34A]">09</Text>
              </View>
              <Text className="text-lg font-bold text-black flex-1">
                Contact Us
              </Text>
            </View>

            <Text className="text-xs text-[#5A5859] leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or
              our data practices, please contact us at:
            </Text>
          </View>
        </View>

        {/* Contact Action Buttons & Office */}
        <View className="mb-6">
          <View className="flex-row items-center">
            {/* Email Button */}
            <TouchableOpacity
              onPress={handleEmailPress}
              activeOpacity={0.8}
              className="bg-black rounded-2xl flex-1 py-3.5 px-3 flex-row items-center justify-center mr-2 shadow-sm"
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
              className="bg-white border border-[#E4EBF2] rounded-2xl flex-1 py-3.5 px-3 flex-row items-center justify-center shadow-sm"
            >
              <Ionicons name="call-outline" size={16} color="black" />
              <Text className="text-black font-semibold text-xs ml-2">
                011 431 3433
              </Text>
            </TouchableOpacity>
          </View>

          {/* Physical Office Card */}
          <View className="bg-white border border-[#E4EBF2] rounded-2xl p-4 flex-row items-start mt-3 shadow-sm">
            <FontAwesome name="building" size={20} color="black" style={{ marginTop: 2 }} />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-[#777A7D] font-medium">
                Physical Office
              </Text>
              <Text className="text-xs text-black font-medium mt-0.5 leading-relaxed">
                No. 46/42, Nawam Mawatha, Colombo 02, Sri Lanka
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PrivacyPolicyScreen;
