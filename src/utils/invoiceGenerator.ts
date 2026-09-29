import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface InvoiceItem {
  id: string | number;
  name: string;
  unitPrice: string | number;
  quantity: string | number;
  unit?: string;
  amount: string | number;
  image?: string | null;
  packageDetails?: {
    packageId?: number;
    productTypeId?: number;
    typeName?: string;
    qty?: number;
  }[];
}

export interface BillingInfo {
  title?: string;
  fullName?: string;
  email?: string;
  buildingType?: string;
  houseNo?: string;
  street?: string;
  city?: string;
  phone?: string;
  buildingNo?: string;
  apartmentName?: string;
  buildingName?: string;
  flatNo?: string;
  floorNo?: string;
}

export interface PickupInfo {
  centerId?: string | number;
  centerName?: string | null;
  contact01?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    district?: string | null;
    province?: string | null;
    country?: string | null;
    zipCode?: string | null;
  };
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate?: string;
  scheduledDate?: string;
  deliveryMethod?: string;
  paymentMethod?: string;
  isPaid?: number | null;
  creditPaid?: string | number | null;
  moneyPaid?: string | number | null;
  amountDue?: string;
  isFreeDeliveryCoupon?: boolean;
  qrCode?: string | null;
  familyPackItems?: InvoiceItem[];
  additionalItems?: InvoiceItem[];
  familyPackTotal?: string | number;
  additionalItemsTotal?: string | number;
  deliveryFee?: string | number;
  discount?: string | number;
  couponDiscount?: string | number;
  grandTotal?: string | number;
  fullTotal?: string | number;
  billingInfo?: BillingInfo;
  pickupInfo?: PickupInfo | null;
  // Fallback simple fields:
  packageTotal?: number;
  productTotal?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  scheduleTimeSlot?: string;
}

export type InvoiceDetails = InvoiceData;

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const cleaned = value
    .toString()
    .replace(/Rs\.?\s?/g, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatCurrencyWithCommas(value: string | number | null | undefined): string {
  const numValue = parseAmount(value);
  return `Rs. ${numValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateStr(dateTimeStr?: string): string {
  if (!dateTimeStr || dateTimeStr === "N/A") return "N/A";
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) {
    return dateTimeStr;
  }
  return date.toLocaleDateString("en-US", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
  });
}

export function formatQuantity(quantity: string | number, unit: string = ""): string {
  const numQty = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  if (isNaN(numQty)) return `${quantity} ${unit}`.trim();

  const formattedQty =
    numQty % 1 === 0
      ? numQty.toString()
      : numQty.toFixed(2).replace(/\.?0+$/, "");
  return unit ? `${formattedQty} ${unit}` : formattedQty;
}

/**
 * Normal (undiscounted) line amount = unit price x quantity.
 * Unit price is per kg / per l, so g and ml quantities are divided by 1000.
 * Falls back to the API amount if the values can't be calculated.
 */
export function getGrossItemAmount(item: InvoiceItem): number {
  const unitPrice = parseAmount(item.unitPrice);
  const qty =
    typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
  if (!unitPrice || !qty || isNaN(qty)) return parseAmount(item.amount);

  const unit = (item.unit || "").toLowerCase().trim();
  const factor = unit === "g" || unit === "ml" ? 1 / 1000 : 1;
  return Math.round(unitPrice * qty * factor * 100) / 100;
}

export function formatPhoneNumberStr(phone?: string | null): string {
  if (!phone || phone === "N/A") return "N/A";
  let cleaned = String(phone).trim();
  cleaned = cleaned.replace(/^\++/, "");
  if (cleaned.startsWith("94")) {
    return `+94 ${cleaned.slice(2).trim()}`;
  }
  if (cleaned.startsWith("0")) {
    return `+94 ${cleaned.slice(1).trim()}`;
  }
  return `+94 ${cleaned}`;
}

export function formatItemCount(count: number): string {
  return count === 1 ? "01 Item" : `${count.toString().padStart(2, "0")} Items`;
}

export function detectPaymentType(
  payType: string = "",
  deliveryMethod: string = "",
  creditPaid: number = 0,
  grandTotal: number = 0
): string {
  const isPickup = deliveryMethod?.toLowerCase().includes("pickup");
  const hasCredit = creditPaid > 0;
  const fullyCoveredByCredit = hasCredit && creditPaid >= grandTotal - 0.01;

  if (fullyCoveredByCredit) {
    return "Credit Balance";
  }

  if (payType === "Card" || payType.toLowerCase() === "card") {
    return hasCredit ? "Online Transfer + Credit Balance" : "Online Transfer";
  }

  const base = isPickup ? "Cash on Pickup" : "Cash on Delivery";
  return hasCredit ? `${base} + Credit Balance` : base;
}

export interface PaymentStatusRow {
  label: string;
  amount: number;
  status: "paid" | "pending";
}

export function getPaymentStatusInfo(
  invoice: InvoiceData,
  grandTotal: number
): { rows: PaymentStatusRow[]; showDeliveryNote: boolean } {
  const rows: PaymentStatusRow[] = [];
  let showDeliveryNote = false;

  const isPaid = Number(invoice.isPaid) === 1;
  const isCardPayment =
    invoice.paymentMethod === "Card" ||
    invoice.paymentMethod?.toLowerCase() === "card";
  const creditPaidNum = parseAmount(invoice.creditPaid);
  const hasCreditPaid =
    invoice.creditPaid !== null &&
    invoice.creditPaid !== undefined &&
    creditPaidNum > 0;
  const remainingAfterCredit = grandTotal - creditPaidNum;
  const isPickup = invoice.deliveryMethod?.toLowerCase().includes("pickup");
  const cashLabel = isPickup ? "Cash on Pickup" : "Cash on Delivery";
  const isFreeDelivery = !!invoice.isFreeDeliveryCoupon;

  const push = (label: string, amount: number, status: "paid" | "pending") => {
    rows.push({ label, amount, status });
  };

  if (hasCreditPaid) {
    push("Credit Balance Used", creditPaidNum, "paid");

    if (remainingAfterCredit > 0.01) {
      if (isPaid) {
        if (isCardPayment) {
          push("Online Transferred Amount", remainingAfterCredit, "paid");
        } else {
          push(cashLabel, remainingAfterCredit, "paid");
        }
      } else if (isPickup) {
        push("Cash On Pickup", remainingAfterCredit, "pending");
      } else {
        push("Cash On Delivery", remainingAfterCredit, "pending");
        showDeliveryNote = !isFreeDelivery;
      }
    }
  } else {
    if (isPaid) {
      if (isCardPayment) {
        push("Online Transferred Amount", grandTotal, "paid");
      } else {
        push(cashLabel, grandTotal, "paid");
      }
    } else if (isPickup) {
      push("Cash On Pickup", grandTotal, "pending");
    } else {
      push("Cash On Delivery", grandTotal, "pending");
      showDeliveryNote = !isFreeDelivery;
    }
  }

  return { rows, showDeliveryNote };
}

export const buildInvoiceHtml = (
  invoice: InvoiceData,
  logoBase64?: string,
  buyerType: string = "Retail"
): string => {
  const creditPaidAmount = parseAmount(invoice.creditPaid);
  const grandTotalAmount = parseAmount(invoice.grandTotal);
  const isPickup = (invoice.deliveryMethod || "").toLowerCase().includes("pickup");
  const deliveryMethodLabel = isPickup ? "Instore Pickup" : "Home Delivery";

  const paymentTypeLabel =
    detectPaymentType(
      invoice.paymentMethod || "Cash",
      invoice.deliveryMethod || "",
      creditPaidAmount,
      grandTotalAmount
    ) || "N/A";

  const billing: BillingInfo = invoice.billingInfo || {
    title: "",
    fullName: invoice.customerName || "Valued Customer",
    phone: invoice.customerPhone || "N/A",
    email: invoice.customerEmail || "N/A",
    houseNo: "",
    street: invoice.customerAddress || "",
    city: "",
    buildingType: "House",
  };

  const isApartment = billing.buildingType === "Apartment";

  // Remove trailing dots from the title so "Mrs." doesn't become "Mrs.."
  const cleanTitle = (billing.title || "").trim().replace(/\.+$/, "");

  const familyPacks = invoice.familyPackItems || [];
  const additionalItems = invoice.additionalItems || [];

  const familyPackTotalNum =
    parseAmount(invoice.familyPackTotal) || invoice.packageTotal || 0;
  // Use the gross sum of the item amounts. The API's additionalItemsTotal can
  // already have the discount deducted, which caused it to be subtracted twice.
  const additionalItemsSum = additionalItems.reduce(
    (sum, item) => sum + getGrossItemAmount(item),
    0
  );
  const additionalItemsTotalNum =
    additionalItemsSum > 0
      ? additionalItemsSum
      : parseAmount(invoice.additionalItemsTotal) || invoice.productTotal || 0;
  const deliveryFeeNum =
    isPickup || invoice.isFreeDeliveryCoupon ? 0 : parseAmount(invoice.deliveryFee);
  const discountNum = parseAmount(invoice.discount);
  const couponDiscountNum = parseAmount(invoice.couponDiscount);

  let finalGrandTotal = 0;
  if (familyPacks.length > 0) finalGrandTotal += familyPackTotalNum;
  if (additionalItems.length > 0) finalGrandTotal += additionalItemsTotalNum;
  if (!isPickup) finalGrandTotal += deliveryFeeNum;
  finalGrandTotal -= discountNum;
  finalGrandTotal -= couponDiscountNum;
  finalGrandTotal = Math.max(finalGrandTotal, 0);

  if (finalGrandTotal === 0 && grandTotalAmount > 0) {
    finalGrandTotal = grandTotalAmount;
  }

  const { rows: paymentStatusRows, showDeliveryNote } = getPaymentStatusInfo(
    invoice,
    finalGrandTotal
  );
  

  // Pickup centre details (safe even when pickupInfo is null/undefined)
  const pickup = invoice.pickupInfo || null;
  const pickupCentreName = pickup?.centerName || "N/A";
  const pickupCity = pickup?.address?.city || "N/A";
  const pickupDistrict = pickup?.address?.district || "N/A";
  const pickupProvince = pickup?.address?.province || "N/A";
  const pickupContact = pickup?.contact01
    ? formatPhoneNumberStr(pickup.contact01)
    : "N/A";

  const nowColombo = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const todayFormatted = new Date()
    .toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      background-color: #ffffff;
      color: #212121;
      font-size: 11px;
      line-height: 1.4;
      padding: 16px 20px;
    }
    .invoice-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0.2em;
      color: #3E206D;
      margin-bottom: 12px;
    }
    .company-header {
      display: grid;
      grid-template-columns: 3fr 2fr;
      column-gap: 0;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .company-details {
      font-size: 11px;
      color: #000000;
      line-height: 1.5;
    }
    .company-details .name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .company-details p {
      font-size: 10px;
      color: #333333;
    }
    .logo-container {
      text-align: left;
    }
    .logo-container img {
      max-width: 140px;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .brand-fallback {
      font-size: 22px;
      font-weight: 800;
      color: #3E206D;
    }
    .brand-fallback span {
      color: #16A34A;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      column-gap: 0;
      row-gap: 8px;
      font-size: 11px;
      margin-bottom: 12px;
    }
    .info-block {
      line-height: 1.5;
    }
    .info-block .bold-label {
      font-weight: bold;
      color: #000000;
      font-size: 11px;
    }
    .info-block p {
      font-size: 10.5px;
      color: #000000;
    }
    .lbl-grey {
      color: #929292;
    }
    .grand-total-display {
      font-size: 16px;
      font-weight: 800;
      color: #000000;
      margin-top: 1px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    .section-header h2 {
      font-size: 12px;
      font-weight: bold;
      color: #000000;
    }
    .section-header .section-total {
      font-size: 13px;
      font-weight: bold;
      color: #000000;
    }
    .divider {
      border-top: 1px solid #D7D7D7;
      margin-bottom: 6px;
    }
    .table-container {
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    th {
      background-color: #F8F8F8;
      border-bottom: 1px solid #D1D5DB;
      padding: 5px 8px;
      text-align: left;
      font-weight: bold;
      color: #111111;
      font-size: 10.5px;
    }
    td {
      border-bottom: 1px solid #E5E7EB;
      padding: 5px 8px;
      font-size: 10px;
      color: #212121;
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .summary-table td {
      border: none;
      padding: 3px 6px;
      font-size: 11px;
      color: #212121;
    }
    .summary-table tr.total-row td {
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      font-weight: bold;
      font-size: 12px;
      color: #000000;
      padding: 5px 6px;
    }
    .summary-table tr.paid-row td {
      font-weight: bold;
      color: #16A34A;
      padding-top: 5px;
    }
    .summary-table tr.pending-row td {
      font-weight: bold;
      color: #D97706;
      padding-top: 5px;
    }
    .delivery-note {
      font-size: 9.5px;
      color: #4B5563;
      margin-top: 4px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .info-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      height: 12px;
      background-color: #1a1a1a;
      color: #ffffff;
      border-radius: 50%;
      font-size: 8px;
      font-style: normal;
      font-weight: bold;
    }
    .remarks-section {
      margin-top: 12px;
      font-size: 10px;
      color: #374151;
      line-height: 1.5;
    }
    .remarks-section .remarks-title {
      font-weight: bold;
      color: #000000;
      font-size: 10.5px;
      margin-bottom: 4px;
    }
    .remarks-section p {
      margin-bottom: 2px;
    }
    .footer-section {
      margin-top: 14px;
      text-align: center;
      font-size: 9px;
      color: #4B5563;
      line-height: 1.5;
    }
    .footer-section .thank-you {
      font-size: 11px;
      font-weight: bold;
      font-style: italic;
      color: #000000;
      margin-bottom: 2px;
    }
    .footer-section .promo {
      font-style: italic;
      color: #212121;
      margin-bottom: 6px;
    }
    .footer-section .computer-generated {
      font-style: italic;
      color: #9CA3AF;
      font-size: 8.5px;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="invoice-title">INVOICE</div>

  <div class="company-header">
    <div class="company-details">
      <div class="name">Polygon Holdings (Private) Ltd</div>
      <p>No. 42/46, Nawam Mawatha, Colombo 02.</p>
      <p>Contact No: +94 770 111 999</p>
      <p>Email Address: info@polygon.lk</p>
    </div>
    <div class="logo-container">
      ${
        logoBase64
          ? `<img src="${logoBase64}" alt="Polygon Logo" />`
          : `<div class="brand-fallback">Govi<span>Mart</span></div>`
      }
    </div>
  </div>

  <div class="info-grid">
    <!-- Left Column: Bill To, Address, Invoice No, Delivery Method, Pickup Centre -->
    <div>
      <div class="info-block">
        <p class="bold-label">Bill To:</p>
        <p>${cleanTitle ? `${cleanTitle}. ` : ""}${billing.fullName || "Valued Customer"}</p>
        <p style="word-break: break-all;">${billing.email || "N/A"}</p>
        <p>${formatPhoneNumberStr(billing.phone)}</p>
      </div>

      ${
        !isPickup
          ? `
      <div class="info-block" style="margin-top: 5px;">
        ${
          isApartment
            ? `
          <p class="bold-label">Apartment Address :</p>
          <p><span class="lbl-grey">No :</span> ${billing.buildingNo || "N/A"},</p>
          <p><span class="lbl-grey">Name :</span> ${billing.apartmentName || billing.buildingName || "N/A"},</p>
          <p><span class="lbl-grey">Flat :</span> ${billing.flatNo || "N/A"},</p>
          <p><span class="lbl-grey">Floor :</span> ${billing.floorNo || "N/A"},</p>
          <p><span class="lbl-grey">House No :</span> ${billing.houseNo || "N/A"},</p>
          <p><span class="lbl-grey">Street Name :</span> ${billing.street || "N/A"}</p>
          <p><span class="lbl-grey">City :</span> ${billing.city || "N/A"}</p>
        `
            : `
          <p class="bold-label">House Address :</p>
          <p><span class="lbl-grey">House No :</span> ${billing.houseNo || "N/A"},</p>
          <p><span class="lbl-grey">Street Name :</span> ${billing.street || "N/A"},</p>
          <p><span class="lbl-grey">City :</span> ${billing.city || "N/A"}</p>
        `
        }
      </div>
      `
          : ""
      }

      <div class="info-block" style="margin-top: 5px;">
        <p class="bold-label">Invoice No:</p>
        <p>${invoice.invoiceNumber}</p>
      </div>

      <div class="info-block" style="margin-top: 5px;">
        <p class="bold-label">Delivery Method:</p>
        <p>${deliveryMethodLabel}</p>
      </div>

      ${
        isPickup
          ? `
      <div class="info-block" style="margin-top: 5px;">
        <p class="bold-label">Pickup Centre:</p>
        <p>${pickupCentreName}</p>
        <p><span class="lbl-grey">City :</span> ${pickupCity}</p>
        <p><span class="lbl-grey">District :</span> ${pickupDistrict}</p>
        <p><span class="lbl-grey">Province :</span> ${pickupProvince}</p>
      </div>
      `
          : ""
      }
    </div>

    <!-- Right Column: Grand Total, Payment Method, Ordered Date, Scheduled Date -->
    <div>
      <div class="info-block">
        <p class="bold-label">Grand Total:</p>
        <p class="grand-total-display">${formatCurrencyWithCommas(finalGrandTotal)}</p>
      </div>

      <div class="info-block" style="margin-top: 12px;">
        <p class="bold-label">Payment Method:</p>
        <p>${paymentTypeLabel}</p>
      </div>

      <div class="info-block" style="margin-top: 12px;">
        <p class="bold-label">Ordered Date:</p>
        <p>${formatDateStr(invoice.invoiceDate)}</p>
      </div>

      <div class="info-block" style="margin-top: 12px;">
        <p class="bold-label">Scheduled Date:</p>
        <p>${formatDateStr(invoice.scheduledDate)}</p>
      </div>
    </div>
  </div>

  <!-- Family Pack Sections -->
  ${familyPacks
    .map((pack) => {
      const itemCount = (pack.packageDetails || []).reduce(
        (sum, d) => sum + (d.qty || 0),
        0
      );
      return `
    <div class="section-header">
      <h2>${pack.name || "Family Pack"} (${formatItemCount(itemCount || Number(pack.quantity) || 1)})</h2>
      <span class="section-total">${formatCurrencyWithCommas(pack.amount)}</span>
    </div>
    <div class="divider"></div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Index</th>
            <th style="width: 70%;">Item Description</th>
            <th style="width: 20%;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${
            pack.packageDetails && pack.packageDetails.length > 0
              ? pack.packageDetails
                  .map(
                    (detail, idx) => `
            <tr>
              <td>${idx + 1}.</td>
              <td>${detail.typeName || "Item"}</td>
              <td>${detail.qty || 1}</td>
            </tr>
          `
                  )
                  .join("")
              : `
            <tr>
              <td colspan="3" class="text-center" style="color: #6B7280; padding: 10px;">No package details available.</td>
            </tr>
          `
          }
        </tbody>
      </table>
    </div>
    `;
    })
    .join("")}

  <!-- Additional Items Section -->
  ${
    additionalItems.length > 0
      ? `
  <div class="section-header">
    <h2>${buyerType === "Wholesale" ? "Selected Items" : "Additional Items"} (${formatItemCount(additionalItems.length)})</h2>
    <span class="section-total">${formatCurrencyWithCommas(additionalItemsTotalNum)}</span>
  </div>
  <div class="divider"></div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Index</th>
          <th style="width: 40%;">Item Description</th>
          <th style="width: 20%;">Unit Price (Rs.)</th>
          <th style="width: 15%;">QTY</th>
          <th style="width: 15%;">Amount (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        ${additionalItems
          .map(
            (item, idx) => `
          <tr>
            <td>${idx + 1}.</td>
            <td>${item.name || "Item"}</td>
            <td>${formatCurrencyWithCommas(item.unitPrice)}</td>
            <td>${formatQuantity(item.quantity, item.unit)}</td>
            <td>${formatCurrencyWithCommas(getGrossItemAmount(item))}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `
      : ""
  }

  <!-- Grand Total for all items Section -->
  <div class="section-header" style="margin-top: 14px;">
    <h2>Grand Total for all items</h2>
  </div>
  <div class="divider"></div>

  <table class="summary-table">
    <tbody>
      ${
        familyPacks.length > 0
          ? `
      <tr>
        <td>Total Price for Packages</td>
        <td class="text-right">${formatCurrencyWithCommas(familyPackTotalNum)}</td>
      </tr>
      `
          : ""
      }

      ${
        additionalItems.length > 0
          ? `
      <tr>
        <td>${buyerType === "Wholesale" ? "Selected Items" : "Additional Items"}</td>
        <td class="text-right">${formatCurrencyWithCommas(additionalItemsTotalNum)}</td>
      </tr>
      `
          : ""
      }

      ${
        !isPickup && deliveryFeeNum > 0
          ? `
      <tr>
        <td>Delivery Charges</td>
        <td class="text-right">${formatCurrencyWithCommas(deliveryFeeNum)}</td>
      </tr>
      `
          : ""
      }

      ${
        discountNum > 0
          ? `
      <tr>
        <td>Discount</td>
        <td class="text-right">- ${formatCurrencyWithCommas(discountNum)}</td>
      </tr>
      `
          : ""
      }

      ${
        couponDiscountNum > 0
          ? `
      <tr>
        <td>Coupon Discount</td>
        <td class="text-right">- ${formatCurrencyWithCommas(couponDiscountNum)}</td>
      </tr>
      `
          : ""
      }

      <tr class="total-row">
        <td>Grand Total</td>
        <td class="text-right">${formatCurrencyWithCommas(finalGrandTotal)}</td>
      </tr>

      ${paymentStatusRows
        .map(
          (row) => `
      <tr class="${row.status === "paid" ? "paid-row" : "pending-row"}">
        <td>${row.label}</td>
        <td class="text-right">${formatCurrencyWithCommas(row.amount)}</td>
      </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  ${
    showDeliveryNote
      ? `
  <div class="delivery-note">
    <span class="info-badge">i</span>
    <span>The delivery charges might be different on the day of delivery. Your Grand Total might be changed then.</span>
  </div>
  `
      : ""
  }

  <!-- Remarks -->
  <div class="remarks-section">
    <div class="remarks-title">Remarks:</div>
    <p>Kindly inspect all goods at the time of delivery to ensure accuracy and condition.</p>
    <p>Polygon does not accept returns under any circumstances.</p>
    <p>Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.</p>
    <p>For any assistance, feel free to contact our customer service team.</p>
  </div>

  <!-- Footer -->
  <div class="footer-section">
    <div class="thank-you">Thank you for shopping with us!</div>
    <div class="promo">WE WILL SEND YOU MORE OFFERS, LOWEST PRICED VEGGIES FROM US</div>
    <div class="computer-generated">-THIS IS A COMPUTER GENERATED INVOICE, THUS NO SIGNATURE REQUIRED-</div>
    <div class="computer-generated">-GENERATED AT: ${nowColombo}, ${todayFormatted}-</div>
  </div>
</body>
</html>
  `;
};

export const generateAndShareInvoicePdf = async (
  invoice: InvoiceData,
  logoBase64?: string,
  isDownload: boolean = true,
  buyerType: string = "Retail"
) => {
  try {
    const html = buildInvoiceHtml(invoice, logoBase64, buyerType);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: isDownload
          ? `Download Invoice #${invoice.invoiceNumber}`
          : `Share Invoice #${invoice.invoiceNumber}`,
      });
    }
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
  }
};