import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { HurryBanner } from "@/component/package/common/HurryBanner";
import { ProgressDots } from "../common/ProgressDots";
import { PriceRow } from "../common/PriceRow";
import { RowDivider } from "../common/RowDivider";
import { getPackageImage } from "../../../constants/reviewPackage.constants";
import { formatPrice, formatWeightDisplay } from "../../../utils/reviewPackageUtils";
import { PackageSummary } from "@/types/types";
import { AlacartSelectedProduct } from "@/store/packageReviewSlice";

interface ConfirmationStepViewProps {
  availableSlots: number | null | undefined;
  scheduleDateStr: string;
  onCancelOrder: () => void;
  totalSteps: number;
  currentStepIndex: number;
  packageSummaries: PackageSummary[];
  unavailablePackageIds: Record<string, boolean>;
  onSelectStepIndex: (stepIndex: number) => void;
  alacartSelection: Record<string | number, AlacartSelectedProduct>;
  isItemUnavailable: (item: any) => boolean;
  getSavedStrikePrice: (item: any) => number | null;
  removeAlacartItem: (itemId: number | string) => void;
  toggleAlacartItemUnit: (itemId: number | string, unit: "kg" | "g") => void;
  updateAlacartItemQuantity: (itemId: number | string, delta: number) => void;
  totalDiff: number;
  isPaid: boolean;
  isCashPayment: boolean;
  additionalDue: number;
  cashLabel: string;
  additionalPayAmount: number;
  confirmGrandTotal: number;
  totalSavingsAmount: number;
  fullPayableAmount: number;
  confirmPackagesTotal: number;
  alacartTotal: number;
  isConfirmDisabled: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

const ConfirmationStepView: React.FC<ConfirmationStepViewProps> = ({
  availableSlots,
  scheduleDateStr,
  onCancelOrder,
  totalSteps,
  currentStepIndex,
  packageSummaries,
  unavailablePackageIds,
  onSelectStepIndex,
  alacartSelection,
  isItemUnavailable,
  getSavedStrikePrice,
  removeAlacartItem,
  toggleAlacartItemUnit,
  updateAlacartItemQuantity,
  totalDiff,
  isPaid,
  isCashPayment,
  additionalDue,
  cashLabel,
  additionalPayAmount,
  confirmGrandTotal,
  totalSavingsAmount,
  fullPayableAmount,
  confirmPackagesTotal,
  alacartTotal,
  isConfirmDisabled,
  isSubmitting,
  onConfirm,
}) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
        paddingBottom: 0,
      }}
    >
      {/* ───────── Content (child 1) ───────── */}
      <View>
        <View className="bg-white pt-1 pb-3">
          <HurryBanner
            ordersLeft={
              typeof availableSlots === "number"
                ? Math.max(0, availableSlots)
                : 0
            }
            date={scheduleDateStr}
            showCancelLink
            onCancelOrder={onCancelOrder}
          />
          <ProgressDots total={totalSteps} current={currentStepIndex} />
        </View>

        {/* Package Cards */}
        <View className="mt-3">
          {packageSummaries.map((item, sIdx) => {
            const isUnavailable =
              unavailablePackageIds[item.pkg.id] === true;
            return (
              <View
                key={`summary-${item.pkg.id}-${sIdx}`}
                style={{
                  borderWidth: 1,
                  borderColor: isUnavailable ? "#FF383C" : "#EEEEEE",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  marginHorizontal: 20,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-2xl bg-[#F9FAFB] border border-[#EEEEEE] items-center justify-center mr-3 overflow-hidden">
                    {item.pkg.image ? (
                      <Image
                        source={
                          typeof item.pkg.image === "string"
                            ? { uri: item.pkg.image }
                            : item.pkg.image
                        }
                        className="w-12 h-12 rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={getPackageImage(item.pkg.id)}
                        className="w-10 h-10"
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: isUnavailable ? "#FF383C" : "#000000",
                      }}
                    >
                      {item.pkg.name}
                    </Text>
                    {!isUnavailable && (
                      <>
                        <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                          Original Price :{" "}
                          <Text className="font-bold text-black">
                            Rs. {formatPrice(item.unitOriginalPrice)}
                          </Text>
                        </Text>
                        <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
                          Additional Changes :{" "}
                          {item.diff === 0 ? (
                            <Text className="font-bold text-black">
                              Rs. 0.00
                            </Text>
                          ) : (
                            <Text
                              className="font-bold"
                              style={{
                                color:
                                  item.diff > 0 ? "#FF2D55" : "#0088FF",
                              }}
                            >
                              {item.diff > 0 ? "+ " : "- "}Rs.{" "}
                              {formatPrice(Math.abs(item.diff))}
                            </Text>
                          )}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View className="h-[1px] bg-[#F0F0F0] my-3" />

                {isUnavailable ? (
                  <View className="flex-row items-center justify-between">
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#FF383C",
                        fontWeight: "600",
                      }}
                    >
                      Qty: {item.pkg.qty}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#FF383C",
                        fontWeight: "700",
                      }}
                    >
                      No longer available
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => onSelectStepIndex(item.stepIndex)}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] text-black">
                        Current Price :{" "}
                        <Text className="font-bold">
                          Rs. {formatPrice(item.unitCurrentPrice)}
                          {item.pkg.qty > 1 ? ` X ${item.pkg.qty}` : ""}
                        </Text>
                      </Text>

                      <View className="w-7 h-7 rounded-full bg-black items-center justify-center">
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Ala Carte Items Section */}
        {Object.keys(alacartSelection).length > 0 && (
          <>
            <View className="h-[1px] bg-[#E5E5EA] my-3" />

            <View className="mt-1">
              <Text className="text-[16px] font-bold text-black mx-5 mb-3">
                Ala Carte Items (
                {String(Object.keys(alacartSelection).length).padStart(
                  2,
                  "0",
                )}
                )
              </Text>

              {Object.values(alacartSelection).map((item, aIdx) => {
                const isItemDisabled = isItemUnavailable(item);

                const strikePrice = isItemDisabled
                  ? null
                  : getSavedStrikePrice(item);

                return (
                  <View
                    key={`alacart-item-${item.id}-${aIdx}`}
                    style={{
                      borderWidth: 1,
                      borderColor: isItemDisabled ? "#F04438" : "#EEEEEE",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      marginHorizontal: 20,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {/* Top row */}
                    <View className="flex-row items-stretch justify-between">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-14 h-14 rounded-2xl bg-[#F8F8F8] items-center justify-center mr-3 overflow-hidden border border-[#F0F0F0]"
                          style={{ opacity: isItemDisabled ? 0.6 : 1 }}
                        >
                          {item.image ? (
                            typeof item.image === "string" ? (
                              <Image
                                source={{ uri: item.image }}
                                className="w-12 h-12"
                                resizeMode="contain"
                              />
                            ) : (
                              <Image
                                source={item.image}
                                className="w-12 h-12"
                                resizeMode="contain"
                              />
                            )
                          ) : (
                            <Ionicons
                              name="leaf-outline"
                              size={24}
                              color={isItemDisabled ? "#CCCCCC" : "#92D01B"}
                            />
                          )}
                        </View>
                        <View className="flex-1 pr-2">
                          <Text
                            className="text-[16px] font-bold text-black"
                            numberOfLines={2}
                          >
                            {item.displayName}
                          </Text>
                          <View className="flex-row items-center mt-0.5">
                            <Text
                              className="text-[15px] font-bold"
                              style={{
                                color:
                                  isItemDisabled || item.isAddedNow
                                    ? "#F04438"
                                    : "#000000",
                              }}
                            >
                              Rs. {formatPrice(item.price * item.quantity)}
                            </Text>
                            {strikePrice != null && (
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: "#9CA3AF",
                                  textDecorationLine: "line-through",
                                  marginLeft: 6,
                                }}
                              >
                                Rs. {formatPrice(strikePrice)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Right column: trash + Added Now */}
                      <View className="items-end justify-between min-h-[56px]">
                        <TouchableOpacity
                          onPress={() => removeAlacartItem(item.id)}
                          activeOpacity={0.7}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isItemDisabled
                              ? "#FEE4E2"
                              : "#F5F5F5",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FontAwesome6
                            name="trash"
                            size={16}
                            color={isItemDisabled ? "#F04438" : "#000000"}
                          />
                        </TouchableOpacity>

                        {!isItemDisabled && item.isAddedNow ? (
                          <View className="mt-12">
                            <Text className="text-[12px] font-medium text-[#F04438]">
                              Added Now
                            </Text>
                          </View>
                        ) : !isItemDisabled ? (
                          <View className="mt-12">
                            <Text
                              className="text-[12px] font-medium"
                              style={{ color: "#12B8A6" }}
                            >
                              Added Earlier
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}
                      </View>
                    </View>

                    {/* Dashed separator */}
                    <View
                      style={{
                        borderBottomWidth: 1,
                        borderStyle: "dashed",
                        borderColor: isItemDisabled ? "#FDA29B" : "#E5E5EA",
                        marginVertical: 14,
                      }}
                    />

                    {isItemDisabled ? (
                      <View className="flex-row items-center justify-between">
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#F04438",
                            fontWeight: "500",
                          }}
                        >
                          {formatWeightDisplay(
                            item.weightDisplay,
                            item.amount,
                            item.unit,
                          )}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#F04438",
                            fontWeight: "600",
                          }}
                        >
                          No longer available
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Text className="text-[13px] text-[#6B6B6B] mr-2">
                            Unit :
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              toggleAlacartItemUnit(item.id, "kg")
                            }
                            activeOpacity={0.8}
                            className={`px-3.5 py-1 rounded-full mr-1.5 ${item.unit === "kg"
                              ? "bg-[#FF9114]"
                              : "bg-[#FCE1C5]"
                              }`}
                          >
                            <Text className="text-white font-bold text-[12px]">
                              kg
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              toggleAlacartItemUnit(item.id, "g")
                            }
                            activeOpacity={0.8}
                            className={`px-3.5 py-1 rounded-full ${item.unit === "g"
                              ? "bg-[#FF9114]"
                              : "bg-[#FCE1C5]"
                              }`}
                          >
                            <Text className="text-white font-bold text-[12px]">
                              g
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center">
                          {(() => {
                            const stepVal =
                              item.step && item.step > 0
                                ? item.step
                                : item.unit === "kg"
                                  ? 0.5
                                  : 500;
                            const minVal =
                              item.minQuantity && item.minQuantity > 0
                                ? item.minQuantity
                                : stepVal;
                            const isAtMin = item.amount <= minVal;

                            return (
                              <TouchableOpacity
                                onPress={() =>
                                  updateAlacartItemQuantity(item.id, -1)
                                }
                                disabled={isAtMin}
                                activeOpacity={0.7}
                                className={`w-6 h-6 rounded-full items-center justify-center ${isAtMin ? "bg-[#D1D1D6]" : "bg-black"
                                  }`}
                              >
                                <Ionicons
                                  name="remove"
                                  size={14}
                                  color="#FFF"
                                />
                              </TouchableOpacity>
                            );
                          })()}

                          <Text className="text-[13px] font-semibold text-black mx-2.5 min-w-[40px] text-center">
                            {formatWeightDisplay(
                              item.weightDisplay,
                              item.amount,
                              item.unit,
                            )}
                          </Text>

                          <TouchableOpacity
                            onPress={() =>
                              updateAlacartItemQuantity(item.id, 1)
                            }
                            activeOpacity={0.7}
                            className="w-6 h-6 rounded-full bg-black items-center justify-center"
                          >
                            <Ionicons name="add" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Please Note boxes */}
        {totalDiff > 0 ||
          (isPaid && !isCashPayment && additionalDue >= 0.01) ? (
          <View className="bg-[#F8F9FA] rounded-2xl p-4 mx-5 my-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            {isCashPayment ? (
              <Text className="text-[13px] text-[#6B6B6B] leading-5">
                Your {cashLabel} order total has increased by{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(additionalPayAmount)}
                </Text>
                . Your new total is{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(confirmGrandTotal)}
                </Text>
                .
              </Text>
            ) : !isPaid ? (
              <Text className="text-[13px] text-[#6B6B6B] leading-5">
                The total amount you need to pay upon at the end of this
                process will be{" "}
                <Text className="font-bold text-black">increased</Text> by{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(additionalPayAmount)}
                </Text>
                .
              </Text>
            ) : (
              <Text className="text-[13px] text-[#6B6B6B] leading-5">
                You have already paid for this order. The additional amount{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(additionalDue)}
                </Text>{" "}
                will need to be paid at the end of this process.
              </Text>
            )}
          </View>
        ) : totalDiff < 0 ? (
          <View className="bg-[#EDFDF2] border border-[#A6F4C5] rounded-2xl p-4 mx-5 my-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            {isCashPayment ? (
              <Text className="text-[13px] text-[#475467] leading-5">
                Your {cashLabel} order total has been reduced by{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(totalSavingsAmount)}
                </Text>
                . Your new total is{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(confirmGrandTotal)}
                </Text>
                .
              </Text>
            ) : !isPaid ? (
              <Text className="text-[13px] text-[#475467] leading-5">
                The total amount you need to pay upon at the end of this
                process will be{" "}
                <Text className="font-bold text-black">reduced</Text> by{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(totalSavingsAmount)}
                </Text>
                .
              </Text>
            ) : (
              <Text className="text-[13px] text-[#475467] leading-5">
                You have already paid for this order, so the remaining
                balance of{" "}
                <Text className="font-bold text-black">
                  Rs. {formatPrice(totalSavingsAmount)}
                </Text>{" "}
                will be credited to your account.
              </Text>
            )}
          </View>
        ) : !isCashPayment && !isPaid ? (
          <View className="bg-[#F8F9FA] rounded-2xl p-4 mx-5 my-4">
            <Text className="text-[14px] font-bold text-black mb-1">
              Please Note :
            </Text>
            <Text className="text-[13px] text-[#6B6B6B] leading-5">
              This scheduled order has not been paid yet. The total amount
              of{" "}
              <Text className="font-bold text-black">
                Rs. {formatPrice(fullPayableAmount)}
              </Text>{" "}
              will need to be paid via card to confirm your order.
            </Text>
          </View>
        ) : null}
      </View>

      {/* ───────── Price section (child 2, inside ScrollView) ───────── */}
      <View
        style={{
          backgroundColor: "#FFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: Platform.OS === "ios" ? 34 : 12,
          marginTop: 20,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
          elevation: 15,
        }}
      >
        <PriceRow
          label="For Packages"
          value={`Rs. ${formatPrice(confirmPackagesTotal)}`}
        />

        {Object.keys(alacartSelection).length > 0 && (
          <>
            <RowDivider />
            <PriceRow
              label="Ala Carte Items"
              value={`Rs. ${formatPrice(alacartTotal)}`}
            />
          </>
        )}

        <RowDivider />

        <PriceRow
          label="Total"
          value={`Rs. ${formatPrice(confirmGrandTotal)}`}
          strong
          big
          marginBottom={20}
        />

        <TouchableOpacity
          onPress={
            isConfirmDisabled || isSubmitting ? undefined : onConfirm
          }
          disabled={isConfirmDisabled || isSubmitting}
          activeOpacity={isSubmitting ? 1 : 0.85}
          style={{
            height: 54,
            backgroundColor: isConfirmDisabled ? "#7F919C" : "#000000",
            opacity: isSubmitting ? 0.85 : 1,
            borderRadius: 30,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: "#000",
            shadowOpacity: isConfirmDisabled ? 0 : 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: isConfirmDisabled ? 0 : 5,
          }}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text
                style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}
              >
                Processing...
              </Text>
            </>
          ) : (
            <Text
              style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}
            >
              {!isCashPayment && !isPaid && fullPayableAmount > 0
                ? `Pay Rs. ${formatPrice(fullPayableAmount)} & Confirm`
                : !isCashPayment && isPaid && additionalDue >= 0.01
                  ? `Pay Additional Rs. ${formatPrice(additionalDue)} & Confirm`
                  : "Confirm Order Details"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default React.memo(ConfirmationStepView);
