import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
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

type PackageItem = {
  productTypeId: number | null;
  itemName: string;
  quantity: number;
};

type InfoPopup = {
  productTypeId: number | null;
  itemName: string;
  products: string[];
  loading: boolean;
  error: boolean;
  iconLeft: number; // x of the icon's left edge (window coords)
  iconCenterY: number; // y of the icon's center (window coords)
} | null;

const ICON_SIZE = 18;
const SIDE_MARGIN = 20; // matches the list's horizontal padding
const ARROW_GAP = 12; // space between popup and icon for the arrow
const ARROW_SIZE = 14;

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
  const { height: windowHeight } = useWindowDimensions();
  const token = useSelector((state: RootState) => state.auth.token);
  const cartProducts = useSelector((state: RootState) => state.cart.products);
  const cartPackages = useSelector((state: RootState) => state.cart.packages);
  const totalCartCount =
    cartProducts.length +
    cartPackages.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const existingPackage = cartPackages.find((p) => p.id === packageId);

  const [packageType, setPackageType] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(
    existingPackage ? existingPackage.quantity : 1,
  );
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const [infoPopup, setInfoPopup] = useState<InfoPopup>(null);
  const [popupHeight, setPopupHeight] = useState(0);
  const [productsCache, setProductsCache] = useState<Record<number, string[]>>(
    {},
  );
  const iconRefs = useRef<Record<number, View | null>>({});

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
          const items: PackageItem[] = response.data.packageItems.map(
            (item: any) => ({
              productTypeId:
                item.productTypeId !== undefined && item.productTypeId !== null
                  ? Number(item.productTypeId)
                  : null,
              itemName: item.displayName || item.itemName || "",
              quantity: item.quantity,
            }),
          );
          items.sort((a, b) =>
            a.itemName.localeCompare(b.itemName, undefined, {
              sensitivity: "base",
            }),
          );
          setPackageItems(items);

          const fetchedTotalItems = items.reduce(
            (total, item) => total + item.quantity,
            0,
          );

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
                totalItems: fetchedTotalItems || existingPackage.totalItems || 1,
                packageType: returnedType || existingPackage.packageType || null,
                endDate: returnedEndDate || existingPackage.endDate || null,
              }),
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

  const openInfoPopup = (item: PackageItem, index: number) => {
    const iconBox = iconRefs.current[index];
    if (!iconBox) return;

    iconBox.measureInWindow(async (x, y, w, h) => {
      const iconLeft = x + w - ICON_SIZE;
      const iconCenterY = y + h / 2;
      const typeId = item.productTypeId;

      setPopupHeight(0);

      if (typeId === null) {
        setInfoPopup({
          productTypeId: null,
          itemName: item.itemName,
          products: [],
          loading: false,
          error: false,
          iconLeft,
          iconCenterY,
        });
        return;
      }

      // Cached: open instantly
      if (productsCache[typeId]) {
        setInfoPopup({
          productTypeId: typeId,
          itemName: item.itemName,
          products: productsCache[typeId],
          loading: false,
          error: false,
          iconLeft,
          iconCenterY,
        });
        return;
      }

      setInfoPopup({
        productTypeId: typeId,
        itemName: item.itemName,
        products: [],
        loading: true,
        error: false,
        iconLeft,
        iconCenterY,
      });

      try {
        const response = await productService.getPackageItemProducts(typeId);
        const names: string[] = Array.isArray(response.data?.products)
          ? response.data.products
              .map((p: any) => p.displayName)
              .filter((n: any) => !!n)
          : [];

        setProductsCache((prev) => ({ ...prev, [typeId]: names }));
        setInfoPopup((prev) =>
          prev && prev.productTypeId === typeId
            ? { ...prev, products: names, loading: false, error: false }
            : prev,
        );
      } catch (err) {
        console.error("failed to fetch package item products: ", err);
        setInfoPopup((prev) =>
          prev && prev.productTypeId === typeId
            ? { ...prev, products: [], loading: false, error: true }
            : prev,
        );
      }
    });
  };

  // ---- popup geometry ----
  const popupRightEdge = infoPopup ? infoPopup.iconLeft - ARROW_GAP : 0;
  const popupWidth = Math.max(200, popupRightEdge - SIDE_MARGIN);
  const popupTop = infoPopup
    ? Math.min(
        Math.max(40, infoPopup.iconCenterY - popupHeight / 2),
        Math.max(40, windowHeight - popupHeight - 20),
      )
    : 0;
  const arrowTop = infoPopup
    ? Math.min(
        Math.max(infoPopup.iconCenterY - popupTop, 28),
        Math.max(28, popupHeight - 28),
      ) -
      ARROW_SIZE / 2
    : 0;

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
            paddingHorizontal: SIDE_MARGIN,
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

              {/* Info icon (measured so the popup can anchor to it) */}
              <View
                ref={(r) => {
                  iconRefs.current[index] = r;
                }}
                collapsable={false}
                style={{ width: 28, alignItems: "flex-end" }}
              >
                <TouchableOpacity
                  activeOpacity={0.6}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => openInfoPopup(item, index)}
                >
                  <Ionicons name="alert-circle" size={ICON_SIZE} color="#000" />
                </TouchableOpacity>
              </View>
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

      {/* Product type info popup (anchored to the tapped icon) */}
      <Modal
        visible={!!infoPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPopup(null)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setInfoPopup(null)}>
          {infoPopup && (
            <Pressable
              onPress={() => {}}
              onLayout={(e) => setPopupHeight(e.nativeEvent.layout.height)}
              style={{
                position: "absolute",
                top: popupTop,
                left: SIDE_MARGIN,
                width: popupWidth,
                opacity: popupHeight === 0 ? 0 : 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 16,
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 12,
              }}
            >
              {/* Arrow pointing at the icon */}
              <View
                style={{
                  position: "absolute",
                  right: -ARROW_SIZE / 2 + 1,
                  top: arrowTop,
                  width: ARROW_SIZE,
                  height: ARROW_SIZE,
                  backgroundColor: "#FFFFFF",
                  transform: [{ rotate: "45deg" }],
                  borderRadius: 2,
                }}
              />

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "#E3FFEA",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="checkmark" size={16} color="#1B7F3B" />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#000000",
                    lineHeight: 20,
                  }}
                >
                  What are included in {infoPopup.itemName}?
                </Text>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setInfoPopup(null)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#4A4A68",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Ionicons name="close" size={13} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E5E7EB",
                  marginTop: 12,
                  marginBottom: 10,
                }}
              />

              {infoPopup.loading ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#000" />
                </View>
              ) : infoPopup.error ? (
                <Text
                  style={{ fontSize: 13, color: "#B42318", lineHeight: 19 }}
                >
                  Couldn't load products. Please try again.
                </Text>
              ) : infoPopup.products.length > 0 ? (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#4A4A68",
                      lineHeight: 20,
                      marginBottom: 12,
                    }}
                  >
                    We include these products from time to time, depending on
                    the season.
                  </Text>

                  {/* Product chips */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {infoPopup.products.map((name, i) => (
                      <View
                        key={`${name}-${i}`}
                        style={{
                          backgroundColor: "#E3FFEA",
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: "#1B7F3B",
                          }}
                        >
                          {name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text
                  style={{ fontSize: 13, color: "#4A4A68", lineHeight: 19 }}
                >
                  No products available right now.
                </Text>
              )}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

export default ViewPackage;