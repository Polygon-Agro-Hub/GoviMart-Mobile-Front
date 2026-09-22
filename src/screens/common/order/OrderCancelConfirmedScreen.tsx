import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import orderService from "@/services/order/order.service";

type Props = StackScreenProps<RootStackParamList, "OrderCancelConfirmation">;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type PackageItem = {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  qty: number;
  unitPrice: number;
};

type AlaCarteItem = {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  weight: string; // e.g. "500 g", "2 kg"
  price: number;
  originalPrice?: number; // shown struck-through if discounted
};

/* ---------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------- */

const ItemAvatar: React.FC<{ icon?: string; image?: string }> = ({
  icon,
  image,
}) =>
  image ? (
    <Image
      source={{ uri: image }}
      className="w-12 h-12 rounded-full bg-[#F5F5F5]"
    />
  ) : (
    <View className="w-12 h-12 rounded-full bg-[#F5F5F5] items-center justify-center">
      <Text style={{ fontSize: 22 }}>{icon || "📦"}</Text>
    </View>
  );

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View className="mx-5 mt-4 border border-[#EEEEEE] rounded-2xl px-4 pt-4 pb-1">
    <Text className="text-[13px] font-bold text-black mb-2">{title}</Text>
    {children}
  </View>
);

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const OrderCancelConfirmation: React.FC<Props> = ({ navigation, route }) => {
  const {
    orderId,
    processOrderId,
    packages: passedPackages,
    alaCarteItems: passedAlaCarte,
    totalPaid: passedTotalPaid,
    totalPaidCard: passedTotalPaidCard,
    totalPaidCredit: passedTotalPaidCredit,
    totalCashDue: passedTotalCashDue,
    processOrderTotal: passedProcessOrderTotal,
    paymentMethod,
    refundCreditAmount: passedRefundCreditAmount,
  } = route.params || {};

  const packages: PackageItem[] =
    passedPackages && passedPackages.length > 0 ? passedPackages : [];
  const alaCarteItems: AlaCarteItem[] =
    passedAlaCarte && passedAlaCarte.length > 0 ? passedAlaCarte : [];

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const isConfirmed = useMemo(
    () => confirmText.trim().toUpperCase() === "CANCEL",
    [confirmText],
  );

  const packagesTotal = packages.reduce(
    (sum, p) => sum + p.qty * p.unitPrice,
    0,
  );
  const alaCarteTotal = alaCarteItems.reduce((sum, i) => sum + i.price, 0);
  const calculatedOrderTotal = packagesTotal + alaCarteTotal;

  const processOrderTotal =
    passedProcessOrderTotal !== undefined && passedProcessOrderTotal > 0
      ? passedProcessOrderTotal
      : passedTotalPaid !== undefined && passedTotalPaid > 0
        ? passedTotalPaid
        : calculatedOrderTotal;

  /* ---------------------------------------------------------
     Payment breakdown
     IMPORTANT: `paymentMethod` on the order record reflects the
     method the order was *placed* with, not necessarily what was
     actually charged. A "Card" order can still end up fully paid
     via credit balance (see processorders.creditPaid). So:
       1. Resolve credit paid FIRST, straight from what was passed
          (which should ultimately come from the DB's creditPaid
          column, not from parsing paymentMethod).
       2. Card paid is only ever non-zero when creditPaid is 0 —
          an order is settled by ONE method, never both.
  --------------------------------------------------------- */

  const totalPaidCredit =
    passedTotalPaidCredit !== undefined ? passedTotalPaidCredit : 0;

  const totalPaidCard =
    totalPaidCredit > 0
      ? 0 // credit covered it — never show card paid alongside credit
      : passedTotalPaidCard !== undefined
        ? passedTotalPaidCard
        : paymentMethod &&
            paymentMethod.toLowerCase() === "card"
          ? (passedTotalPaid ?? processOrderTotal)
          : 0;

  const totalCashDue =
    passedTotalCashDue !== undefined
      ? passedTotalCashDue
      : paymentMethod &&
          (paymentMethod.toLowerCase().includes("cash") ||
            paymentMethod.toLowerCase() === "cod")
        ? Math.max(0, processOrderTotal - totalPaidCredit)
        : 0;

  const refundCreditAmount =
    passedRefundCreditAmount !== undefined
      ? passedRefundCreditAmount
      : totalPaidCard + totalPaidCredit;

  const onCancelOrder = async () => {
    if (!isConfirmed || loading) return;
    setLoading(true);
    try {
      if (orderId) {
        await orderService.cancelOrder({
          orderId,
          processOrderId: processOrderId || undefined,
        });
      }
      Alert.alert(
        "Order Cancelled",
        "Your order has been cancelled successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }],
              });
            },
          },
        ],
      );
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      Alert.alert(
        "Cancellation Failed",
        err?.response?.data?.message ||
          "Unable to cancel your order at this moment. Please try again or contact support.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-11 h-11 rounded-full border border-[#EEEEEE] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-[17px] font-semibold text-black mr-11">
          Order Cancel Confirmation
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Warning banner */}
          <View className="mx-5 mt-2 bg-[#FDECEC] rounded-2xl p-4 flex-row">
            <Ionicons
              name="warning"
              size={18}
              color="#E11D48"
              style={{ marginTop: 2 }}
            />
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-[#E11D48]">
                You are about to cancel this order.
              </Text>
              <Text className="text-[13px] text-[#E11D48] mt-0.5">
                {refundCreditAmount > 0
                  ? "This order has been paid. Refund will be converted to your credit balance."
                  : "This order will be cancelled immediately."}
              </Text>
            </View>
          </View>

          {/* Packages */}
          {packages.length > 0 && (
            <SectionCard
              title={`Packages (${String(packages.length).padStart(2, "0")})`}
            >
              {packages.map((pkg, idx) => (
                <View key={pkg.id}>
                  {idx > 0 && <View className="h-[1px] bg-[#ECECEC] my-3" />}
                  <View className="flex-row items-center pb-3">
                    <ItemAvatar icon={pkg.icon} image={pkg.image} />
                    <View className="ml-3">
                      <Text className="text-[15px] font-bold text-black">
                        {pkg.name}{" "}
                        <Text className="text-[13px] font-normal text-[#8A8A8A]">
                          (x{pkg.qty})
                        </Text>
                      </Text>
                      <Text className="text-[13px] text-black mt-0.5">
                        Rs. {pkg.unitPrice.toFixed(2)}
                        {pkg.qty > 1
                          ? ` x ${pkg.qty} = Rs. ${(
                              pkg.unitPrice * pkg.qty
                            ).toFixed(2)}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Ala Carte Items */}
          {alaCarteItems.length > 0 && (
            <SectionCard
              title={`Ala Carte Items (${String(alaCarteItems.length).padStart(
                2,
                "0",
              )})`}
            >
              {alaCarteItems.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View className="h-[1px] bg-[#ECECEC] my-3" />}
                  <View className="flex-row items-center pb-3">
                    <ItemAvatar icon={item.icon} image={item.image} />
                    <View className="ml-3">
                      <Text className="text-[15px] font-bold text-black">
                        {item.name}
                      </Text>
                      <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                        {item.weight}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-[13px] font-bold text-black">
                          Rs. {item.price.toFixed(2)}
                        </Text>
                        {item.originalPrice && (
                          <Text className="text-[12px] text-[#B0B0B0] line-through ml-2">
                            Rs. {item.originalPrice.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Totals Summary */}
          <View className="mx-5 mt-6 border border-[#EEEEEE] rounded-2xl p-4 bg-white">
            <Text className="text-[14px] font-bold text-black mb-3">
              Payment Summary
            </Text>

            {/* Total Paid with Card (if any) */}
            {totalPaidCard > 0 && (
              <View className="flex-row justify-between pb-2.5">
                <Text className="text-[14px] text-[#4A4A4A]">
                  Total Paid with Card
                </Text>
                <Text className="text-[14px] font-semibold text-black">
                  Rs. {totalPaidCard.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Total Paid with Credit (if any) */}
            {totalPaidCredit > 0 && (
              <View className="flex-row justify-between pb-2.5">
                <Text className="text-[14px] text-[#4A4A4A]">
                  Total Paid with Credit
                </Text>
                <Text className="text-[14px] font-semibold text-black">
                  Rs. {totalPaidCredit.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Total Cash Due (if any) */}
            {totalCashDue > 0 && (
              <View className="flex-row justify-between pb-2.5">
                <Text className="text-[14px] text-[#000000]">
                  Total Cash Due
                </Text>
                <Text className="text-[14px] font-semibold text-[#000000]">
                  Rs. {totalCashDue.toFixed(2)}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-[#ECECEC] my-1" />

            {/* Grand Total */}
            <View className="flex-row justify-between pt-2">
              <Text className="text-[15px] font-bold text-black">Total</Text>
              <Text className="text-[16px] font-bold text-black">
                Rs. {processOrderTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Credit info component */}
          {refundCreditAmount > 0 && (
            <View className="mx-5 mt-6 bg-[#EAF9EE] border border-[#A6F4C5] rounded-3xl p-5 items-center">
              <View className="w-12 h-12 rounded-full bg-[#22C55E] items-center justify-center">
                <Ionicons name="wallet" size={22} color="#fff" />
              </View>
              <Text className="text-[15px] font-bold text-[#15803D] mt-3 text-center">
                Amount will be credited to your credit balance
              </Text>
              <Text className="text-[13px] text-[#3F7A50] text-center mt-2 leading-5">
                After canceling, the full converted amount of{" "}
                <Text className="font-bold text-[#15803D]">
                  Rs. {refundCreditAmount.toFixed(2)}
                </Text>{" "}
                will be added to your credit balance. You can use it for your
                next purchase.
              </Text>
            </View>
          )}

          {/* Confirm input */}
          <View className="mx-5 mt-6 border border-black rounded-2xl p-4">
            <View className="flex-row">
              <Ionicons name="lock-closed" size={18} color="#000" />
              <View className="ml-2 flex-1">
                <Text className="text-[14px] font-bold text-black">
                  To cancel this order
                </Text>
                <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                  Type <Text className="font-bold text-black">CANCEL</Text> in
                  the box below to confirm.
                </Text>
              </View>
            </View>

            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="CANCEL"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              autoCorrect={false}
              className={`mt-4 border rounded-full px-4 py-3 text-[14px] text-center font-semibold ${
                isConfirmed
                  ? "border-[#22C55E] text-[#15803D]"
                  : "border-[#E11D48] text-black"
              }`}
            />
          </View>
        </ScrollView>

        {/* Fixed bottom action */}
        <View className="px-5 pb-5 pt-3 bg-white border-t border-[#F0F0F0]">
          <TouchableOpacity
            onPress={onCancelOrder}
            disabled={!isConfirmed || loading}
            activeOpacity={0.85}
            className={`rounded-2xl py-4 items-center ${
              isConfirmed ? "bg-[#E11D48]" : "bg-[#F3A9B4]"
            }`}
          >
            <Text className="text-white text-[16px] font-bold">
              {loading ? "Cancelling..." : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OrderCancelConfirmation;