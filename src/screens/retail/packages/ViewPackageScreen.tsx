import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  addPackage,
  setPackageQuantity,
  removePackage,
} from "@/store/cartSlice";
import { RootStackParamList } from "@/types/types";
import BottomCart from "@/component/common/BottomCart";

import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import AuthPromptModal from "@/component/common/AuthPromptModal";
import productService from "@/services/product/product.service";
import cartService from "@/services/cart/cart.service";

const getDeliveryCutoffDate = (endDateStr?: string | null): string | null => {
  if (!endDateStr) return null;
  try {
    let year: number;
    let month: number;
    let day: number;

    const str = String(endDateStr).trim();
    if (str.includes("T") || str.includes("Z")) {
      const d = new Date(str);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    } else if (str.includes("-")) {
      const parts = str.split("T")[0].split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const d = new Date(str);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // Delivery cutoff is [Expire Date] - 2 days
    const cutoffDate = new Date(year, month, day);
    cutoffDate.setDate(cutoffDate.getDate() - 2);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const displayDay = cutoffDate.getDate();
    const displayMonth = monthNames[cutoffDate.getMonth()];
    const displayYear = cutoffDate.getFullYear();

    return `${displayDay} ${displayMonth} ${displayYear}`;
  } catch (err) {
    console.error("Error calculating delivery cutoff date:", err);
    return null;
  }
};

type Props = StackScreenProps<RootStackParamList, "ViewPackage">;

const ViewPackage: React.FC<Props> = ({ navigation, route }) => {
  const {
    packageId,
    packageName,
    image,
    price,
    packageType: initialPackageType,
    endDate: initialEndDate,
  } = route.params;
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const cartProducts = useSelector((state: RootState) => state.cart.products);
  const cartPackages = useSelector((state: RootState) => state.cart.packages);
  const totalCartCount =
    cartProducts.length +
    cartPackages.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const existingPackage = cartPackages.find((p) => p.id === packageId);

  const [packageType, setPackageType] = useState<string | null>(
    initialPackageType || null,
  );
  const [endDate, setEndDate] = useState<string | null>(
    initialEndDate || null,
  );

  const [packageItems, setPackageItems] = useState<
    { itemName: string; quantity: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(
    existingPackage ? existingPackage.quantity : 1,
  );
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const [viewCartVisible, setViewCartVisible] = useState(
    !!existingPackage || totalCartCount > 0,
  );

  useEffect(() => {
    if (existingPackage) {
      setQuantity(existingPackage.quantity);
      setViewCartVisible(true);
    }
  }, [existingPackage]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await productService.getPackageDetails(packageId);
        if (response.data && response.data.status) {
          const items = response.data.packageItems.map((item: any) => ({
            itemName: item.displayName || item.itemName || "",
            quantity: item.quantity,
          }));
          items.sort((a: { itemName: string }, b: { itemName: string }) =>
            a.itemName.localeCompare(b.itemName, undefined, { sensitivity: "base" })
          );
          setPackageItems(items);

          const returnedType =
            response.data.packageType || response.data.packageInfo?.packageType;
          const returnedEndDate =
            response.data.endDate || response.data.packageInfo?.endDate;
          if (returnedType) setPackageType(returnedType);
          if (returnedEndDate) setEndDate(returnedEndDate);

          if (existingPackage && (returnedType || returnedEndDate)) {
            dispatch(
              addPackage({
                id: packageId,
                name: packageName,
                image: image,
                price: price,
                quantity: existingPackage.quantity,
                totalItems: totalItems || existingPackage.totalItems || 1,
                packageType: returnedType || existingPackage.packageType || null,
                endDate: returnedEndDate || existingPackage.endDate || null,
              })
            );
          }
        }
      } catch (error) {
        console.error("failed to fetch package details: ", error);
        Alert.alert("Error", "Failed to load package details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [packageId]);

  const totalItems = packageItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const isOneTimePackage =
    (packageType || "").trim().toLowerCase() === "one time";
  const deliveryCutoffDate = getDeliveryCutoffDate(endDate);
  const showSeasonalSection = isOneTimePackage && !!deliveryCutoffDate;

  const increaseQty = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQty = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  const onAddToCart = async () => {
    if (!token) {
      setAuthModalVisible(true);
      return;
    }
    dispatch(
      addPackage({
        id: packageId,
        name: packageName,
        image: image,
        price: price,
        quantity: quantity,
        totalItems: totalItems,
        packageType: packageType || null,
        endDate: endDate || null,
      }),
    );
    if (token) {
      cartService
        .syncCartPackage(packageId, quantity)
        .catch((err) => console.error("DB cart sync error:", err));
    }
    showCartMessage("Added to Cart");
  };

  const onUpdateCart = async () => {
    if (!token) {
      setAuthModalVisible(true);
      return;
    }
    dispatch(
      setPackageQuantity({
        id: packageId,
        quantity: quantity,
      }),
    );
    if (token) {
      cartService
        .syncCartPackage(packageId, quantity)
        .catch((err) => console.error("DB cart sync error:", err));
    }
    showCartMessage("Cart Updated");
  };

  const onRemoveFromCart = async () => {
    dispatch(removePackage(packageId));
    if (token) {
      cartService
        .removeCartPackage(packageId)
        .catch((err) => console.error("DB cart sync error:", err));
    }
    showCartMessage("Removed from Cart");
    setViewCartVisible(false);
  };

  const showCartMessage = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setViewCartVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F2F2F6] items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F2F6]">
      <StatusBar backgroundColor="#F2F2F6" barStyle="dark-content" />

      {/* Close Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute right-5 top-3 z-50 bg-white w-11 h-11 rounded-full items-center justify-center"
      >
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>

      {/* Product Image */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
        }}
      >
        <View className="items-center mt-10 mb-10">
          <Image
            source={{ uri: image }}
            resizeMode="contain"
            style={{
              width: "100%",
              height: 200,
            }}
          />
        </View>

        {/* White area */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            marginTop: 10,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 130,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: {
              width: 0,
              height: -2,
            },
            elevation: 6,
          }}
        >
          {/* Package Name */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "500",
              color: "#111827",
              marginBottom: 10,
            }}
          >
            {packageName}
          </Text>

          {/* Price */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#000",
              marginBottom: 6,
            }}
          >
            Rs.{" "}
            {price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View
            style={{
              height: 1,
              backgroundColor: "#ECECEC",
              marginVertical: 16,
            }}
          />

          {/* Seasonal Package Section (Only for One Time packages) */}
          {showSeasonalSection && (
            <View
              style={{
                backgroundColor: "#E3FFEA",
                borderRadius: 18,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Ionicons
                  name="time"
                  size={20}
                  color="#000000"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#000000",
                  }}
                >
                  Seasonal Package
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 13,
                  color: "#000000",
                  lineHeight: 19,
                }}
              >
                This package will no longer be available{"\n"}
                for delivery after this date : {deliveryCutoffDate}.{"\n"}
                We appreciate your understanding and support.
              </Text>
            </View>
          )}

          {/* Section Title */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 10,
              paddingHorizontal: 0,
            }}
          >
            All ({totalItems} Items)
          </Text>

          {/* Package Items */}
          {packageItems.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 0,
                borderBottomWidth: index === packageItems.length - 1 ? 0 : 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: "#667085",
                  flex: 1,
                }}
              >
                {item.itemName}
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: "#667085",
                }}
              >
                {item.quantity.toString().padStart(2, "0")}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Cart */}
      <CartToast visible={toastVisible} message={toastMessage} />

      <ViewCartPopup
        visible={viewCartVisible && totalCartCount > 0}
        itemCount={totalCartCount}
        onPress={() => navigation.navigate("MyCart")}
      />

      <BottomCart
        minimumValue={1}
        step={1}
        quantity={quantity}
        initialIsAdded={!!existingPackage}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onAddToCart={onAddToCart}
        onUpdateCart={onUpdateCart}
        onRemoveFromCart={onRemoveFromCart}
      />

      <AuthPromptModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        navigation={navigation}
        title="Sign In to Add Package"
        subtitle="Please sign in or create an account to add packages to your cart and place orders."
      />
    </View>
  );
};

export default ViewPackage;
