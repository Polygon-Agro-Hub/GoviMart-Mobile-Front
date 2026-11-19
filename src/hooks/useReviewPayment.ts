import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PaymentGatewayFactory } from "@/services/payment/payment.factory";
import { UnifiedCheckoutSession } from "@/services/payment/payment.types";
import cardStorageService, {
  SavedCard,
} from "@/services/payment/cardStorageService";
import apiClient from "@/services/config-service/axio-config";
import { ENDPOINTS } from "@/services/config-service/endpoints";
import { getAuthHeader } from "@/services/config-service/auth-header";
import orderService from "@/services/order/order.service";

interface UseReviewPaymentProps {
  userId?: number | string;
  invoiceNo: string;
  routeInvoiceNo?: string;
  effectiveOrderId: string | number;
  showSuccessMessage: (inv: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
}

export const useReviewPayment = ({
  userId,
  invoiceNo,
  routeInvoiceNo,
  effectiveOrderId,
  showSuccessMessage,
  setIsSubmitting,
}: UseReviewPaymentProps) => {
  const [activeGateway, setActiveGateway] = useState<string>("payments_lk");
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [checkoutSession, setCheckoutSession] =
    useState<UnifiedCheckoutSession | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [pendingConfirmPayload, setPendingConfirmPayload] = useState<any>(null);

  // Fetch active payment gateway from backend config
  useEffect(() => {
    const fetchActiveGateway = async () => {
      try {
        const headers = await getAuthHeader();
        const res = await apiClient.get(ENDPOINTS.PAYMENT.ACTIVE_GATEWAY, {
          headers,
        });
        if (res.data?.status && res.data?.data?.activeGateway) {
          setActiveGateway(res.data.data.activeGateway);
        }
      } catch {
        setActiveGateway("payments_lk");
      }
    };
    fetchActiveGateway();
  }, []);

  // Load saved card for 1-click fast pay (additional payment flow)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadCard = async () => {
        try {
          const card = await cardStorageService.getSavedCard(userId);
          if (isMounted) setSavedCard(card);
        } catch { }
      };
      loadCard();
      return () => {
        isMounted = false;
      };
    }, [userId]),
  );

  const handleAdditionalPaymentSuccess = async (confirmPayload?: any) => {
    setCheckoutModalVisible(false);

    const payload = confirmPayload ?? pendingConfirmPayload;
    if (!payload) {
      Alert.alert("Error", "Order details missing. Please contact support.");
      setIsSubmitting(false);
      return;
    }

    try {
      const confirmRes = await orderService.confirmPackageReview({
        ...payload,
        isPaid: 1,
      });
      console.log(
        "[ReviewPackageScreen] confirmPackageReview (post-payment):",
        confirmRes.data,
      );

      showSuccessMessage(
        invoiceNo ||
        routeInvoiceNo ||
        (effectiveOrderId ? `#${effectiveOrderId}` : ""),
      );
    } catch (err: any) {
      console.error("[ReviewPackageScreen] Post-payment confirm error:", err);
      setIsSubmitting(false);
      Alert.alert(
        "Order Confirmation Failed",
        "Your payment was received but the order could not be confirmed. Please contact support.",
      );
    }
  };

  const handleAdditionalPaymentCancel = () => {
    setCheckoutModalVisible(false);
    setCheckoutSession(null);
    setPendingConfirmPayload(null);
    setIsSubmitting(false);
    Alert.alert(
      "Payment Cancelled",
      "The payment was not completed. Your order was not confirmed. You can try again.",
    );
  };

  return {
    activeGateway,
    setActiveGateway,
    savedCard,
    setSavedCard,
    checkoutSession,
    setCheckoutSession,
    checkoutModalVisible,
    setCheckoutModalVisible,
    pendingConfirmPayload,
    setPendingConfirmPayload,
    handleAdditionalPaymentSuccess,
    handleAdditionalPaymentCancel,
  };
};

export default useReviewPayment;

