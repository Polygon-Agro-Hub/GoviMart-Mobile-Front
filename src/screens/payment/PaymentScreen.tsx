import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import customerService from "@/services/customer/customer.service";
import orderService from "@/services/order/order.service";
import { clearCart } from "@/store/cartSlice";

type PaymentScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentScreen"
>;

type PaymentScreenRouteProp = RouteProp<
  RootStackParamList,
  "PaymentScreen"
>;

interface Props {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialAmount = route.params?.amount || 0;
  const headerTitle = route.params?.title || "Payment Summery";

  const [subTotal, setSubTotal] = useState<number>(initialAmount);
  const [loading, setLoading] = useState<boolean>(!initialAmount);

  useEffect(() => {
    if (!initialAmount) {
      const fetchBalance = async () => {
        try {
          setLoading(true);
          const response = await customerService.getAccountDetails();
          if (response.data && response.data.data) {
            const rawBalance = Number(response.data.data.creditBalance || 0);
            setSubTotal(Math.abs(rawBalance));
          }
        } catch (error) {
          console.log("Error fetching account balance: ", error);
        } finally {
          setLoading(false);
        }
      };
      fetchBalance();
    }
  }, [initialAmount]);

  const processingFee = subTotal * 0.12;
  const fullTotal = subTotal + processingFee;

  const formatAmount = (amt: number) => {
    return amt.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const dispatch = useDispatch();
  const orderContext = route.params?.orderContext;
  const [submitting, setSubmitting] = useState(false);

  const handleContinuePayment = async () => {
    if (!orderContext) {
      navigation.navigate("PaymentMethod", {
        total: fullTotal,
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        cartId: orderContext.cartId || 0,
        paymentMethod: "card",
        grandTotal: fullTotal,
        discountAmount: orderContext.discount || 0,
        deliveryCharge: orderContext.deliveryCharge || 0,
        creditPaid: 0,
        moneyPaid: fullTotal,
        isFinalizeImdt: orderContext.isFinalizeImdt || 0,
        checkoutDetails: {
          ...(orderContext.checkoutDetails || {
            deliveryMethod: orderContext.deliveryMethod || "home",
          }),
        },
      };

      const response = await orderService.createOrder(payload);
      if (response.data && response.data.status && response.data.data) {
        dispatch(clearCart());
        navigation.navigate("OrderConfirmed", {
          orderId: response.data.data.orderId,
          invoiceNumber: response.data.data.invoiceNumber,
          total: response.data.data.total,
        });
      } else {
        Alert.alert("Order Failed", response.data.message || "Failed to create order.");
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      const errorMsg = errorData?.message || (Array.isArray(errorData?.details) ? errorData.details.join("; ") : null) || error?.message || "Failed to process card payment.";
      console.error("Order error in PaymentScreen:", errorMsg, errorData);
      if (errorData?.code === "ITEMS_UNAVAILABLE") {
        Alert.alert(
          "Items Unavailable",
          "Some items in your cart are no longer available. Please review your cart.",
          [{ text: "OK", onPress: () => navigation.navigate("MyCart") }]
        );
      } else {
        Alert.alert("Order Failed", errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* HEADER */}
      <CustomHeader
        title={headerTitle}
        navigation={navigation}
        showBackButton={true}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            Loading Payment Summary...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: 30,
            }}
          >
            {/* 3D PAYMENT SUMMARY ILLUSTRATION */}
            <View style={{ alignItems: "center", marginVertical: 20 }}>
              <Image
                source={require("@/assets/images/payment/payment-summery.webp")}
                style={{
                  width: 190,
                  height: 190,
                  resizeMode: "contain",
                }}
              />
            </View>

            {/* PAYMENT SUMMARY CARD */}
            <View
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 20,
                paddingHorizontal: 18,
                paddingVertical: 20,
                marginHorizontal: 16,
              }}
            >
              {/* TOTAL NEGATIVE CREDIT BALANCE */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#4B5563",
                    fontWeight: "400",
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  Total negative Credit balance
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  Rs.{formatAmount(subTotal)}
                </Text>
              </View>

              {/* PROCESSING FEE */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#4B5563",
                    fontWeight: "400",
                  }}
                >
                  Processing Fee (12%)
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  + Rs.{formatAmount(processingFee)}
                </Text>
              </View>

              {/* DIVIDER */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E5E7EB",
                  marginBottom: 16,
                }}
              />

              {/* FULL TOTAL */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Full Total
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "#C58B2B",
                  }}
                >
                  Rs.{formatAmount(fullTotal)}
                </Text>
              </View>
            </View>

            {/* SECURE PAYMENT BANNER */}
            <View
              style={{
                backgroundColor: "#EDFFF2",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 14,
                marginHorizontal: 16,
                marginTop: 18,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#C6F6D5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: "#2D5A3C",
                  fontWeight: "500",
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Your payment information is secure and encrypted.
              </Text>
            </View>
          </ScrollView>

          {/* BOTTOM BUTTON */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 20,
              paddingTop: 10,
              backgroundColor: "#FFFFFF",
            }}
          >
            <TouchableOpacity
              activeOpacity={submitting ? 1 : 0.85}
              disabled={submitting}
              onPress={handleContinuePayment}
              style={{
                height: 52,
                backgroundColor: "#000000",
                borderRadius: 28,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  Continue to Payment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PaymentScreen;
