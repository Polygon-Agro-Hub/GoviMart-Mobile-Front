import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PackageMeta } from "@/store/packageReviewSlice";
import { formatPrice } from "../../../utils/reviewPackageUtils";
import { PriceRow } from "../common/PriceRow";
import { RowDivider } from "../common/RowDivider";
import { PackageOverviewCard } from "./PackageOverviewCard";
import LoadingPage from "@/component/common/LoadingPage";
import { HurryBanner } from "@/component/package/common/HurryBanner";
import { TimeRanOutBanner } from "@/component/package/common/TimeRanOutBanner";

interface ReviewOverviewViewProps {
  invoiceNo?: string;
  effectiveOrderId: string | number;
  scheduleDateStr: string;
  nextScheduleDateStr: string;
  isLocked: boolean;
  isTimeRanOut: boolean;
  availableSlots: number;
  loadingReview: boolean;
  packagesMeta: PackageMeta[];
  isRefreshing: boolean;
  onRefresh: () => void;
  overviewTotal: number;
  overviewDiscount: number;
  overviewFullTotal: number;
  onSendReminderTomorrow: () => void;
  onCancelOrder: () => void;
  onStartReview: () => void;
}

export const ReviewOverviewView: React.FC<ReviewOverviewViewProps> = ({
  invoiceNo,
  effectiveOrderId,
  scheduleDateStr,
  nextScheduleDateStr,
  isLocked,
  isTimeRanOut,
  availableSlots,
  loadingReview,
  packagesMeta,
  isRefreshing,
  onRefresh,
  overviewTotal,
  overviewDiscount,
  overviewFullTotal,
  onSendReminderTomorrow,
  onCancelOrder,
  onStartReview,
}) => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    className="flex-1"
    contentContainerStyle={{
      flexGrow: 1,
      justifyContent: "space-between",
    }}
    refreshControl={
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        colors={["#000000"]}
        tintColor="#000000"
      />
    }
  >
    <View>
      <View className="items-center mt-2">
        <Text className="text-[17px] font-bold text-black">
          Order : #{invoiceNo || effectiveOrderId}
        </Text>
        <Text className="text-[14px] text-[#494A65] mt-1">
          Schedule to : {scheduleDateStr}
        </Text>
      </View>

      {isLocked && (
        <View className="mx-5 mt-3 bg-[#FFF3CD] border border-[#FFEBAA] rounded-2xl p-4 flex-row items-center">
          <Ionicons name="lock-closed" size={20} color="#856404" />
          <Text className="text-[13px] text-[#856404] font-medium ml-2 flex-1">
            Package reviewing is currently locked. Your order is already being
            packed.
          </Text>
        </View>
      )}

      <View className="h-[1px] bg-[#ECECEC] mt-5" />

      {isTimeRanOut ? (
        <TimeRanOutBanner
          nextScheduleDateStr={nextScheduleDateStr}
          onSendReminderTomorrow={onSendReminderTomorrow}
          onCancelOrder={onCancelOrder}
        />
      ) : (
        <>
          <Text className="text-center text-[12px] text-[#5A5859] mt-4 mx-8 leading-5">
            Review and customize your package as per your preference.
          </Text>

          <View className="mt-5">
            <HurryBanner
              ordersLeft={
                typeof availableSlots === "number"
                  ? Math.max(0, availableSlots)
                  : 0
              }
              date={scheduleDateStr}
              showCancelLink={true}
              onCancelOrder={onCancelOrder}
            />
          </View>

          <View className="h-[1px] bg-[#ECECEC] mt-6" />

          <Text className="text-center text-[12px] text-[#494A65] mt-4 mx-8 leading-5">
            Here are the packages you purchased. You can review and update them
            if needed.
          </Text>

          {loadingReview ? (
            <LoadingPage
              message="Loading package details..."
              fullScreen={false}
            />
          ) : packagesMeta.length === 0 ? (
            <View className="mx-5 mt-4 p-6 bg-[#F9FAFB] rounded-2xl items-center justify-center border border-[#ECECEC]">
              <Ionicons name="cube-outline" size={36} color="#9CA3AF" />
              <Text className="text-[14px] text-[#6B6B6B] font-medium mt-2">
                No packages found for this order.
              </Text>
            </View>
          ) : (
            packagesMeta.map((pkg, pIdx) => (
              <PackageOverviewCard
                key={`pkg-${pkg.id}-${pIdx}`}
                pkg={pkg}
                index={pIdx}
              />
            ))
          )}

          <Text className="text-center text-[14px] text-[#6B6B6B] mt-5 mx-8 leading-5">
            Lastly, you may also purchase any additional items you want after
            reviewing the packages you purchased.
          </Text>

          <View className="mx-5 mt-4 bg-[#F5F5F5] rounded-2xl p-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            <Text className="text-[13px] text-[#6B6B6B] leading-5">
              If you update the quantities of products in your packages, or add
              or replace products, the total amount may change. You'll need to
              pay any additional amount due.
            </Text>
          </View>
        </>
      )}
    </View>

    {/* Bottom Payment & Action Section (overview) inside ScrollView */}
    {!loadingReview && !isTimeRanOut && (
      <View
        style={{
          backgroundColor: "#FFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: Platform.OS === "ios" ? 34 : 20,
          marginTop: 20,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
          elevation: 15,
        }}
      >
        {/* Total = Full Total + Discount Received */}
        <PriceRow label="Total" value={`Rs. ${formatPrice(overviewTotal)}`} />

        <RowDivider />

        {/* Discount Received */}
        <PriceRow
          label="Discount Received"
          value={`- Rs. ${formatPrice(overviewDiscount)}`}
          valueColor="#1B8A3A"
        />

        <RowDivider />

        {/* Full Total = productPrice + packingFee + serviceFee */}
        <PriceRow
          label="Full Total"
          value={`Rs. ${formatPrice(overviewFullTotal)}`}
          strong
          big
          marginBottom={14}
        />

        {/* Note about what is shown from this point onward */}
        <View
          style={{
            backgroundColor: "#F5F8FF",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#000000",
              marginBottom: 4,
            }}
          >
            Please Note :
          </Text>
          <Text style={{ fontSize: 12, lineHeight: 18, color: "#494A65" }}>
            From this point onward, only the package prices and à la carte prices
            will be shown. Any à la carte discounts, coupon discounts, delivery
            fees will not be reflected here.
          </Text>
        </View>

        <TouchableOpacity
          disabled={loadingReview || packagesMeta.length === 0}
          onPress={onStartReview}
          activeOpacity={0.85}
          style={{
            height: 54,
            backgroundColor:
              loadingReview || packagesMeta.length === 0
                ? "#7F919C"
                : "#000000",
            borderRadius: 30,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity:
              loadingReview || packagesMeta.length === 0 ? 0 : 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: loadingReview || packagesMeta.length === 0 ? 0 : 5,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
            {loadingReview ? "Loading Packages..." : "Review My Packages"}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </ScrollView>
);

