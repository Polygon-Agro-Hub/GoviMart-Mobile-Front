import React from "react";
import { View, Text, Image } from "react-native";
import { PackageMeta } from "@/store/packageReviewSlice";
import { formatPrice } from "../../../utils/reviewPackageUtils";

interface PackageOverviewCardProps {
  pkg: PackageMeta;
  index: number;
}

export const PackageOverviewCard: React.FC<PackageOverviewCardProps> = ({
  pkg,
  index,
}) => (
  <View
    key={`pkg-${pkg.id}-${index}`}
    className="mx-5 mt-4 border border-[#EEEEEE] bg-white rounded-2xl px-4 py-2.5 flex-row items-center"
  >
    <View className="w-14 h-14 rounded-2xl bg-[#F9FAFB] border border-[#EEEEEE] items-center justify-center overflow-hidden">
      {pkg.image ? (
        <Image
          source={{ uri: pkg.image }}
          className="w-12 h-12 rounded-xl"
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: 24 }}>{pkg.icon || "📦"}</Text>
      )}
    </View>
    <View className="ml-3 flex-1">
      <Text className="text-[17px] font-bold text-black" numberOfLines={2}>
        {pkg.name} (x{pkg.qty})
      </Text>
      <Text className="text-[13px] text-[#6B6B6B] mt-0.5">
        Price :{" "}
        <Text className="font-bold text-black">
          Rs. {formatPrice(pkg.unitPrice + pkg.serviceFee + pkg.packingFee)} x{" "}
          {pkg.qty} = Rs.{" "}
          {formatPrice(
            (pkg.unitPrice + pkg.serviceFee + pkg.packingFee) * pkg.qty,
          )}
        </Text>
      </Text>
    </View>
  </View>
);

