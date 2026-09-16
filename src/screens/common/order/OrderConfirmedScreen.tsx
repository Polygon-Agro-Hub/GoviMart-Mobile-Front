import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
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

  const total =
    passedTotal !== undefined
      ? passedTotal
      : orderContext?.grandTotal !== undefined
        ? orderContext.grandTotal
        : Math.max(0, packageTotal + productTotal - discount + deliveryFee);

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

  const resolveOrderAndCustomerData = async () => {
    const orderId = route.params?.orderId;
    let orderObj: any = null;
    let customerObj: any = userProfile;

    if (orderId) {
      try {
        const res = await orderService.getInvoice(orderId);
        if (res.data?.status && res.data?.invoice) {
          orderObj = res.data.invoice;
        }
      } catch (e) {
        console.warn(
          "Could not fetch full invoice from API, falling back to local data:",
          e,
        );
      }
    }

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

    return { order: orderObj, customerData: customerObj };
  };

  const buildHtmlContent = (
    order: any,
    customerData: any,
    logoBase64: string,
  ) => {
    console.log(
      "==================== [INVOICE DEBUG START] ====================",
    );
    console.log("[INVOICE] RAW ORDER OBJECT:", JSON.stringify(order, null, 2));
    console.log(
      "[INVOICE] CUSTOMER DATA:",
      JSON.stringify(customerData, null, 2),
    );
    console.log(
      "[INVOICE] ORDER CONTEXT:",
      JSON.stringify(orderContext, null, 2),
    );

    const invoiceNumber =
      order?.invoiceNumber ||
      order?.orderStatus?.invoiceNumber ||
      invoiceNo ||
      `INV-${Date.now()}`;

    // Dates
    const orderedDateStr = formatDateStr(
      order?.invoiceDate || order?.createdAt || now,
    );
    const scheduledDateStr = formatDateStr(
      order?.scheduledDate || order?.sheduleDate || order?.scheduleDate,
      displayScheduleDate,
    );

    // Billing & Customer details
    const billing: any = order?.billingInfo || {};
    const customer: any = order?.customerInfo || {};
    const checkout: any = orderContext?.checkoutDetails || {};

    const title =
      billing.title ||
      customer.title ||
      customerData?.title ||
      userProfile?.title ||
      "";
    const fullName =
      billing.fullName ||
      customer.fullName ||
      (customer.firstName
        ? `${customer.firstName} ${customer.lastName || ""}`
        : "") ||
      checkout.fullName ||
      `${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim() ||
      "Valued Customer";

    const rawPhone =
      billing.phone ||
      customer.phoneNumber ||
      customer.phone ||
      checkout.phone1 ||
      userProfile?.phoneNumber ||
      customerData?.phoneNumber ||
      "";
    const formattedPhone = formatPhoneNumber(rawPhone);

    const email =
      billing.email ||
      customer.email ||
      customerData?.email ||
      userProfile?.email ||
      "";

    const buildingType =
      billing.buildingType ||
      customer.buildingType ||
      order?.buildingType ||
      checkout.buildingType ||
      "House";

    const houseNo =
      (billing.houseNo && billing.houseNo !== "N/A" ? billing.houseNo : "") ||
      order?.buildingDetails?.houseNo ||
      checkout.houseNo ||
      "";

    const streetName =
      (billing.street && billing.street !== "N/A" ? billing.street : "") ||
      order?.buildingDetails?.streetName ||
      checkout.street ||
      "";

    const city =
      (billing.city && billing.city !== "N/A" ? billing.city : "") ||
      order?.buildingDetails?.city ||
      checkout.cityName ||
      "";

    const buildingNo =
      (billing.buildingNo && billing.buildingNo !== "N/A"
        ? billing.buildingNo
        : "") ||
      order?.buildingDetails?.buildingNo ||
      checkout.buildingNo ||
      "";

    const buildingName =
      (billing.apartmentName && billing.apartmentName !== "N/A"
        ? billing.apartmentName
        : "") ||
      order?.buildingDetails?.buildingName ||
      checkout.buildingName ||
      "";

    const unitNo =
      (billing.flatNo && billing.flatNo !== "N/A" ? billing.flatNo : "") ||
      order?.buildingDetails?.unitNo ||
      checkout.flatNumber ||
      "";

    const floorNo =
      (billing.floorNo && billing.floorNo !== "N/A" ? billing.floorNo : "") ||
      order?.buildingDetails?.floorNo ||
      checkout.floorNumber ||
      "";

    const isApartment = String(buildingType).toLowerCase() === "apartment";

    // Payment & Delivery methods
    const orderPaymentMethod =
      order?.paymentMethod ||
      order?.orderStatus?.paymentMethod ||
      orderContext?.paymentMethod ||
      "Cash";

    const orderDeliveryMethod =
      order?.deliveryMethod ||
      order?.delivaryMethod ||
      orderContext?.deliveryMethod ||
      "Home Delivery";

    const paymentMethodLower = orderPaymentMethod.toLowerCase();
    const deliveryMethodLower = orderDeliveryMethod.toLowerCase();

    // Items and Sections
    const packageItems =
      order?.familyPackItems || order?.packageInfo?.packageDetails || [];
    const hasPackage =
      (Array.isArray(packageItems) && packageItems.length > 0) ||
      order?.isPackage === 1 ||
      (order?.packageInfo &&
        parsePrice(order?.packageInfo?.productPrice) > 0) ||
      packageTotal > 0;

    const packageName =
      order?.packageInfo?.displayName ||
      (packageItems.length > 0 && packageItems[0].name
        ? packageItems[0].name
        : "Package");

    const packagePrice = parsePrice(
      order?.familyPackTotal ||
        order?.packageInfo?.productPrice ||
        packageTotal,
    );
    const packingFee = parsePrice(order?.packageInfo?.packingFee || 0);
    const serviceFee = parsePrice(order?.packageInfo?.serviceFee || 0);
    const packageSectionTotal = packagePrice + packingFee + serviceFee;

    // Additional Items
    const additionalItemsList = order?.additionalItems || [];
    const hasAdditionalItems =
      Array.isArray(additionalItemsList) && additionalItemsList.length > 0;

    let additionalItemsCalculatedSum = 0;
    let additionalItemsRows = "";

    if (hasAdditionalItems) {
      additionalItemsList.forEach((item: any, index: number) => {
        const itemUnitPrice = parsePrice(
          item.unitPrice ||
            item.normalPrice ||
            item.marketplacetablenormalPrice ||
            item.price ||
            0,
        );
        const rawQty = parsePrice(item.quantity || item.qty || 1);
        const isGramUnit = String(item.unit || "").toLowerCase() === "g";
        const displayQuantity =
          isGramUnit && rawQty >= 10 ? rawQty / 1000 : rawQty;
        const itemAmount = parsePrice(
          item.amount || item.finalPrice || itemUnitPrice * displayQuantity,
        );
        additionalItemsCalculatedSum += itemAmount;

        const itemName = item.displayName || item.name || "Item";

        console.log(`[INVOICE ITEM ${index + 1}]`, {
          raw: item,
          parsedName: itemName,
          itemUnitPrice,
          rawQty,
          displayQuantity,
          itemAmount,
        });

        additionalItemsRows += `
  <tr>
    <td style="text-align: center">${index + 1}</td>
    <td class="tabledata">${itemName}</td>
    <td class="tabledata">${itemUnitPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
    <td class="tabledata">${displayQuantity % 1 === 0 ? displayQuantity : displayQuantity.toFixed(3).replace(/\.?0+$/, "")}</td>
    <td class="tabledata">${itemAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
  </tr>`;
      });
    }

    const additionalItemsTotal =
      additionalItemsCalculatedSum > 0
        ? additionalItemsCalculatedSum
        : parsePrice(order?.additionalItemsTotal) || productTotal || 0;

    // Fees & Discounts
    const discountAmount = parsePrice(
      order?.discount || order?.orderDiscount || discount,
    );
    const couponDiscount = parsePrice(order?.couponDiscount || 0);
    const totalDiscount = discountAmount + couponDiscount;

    const deliveryChargeAmount = parsePrice(
      order?.deliveryFee || order?.deliveryCharge || deliveryFee,
    );

    // Grand Total
    let totalAmount = parsePrice(
      order?.grandTotal || order?.amountDue || order?.fullTotal,
    );
    if (!totalAmount || totalAmount === 0) {
      totalAmount = Math.max(
        0,
        packageSectionTotal +
          additionalItemsTotal +
          deliveryChargeAmount -
          totalDiscount,
      );
    }
    if (!totalAmount && total) {
      totalAmount = total;
    }

    // Package Rows
    let packageDetailsRows = "";
    let packageItemCount = 0;
    if (hasPackage) {
      if (Array.isArray(packageItems) && packageItems.length > 0) {
        packageItems.forEach((item: any, index: number) => {
          const itemName =
            item.productTypeName || item.name || item.displayName || "Item";
          const itemQty = item.qty || item.quantity || "01";
          packageItemCount += parsePrice(itemQty) || 1;
          packageDetailsRows += `<tr>
        <td style="text-align: center">${index + 1}</td>
        <td class="tabledata">${itemName}</td>
        <td class="tabledata">${itemQty}</td>
      </tr>`;
        });
      }
    }

    // Payment status details
    const isPaidNum =
      order?.isPaid !== undefined
        ? Number(order.isPaid)
        : order?.orderStatus?.isPaid !== undefined
          ? Number(order.orderStatus.isPaid)
          : paymentMethodLower === "card"
            ? 1
            : 0;

    const creditPaid = parsePrice(
      order?.creditPaid || order?.orderStatus?.creditPaid || 0,
    );
    const moneyPaid = parsePrice(
      order?.moneyPaid ||
        order?.orderStatus?.moneyPaid ||
        (isPaidNum ? totalAmount : 0),
    );

    console.log("[INVOICE TOTALS SUMMARY]:", {
      invoiceNumber,
      orderedDateStr,
      scheduledDateStr,
      customerName: `${title ? `${title}. ` : ""}${fullName}`,
      phone: formattedPhone,
      email,
      packageSectionTotal,
      additionalItemsCalculatedSum,
      additionalItemsTotal,
      totalDiscount,
      deliveryChargeAmount,
      totalAmount,
      creditPaid,
      moneyPaid,
      paymentMethod: orderPaymentMethod,
      isPaid: isPaidNum,
    });
    console.log(
      "==================== [INVOICE DEBUG END] ====================",
    );

    let paymentStatusHtml = "";

    if (paymentMethodLower === "card" || isPaidNum === 1) {
      const creditRowHtml =
        creditPaid > 0
          ? `
          <div style="display: flex; justify-content: space-between; margin-right: 20px; margin-top: 10px;">
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Credit Balance Used</p>
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Rs. ${creditPaid
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
          </div>
        `
          : "";

      const onlineRowHtml =
        moneyPaid > 0
          ? `
          <div style="display: flex; justify-content: space-between; margin-right: 20px; margin-top: ${creditPaid > 0 ? "2px" : "10px"};">
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Online Transferred Amount</p>
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Rs. ${moneyPaid
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
          </div>
        `
          : "";

      paymentStatusHtml = `
          ${creditRowHtml}
          ${onlineRowHtml}
        `;
    } else {
      const cashPendingAmount = Math.max(0, totalAmount - creditPaid);

      const label = deliveryMethodLower.includes("pickup")
        ? "Cash On Pickup (Pending)"
        : "Cash On Delivery (Pending)";

      const warningHtml = deliveryMethodLower.includes("pickup")
        ? ""
        : `
          <p style="font-size: 11px; color: #666666; margin-top: 5px; margin-right: 20px; line-height: 15px;">
            <span style="display: inline-block; background-color: black; color: white; border-radius: 50%; width: 14px; height: 14px; text-align: center; font-size: 10px; line-height: 14px; font-weight: bold; margin-right: 5px; vertical-align: middle;">i</span>
            <span style="vertical-align: middle;">The delivery charges might be different on the day of delivery. Your Grand Total might be changed then.</span>
          </p>
        `;

      const creditRowHtml =
        creditPaid > 0
          ? `
          <div style="display: flex; justify-content: space-between; margin-right: 20px; margin-top: 10px;">
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Credit Balance Used</p>
            <p style="color: #16A34A; font-weight: 600; font-size: 14px;">Rs. ${creditPaid
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
          </div>
        `
          : "";

      paymentStatusHtml = `
          ${creditRowHtml}
          <div style="display: flex; justify-content: space-between; margin-right: 20px; margin-top: ${creditPaid > 0 ? "2px" : "10px"};">
            <p style="color: #EA9A3E; font-weight: 600; font-size: 14px;">${label}</p>
            <p style="color: #EA9A3E; font-weight: 600; font-size: 14px;">Rs. ${cashPendingAmount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
          </div>
          ${warningHtml}
        `;
    }

    return `
       <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Invoice</title>

    <style>
    @page {
      margin-top: 20px;
      size: A4;
    }
      body {
        font-family: Arial, sans-serif;
        padding: 10px;
        margin: 0;
        background-color: #ffffff;
        height: fit-content;
        overflow: hidden;
      }
      .invoice-container {
        width: 100%;
        max-width: 730px;
        margin: auto;
        background: white;
        padding: 20px;
        height: fit-content;
        overflow: hidden;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 30px;
      }
      .top h1 {
        color: #3e206d;
        font-size: 20px;
        text-align: center;
        justify-items: center;
        align-items: center;
      }
      .headerp {
        font-size: 14px;
        line-height: 10px;
      }
      .label {
        color: #929292;
        font-weight: 500;
      }
      .value {
        color: #000000;
        font-weight: normal;
      }
      .logo {
        width: 180px;
        height: auto;
      }
      .bold {
        font-weight: 550;
        font-size: 14px;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .table th,
      .table td {
        border-left: none;
        border-right: none;
        padding: 15px;
        text-align: left;
      }
      .table th {
        background-color: #f8f8f8;
        font-size: 14px;
        font-weight: ;
        justify-items: center;
        border-bottom: 1px solid #ddd;
      }
      .tabledata {
        font-size: 14px;
        font-weight: bold;
        color: #666666;
      }
      .table td {
        text-align: left;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        margin-top: 30px;
        color: #8492A3;
        page-break-after: avoid;
      }
      .section1 {
        margin-top: 10px;
      }
      .section2 {
        margin-top: 10px;
      }
      .section3 {
        margin-top: 10px;
      }
      .section {
        page-break-inside: avoid;
      }
      .ptext {
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <!-- Header Section -->
      <div class="top">
        <h1>INVOICE</h1>
      </div>
      <div class="header">
        <div>
          <p>
            <span style="font-weight: 550; font-size: 16px"
              >Polygon Holdings (Private) Limited</span
            >
          </p>
          <p class="headerp">No. 42/46, Nawam Mawatha, Colombo 02.</p>
          <p class="headerp">Contact No : +94 770 111 999</p>
          <p class="headerp">Email Address : info@polygon.lk</p>
        </div>
        <div>
          <img
            src="${logoBase64}"
            alt="Polygon Logo"
            class="logo"
          />
        </div>
      </div>

      <!-- Billing Section -->
      <div
        class="section1"
        style="display: flex; justify-content: space-between"
      >
        <div>
          <p class="bold">Bill To :</p>
          <p class="headerp">${title ? `${title}. ` : ""}${fullName}</p>
          ${formattedPhone ? `<p class="headerp">${formattedPhone}</p>` : ""}
          ${email ? `<p class="headerp">${email}</p>` : ""}
          <div style="margin-top: 10px">
      ${
        isApartment
          ? `
  <p class="bold">Apartment Address :</p>
  ${buildingNo ? `<p class="headerp"><span class="label">No : </span><span class="value">${buildingNo},</span></p>` : ""}
  ${buildingName ? `<p class="headerp"><span class="label">Name : </span><span class="value">${buildingName},</span></p>` : ""}
  ${unitNo ? `<p class="headerp"><span class="label">Flat : </span><span class="value">${unitNo},</span></p>` : ""}
  ${floorNo ? `<p class="headerp"><span class="label">Floor : </span><span class="value">${floorNo},</span></p>` : ""}
  ${houseNo ? `<p class="headerp"><span class="label">House No : </span><span class="value">${houseNo},</span></p>` : ""}
  ${streetName ? `<p class="headerp"><span class="label">Street Name : </span><span class="value">${streetName},</span></p>` : ""}
  ${city ? `<p class="headerp"><span class="label">City : </span><span class="value">${city}</span></p>` : ""}
    `
          : `
  <p class="bold">House Address :</p>
  ${houseNo ? `<p class="headerp"><span class="label">House No : </span><span class="value">${houseNo},</span></p>` : ""}
  ${streetName ? `<p class="headerp"><span class="label">Street Name : </span><span class="value">${streetName},</span></p>` : ""}
  ${city ? `<p class="headerp"><span class="label">City : </span><span class="value">${city}</span></p>` : ""}
    `
      }
          </div>
          
        </div>
        <div>
          <div style="margin-right: 55px">
            <p class="bold">Grand Total :</p>
            <p style="font-weight: 550; font-size: 16px">Rs. ${totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
            <div class="section" style="margin-top: 30px">
              <p class="bold">Payment Method :</p>
              <p class="headerp">${paymentMethodLower === "card" || isPaidNum === 1 ? "Online Transfer" : "Cash On Delivery"}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          class="section2"
          style="display: flex; justify-content: space-between"
        >
          <div>
            <p class="bold">Invoice No :</p>
            <p class="headerp">${invoiceNumber}</p>
          </div>
          <div style="margin-right: 79px">
            <p class="bold">Ordered Date :</p>
            <p class="headerp">${orderedDateStr}</p>
          </div>
        </div>

        <div
          class="section2"
          style="display: flex; justify-content: space-between"
        >
          <div>
            <p class="bold">Delivery Method :</p>
            <p class="headerp">${deliveryMethodLower.includes("pickup") ? "Store Pickup" : "Home Delivery"}</p>
          </div>
          <div style="margin-right: 64px">
            <p class="bold">Scheduled Date :</p>
            <p class="headerp">${scheduledDateStr}</p>
          </div>
        </div>
      </div>

      ${
        hasPackage
          ? `
      <!-- Package Section -->
      <div class="section" style="margin-top: 40px; margin-bottom: 30px">
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          "
        >
          <div class="bold">${packageName} (${String(packageItemCount || packageItems.length || 1).padStart(2, "0")} Items)</div>
          <div style="font-weight: 550; font-size: 16px">Rs. ${packageSectionTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
        <div style="border: 1px solid #ddd; border-radius: 10px">
          <table class="table">
            <tr>
              <th style="text-align: center; border-top-left-radius: 10px">
                Index
              </th>
              <th>Item Description</th>
              <th style="border-top-right-radius: 10px; width: 40%">QTY</th>
            </tr>
            ${packageDetailsRows}
          </table>
        </div>
      </div>`
          : ""
      }

      ${
        hasAdditionalItems
          ? `
      <!-- Additional Items Section -->
      <div class="section 4">
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
            margin-top:10px
          "
        >
          <div class="bold">${hasPackage ? "Additional Items" : "Custom Items"} (${String(additionalItemsList.length).padStart(2, "0")} ${additionalItemsList.length === 1 ? "Item" : "Items"})</div>
          <div style="font-weight: 550; font-size: 16px">Rs. ${additionalItemsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        </div>
        <div style="border: 1px solid #ddd; border-radius: 10px">
          <table class="table">
            <tr>
              <th style="text-align: center; border-top-left-radius: 10px">
                Index
              </th>
              <th>Item Description</th>
              <th>Unit Price (Rs.)</th>
              <th>QTY (kg)</th>
              <th style="border-top-right-radius: 10px">Amount (Rs.)</th>
            </tr>
            ${additionalItemsRows}
          </table>
        </div>
      </div>`
          : ""
      }

      <!-- Grand Total Section -->
      <div class="section" style="margin-top: 30px">
        <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc;padding-bottom: 10px;" >
          <div class="bold">Grand Total for all items</div>
        </div>
        ${
          hasPackage
            ? `
        <div style="display: flex; justify-content: space-between; margin-right: 20px; " class="ptext" >
          <p>${packageName}</p>
          <p>Rs. ${packageSectionTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
        </div>`
            : ""
        }
        ${
          hasAdditionalItems
            ? `
        <div style=" display: flex; justify-content: space-between; margin-right: 20px;" class="ptext" > 
          <p>${hasPackage ? "Additional Items" : "Custom Items"}</p>
          <p>Rs. ${additionalItemsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
        </div>`
            : ""
        }
        
        <div style="display: flex; justify-content: space-between; margin-right: 20px;" class="ptext" >
          <p>Discount</p>
          <p> Rs. ${totalDiscount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
        </div>
        <div style="display: flex; justify-content: space-between; margin-right: 20px;" class="ptext">
          <p>Delivery Fee</p>
          <p>Rs. ${deliveryChargeAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
        </div>

        <div style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;" ></div>
      </div>

      <!-- Payment Method Section -->
      <div style="margin-top: -10px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; margin-right: 20px;">
        <p>Grand Total</p>
        <p>Rs. ${totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
      </div>

      <!-- Payment Status Section (dynamic: Online Transferred / Credit Balance Used / Cash On Delivery / Cash On Pickup) -->
      ${paymentStatusHtml}

      <!-- Remarks Section -->
      <div class="section">
        <p style=" margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 600;">
          Remarks :
        </p>

        <div style="color: #666666; font-size: 12px; line-height: 10px;">
          <p>Kindly inspect all goods at the time of delivery to ensure accuracy and condition.</p>
          <p>Polygon does not accept returns under any circumstances.</p>
          <p>Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.</p>
          <p>For any assistance, feel free to contact our customer service team.</p>
        </div>
       
      </div>

      <!-- Footer Section -->
      <div class="footer">
        <p style=" margin-top: 30px; font-size: 16px; font-weight: 600; color:#000; font-style:italic">Thank you for shopping with us!</p>
        <p style=" margin-top: -5px; font-size: 14px; font-weight: 500; color:#4B4B4B; font-style:italic">WE WILL SEND YOU MORE OFFERS, LOWEST PRICED VEGGIES FROM US.</p>
        <p style=" margin-top: 30px; font-style:italic">
          - THIS IS A COMPUTER GENERATED INVOICE, THUS NO SIGNATURE REQUIRED -
        </p>
      </div>
    </div>
  </body>
</html>
        `;
  };

  const handleDownloadInvoice = async () => {
    if (isDownloading || isSharing) return;

    try {
      setIsDownloading(true);

      const logoBase64 = await convertLogoToBase64();
      const { order, customerData } = await resolveOrderAndCustomerData();
      const invoiceNumber =
        order?.orderStatus?.invoiceNumber || invoiceNo || `INV-${Date.now()}`;

      const htmlContent = buildHtmlContent(order, customerData, logoBase64);

      const { base64: pdfBase64 } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        base64: true,
      });

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
          `Invoice_${invoiceNumber}.pdf`,
          "application/pdf",
        );

        await FileSystem.writeAsStringAsync(fileUri, pdfBase64!, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert("Success", "Invoice downloaded successfully.");
      } else {
        const filePath = `${FileSystem.documentDirectory}Invoice_${invoiceNumber}.pdf`;

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

  const handleShareInvoice = async () => {
    if (isDownloading || isSharing) return;

    try {
      setIsSharing(true);

      const logoBase64 = await convertLogoToBase64();
      const { order, customerData } = await resolveOrderAndCustomerData();

      const htmlContent = buildHtmlContent(order, customerData, logoBase64);

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Invoice sharing error:", error);
      Alert.alert("Error", "Failed to share invoice. Please try again.");
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
