import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  Keyboard,
  Alert,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import orderService from "@/services/order/order.service";
import { AlertModal } from "@/component/common/AlertModal";

/*
  NOTE: add these to the "OrderConfirmedOrderCancelScreen" params in
  RootStackParamList:
    serviceFee?: number;
    hasAlaCarte?: boolean;
    couponDiscount?: number;        // money-off coupon (not free delivery)
    deliveryFee?: number;           // original delivery fee (0 for pickup)
    isFreeDeliveryCoupon?: boolean; // true => "Delivery Fee Coupon Applied!"
    isPickup?: boolean;
*/
type Props = StackScreenProps<
  RootStackParamList,
  "OrderConfirmedOrderCancelScreen"
>;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type PackageItem = {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  qty: number;
  productPrice?: number; // price stored on the order (order-time)
  unitPrice?: number; // fallback only - make sure caller passes order-time value
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

// Space (px) kept between the confirm box and the visible bottom area
// (this leaves room for the fixed "Cancel Order" button).
const EXTRA_SPACE = 100;

// Package price = (productPrice | unitPrice) + packingFee + serviceFee
const getPackageUnitPrice = (pkg: PackageItem): number =>
  Number(pkg.productPrice ?? pkg.unitPrice ?? 0) +
  Number(pkg.packingFee ?? 0) +
  Number(pkg.serviceFee ?? 0);

// The same package passed more than once is merged into ONE row with the
// quantities added together (so it can be shown as "X2").
const groupPackages = (list: PackageItem[]): PackageItem[] => {
  const map = new Map<string, PackageItem>();
  list.forEach((p) => {
    const key = `${String(p.name || "")
      .trim()
      .toLowerCase()}|${getPackageUnitPrice(p)}`;
    const qty = Number(p.qty) || 1;
    const existing = map.get(key);
    if (existing) {
      existing.qty += qty;
    } else {
      map.set(key, { ...p, id: key, qty });
    }
  });
  return Array.from(map.values());
};

// 1250 -> "1,250.00", 1234567.5 -> "1,234,567.50"
const formatPrice = (value: number | string | null | undefined): string => {
  const num = Number(value ?? 0);
  if (!isFinite(num)) return "0.00";
  const [intPart, decPart] = num.toFixed(2).split(".");
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decPart}`;
};

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

// Flat summary row with a divider line underneath (matches the design)
//  - light: regular-weight order breakdown rows (For Packages, Delivery Fee ...)
//  - bold:  Total row
//  - default: semi-bold payment rows (Total Pay with Card (Due) ...)
//  - valueClassName: overrides the value text style (e.g. green coupon message)
const SummaryRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  light?: boolean;
  valueClassName?: string;
}> = ({ label, value, bold, light, valueClassName }) => (
  <View
    className={`flex-row justify-between items-center py-3 border-b ${
      light ? "border-[#ECECEC]" : "border-[#D9D9D9]"
    }`}
  >
    <Text
      className={`text-[14px] ${light ? "text-[#4B4F6B]" : "text-black"} ${
        bold ? "font-bold" : light ? "" : "font-semibold"
      }`}
    >
      {label}
    </Text>
    <Text
      className={
        valueClassName ??
        `text-[14px] ${light ? "text-[#4B4F6B]" : "text-black"} ${
          bold ? "font-bold" : light ? "" : "font-semibold"
        }`
      }
    >
      {value}
    </Text>
  </View>
);

/* ---------------------------------------------------------
   Screen
--------------------------------------------------------- */

const OrderConfirmedOrderCancelScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const {
    orderId,
    processOrderId,
    hasAlaCarte: passedHasAlaCarte,
    hasAlacart: passedHasAlacart,
    packages: passedPackages,
    alaCarteItems: passedAlaCarte,
    totalPaid: passedTotalPaid,
    totalPaidCard: passedTotalPaidCard,
    totalPaidCredit: passedTotalPaidCredit,
    processOrderTotal: passedProcessOrderTotal,
    paymentMethod,
    refundCreditAmount: passedRefundCreditAmount,
    serviceFee: passedServiceFee, // DASH: 0 / undefined when not a Dash order
    couponDiscount: passedCouponDiscount,
    deliveryFee: passedDeliveryFee,
    isFreeDeliveryCoupon: passedIsFreeDeliveryCoupon,
    isPickup: passedIsPickup,
  } = (route.params || {}) as any;

  // Order has ala carte items check
  const hasAlaCarte = Boolean(
    passedHasAlaCarte ||
      passedHasAlacart ||
      (passedAlaCarte && passedAlaCarte.length > 0),
  );

  // DASH service fee (only passed for orderApp = "Dash")
  const serviceFee = Number(passedServiceFee ?? 0);

  // Coupon / delivery details passed from the confirmation screen
  const couponDiscount = Number(passedCouponDiscount ?? 0);
  const isPickup = Boolean(passedIsPickup);
  const isFreeDeliveryCoupon = Boolean(passedIsFreeDeliveryCoupon);
  const deliveryFee = isPickup ? 0 : Number(passedDeliveryFee ?? 0);
  // Free-delivery coupon => nothing is charged for delivery
  const deliveryFeeCharged = isFreeDeliveryCoupon ? 0 : deliveryFee;
  // Show the Delivery Fee row for delivery orders (not for pickup)
  const showDeliveryRow =
    !isPickup && (isFreeDeliveryCoupon || deliveryFee > 0);

  // Duplicates are merged here, so it works no matter how the caller sends them
  const packages: PackageItem[] = useMemo(
    () =>
      passedPackages && passedPackages.length > 0
        ? groupPackages(passedPackages as PackageItem[])
        : [],
    [passedPackages],
  );

  // Passed ala carte items may carry live marketplace prices, so they are NOT
  // used while we wait for the order-time prices from the server.
  // They are only used as a fallback if the fetch fails.
  const [alaCarteItems, setAlaCarteItems] = useState<AlaCarteItem[]>([]);

  // True until the order-time ala carte items are loaded (or the fetch fails).
  // The summary stays hidden meanwhile so it never flashes wrong numbers.
  const [alaCarteLoading, setAlaCarteLoading] = useState<boolean>(
    hasAlaCarte && Boolean(orderId),
  );

  // Fetch directly from orderadditionalitems table ONLY when this order has ala carte items
  useEffect(() => {
    if (!hasAlaCarte || !orderId) {
      setAlaCarteLoading(false);
      return;
    }

    let isMounted = true;
    const fetchCancelAlaCarte = async () => {
      try {
        const res = await orderService.getCancelOrderAdditionalItems(
          orderId,
          processOrderId,
        );
        if (!isMounted) return;

        if (res.data?.status && Array.isArray(res.data.data)) {
          const items: AlaCarteItem[] = res.data.data.map((it: any) => {
            const linePrice = parseFloat(it.price) || 0;
            const lineNormal = parseFloat(it.normalPrice) || 0;
            return {
              id: String(it.id || it.productId || "item"),
              name: it.displayName || it.name || "Item",
              icon: it.icon,
              image: it.image,
              weight: `${it.qty} ${it.unit || "kg"}`,
              price: linePrice,
              originalPrice:
                lineNormal > linePrice + 0.01 ? lineNormal : undefined,
            };
          });
          setAlaCarteItems(items);
        } else if (passedAlaCarte && passedAlaCarte.length > 0) {
          // Fallback: server returned nothing usable
          setAlaCarteItems(passedAlaCarte);
        }
      } catch (err) {
        console.error("Failed to fetch cancel order additional items:", err);
        if (isMounted && passedAlaCarte && passedAlaCarte.length > 0) {
          setAlaCarteItems(passedAlaCarte);
        }
      } finally {
        if (isMounted) setAlaCarteLoading(false);
      }
    };

    fetchCancelAlaCarte();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAlaCarte, orderId, processOrderId]);

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // AlertModal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("error");

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertType === "success") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  // Keyboard / scroll refs
  const scrollRef = useRef<ScrollView>(null);
  const rootRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const keyboardOpenRef = useRef(false);
  const confirmWrapRef = useRef<View>(null);
  const scrollWrapRef = useRef<View>(null);

  // Scroll only as much as needed so the confirm box sits just above the
  // fixed bottom button (not at the top of the screen).
  const ensureVisible = useCallback(() => {
    // The scroll area's bottom edge = top of the keyboard, because the
    // whole content area is lifted by `keyboardHeight`.
    scrollWrapRef.current?.measureInWindow((_sx, sy, _sw, sh) => {
      const areaBottom = sy + sh;
      confirmWrapRef.current?.measureInWindow((_x, y, _w, h) => {
        const limit = areaBottom - EXTRA_SPACE;
        const overflow = y + h - limit;
        if (overflow > 0) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + overflow,
            animated: true,
          });
        }
      });
    });
  }, []);

  // Track keyboard height
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardOpenRef.current = true;
      setKeyboardVisible(true);
      // Measure how much the keyboard REALLY covers the screen. If Android already
      // resized the window, the overlap is 0 and no extra padding is added
      // (this prevents the long white space).
      const kbTop = e.endCoordinates.screenY;
      setTimeout(() => {
        rootRef.current?.measureInWindow((_rx, ry, _rw, rh) => {
          setKeyboardHeight(Math.max(0, ry + rh - kbTop));
        });
      }, 100);
      // wait for the layout to shrink, then scroll
      setTimeout(ensureVisible, 300);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpenRef.current = false;
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureVisible]);

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

  // Order total = packages + ala carte - coupon + delivery fee (0 when a
  // free-delivery coupon is applied) + DASH service fee
  const calculatedOrderTotal = Math.max(
    0,
    packagesTotal +
      alaCarteTotal -
      couponDiscount +
      deliveryFeeCharged +
      serviceFee,
  );

  // The items list (order-time prices) is the single source of truth, so the
  // list and the summary always match. Passed totals are only a fallback when
  // there are no items to sum.
  const processOrderTotal =
    packagesTotal + alaCarteTotal > 0
      ? calculatedOrderTotal
      : Number(passedProcessOrderTotal ?? passedTotalPaid ?? 0);

  /* ---------------------------------------------------------
     Payment breakdown
     An order can be split: Credit + Card, or Credit + Cash.
     Each part is shown on its own line.
       - Credit:     as passed (DB creditPaid) - historical, not price based.
       - Card PAID:  as passed (actual payment) - historical.
       - Card DUE:   derived from the order-time total (the card is only
                     charged when the customer confirms the order).
       - Cash DUE:   derived from the order-time total.
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

  // Card PAID
  const totalPaidCard = isFullyPaidByCredit
    ? 0
    : Math.min(Number(passedTotalPaidCard ?? 0), remainingAfterCredit);

  // Card DUE (card order that is not paid yet) - derived, not passed
  const totalCardDue = isFullyPaidByCredit
    ? 0
    : method === "card"
      ? Math.max(0, remainingAfterCredit - totalPaidCard)
      : 0;

  // Cash DUE - derived, not passed
  const totalCashDue = isFullyPaidByCredit
    ? 0
    : method.includes("cash") || method === "cod"
      ? remainingAfterCredit
      : 0;

  // Only the credit that was already paid goes back to the credit balance.
  // The card amount is NOT refunded as credit (the card is only charged when
  // the customer confirms the order).
  // Capped so it can never exceed the order total.
  const refundCreditAmount = Math.min(
    passedRefundCreditAmount !== undefined
      ? Number(passedRefundCreditAmount)
      : totalPaidCredit,
    processOrderTotal,
  );

  const onCancelOrder = async () => {
    if (!isConfirmed || loading || alaCarteLoading) return;
    setLoading(true);
    try {
      if (orderId) {
        await orderService.cancelOrderBeforeConfirm({
          orderId,
          processOrderId: processOrderId || undefined,
        });
      }
      setAlertTitle("Order Cancelled");
      setAlertMessage("Your order has been cancelled successfully.");
      setAlertType("success");
      setAlertVisible(true);
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      setAlertTitle("Cancellation Failed");
      setAlertMessage(
        err?.response?.data?.message ||
          "Unable to cancel your order at this moment. Please try again or contact support.",
      );
      setAlertType("error");
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const canCancel = isConfirmed && !loading && !alaCarteLoading;

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

      <View
        ref={rootRef}
        collapsable={false}
        className="flex-1"
        style={{ paddingBottom: keyboardHeight }}
      >
        <View className="flex-1" ref={scrollWrapRef} collapsable={false}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
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
                    ? "The credit you paid for this order will be returned to your Polygon Wallet."
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
                      {idx > 0 && (
                        <View className="h-[1px] bg-[#ECECEC] my-3" />
                      )}
                      <View className="flex-row items-center pb-3">
                        <ItemAvatar icon={pkg.icon} image={pkg.image} />
                        <View className="ml-3 flex-1">
                          <Text className="text-[15px] font-bold text-black">
                            {pkg.name}
                            {pkg.qty > 1 && (
                              <Text className="text-[14px] font-semibold text-[#4A4A4A]">
                                {" "}
                                (X{pkg.qty})
                              </Text>
                            )}
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

            {/* Totals Summary (flat rows with dividers) - shown only after
                order-time items are loaded so wrong numbers never flash */}
            {!alaCarteLoading && (
              <View className="mx-5 mt-6">
                {/* ── Order breakdown ── */}
                {packagesTotal > 0 && (
                  <SummaryRow
                    light
                    label="For Packages"
                    value={`Rs. ${formatPrice(packagesTotal)}`}
                  />
                )}

                {alaCarteTotal > 0 && (
                  <SummaryRow
                    light
                    label="For Ala Carte"
                    value={`Rs. ${formatPrice(alaCarteTotal)}`}
                  />
                )}

                {couponDiscount > 0 && (
                  <SummaryRow
                    light
                    label="Coupon Discount"
                    value={`- Rs. ${formatPrice(couponDiscount)}`}
                  />
                )}

                {showDeliveryRow &&
                  (isFreeDeliveryCoupon ? (
                    <SummaryRow
                      light
                      label="Delivery Fee"
                      value="Delivery Fee Coupon Applied!"
                      valueClassName="text-[11px] text-[#1F7A3A]"
                    />
                  ) : (
                    <SummaryRow
                      light
                      label="Delivery Fee"
                      value={`+ Rs. ${formatPrice(deliveryFee)}`}
                    />
                  ))}

                {/* DASH: Service Fee (only for Dash orders) */}
                {serviceFee > 0 && (
                  <SummaryRow
                    light
                    label="Service Fee"
                    value={`+ Rs. ${formatPrice(serviceFee)}`}
                  />
                )}

                {/* ── Payment breakdown ── */}
                {totalPaidCard > 0 && (
                  <SummaryRow
                    label="Total Paid with Card"
                    value={`Rs. ${formatPrice(totalPaidCard)}`}
                  />
                )}

                {totalCardDue > 0 && (
                  <SummaryRow
                    label="Total Pay with Card (Due)"
                    value={`Rs. ${formatPrice(totalCardDue)}`}
                  />
                )}

                {totalPaidCredit > 0 && (
                  <SummaryRow
                    label="Total Paid with Credit"
                    value={`Rs. ${formatPrice(totalPaidCredit)}`}
                  />
                )}

                {totalCashDue > 0 && (
                  <SummaryRow
                    label="Total Cash (Due)"
                    value={`Rs. ${formatPrice(totalCashDue)}`}
                  />
                )}

                <SummaryRow
                  label="Total"
                  value={`Rs. ${formatPrice(processOrderTotal)}`}
                  bold
                />
              </View>
            )}

            {/* Credit info component (only the credit that was paid) */}
            {!alaCarteLoading && refundCreditAmount > 0 && (
              <View className="mx-5 mt-6 bg-[#EAF9EE] border border-[#A6F4C5] rounded-3xl p-5 items-center">
                <View className="w-12 h-12 rounded-full bg-[#22C55E] items-center justify-center">
                  <Ionicons name="wallet" size={22} color="#fff" />
                </View>
                <Text className="text-[15px] font-bold text-[#15803D] mt-3 text-center">
                  Amount will be credited to your Polygon Wallet
                </Text>
                <Text className="text-[13px] text-[#3F7A50] text-center mt-2 leading-5">
                  After canceling, the credit amount you paid,{" "}
                  <Text className="font-bold text-[#15803D]">
                    Rs. {formatPrice(refundCreditAmount)}
                  </Text>{" "}
                  will be added back to your Polygon Wallet. You can use it for
                  your next purchase.
                </Text>
              </View>
            )}

            {/* Confirm input */}
            <View
              className="mx-5 mt-6 border border-black rounded-2xl p-4"
              ref={confirmWrapRef}
              collapsable={false}
            >
              <View className="flex-row">
                <FontAwesome6 name="lock" size={20} color="#000" />
                <View className="ml-2 flex-1">
                  <Text className="text-[14px] font-bold text-black">
                    To cancel this order
                  </Text>
                  <Text className="text-[13px] text-[#8A8A8A] mt-0.5">
                    Type <Text className="font-bold text-black">"CANCEL"</Text>{" "}
                    in the box below to confirm.
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
                onFocus={() => {
                  // if keyboard is already open, adjust now
                  if (keyboardOpenRef.current) setTimeout(ensureVisible, 150);
                }}
              />
            </View>
          </ScrollView>
        </View>

        {/* Fixed bottom action */}
        <View
          className={`px-5 bg-white ${
            keyboardVisible ? "pt-2 pb-2" : "pt-3 pb-5"
          }`}
        >
          <TouchableOpacity
            onPress={onCancelOrder}
            disabled={!canCancel}
            activeOpacity={0.85}
            className={`rounded-full py-4 items-center ${
              canCancel ? "bg-[#E11D48]" : "bg-[#7F919C]"
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
      </View>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
        autoClose={false}
        showOkButton={true}
        okButtonText="OK"
        onOkPress={handleAlertClose}
      />
    </View>
  );
};

export default OrderConfirmedOrderCancelScreen;