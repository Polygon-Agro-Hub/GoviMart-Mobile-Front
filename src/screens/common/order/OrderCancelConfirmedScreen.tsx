import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
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
  productPrice?: number;
  unitPrice?: number; // base product price when productPrice isn't passed
  packingFee?: number;
  serviceFee?: number;
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
   Helpers
--------------------------------------------------------- */

// Package price = (productPrice | unitPrice) + packingFee + serviceFee
const getPackageUnitPrice = (pkg: PackageItem): number =>
  Number(pkg.productPrice ?? pkg.unitPrice ?? 0) +
  Number(pkg.packingFee ?? 0) +
  Number(pkg.serviceFee ?? 0);

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isConfirmed = useMemo(
    () => confirmText.trim().toUpperCase() === "CANCEL",
    [confirmText],
  );

  // Total package count = sum of quantities (e.g. 2 + 1 = 3)
  const packagesCount = packages.reduce(
    (sum, p) => sum + (Number(p.qty) || 0),
    0,
  );

  const packagesTotal = packages.reduce(
    (sum, p) => sum + p.qty * getPackageUnitPrice(p),
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
     An order can be split: Credit + Card, or Credit + Cash.
     Each part is shown on its own line.
       - Credit: as passed (DB creditPaid).
       - Card: as passed, else (card order) total - credit.
       - Cash due: as passed, else (cash/COD order) total - credit.
  --------------------------------------------------------- */

  const method = (paymentMethod || "").toLowerCase();

  // Credit can never exceed the order total
  const totalPaidCredit = Math.min(
    Number(passedTotalPaidCredit ?? 0),
    processOrderTotal,
  );

  // Amount left after credit has been applied
  const remainingAfterCredit = Math.max(0, processOrderTotal - totalPaidCredit);

  // Fully covered by credit -> no card / cash line at all
  const isFullyPaidByCredit =
    processOrderTotal > 0 && remainingAfterCredit === 0;

  const totalPaidCard = isFullyPaidByCredit
    ? 0
    : passedTotalPaidCard !== undefined
      ? Math.min(Number(passedTotalPaidCard), remainingAfterCredit)
      : method === "card"
        ? remainingAfterCredit
        : 0;

  const totalCashDue = isFullyPaidByCredit
    ? 0
    : passedTotalCashDue !== undefined
      ? Math.min(Number(passedTotalCashDue), remainingAfterCredit)
      : method.includes("cash") || method === "cod"
        ? remainingAfterCredit
        : 0;

  // Cash isn't paid yet, so only card + credit are refunded as credit.
  // Capped so it can never exceed the order total.
  const refundCreditAmount = Math.min(
    passedRefundCreditAmount !== undefined
      ? Number(passedRefundCreditAmount)
      : totalPaidCard + totalPaidCredit,
    processOrderTotal,
  );

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

  // 1250 -> "1,250.00", 1234567.5 -> "1,234,567.50"
  const formatPrice = (value: number | string | null | undefined): string => {
    const num = Number(value ?? 0);
    if (!isFinite(num)) return "0.00";
    const [intPart, decPart] = num.toFixed(2).split(".");
    return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decPart}`;
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
        keyboardVerticalOffset={20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
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
              title={`Packages (${String(packagesCount).padStart(2, "0")})`}
            >
              {packages.map((pkg, idx) => {
                const unitPrice = getPackageUnitPrice(pkg);
                return (
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
                          Rs. {formatPrice(unitPrice)}
                          {pkg.qty > 1
                            ? ` x ${pkg.qty} = Rs. ${formatPrice(unitPrice * pkg.qty)}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
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
                          Rs. {formatPrice(item.price)}
                        </Text>
                        {item.originalPrice != null &&
                          item.originalPrice > item.price + 0.001 && (
                            <Text className="text-[12px] text-[#B0B0B0] line-through ml-2">
                              Rs. {formatPrice(item.originalPrice)}
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
                  Rs. {formatPrice(totalPaidCard)}
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
                  Rs. {formatPrice(totalPaidCredit)}
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
                  Rs. {formatPrice(totalCashDue)}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-[#ECECEC] my-1" />

            {/* Grand Total */}
            <View className="flex-row justify-between pt-2">
              <Text className="text-[15px] font-bold text-black">Total</Text>
              <Text className="text-[16px] font-bold text-black">
                Rs. {formatPrice(processOrderTotal)}
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
                  Rs. {formatPrice(refundCreditAmount)}
                </Text>{" "}
                will be added to your credit balance. You can use it for your
                next purchase.
              </Text>
            </View>
          )}

          {/* Confirm input */}
          <View className="mx-5 mt-6 border border-black rounded-2xl p-4">
            <View className="flex-row">
              <FontAwesome6 name="lock" size={20} color="#000" />
              <View className="ml-2 flex-1">
                <Text className="text-[14px] font-bold text-black">
                  To cancel this order
                </Text>
                <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                  Type <Text className="font-bold text-black">"CANCEL"</Text> in
                  the box below to confirm.
                </Text>
              </View>
            </View>

            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type “CANCEL”"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              autoCorrect={false}
              className="mt-4 border rounded-full px-4 py-3 text-[14px] text-center font-semibold border-[#E11D48] text-black"
            />
          </View>
        </ScrollView>

        {/* Fixed bottom action */}
        <View
          className={`px-5 bg-white ${
            keyboardVisible ? "pt-2 pb-2" : "pt-3 pb-5"
          }`}
        >
          <TouchableOpacity
            onPress={onCancelOrder}
            disabled={!isConfirmed || loading}
            activeOpacity={0.85}
            className={`rounded-full py-4 items-center ${
              isConfirmed ? "bg-[#E11D48]" : "bg-[#7F919C]"
            }`}
            style={{
              shadowColor: "#000000",
              shadowOpacity: 0.2,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
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
