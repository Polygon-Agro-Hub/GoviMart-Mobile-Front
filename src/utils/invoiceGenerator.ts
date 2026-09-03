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
    flatNo?: string;
    floorNo?: string;
}

export interface PickupInfo {
    centerId?: string;
    centerName?: string;
    contact01?: string;
    address?: {
        street?: string;
        city?: string;
        district?: string;
        province?: string;
        country?: string;
        zipCode?: string;
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
    familyPackTotal?: string;
    additionalItemsTotal?: string;
    deliveryFee?: string;
    discount?: string;
    couponDiscount?: string;
    grandTotal?: string;
    billingInfo?: BillingInfo;
    pickupInfo?: PickupInfo;
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

const parseNum = (val: any): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/Rs\.?\s?/g, "").replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

const formatPrice = (val: any): string => {
    const num = parseNum(val);
    return `Rs. ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateStr = (dateStr?: string): string => {
    if (!dateStr || dateStr === "N/A") return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export const buildInvoiceHtml = (invoice: InvoiceData): string => {
    const isPickup = (invoice.deliveryMethod || "").toLowerCase().includes("pickup");
    const deliveryMethodLabel = isPickup ? "Instore Pickup" : "Home Delivery";
    const creditPaidNum = parseNum(invoice.creditPaid);
    const moneyPaidNum = parseNum(invoice.moneyPaid);
    const grandTotalNum = parseNum(invoice.grandTotal);
    const isPaid = Number(invoice.isPaid) === 1;

    let paymentMethodLabel = invoice.paymentMethod || "Cash";
    if (creditPaidNum > 0 && moneyPaidNum > 0) {
        paymentMethodLabel = `${invoice.paymentMethod === "Card" ? "Online Transfer" : (isPickup ? "Cash on Pickup" : "Cash on Delivery")} + Credit Balance`;
    } else if (creditPaidNum > 0 && moneyPaidNum === 0) {
        paymentMethodLabel = "Credit Balance";
    } else if (invoice.paymentMethod === "Card") {
        paymentMethodLabel = "Online Transfer";
    } else {
        paymentMethodLabel = isPickup ? "Cash on Pickup" : "Cash on Delivery";
    }

    const familyPacks = invoice.familyPackItems || [];
    const additionalItems = invoice.additionalItems || [];

    const familyPackTotalNum = parseNum(invoice.familyPackTotal) || (invoice.packageTotal || 0);
    const additionalItemsTotalNum = parseNum(invoice.additionalItemsTotal) || (invoice.productTotal || 0);
    const deliveryFeeNum = isPickup || invoice.isFreeDeliveryCoupon ? 0 : (parseNum(invoice.deliveryFee) || 0);
    const discountNum = parseNum(invoice.discount) || 0;
    const couponDiscountNum = parseNum(invoice.couponDiscount) || 0;

    const billing = invoice.billingInfo || {
        title: "",
        fullName: invoice.customerName || "Customer",
        phone: invoice.customerPhone || "N/A",
        email: invoice.customerEmail || "N/A",
        houseNo: "",
        street: invoice.customerAddress || "",
        city: "",
        buildingType: "House",
    };

    const isApartment = billing.buildingType === "Apartment";
    const nowColombo = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice - ${invoice.invoiceNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 24px 32px;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
        }
        body {
            padding: 24px 30px;
            color: #212121;
            background: #FFFFFF;
            font-size: 11px;
            line-height: 1.4;
        }
        .header-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #3E206D;
            margin-bottom: 20px;
        }
        .company-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        .company-title {
            font-size: 12px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 2px;
        }
        .company-info {
            font-size: 9.5px;
            color: #4B5563;
            line-height: 1.45;
        }
        .brand-logo {
            font-size: 20px;
            font-weight: 800;
            color: #3E206D;
            text-align: right;
        }
        .brand-logo span {
            color: #16A34A;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 24px;
            margin-bottom: 16px;
            padding-top: 10px;
        }
        .meta-group {
            margin-bottom: 8px;
        }
        .meta-group strong {
            display: block;
            font-size: 10px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 1px;
        }
        .meta-group p {
            font-size: 9.5px;
            color: #212121;
            line-height: 1.4;
        }
        .lbl-grey {
            color: #929292;
        }
        .grand-total-highlight {
            font-size: 14px;
            font-weight: 800;
            color: #000000;
            margin-top: 1px;
        }
        .section-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 14px;
            margin-bottom: 4px;
        }
        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #000000;
        }
        .section-amount {
            font-size: 10.5px;
            font-weight: bold;
            color: #000000;
        }
        .divider-line {
            height: 1px;
            background-color: #D7D7D7;
            margin-bottom: 6px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        th {
            background-color: #F8F8F8;
            border: 1px solid #D1D5DB;
            padding: 5px 8px;
            font-size: 9px;
            text-align: left;
            font-weight: bold;
            color: #111111;
        }
        td {
            border: 1px solid #E5E7EB;
            padding: 5px 8px;
            font-size: 9px;
            color: #212121;
            vertical-align: top;
        }
        .text-right {
            text-align: right;
        }
        .pkg-item-list {
            margin-top: 3px;
            padding-left: 12px;
            font-size: 8.5px;
            color: #6B7280;
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
            font-size: 9.5px;
            color: #212121;
        }
        .summary-table tr.total-row td {
            border-top: 2px solid #000000;
            border-bottom: 2px solid #000000;
            font-weight: bold;
            font-size: 10.5px;
            color: #000000;
            padding: 6px 6px;
        }
        .summary-table tr.paid-row td {
            font-weight: bold;
            color: #16A34A;
            padding-top: 4px;
        }
        .summary-table tr.pending-row td {
            font-weight: bold;
            color: #D97706;
            padding-top: 4px;
        }
        .delivery-note {
            font-size: 8.5px;
            font-style: italic;
            color: #4B5563;
            margin-top: 4px;
            margin-bottom: 10px;
        }
        .qr-container {
            margin-top: 14px;
            text-align: center;
        }
        .qr-container img {
            width: 85px;
            height: 85px;
            margin: 0 auto 3px auto;
            display: block;
        }
        .qr-container span {
            font-size: 8px;
            color: #6B7280;
        }
        .remarks-box {
            margin-top: 12px;
            font-size: 8.5px;
            line-height: 1.5;
            color: #374151;
            border-top: 1px dashed #D1D5DB;
            padding-top: 8px;
        }
        .remarks-box strong {
            display: block;
            font-size: 9px;
            color: #000000;
            margin-bottom: 2px;
        }
        .footer-box {
            margin-top: 12px;
            text-align: center;
            font-size: 8px;
            color: #6B7280;
            line-height: 1.4;
        }
        .footer-box .f-bold {
            font-weight: bold;
            font-style: italic;
            font-size: 9px;
            color: #111827;
            margin-bottom: 2px;
        }
        .footer-box .f-sub {
            font-style: italic;
            margin-bottom: 4px;
        }
        .footer-box .f-comp {
            font-style: italic;
            color: #9CA3AF;
        }
    </style>
</head>
<body>
    <div class="header-title">INVOICE</div>

    <div class="company-row">
        <div>
            <div class="company-title">Polygon Holdings (Private) Ltd</div>
            <div class="company-info">
                No. 42/46, Nawam Mawatha, Colombo 02.<br />
                Contact No: +94 770 111 999<br />
                Email Address: info@polygon.lk
            </div>
        </div>
        <div class="brand-logo">
            Govi<span>Mart</span>
        </div>
    </div>

    <div class="meta-grid">
        <div>
            <div class="meta-group">
                <strong>Bill To:</strong>
                <p>${billing.title ? `${billing.title}. ` : ""}${billing.fullName || "Valued Customer"}</p>
                <p>${billing.email || "N/A"}</p>
                <p>${billing.phone || "N/A"}</p>
            </div>

            ${!isPickup ? `
            <div class="meta-group">
                <strong>${isApartment ? "Apartment Address:" : "House Address:"}</strong>
                ${isApartment ? `
                    <p><span class="lbl-grey">No :</span> ${billing.buildingNo || "N/A"},</p>
                    <p><span class="lbl-grey">Name :</span> ${billing.apartmentName || "N/A"},</p>
                    <p><span class="lbl-grey">Flat :</span> ${billing.flatNo || "N/A"},</p>
                    <p><span class="lbl-grey">Floor :</span> ${billing.floorNo || "N/A"},</p>
                    <p><span class="lbl-grey">House No :</span> ${billing.houseNo || "N/A"},</p>
                    <p><span class="lbl-grey">Street Name :</span> ${billing.street || "N/A"},</p>
                    <p><span class="lbl-grey">City :</span> ${billing.city || "N/A"}</p>
                ` : `
                    <p><span class="lbl-grey">House No :</span> ${billing.houseNo || "N/A"},</p>
                    <p><span class="lbl-grey">Street Name :</span> ${billing.street || "N/A"},</p>
                    <p><span class="lbl-grey">City :</span> ${billing.city || "N/A"}</p>
                `}
            </div>
            ` : ""}

            ${isPickup && invoice.pickupInfo ? `
            <div class="meta-group">
                <strong>Centre :</strong> <p>${invoice.pickupInfo.centerName || "N/A"}</p>
                <p><span class="lbl-grey">City :</span> ${invoice.pickupInfo.address?.city || "N/A"}</p>
                <p><span class="lbl-grey">District :</span> ${invoice.pickupInfo.address?.district || "N/A"}</p>
                <p><span class="lbl-grey">Province :</span> ${invoice.pickupInfo.address?.province || "N/A"}</p>
            </div>
            ` : ""}

            <div class="meta-group">
                <strong>Invoice No:</strong>
                <p>${invoice.invoiceNumber}</p>
            </div>

            <div class="meta-group">
                <strong>Delivery Method:</strong>
                <p>${deliveryMethodLabel}</p>
            </div>
        </div>

        <div>
            <div class="meta-group">
                <strong>Grand Total:</strong>
                <p class="grand-total-highlight">Rs. ${grandTotalNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <div class="meta-group">
                <strong>Payment Method:</strong>
                <p>${paymentMethodLabel}</p>
            </div>

            <div class="meta-group">
                <strong>Ordered Date:</strong>
                <p>${formatDateStr(invoice.invoiceDate)}</p>
            </div>

            <div class="meta-group">
                <strong>Scheduled Date:</strong>
                <p>${formatDateStr(invoice.scheduledDate)}</p>
            </div>

            ${invoice.scheduleTimeSlot ? `
            <div class="meta-group">
                <strong>Time Slot:</strong>
                <p>${invoice.scheduleTimeSlot}</p>
            </div>` : ""}
        </div>
    </div>

    ${familyPacks.map((pack) => {
        const itemCount = (pack.packageDetails || []).reduce((sum, d) => sum + (d.qty || 0), 0);
        return `
        <div class="section-header-row">
            <span class="section-title">${pack.name || "Family Pack"} (${String(itemCount).padStart(2, "0")} Items)</span>
            <span class="section-amount">${formatPrice(pack.amount)}</span>
        </div>
        <div class="divider-line"></div>
        <table>
            <thead>
                <tr>
                    <th style="width: 10%;">Index</th>
                    <th style="width: 70%;">Item Description</th>
                    <th style="width: 20%;">QTY</th>
                </tr>
            </thead>
            <tbody>
                ${(pack.packageDetails && pack.packageDetails.length > 0) ? pack.packageDetails.map((detail, idx) => `
                    <tr>
                        <td>${idx + 1}.</td>
                        <td>${detail.typeName}</td>
                        <td>${String(detail.qty).padStart(2, "0")}</td>
                    </tr>
                `).join("") : `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #6B7280;">No package details available.</td>
                    </tr>
                `}
            </tbody>
        </table>
        `;
    }).join("")}

    ${additionalItems.length > 0 ? `
    <div class="section-header-row">
        <span class="section-title">Additional Items (${String(additionalItems.length).padStart(2, "0")} Items)</span>
        <span class="section-amount">${formatPrice(additionalItemsTotalNum)}</span>
    </div>
    <div class="divider-line"></div>
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
            ${additionalItems.map((item, idx) => `
                <tr>
                    <td>${idx + 1}.</td>
                    <td>${item.name || "Item"}</td>
                    <td>${formatPrice(item.unitPrice)}</td>
                    <td>${item.quantity || "1"} ${item.unit || ""}</td>
                    <td>${formatPrice(item.amount)}</td>
                </tr>
            `).join("")}
        </tbody>
    </table>
    ` : ""}

    <div class="section-header-row">
        <span class="section-title">Grand Total for all items</span>
    </div>
    <div class="divider-line"></div>

    <table class="summary-table">
        <tbody>
            ${familyPackTotalNum > 0 ? `
            <tr>
                <td>Total Price for Packages</td>
                <td class="text-right">Rs. ${familyPackTotalNum.toFixed(2)}</td>
            </tr>` : ""}

            ${additionalItemsTotalNum > 0 ? `
            <tr>
                <td>Additional Items</td>
                <td class="text-right">Rs. ${additionalItemsTotalNum.toFixed(2)}</td>
            </tr>` : ""}

            ${deliveryFeeNum > 0 ? `
            <tr>
                <td>Delivery Charges</td>
                <td class="text-right">Rs. ${deliveryFeeNum.toFixed(2)}</td>
            </tr>` : ""}

            ${discountNum > 0 ? `
            <tr>
                <td>Discount</td>
                <td class="text-right">- Rs. ${discountNum.toFixed(2)}</td>
            </tr>` : ""}

            ${couponDiscountNum > 0 ? `
            <tr>
                <td>Coupon Discount</td>
                <td class="text-right">- Rs. ${couponDiscountNum.toFixed(2)}</td>
            </tr>` : ""}

            <tr class="total-row">
                <td>Grand Total</td>
                <td class="text-right">Rs. ${grandTotalNum.toFixed(2)}</td>
            </tr>

            ${creditPaidNum > 0 ? `
            <tr class="paid-row">
                <td>Credit Balance Used</td>
                <td class="text-right">Rs. ${creditPaidNum.toFixed(2)}</td>
            </tr>` : ""}

            ${moneyPaidNum > 0 ? `
            <tr class="${isPaid ? "paid-row" : "pending-row"}">
                <td>${invoice.paymentMethod === "Card" ? "Online Transferred Amount" : (isPickup ? "Cash on Pickup" : "Cash on Delivery")}</td>
                <td class="text-right">Rs. ${moneyPaidNum.toFixed(2)}</td>
            </tr>` : ""}

            ${creditPaidNum === 0 && moneyPaidNum === 0 ? `
            <tr class="${isPaid ? "paid-row" : "pending-row"}">
                <td>${isPaid ? (invoice.paymentMethod === "Card" ? "Online Transferred Amount" : "Paid") : (isPickup ? "Cash on Pickup" : "Cash on Delivery")}</td>
                <td class="text-right">Rs. ${grandTotalNum.toFixed(2)}</td>
            </tr>` : ""}
        </tbody>
    </table>

    ${!isPaid && !isPickup ? `
    <div class="delivery-note">
        ⓘ The delivery charges might be different on the day of delivery. Your Grand Total might be changed then.
    </div>
    ` : ""}

    ${invoice.qrCode ? `
    <div class="qr-container">
        <img src="${invoice.qrCode}" alt="QR Code" />
        <span>Scan to verify invoice #${invoice.invoiceNumber}</span>
    </div>
    ` : ""}

    <div class="remarks-box">
        <strong>Remarks:</strong>
        Kindly inspect all goods at the time of delivery to ensure accuracy and condition.<br />
        Polygon does not accept returns under any circumstances.<br />
        Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.<br />
        For any assistance, feel free to contact our customer service team.
    </div>

    <div class="footer-box">
        <div class="f-bold">Thank you for shopping with us!</div>
        <div class="f-sub">WE WILL SEND YOU MORE OFFERS, LOWEST PRICED VEGGIES FROM US</div>
        <div class="f-comp">- THIS IS A COMPUTER GENERATED INVOICE, THUS NO SIGNATURE REQUIRED -</div>
        <div class="f-comp">- GENERATED AT: ${nowColombo} -</div>
    </div>
</body>
</html>
    `;
};

export const generateAndShareInvoicePdf = async (invoice: InvoiceData, isDownload: boolean = true) => {
    try {
        const html = buildInvoiceHtml(invoice);

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
