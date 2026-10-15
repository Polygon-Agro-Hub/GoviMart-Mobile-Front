import React from "react";
import { Text, TextStyle } from "react-native";

export const NOTIFICATION_TITLES = {
  PACKAGE_FINALIZATION_REVIEW: "Package Finalization Review",
  ORDER_PROCESSING: "Order is Processing",
  ORDER_OUT_FOR_DELIVERY: "Order is Out for Delivery",
  PAYMENT_REMINDER: "Payment Reminder !!!",
  ORDER_READY_TO_PICKUP: "Order is Ready to Pickup",
  ORDER_PICKED_UP: "Order Picked up",
  ORDER_COLLECTED_BY_DRIVER: "Order Collected by Driver",
  ORDER_ON_THE_WAY: "Order is On the Way",
  ORDER_DELIVERED: "Order Delivered",
  ORDER_ON_HOLD: "Order On Hold",
  ORDER_ON_THE_WAY_AGAIN: "Order is On the Way Again",
  ORDER_RETURNED: "Order Returned",
  ORDER_CANCELLED: "Order Cancelled",
} as const;

/**
 * Returns true ONLY if the notification requires an Action Required badge.
 * (Package Finalization Review and Payment Reminder !!!)
 */
export const isActionRequiredNotification = (title?: string): boolean => {
  if (!title) return false;
  const normalized = title.trim().toLowerCase();
  return (
    normalized.includes("package finalization review") ||
    normalized.includes("payment reminder")
  );
};

export interface NotificationTemplateParams {
  invoiceNo?: string;
  date?: string;
  amount?: string | number;
  reason?: string;
  deadline?: string;
}

export const NOTIFICATION_TEMPLATES: Record<
  string,
  (params: NotificationTemplateParams) => string
> = {
  [NOTIFICATION_TITLES.PACKAGE_FINALIZATION_REVIEW]: (p) =>
    `Please review and finalize your package in #${p.invoiceNo || "[Invoice No]"} to proceed the order.`,

  [NOTIFICATION_TITLES.ORDER_PROCESSING]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, scheduled for ${p.date || "August 8"}, is now being processed. We’ll keep you informed with further updates.`,

  [NOTIFICATION_TITLES.ORDER_OUT_FOR_DELIVERY]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, scheduled for ${p.date || "August 8"}, is now out for delivery. One of our drivers will be assigned to deliver your order shortly.`,

  [NOTIFICATION_TITLES.PAYMENT_REMINDER]: (p) =>
    `Order #${p.invoiceNo || "[Invoice No.]"} – Rs. ${p.amount || "1,000.00"}, scheduled for ${p.date || "September 3"}. Please pay via online banking before ${p.deadline || "September 1 at 6:00 PM"} to avoid cancellation.`,

  [NOTIFICATION_TITLES.ORDER_READY_TO_PICKUP]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, scheduled for ${p.date || "August 8"}, is now ready to pickup. Please visit our centre before 9:00 PM today to collect your order.`,

  [NOTIFICATION_TITLES.ORDER_PICKED_UP]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, has been successfully picked up. We hope you had a great experience with our service.`,

  [NOTIFICATION_TITLES.ORDER_COLLECTED_BY_DRIVER]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, has been collected by our driver.`,

  [NOTIFICATION_TITLES.ORDER_ON_THE_WAY]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, is on its way to you. Our driver will deliver your order shortly.`,

  [NOTIFICATION_TITLES.ORDER_DELIVERED]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, has been successfully delivered. We hope you’re happy with our service and had a great experience. Thank you for choosing us!`,

  [NOTIFICATION_TITLES.ORDER_ON_HOLD]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, is currently on hold.\nReason : “${p.reason || "Customer didn’t answered the call."}”`,

  [NOTIFICATION_TITLES.ORDER_ON_THE_WAY_AGAIN]: (p) =>
    `Your order #${p.invoiceNo || "[Invoice No.]"}, is back on the way to you. Our driver will deliver your order shortly.`,

  [NOTIFICATION_TITLES.ORDER_RETURNED]: (p) => {
    const reasonText =
      p.reason && p.reason.toLowerCase() !== "other"
        ? p.reason
        : (p as any).otherReason || (p as any).returnNote || p.reason || "The customer didn’t answered the call.";
    return `Your order #${p.invoiceNo || "[Invoice No.]"}, has been returned.\nReason : “${reasonText}”`;
  },

  [NOTIFICATION_TITLES.ORDER_CANCELLED]: (p) => {
    const reasonText =
      p.reason && p.reason.toLowerCase() !== "other"
        ? p.reason
        : (p as any).otherReason || (p as any).returnNote || p.reason;
    return reasonText
      ? `Your order #${p.invoiceNo || "[Invoice No.]"}, has been cancelled.\nReason : “${reasonText}”\n\nIf you have already made a payment for this order, the total amount will be added to your credit balance. You can use this credit toward your next order.`
      : `Your order #${p.invoiceNo || "[Invoice No.]"}, has been cancelled.`;
  },
};

/**
 * Parses message text to highlight:
 * 1. invoice number (e.g. `#[Invoice No]`, `#[2609030012]`, `#2609030012`)
 * 2. Schedule Date (e.g. `scheduled for August 8`, `scheduled for September 3`, `scheduled for 2026-09-03`)
 * 3. Payment deadline (e.g. `before September 1 at 6:00 PM`, `before September 1`, `before 2026-09-01 at 6:00 PM`)
 * in bold.
 */
export const renderBoldInvoiceMessage = (
  message: string,
  baseStyle?: TextStyle,
  boldStyle?: TextStyle
): React.ReactNode => {
  if (!message) return null;

  // Pattern captures:
  // 1. Invoice token: (#\[[^\]\r\n]+\]|#[A-Za-z0-9_-]+)
  // 2 & 3. "scheduled for " + <Date>
  // 4. "before <Date> at <Time>" or "before <Date>"
  const pattern =
    /(#(?:\[[^\]\r\n]+\]|[A-Za-z0-9_-]+))|(scheduled for\s+)((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*,\s*\d{4})?|\d{4}-\d{2}-\d{2})|(before\s+(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*,\s*\d{4})?|\d{4}-\d{2}-\d{2})(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))?)/gi;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const boldMergedStyle = [
    baseStyle,
    { fontWeight: "700" as const, color: "#111827" },
    boldStyle,
  ];

  while ((match = pattern.exec(message)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      elements.push(
        <Text key={`txt-${lastIndex}`} style={baseStyle}>
          {message.substring(lastIndex, match.index)}
        </Text>
      );
    }

    if (match[1]) {
      // Invoice token match: #12345
      elements.push(
        <Text key={`inv-${match.index}`} style={boldMergedStyle}>
          {match[1]}
        </Text>
      );
    } else if (match[2] && match[3]) {
      // "scheduled for " (normal) + Date (bold)
      elements.push(
        <Text key={`sched-prefix-${match.index}`} style={baseStyle}>
          {match[2]}
        </Text>
      );
      elements.push(
        <Text key={`sched-date-${match.index}`} style={boldMergedStyle}>
          {match[3]}
        </Text>
      );
    } else if (match[4]) {
      // Deadline match: "before September 1 at 6:00 PM"
      elements.push(
        <Text key={`deadline-${match.index}`} style={boldMergedStyle}>
          {match[4]}
        </Text>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  // Trailing text
  if (lastIndex < message.length) {
    elements.push(
      <Text key={`txt-end`} style={baseStyle}>
        {message.substring(lastIndex)}
      </Text>
    );
  }

  return elements;
};
