import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { RootStackParamList } from "@/types/types";
import { RootState } from "@/store";
import { clearCart } from "@/store/cartSlice";
import orderService from "@/services/order/order.service";
import customerService from "@/services/customer/customer.service";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import { buildInvoiceHtml, InvoiceData } from "@/utils/invoiceGenerator";

type OrderConfirmedNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OrderConfirmed"
>;

type OrderConfirmedRouteProp = RouteProp<RootStackParamList, "OrderConfirmed">;

interface Props {
  navigation: OrderConfirmedNavigationProp;
  route: OrderConfirmedRouteProp;
}

const OrderConfirmed: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const userProfile = useSelector((state: RootState) => state.auth.userProfile);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  React.useEffect(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const orderContext = route.params?.orderContext;
  const invoiceNo = route.params?.invoiceNumber || "INV-PENDING";
  const passedTotal = route.params?.total;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── SCHEDULE DATE RESOLUTION ──────────────────────────────────────────────
  const calcOrders = orderContext?.checkoutDetails?.calculatedOrders || [];
  let displayScheduleDate = "As Scheduled";
  if (calcOrders.length > 0) {
    // Recurring schedule: display the 1st scheduled order date
    displayScheduleDate =
      calcOrders[0].date || (calcOrders[0] as any).dateStr || "As Scheduled";
  } else if (orderContext?.checkoutDetails?.deliveryDate) {
    // One Time order delivery date
    displayScheduleDate = orderContext.checkoutDetails.deliveryDate;
  } else if (route.params?.deliveryDate || route.params?.scheduleDate) {
    displayScheduleDate =
      route.params?.deliveryDate ||
      route.params?.scheduleDate ||
      "As Scheduled";
  }

  const displayScheduleTime =
    orderContext?.checkoutDetails?.timeSlot ||
    route.params?.timeSlot ||
    "08:00 AM - 12:00 PM";

  // ─── TOTALS & BREAKDOWN ────────────────────────────────────────────────────
  const packageTotal = orderContext?.packageTotal || 0;
  const productTotal = orderContext?.productTotal || 0;
  const discount = orderContext?.discount || 0;
  const deliveryFee = orderContext?.deliveryCharge || 0;

  const isFreeDeliveryCoupon = Boolean(
    orderContext?.isFreeDeliveryCoupon ||
    orderContext?.appliedCoupon?.isFreeDelivery ||
    orderContext?.checkoutDetails?.couponType?.toLowerCase()?.includes("free") ||
    orderContext?.checkoutDetails?.couponType?.toLowerCase()?.includes("delivery") ||
    orderContext?.couponType?.toLowerCase()?.includes("free") ||
    orderContext?.couponType?.toLowerCase()?.includes("delivery")
  );

  const couponDiscount =
    orderContext?.couponDiscount !== undefined && Number(orderContext?.couponDiscount) > 0
      ? parseFloat(String(orderContext.couponDiscount)) || 0
      : orderContext?.couponValue !== undefined && Number(orderContext?.couponValue) > 0
        ? parseFloat(String(orderContext.couponValue)) || 0
        : orderContext?.checkoutDetails?.couponValue !== undefined && Number(orderContext?.checkoutDetails?.couponValue) > 0
          ? parseFloat(String(orderContext.checkoutDetails.couponValue)) || 0
          : orderContext?.appliedCoupon?.discount !== undefined && Number(orderContext?.appliedCoupon?.discount) > 0
            ? parseFloat(String(orderContext.appliedCoupon.discount)) || 0
            : route.params?.couponValue !== undefined && Number(route.params?.couponValue) > 0
              ? parseFloat(String(route.params.couponValue)) || 0
              : 0;

  const total =
    passedTotal !== undefined
      ? passedTotal
      : orderContext?.grandTotal !== undefined
        ? orderContext.grandTotal
        : Math.max(0, packageTotal + productTotal - discount - couponDiscount + (isFreeDeliveryCoupon ? 0 : deliveryFee));

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleBackHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBackHome();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const convertLogoToBase64 = async (): Promise<string> => {
    try {
      const asset = Asset.fromModule(
        require("@/assets/images/public/polygon-logo.png"),
      );
      await asset.downloadAsync();
      if (asset.localUri) {
        const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${base64}`;
      }
    } catch (e) {
      console.warn("convertLogoToBase64 error:", e);
    }
    return "";
  };

  const parsePrice = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDateStr = (dateVal: any, fallbackStr?: string): string => {
    if (!dateVal && fallbackStr) return fallbackStr;
    if (!dateVal) return fallbackStr || "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal || fallbackStr || "N/A");
    return d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-");
  };

  const formatPhoneNumber = (rawPhone: any): string => {
    if (!rawPhone || rawPhone === "N/A") return "";
    let cleaned = String(rawPhone).trim();
    // remove all leading + signs
    cleaned = cleaned.replace(/^\++/, "");
    // if starts with 94 followed by number
    if (cleaned.startsWith("94")) {
      return `+94 ${cleaned.slice(2).trim()}`;
    }
    // if starts with 0 (e.g. 0764512395)
    if (cleaned.startsWith("0")) {
      return `+94 ${cleaned.slice(1).trim()}`;
    }
    return `+94 ${cleaned}`;
  };

  const resolveInvoiceData = async (): Promise<{
    invoiceData: InvoiceData;
    logoBase64: string;
  }> => {
    const logoBase64 = await convertLogoToBase64();
    const orderId = route.params?.orderId;
    let apiInvoice: any = null;

    if (orderId) {
      try {
        const res = await orderService.getInvoice(orderId);
        if (res.data?.status && res.data?.invoice) {
          apiInvoice = res.data.invoice.invoice || res.data.invoice;
        }
      } catch (e) {
        console.warn(
          "Could not fetch full invoice from API, falling back to local data:",
          e,
        );
      }
    }

    let customerObj: any = userProfile;
    if (!customerObj) {
      try {
        const custRes = await customerService.getAccountDetails();
        if (custRes.data?.data) {
          customerObj = custRes.data.data;
        }
      } catch (e) {
        // ignore
      }
    }

    const checkout: any = orderContext?.checkoutDetails || {};
    const orderCtx: any = orderContext || {};
    const userProf: any = userProfile || {};
    const isApartment =
      (checkout.buildingType || userProf.buildingType || "").toLowerCase() ===
      "apartment";

    const resolvedInvoiceNumber =
      apiInvoice?.invoiceNumber ||
      route.params?.invoiceNumber ||
      invoiceNo ||
      `INV-${Date.now()}`;

    const invoiceData: InvoiceData = {
      invoiceNumber: resolvedInvoiceNumber,
      invoiceDate: apiInvoice?.invoiceDate || new Date().toISOString(),
      scheduledDate: apiInvoice?.scheduledDate || displayScheduleDate,
      deliveryMethod:
        apiInvoice?.deliveryMethod ||
        orderCtx.deliveryMethod ||
        "Home Delivery",
      paymentMethod:
        apiInvoice?.paymentMethod || orderCtx.paymentMethod || "Cash",
      isPaid:
        apiInvoice?.isPaid !== undefined
          ? apiInvoice.isPaid
          : orderCtx.paymentMethod?.toLowerCase() === "card"
            ? 1
            : 0,
      creditPaid:
        apiInvoice?.creditPaid !== undefined
          ? apiInvoice.creditPaid
          : orderCtx.creditPaid || 0,
      moneyPaid:
        apiInvoice?.moneyPaid !== undefined
          ? apiInvoice.moneyPaid
          : orderCtx.moneyPaid || 0,
      amountDue: apiInvoice?.amountDue,
      isFreeDeliveryCoupon: apiInvoice?.isFreeDeliveryCoupon,
      familyPackItems:
        apiInvoice?.familyPackItems ||
        (orderCtx.packageInfo
          ? [
              {
                id: 1,
                name: orderCtx.packageInfo.displayName || "Family Pack",
                unitPrice: orderCtx.packageInfo.productPrice || packageTotal,
                quantity: 1,
                amount: orderCtx.packageInfo.productPrice || packageTotal,
                packageDetails: orderCtx.packageInfo.packageDetails || [],
              },
            ]
          : []),
      additionalItems:
        apiInvoice?.additionalItems ||
        (orderCtx.additionalItems || []).map((item: any, idx: number) => ({
          id: item.id || idx + 1,
          name: item.displayName || item.name || "Item",
          unitPrice: item.normalPrice || item.unitPrice || 0,
          quantity: item.qty || item.quantity || 1,
          unit: item.unit || "kg",
          amount:
            item.amount ||
            item.price ||
            item.finalPrice ||
            (item.normalPrice || 0) * (item.qty || 1),
        })),
      familyPackTotal:
        apiInvoice?.familyPackTotal !== undefined
          ? apiInvoice.familyPackTotal
          : packageTotal,
      additionalItemsTotal:
        apiInvoice?.additionalItemsTotal !== undefined
          ? apiInvoice.additionalItemsTotal
          : productTotal,
      deliveryFee:
        apiInvoice?.deliveryFee !== undefined
          ? apiInvoice.deliveryFee
          : deliveryFee,
      discount:
        apiInvoice?.discount !== undefined ? apiInvoice.discount : discount,
      couponDiscount:
        apiInvoice?.couponDiscount !== undefined
          ? apiInvoice.couponDiscount
          : couponDiscount,
      grandTotal:
        apiInvoice?.fullTotal !== undefined && apiInvoice?.fullTotal !== null
          ? apiInvoice.fullTotal
          : apiInvoice?.grandTotal !== undefined && apiInvoice?.grandTotal !== null
            ? apiInvoice.grandTotal
            : orderCtx?.fullTotal !== undefined && orderCtx?.fullTotal !== null
              ? orderCtx.fullTotal
              : total,
      fullTotal:
        apiInvoice?.fullTotal !== undefined && apiInvoice?.fullTotal !== null
          ? apiInvoice.fullTotal
          : apiInvoice?.grandTotal !== undefined && apiInvoice?.grandTotal !== null
            ? apiInvoice.grandTotal
            : orderCtx?.fullTotal !== undefined && orderCtx?.fullTotal !== null
              ? orderCtx.fullTotal
              : total,
      billingInfo: apiInvoice?.billingInfo
        ? {
            ...apiInvoice.billingInfo,
            phone: formatPhoneNumber(apiInvoice.billingInfo.phone),
          }
        : {
            title: customerObj?.title || userProf.title || "",
            fullName:
              customerObj?.fullName ||
              `${userProf.firstName || ""} ${userProf.lastName || ""}`.trim() ||
              checkout.fullName ||
              "Valued Customer",
            email: customerObj?.email || userProf.email || "N/A",
            phone: formatPhoneNumber(
              customerObj?.phoneNumber ||
                userProf.phoneNumber ||
                checkout.phone1 ||
                "N/A",
            ),
            buildingType: isApartment ? "Apartment" : "House",
            houseNo: checkout.houseNo || "",
            street: checkout.street || checkout.streetName || "",
            city: checkout.cityName || checkout.city || "",
            buildingNo: checkout.buildingNo || "",
            apartmentName: checkout.buildingName || "",
            flatNo: checkout.flatNumber || checkout.flatNo || "",
            floorNo: checkout.floorNumber || checkout.floorNo || "",
          },
           pickupInfo: (() => {
        const apiPickup = apiInvoice?.pickupInfo;
        const localPickup = orderCtx.pickupCenter
          ? {
              centerId: String(orderCtx.pickupCenter.id || orderCtx.pickupCenter.centerId || ""),
              centerName:
                orderCtx.pickupCenter.centerName ||
                orderCtx.pickupCenter.name ||
                null,
              contact01:
                orderCtx.pickupCenter.contact01 ||
                orderCtx.pickupCenter.phone1 ||
                null,
              address: {
                street: orderCtx.pickupCenter.street || "",
                city: orderCtx.pickupCenter.city || "",
                district: orderCtx.pickupCenter.district || "",
                province: orderCtx.pickupCenter.province || "",
                country: "Sri Lanka",
                zipCode: orderCtx.pickupCenter.zipcode || orderCtx.pickupCenter.zipCode || "",
              },
            }
          : undefined;

        const apiHasName =
          apiPickup?.centerName && apiPickup.centerName !== "Unknown";
        if (apiHasName) return apiPickup;
        return localPickup || apiPickup || undefined;
      })(),
    };
    console.log("API pickupInfo:", JSON.stringify(apiInvoice?.pickupInfo));


    return { invoiceData, logoBase64 };
  };

  

  const handleDownloadInvoice = async () => {
    if (isDownloading || isSharing) return;

    try {
      setIsDownloading(true);
      const { invoiceData, logoBase64 } = await resolveInvoiceData();
      const htmlContent = buildInvoiceHtml(invoiceData, logoBase64);

      const { base64: pdfBase64 } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        base64: true,
      });

      const cleanInvoiceNumber = invoiceData.invoiceNumber.replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const targetFileName = `Invoice_${cleanInvoiceNumber}.pdf`;

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert(
            "Permission denied",
            "Please allow access to save the PDF.",
          );
          return;
        }

        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          targetFileName,
          "application/pdf",
        );

        await FileSystem.writeAsStringAsync(fileUri, pdfBase64!, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert("Success", "Invoice downloaded successfully.");
      } else {
        const filePath = `${FileSystem.documentDirectory}${targetFileName}`;

        await FileSystem.writeAsStringAsync(filePath, pdfBase64!, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert("Success", "Invoice saved successfully.");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      Alert.alert("Error", "Failed to generate invoice. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── SHARE INVOICE (FIXED) ────────────────────────────────────────────────
  // History of this bug:
  // 1) Original code generated the PDF, then tried FileSystem.copyAsync() on
  //    the Print module's cache uri to rename it. Android blocks that copy
  //    ("isn't readable"), and the old catch block generated a SECOND
  //    throwaway PDF and shared that instead — also unreadable.
  // 2) Next attempt asked printToFileAsync for base64: true so the file could
  //    be written ourselves (like the download flow does). But base64:true
  //    forces expo-print to hold the whole PDF in memory as a base64 string
  //    (on top of the invoice HTML + embedded logo image), and on many
  //    Android devices that encode/write step itself fails natively:
  //    "An error occured while writing the PDF data".
  //
  // Fix: share doesn't need base64 at all (only the SAF-based download flow
  // does). Just get the plain `uri` from printToFileAsync and hand it
  // straight to Sharing.shareAsync — no base64 encoding, no copyAsync, no
  // rename, no second PDF. This is the standard, reliable expo-print +
  // expo-sharing pattern.
  const handleShareInvoice = async () => {
    if (isDownloading || isSharing) return;

    try {
      setIsSharing(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device.",
        );
        return;
      }

      const { invoiceData, logoBase64 } = await resolveInvoiceData();
      const htmlContent = buildInvoiceHtml(invoiceData, logoBase64);
      const cleanInvoiceNumber = invoiceData.invoiceNumber.replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );

      // Attempt 1: share the Print module's own cache uri directly. This is
      // the standard, lowest-overhead path and is what a dev/production
      // build should use successfully.
      try {
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          width: 595,
        });

        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: `Invoice_${cleanInvoiceNumber}.pdf`,
        });
        return;
      } catch (primaryError) {
        console.warn(
          "Primary share path failed, retrying via documentDirectory:",
          primaryError,
        );
      }

      // Attempt 2 (fallback, mainly needed under Expo Go's stricter file
      // provider sandbox): regenerate as base64 and write it into
      // documentDirectory ourselves — a location Expo Go's provider does
      // expose — then share that copy instead.
      const { base64: pdfBase64 } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        base64: true,
      });

      if (!pdfBase64) {
        throw new Error("Failed to generate invoice PDF.");
      }

      const fallbackUri = `${FileSystem.documentDirectory}Invoice_${cleanInvoiceNumber}.pdf`;

      const existing = await FileSystem.getInfoAsync(fallbackUri);
      if (existing.exists) {
        await FileSystem.deleteAsync(fallbackUri, { idempotent: true });
      }

      await FileSystem.writeAsStringAsync(fallbackUri, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fallbackUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: `Invoice_${cleanInvoiceNumber}.pdf`,
      });
    } catch (error: any) {
      console.error("Invoice sharing error:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to share invoice. Please try again.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* ─── SCROLLABLE CONTENT (Main content centered in screen) ──────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 18,
          paddingTop: 20,
          paddingBottom: 28,
        }}
      >
        {/* ─── ORDER CONFIRMED TITLE ──────────────────────────────────── */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 20,
            fontWeight: "800",
            color: "#111111",
          }}
        >
          Order Confirmed!
        </Text>

        {/* ─── CONFIRMED STAR BADGE (Previous original design) ────────── */}
        <View
          style={{
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F1F1F5",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          <Ionicons name="star" size={11} color="#111111" />
          <Text
            style={{
              fontSize: 12,
              color: "#222222",
              fontWeight: "600",
              marginLeft: 4,
            }}
          >
            Confirmed
          </Text>
        </View>

        {/* Subtitle Description */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 13,
            lineHeight: 19,
            color: "#62667A",
            marginHorizontal: 16,
            marginBottom: 16,
          }}
        >
          Thank you! Your order has been placed
          {"\n"}
          successfully. We'll deliver it as scheduled.
        </Text>

        {/* ─── ORDER ID BOX ────────────────────────────────────────────── */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E9",
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#747990",
              fontWeight: "500",
            }}
          >
            Order ID
          </Text>

          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#111111",
              marginTop: 2,
            }}
          >
            [{invoiceNo}]
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#747990",
              marginTop: 4,
            }}
          >
            At {formattedTime} on {formattedDate}
          </Text>
        </View>

        {/* ─── SCHEDULE DATE CARD ──────────────────────────────────────── */}
        <View
          style={{
            height: 59,
            borderRadius: 12,
            backgroundColor: "#F3F3F7",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#000000",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="calendar" size={18} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#747990",
              }}
            >
              Schedule Date
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#111111",
                fontWeight: "600",
                marginTop: 1,
              }}
            >
              {displayScheduleDate}
            </Text>
          </View>
        </View>

        {/* ─── SCHEDULE TIME SLOT CARD ─────────────────────────────────── */}
        <View
          style={{
            height: 59,
            borderRadius: 12,
            backgroundColor: "#F3F3F7",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#000000",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="time" size={18} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#747990",
              }}
            >
              Schedule Time Slot
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#111111",
                fontWeight: "600",
                marginTop: 1,
              }}
            >
              {displayScheduleTime}
            </Text>
          </View>
        </View>

        {/* ─── ORDER SUMMARY CARD ──────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#111111",
            marginBottom: 6,
            marginLeft: 2,
          }}
        >
          Order Summary
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#DDE3E9",
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        >
          {/* For Packages (only if > 0) */}
          {packageTotal > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>
                For Packages
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}
              >
                Rs. {formatAmount(packageTotal)}
              </Text>
            </View>
          )}

          {/* Ala Carte Items (only if > 0) */}
          {productTotal > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>
                Ala Carte Items
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}
              >
                Rs. {formatAmount(productTotal)}
              </Text>
            </View>
          )}

          {/* Discount (only if > 0) */}
          {discount > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>Discount</Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}
              >
                - Rs. {formatAmount(discount)}
              </Text>
            </View>
          )}

          {/* Coupon Discount (only if > 0) */}
          {couponDiscount > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>
                Coupon Discount
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}
              >
                - Rs. {formatAmount(couponDiscount)}
              </Text>
            </View>
          )}

          {/* Delivery Fee (ONLY if > 0 - never show if 0) */}
          {deliveryFee > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>
                Delivery Fee
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#222222" }}
              >
                + Rs. {formatAmount(deliveryFee)}
              </Text>
            </View>
          )}

          {/* Free Delivery Coupon note */}
          {isFreeDeliveryCoupon && deliveryFee === 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#60647A" }}>
                Delivery Fee
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}
              >
                FREE (Coupon)
              </Text>
            </View>
          )}

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "#E4E6EA",
              marginVertical: 6,
            }}
          />

          {/* Total */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 14.5,
                fontWeight: "700",
                color: "#111111",
              }}
            >
              Total
            </Text>

            <Text
              style={{
                fontSize: 15.5,
                fontWeight: "800",
                color: "#111111",
              }}
            >
              Rs. {formatAmount(total)}
            </Text>
          </View>
        </View>

        {/* ─── DELIVERY NOTIFICATION BANNER ─────────────────────────────── */}
        <View
          style={{
            height: 38,
            borderRadius: 20,
            backgroundColor: "#F3F3F5",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "#000000",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 8,
            }}
          >
            <Ionicons name="notifications" size={12} color="#FFFFFF" />
          </View>

          <Text
            style={{
              fontSize: 12,
              color: "#555A68",
              flex: 1,
            }}
          >
            We'll notify you once your order is on the way.
          </Text>
        </View>

        {/* ─── DIRECT BACK TO HOME BUTTON ──────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleBackHome}
          style={{
            height: 48,
            borderRadius: 25,
            backgroundColor: "#000000",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            Direct Back to Home
          </Text>
        </TouchableOpacity>

        {/* ─── INVOICE BUTTONS (Download & Share) ───────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          {/* Download */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDownloadInvoice}
            disabled={isDownloading || isSharing}
            style={{
              flex: 1,
              height: 48,
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 25,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              opacity: isDownloading || isSharing ? 0.6 : 1,
            }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Ionicons name="download-outline" size={17} color="#111111" />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#111111",
                    marginLeft: 6,
                    fontWeight: "600",
                  }}
                >
                  Download Invoice
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShareInvoice}
            disabled={isDownloading || isSharing}
            style={{
              flex: 1,
              height: 48,
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 25,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              opacity: isDownloading || isSharing ? 0.6 : 1,
            }}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Ionicons name="share-outline" size={17} color="#111111" />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#111111",
                    marginLeft: 6,
                    fontWeight: "600",
                  }}
                >
                  Share Invoice
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default OrderConfirmed;