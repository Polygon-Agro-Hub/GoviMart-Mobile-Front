import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import orderService from "@/services/order/order.service";
import {
  CouponItem,
  getCouponTheme,
} from "@/constants/coupon.constants";
import AppliedCouponCard from "./AppliedCouponCard";

interface CouponModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyCoupon: (couponResult: {
    code: string;
    type: string;
    discount: number;
    isFreeDelivery: boolean;
  }) => void;
  deliveryMethod?: "home" | "pickup" | string;
  cartTotal?: number;
  cartId?: number;
}

const CouponModal: React.FC<CouponModalProps> = ({
  visible,
  onClose,
  onApplyCoupon,
  deliveryMethod = "home",
  cartTotal = 0,
  cartId,
}) => {
  const [inputCode, setInputCode] = useState("");
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState<{
    code: string;
    type: string;
    discount: number;
    isFreeDelivery: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setSuccessModalData(null);
      fetchCoupons();
    }
  }, [visible]);

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await orderService.getAvailableCoupons();
      if (res.data && res.data.data) {
        setCoupons(res.data.data);
      }
    } catch (err) {
      console.log("Error loading available coupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const formatPrice = (price: any) => {
    const num = parseFloat(price) || 0;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getCouponDescription = (item: CouponItem) => {
    const isFreeDel =
      item.type === "Free Delivery" || item.type === "Free Delivary";
    const hasLimit = item.checkLimit === 1 && item.priceLimit;

    if (item.type === "Percentage") {
      const pct = item.percentage || 0;
      return hasLimit
        ? `Get ${pct}% off for min. order Rs. ${formatPrice(item.priceLimit)}`
        : `Get ${pct}% off for any order value.`;
    }

    if (item.type === "Fixed Amount") {
      const fix = item.fixDiscount || 0;
      return hasLimit
        ? `Get Rs. ${formatPrice(fix)} off for min. order Rs. ${formatPrice(item.priceLimit)}`
        : `Get Rs. ${formatPrice(fix)} off for any order value.`;
    }

    if (isFreeDel) {
      return hasLimit
        ? `Get free delivery for min. order Rs. ${formatPrice(item.priceLimit)}`
        : `Get free delivery for any order value.`;
    }

    return `Get discount on your order.`;
  };

  const handleApply = async (codeToApply: string) => {
    const trimmed = codeToApply.trim();
    if (!trimmed) {
      Alert.alert("Coupon Required", "Please enter a valid coupon code.");
      return;
    }

    try {
      setApplyingCode(trimmed);
      const res = await orderService.checkCoupon({
        coupon: trimmed,
        deliveryMethod,
        cartTotal,
        cartId,
      });

      if (res.data && res.data.status) {
        const discountVal = parseFloat(res.data.discount) || 0;
        const couponType = res.data.type || "";
        const isFreeDelivery =
          couponType === "Free Delivery" || couponType === "Free Delivary";

        setSuccessModalData({
          code: res.data.code || trimmed,
          type: couponType,
          discount: discountVal,
          isFreeDelivery,
          message: res.data.message || "Coupon is valid.",
        });
      } else {
        Alert.alert("Coupon Error", res.data?.message || "Invalid coupon code.");
      }
    } catch (error: any) {
      console.log("Error applying coupon:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to apply coupon. Please check the code and try again.";
      Alert.alert("Cannot Apply Coupon", msg);
    } finally {
      setApplyingCode(null);
    }
  };

  const handleConfirmSuccess = () => {
    if (successModalData) {
      onApplyCoupon({
        code: successModalData.code,
        type: successModalData.type,
        discount: successModalData.discount,
        isFreeDelivery: successModalData.isFreeDelivery,
      });
      setSuccessModalData(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            width: "100%",
            maxWidth: 390,
            maxHeight: "88%",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          {/* Top Close Icon */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginBottom: 4,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#000000",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ─── SUCCESS POPUP (WHEN APPLIED) ───────────────────────────── */}
          {successModalData ? (
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              {/* Green Success Check Icon */}
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: "#DCFCE7",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Ionicons name="checkmark-circle" size={30} color="#16A34A" />
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#111111",
                  marginBottom: 4,
                }}
              >
                Coupon Applied!
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {successModalData.message}
              </Text>

              {/* Exact Card Design with Correct Color from Mockup */}
              <AppliedCouponCard
                code={successModalData.code}
                type={successModalData.type}
                discount={successModalData.discount}
                isFreeDelivery={successModalData.isFreeDelivery}
                deliveryCharge={0}
                onRemove={() => setSuccessModalData(null)}
                style={{
                  width: "100%",
                  marginHorizontal: 0,
                  marginBottom: 18,
                }}
              />

              {/* Continue Pill Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmSuccess}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#000000",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Centered Ticket Badge */}
              <View style={{ alignItems: "center", marginBottom: 6 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#F3E8FF",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FontAwesome6 name="ticket" size={20} color="#5B18AD" />
            </View>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#111111",
                marginTop: 10,
              }}
            >
              Apply Coupon
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#6B7280",
                marginTop: 4,
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              Enter your coupon code to get exciting discounts.
            </Text>
          </View>

          {/* Input Field */}
          <View
            style={{
              height: 54,
              borderRadius: 27,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "#FFFFFF",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              marginTop: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#000000",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <FontAwesome6 name="ticket" size={14} color="#FFFFFF" />
            </View>

            <TextInput
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: "600",
                color: "#111111",
                paddingVertical: 0,
              }}
              placeholder="Type Here"
              placeholderTextColor="#9CA3AF"
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {Boolean(inputCode) ? (
              <TouchableOpacity
                onPress={() => setInputCode("")}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Apply Coupon Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={applyingCode !== null || !inputCode.trim()}
            onPress={() => handleApply(inputCode)}
            style={{
              height: 48,
              borderRadius: 24,
              backgroundColor:
                inputCode.trim() && applyingCode === null
                  ? "#000000"
                  : "#9CA3AF",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {applyingCode === inputCode.trim() ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Apply Coupon
              </Text>
            )}
          </TouchableOpacity>

          {/* Section Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 16,
            }}
          >
            <View
              style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
            />
            <Text
              style={{
                marginHorizontal: 12,
                fontSize: 12,
                color: "#6B7280",
                fontWeight: "500",
              }}
            >
              Available Offers
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
            />
          </View>

          {/* Available Offers List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 260 }}
          >
            {loadingCoupons ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color="#000000" />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Loading available offers...
                </Text>
              </View>
            ) : coupons.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                  }}
                >
                  No available coupons right now.
                </Text>
              </View>
            ) : (
              coupons.map((item) => {
                const theme = getCouponTheme(item.type);
                const isApplyingThis = applyingCode === item.code;

                return (
                  <View
                    key={String(item.id)}
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      padding: 12,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {/* Left Icon Badge */}
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: theme.primary,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <FontAwesome6
                        name="ticket"
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>

                    {/* Middle Info */}
                    <View
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: "#111111",
                        }}
                      >
                        {item.code}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#4B5563",
                          marginTop: 2,
                          lineHeight: 16,
                        }}
                      >
                        {getCouponDescription(item)}
                      </Text>
                    </View>

                    {/* Right Apply Pill Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={applyingCode !== null}
                      onPress={() => handleApply(item.code)}
                      style={{
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#000000",
                        paddingHorizontal: 16,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {isApplyingThis ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Apply
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Footnote Badge */}
          <View
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              paddingVertical: 6,
              paddingHorizontal: 12,
              alignSelf: "center",
              marginTop: 10,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#4B5563",
                fontWeight: "500",
              }}
            >
              Only one coupon can be applied for a order.
            </Text>
          </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default CouponModal;
