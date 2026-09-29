import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  BackHandler,
  ToastAndroid,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  RootStackParamList,
  ProductType,
  PackageType,
  ShopItem,
} from "@/types/types";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  addProduct,
  removeProduct,
  increaseProductWeight,
  decreaseProductWeight,
  changeProductUnit,
  addPackage,
  removePackage,
  increasePackageQuantity,
  decreasePackageQuantity,
  setCartFromBackend,
  clearCart,
  ProductCartItem,
  PackageCartItem,
  CartState,
} from "@/store/cartSlice";
import { updateUserProfile } from "@/store/authSlice";
import cartService from "@/services/cart/cart.service";
import customerService from "@/services/customer/customer.service";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeHeader from "@/component/home/HomeHeader";
import HomeBannerSlider from "@/component/home/HomeBannerSlider";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import CartToast from "@/component/common/CartToast";
import ViewCartPopup from "@/component/common/ViewCartPopup";
import NoDataFound from "@/component/common/NoDataFound";
import productService from "@/services/product/product.service";
import socketService from "@/services/socket/socket.service";
import FixedMarqueeText from "@/component/marquee-text/MarqueeText";

export type { ProductType, PackageType } from "@/types/types";

type HomeNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeProps {
  navigation: HomeNavigationProp;
}

interface Category {
  id: string;
  name: string;
  circleBg: string;
  borderColor: string;
  activeBg: string;
  active: boolean;
}

interface AddTimeSnapshot {
  weight?: number;
  unit?: "g" | "kg";
  quantity?: number;
  price: number;
}

// Price display types coming from the backend (marketplaceitems.displayType):
// "AP&SP&D" -> Actual Price (struck through) + Sale Price + Discount% badge
// "AP&SP"   -> Actual Price (struck through) + Sale Price, no badge
// "D&AP"    -> Only Sale Price + Discount% badge, no struck-through actual price
type DisplayType = "AP&SP&D" | "D&AP" | "AP&SP";

const CATEGORY_IMAGES: Record<string, any> = {
  Packages: require("@/assets/images/home/packages.webp"),
  Vegetables: require("@/assets/images/home/veggies.webp"),
  Fruits: require("@/assets/images/home/fruits.webp"),
  Cereals: require("@/assets/images/home/cereal.webp"),
  Spices: require("@/assets/images/home/spices.webp"),
  Mushrooms: require("@/assets/images/home/mushroom.webp"),
  Pulses: require("@/assets/images/home/pulses.webp"),
};

const CATEGORIES: Category[] = [
  {
    id: "Packages",
    name: "Packages",
    circleBg: "#FFCCB9",
    borderColor: "#C58B8B",
    activeBg: "#FB4300",
    active: false,
  },
  {
    id: "Vegetables",
    name: "Veggies",
    circleBg: "#F3FFDD",
    borderColor: "#50FF43",
    activeBg: "#92D01B",
    active: true,
  },
  {
    id: "Fruits",
    name: "Fruits",
    circleBg: "#FEE5E4",
    borderColor: "#EA2A3D",
    activeBg: "#EA2A3D",
    active: false,
  },
  {
    id: "Cereals",
    name: "Cereal",
    circleBg: "#FFFBE0",
    borderColor: "#FFCF70",
    activeBg: "#FBA600",
    active: false,
  },
  {
    id: "Spices",
    name: "Spices",
    circleBg: "#FFF0DD",
    borderColor: "#A56021",
    activeBg: "#8C4C17",
    active: false,
  },
  {
    id: "Mushrooms",
    name: "Mushrooms",
    circleBg: "#FFEED9",
    borderColor: "#B47E7F",
    activeBg: "#8D4546",
    active: false,
  },
  {
    id: "Pulses",
    name: "Pulses",
    circleBg: "#FFE3E9",
    borderColor: "#B47E7F",
    activeBg: "#872844",
    active: false,
  },
];

const { width } = Dimensions.get("window");

const BannerSkeleton = () => {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View className="mx-6 mt-4">
      <Animated.View
        style={{
          width: width - 48,
          height: 160,
          borderRadius: 20,
          backgroundColor: "#E5E5EA",
          opacity: pulseAnim,
        }}
      />
      <View className="flex-row justify-center items-center gap-1.5 mt-3">
        {[1, 2, 3].map((_, index) => (
          <View key={index} className="w-1.5 h-1.5 rounded-full bg-[#E5E5EA]" />
        ))}
      </View>
    </View>
  );
};

const ProductCardSkeleton = ({ pulseAnim }: { pulseAnim: Animated.Value }) => {
  return (
    <View
      className="flex-1 bg-[#F4F3F3] pt-12 pb-6 px-4 items-center mx-2 relative mb-6"
      style={{
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
      }}
    >
      <Animated.View
        style={{ opacity: pulseAnim }}
        className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center shadow-sm border border-gray-100"
      >
        <View className="w-12 h-12 rounded-full bg-[#E5E5EA]" />
      </Animated.View>

      <Animated.View
        style={{ opacity: pulseAnim }}
        className="w-20 h-3.5 bg-[#E5E5EA] rounded mt-3"
      />

      <Animated.View
        style={{ opacity: pulseAnim }}
        className="w-14 h-3 bg-[#E5E5EA] rounded mt-2"
      />

      <Animated.View
        style={{ opacity: pulseAnim }}
        className="w-10 h-10 rounded-full bg-[#E5E5EA] absolute -bottom-5"
      />
    </View>
  );
};

const ProductGridSkeleton = () => {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View className="mt-8 px-4">
      <View className="flex-row justify-between mb-4">
        <ProductCardSkeleton pulseAnim={pulseAnim} />
        <ProductCardSkeleton pulseAnim={pulseAnim} />
      </View>
      <View className="flex-row justify-between mb-4">
        <ProductCardSkeleton pulseAnim={pulseAnim} />
        <ProductCardSkeleton pulseAnim={pulseAnim} />
      </View>
    </View>
  );
};

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const userToken = useSelector(
    (state: RootState) => (state as RootState & { auth: any }).auth.token,
  );
  const userProfile = useSelector(
    (state: RootState) => (state as RootState & { auth: any }).auth.userProfile,
  );
  const buyerType = userProfile?.buyerType || "Retail";
  const isRetail = buyerType.toLowerCase() === "retail";

  const cartProducts = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.products,
  );
  const cartPackages = useSelector(
    (state: RootState) =>
      (state as RootState & { cart: CartState }).cart.packages,
  );
  const totalCartItems =
    cartProducts.length +
    cartPackages.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const visibleCategories = isRetail
    ? CATEGORIES
    : CATEGORIES.filter((category) => category.id !== "Packages");

  const [bannerSlides, setBannerSlides] = useState<
    { id: number; image: string; details: string }[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    isRetail ? "Packages" : "Vegetables",
  );
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [addingItemId, setAddingItemId] = useState<number | null>(null);
  const isCartSyncingRef = useRef(false);

  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const userTokenRef = useRef(userToken);
  userTokenRef.current = userToken;

  const [addTimeSnapshots, setAddTimeSnapshots] = useState<
    Record<number, AddTimeSnapshot>
  >({});

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  }, []);

  const formatPrice = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const backPressedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const syncUserProfile = async () => {
        try {
          const response = await customerService.getAccountDetails();
          if (response.data && response.data.data) {
            const data = response.data.data;
            const current = userProfileRef.current;
            const isDifferent =
              !current ||
              current.firstName !== data.firstName ||
              current.lastName !== data.lastName ||
              current.title !== data.title ||
              current.image !== data.image ||
              current.buyerType !== data.buyerType ||
              current.email !== data.email ||
              current.phoneNumber !== data.phoneNumber;

            if (isDifferent) {
              const updatedProfile = {
                firstName: data.firstName || current?.firstName || "",
                lastName: data.lastName || current?.lastName || "",
                title: data.title || current?.title,
                image: data.image !== undefined ? data.image : current?.image,
                buyerType: data.buyerType || current?.buyerType || "Retail",
                email: data.email || current?.email || "",
                phoneNumber: data.phoneNumber || current?.phoneNumber || "",
                firstTimeUser: current?.firstTimeUser ?? 0,
                id: data.id || current?.id,
              };
              dispatch(updateUserProfile(updatedProfile));
              await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
            }
          }
        } catch (error) {
          // silently handle if offline or unauthenticated
        }
      };

      if (userTokenRef.current) {
        syncUserProfile();

        // Sync this user's cart from backend only if not actively modifying locally
        if (!isCartSyncingRef.current) {
          cartService.getUserCart()
            .then((dbCartRes) => {
              if (isCartSyncingRef.current) return;
              if (dbCartRes.data?.status && dbCartRes.data?.data) {
                const dbProducts = dbCartRes.data.data.products || [];
                const dbPackages = dbCartRes.data.data.packages || [];
                dispatch(
                  setCartFromBackend({
                    products: dbProducts,
                    packages: dbPackages,
                    cartUserId: userProfileRef.current?.id ?? null,
                  })
                );
              }
            })
            .catch(() => { });
        }
      } else {
        // No token — clear any stale cart items from a previous session
        dispatch(clearCart());
      }

      const onBackPress = () => {
        if (backPressedOnce.current) {
          BackHandler.exitApp();
          return true;
        }

        backPressedOnce.current = true;
        if (Platform.OS === "android") {
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        }

        setTimeout(() => {
          backPressedOnce.current = false;
        }, 2000);

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [dispatch]),
  );

  const fetchBanners = async () => {
    try {
      setLoadingBanners(true);
      const response = await productService.getBanners();
      if (response.data && response.data.status) {
        const fetchedSlides = response.data.slides || [];
        const matchingSlides = fetchedSlides.filter(
          (slide: any) => slide.type?.toLowerCase() === buyerType.toLowerCase(),
        );
        const slidesToUse = (
          matchingSlides.length > 0 ? matchingSlides : fetchedSlides
        ).slice();
        slidesToUse.sort((a: any, b: any) => {
          const indexA = a.indexId != null ? Number(a.indexId) : 999999;
          const indexB = b.indexId != null ? Number(b.indexId) : 999999;
          return indexA - indexB;
        });
        setBannerSlides(slidesToUse);
      }
    } catch (err) {
      console.error("Failed to load banner slides from backend:", err);
    } finally {
      setLoadingBanners(false);
    }
  };

  const fetchPackages = async () => {
    if (!isRetail) {
      setShopItems([]);
      return;
    }
    try {
      setLoadingProducts(true);
      const response = await productService.getAllPackages(buyerType);
      if (response.data && response.data.status) {
        const packages = (response.data?.product || []).map((item: any) => ({
          ...item,
          type: "package",
        }));
        setShopItems(packages);
      } else {
        setShopItems([]);
      }
    } catch (error) {
      console.error("Failed to load packages from backend:", error);
      setShopItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    getSelectedCategoryProducts(selectedCategoryId);
  }, [selectedCategoryId, buyerType]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = text.trim();
    if (!query) {
      getSelectedCategoryProducts(selectedCategoryId);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoadingProducts(true);
        const response = await productService.getProductsByCategory(
          "",
          buyerType,
          query,
        );

        let matchingProducts: ShopItem[] = [];
        if (response.data?.status && response.data.products) {
          matchingProducts = response.data.products.map((item: any) => ({
            ...item,
            type: "product",
          }));
        }

        if (isRetail) {
          try {
            const pkgResponse = await productService.getAllPackages(buyerType);
            if (pkgResponse.data?.status && pkgResponse.data.product) {
              const matchingPkgs = pkgResponse.data.product
                .filter((pkg: any) =>
                  (pkg.displayName || pkg.packageName || "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((item: any) => ({
                  ...item,
                  type: "package",
                }));
              matchingProducts = [...matchingPkgs, ...matchingProducts];
            }
          } catch (pkgErr) {
            console.log("Package search error:", pkgErr);
          }
        }

        setShopItems(matchingProducts);
      } catch (error) {
        console.error("Search failed:", error);
        setShopItems([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 350);
  };

  const getSelectedCategoryProducts = async (
    categoryId: string,
    currentBuyerType = buyerType,
  ) => {
    try {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setSearchQuery("");
      setSelectedCategoryId(categoryId);
      setLoadingProducts(true);
      if (categoryId === "Packages") {
        if (!isRetail) {
          setShopItems([]);
          setLoadingProducts(false);
          return;
        }
        const response = await productService.getAllPackages(currentBuyerType);
        if (response.data?.status) {
          const packages = (response.data?.product || []).map((item: any) => ({
            ...item,
            type: "package",
          }));
          setShopItems(packages);
        } else {
          setShopItems([]);
        }
        setLoadingProducts(false);
        return;
      }

      const response = await productService.getProductsByCategory(
        categoryId,
        currentBuyerType,
      );

      if (response.data?.status) {
        const products = (response.data.products || []).map((item: any) => ({
          ...item,
          type: "product",
        }));
        setShopItems(products);
      } else {
        setShopItems([]);
      }
    } catch (error) {
      console.error(
        "Failed to load selected category products from backend:",
        error,
      );
      setShopItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    if (isRetail) {
      setSelectedCategoryId("Packages");
      fetchPackages();
    } else {
      setSelectedCategoryId("Vegetables");
      getSelectedCategoryProducts("Vegetables", buyerType);
    }
  }, [buyerType, isRetail]);

  // Real-time Home Screen updates for Products, Packages & Banners via Socket.IO
  useEffect(() => {
    const handleRefreshItems = () => {
      const query = searchQuery.trim();
      if (query) {
        productService
          .getProductsByCategory("", buyerType, query)
          .then(async (response) => {
            let matchingProducts: ShopItem[] = [];
            if (response.data?.status && response.data.products) {
              matchingProducts = response.data.products.map((item: any) => ({
                ...item,
                type: "product",
              }));
            }
            if (isRetail) {
              try {
                const pkgResponse = await productService.getAllPackages(buyerType);
                if (pkgResponse.data?.status && pkgResponse.data.product) {
                  const matchingPkgs = pkgResponse.data.product
                    .filter((pkg: any) =>
                      (pkg.displayName || pkg.packageName || "")
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((item: any) => ({
                      ...item,
                      type: "package",
                    }));
                  matchingProducts = [...matchingPkgs, ...matchingProducts];
                }
              } catch { }
            }
            setShopItems(matchingProducts);
          })
          .catch(() => { });
      } else {
        if (selectedCategoryId === "Packages" && isRetail) {
          fetchPackages();
        } else {
          getSelectedCategoryProducts(selectedCategoryId, buyerType);
        }
      }
    };

    const unsubscribeCatalog = socketService.onCatalogUpdate((data) => {
      console.log("📦 [HomeScreen] Real-time catalog update received via Socket.IO:", data);
      fetchBanners();
      handleRefreshItems();
    });

    const unsubscribeBanner = socketService.onBannerUpdate((data) => {
      console.log("🎨 [HomeScreen] Real-time banner update received via Socket.IO:", data);
      fetchBanners();
    });

    return () => {
      unsubscribeCatalog();
      unsubscribeBanner();
    };
  }, [selectedCategoryId, buyerType, isRetail, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const promises: Promise<any>[] = [fetchBanners()];

      if (userToken) {
        promises.push(
          customerService
            .getAccountDetails()
            .then(async (response) => {
              if (response.data && response.data.data) {
                const data = response.data.data;
                const updatedProfile = {
                  firstName: data.firstName || userProfile?.firstName || "",
                  lastName: data.lastName || userProfile?.lastName || "",
                  title: data.title || userProfile?.title,
                  image: data.image !== undefined ? data.image : userProfile?.image,
                  buyerType: data.buyerType || userProfile?.buyerType || "Retail",
                  email: data.email || userProfile?.email || "",
                  phoneNumber: data.phoneNumber || userProfile?.phoneNumber || "",
                  firstTimeUser: userProfile?.firstTimeUser ?? 0,
                  id: data.id || userProfile?.id,
                };
                dispatch(updateUserProfile(updatedProfile));
                await AsyncStorage.setItem(
                  "userProfile",
                  JSON.stringify(updatedProfile),
                );
              }
            })
            .catch(() => { }),
        );

        // Also refresh the cart from backend
        promises.push(
          cartService.getUserCart()
            .then((dbCartRes) => {
              if (dbCartRes.data?.status && dbCartRes.data?.data) {
                const dbProducts = dbCartRes.data.data.products || [];
                const dbPackages = dbCartRes.data.data.packages || [];
                dispatch(
                  setCartFromBackend({
                    products: dbProducts,
                    packages: dbPackages,
                    cartUserId: userProfile?.id ?? null,
                  })
                );
              }
            })
            .catch(() => { }),
        );
      }

      const query = searchQuery.trim();
      if (query) {
        promises.push(
          productService
            .getProductsByCategory("", buyerType, query)
            .then(async (response) => {
              let matchingProducts: ShopItem[] = [];
              if (response.data?.status && response.data.products) {
                matchingProducts = response.data.products.map((item: any) => ({
                  ...item,
                  type: "product",
                }));
              }
              if (isRetail) {
                try {
                  const pkgResponse =
                    await productService.getAllPackages(buyerType);
                  if (pkgResponse.data?.status && pkgResponse.data.product) {
                    const matchingPkgs = pkgResponse.data.product
                      .filter((pkg: any) =>
                        (pkg.displayName || pkg.packageName || "")
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((item: any) => ({
                        ...item,
                        type: "package",
                      }));
                    matchingProducts = [...matchingPkgs, ...matchingProducts];
                  }
                } catch { }
              }
              setShopItems(matchingProducts);
            })
            .catch(() => { }),
        );
      } else {
        if (selectedCategoryId === "Packages" && isRetail) {
          promises.push(fetchPackages());
        } else {
          promises.push(
            getSelectedCategoryProducts(selectedCategoryId, buyerType),
          );
        }
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to refresh home screen:", error);
    } finally {
      setRefreshing(false);
    }
  }, [
    buyerType,
    isRetail,
    selectedCategoryId,
    searchQuery,
    userToken,
    userProfile,
    dispatch,
  ]);

  const itemRows: ShopItem[][] = [];
  for (let i = 0; i < shopItems?.length; i += 2) {
    itemRows.push(shopItems?.slice(i, i + 2));
  }

  const handleProfileNavigation = useCallback(() => {
    navigation.navigate("Profile");
  }, [navigation]);

  const handleMyCartNavigation = useCallback(() => {
    navigation.navigate("MyCart");
  }, [navigation]);

  const handleToggleUnit = useCallback(
    (productId: number, unit: "g" | "kg") => {
      const item = cartProducts.find((p: ProductCartItem) => p.id === productId);
      if (!item || item.unit === unit) return;
      isCartSyncingRef.current = true;
      dispatch(changeProductUnit({ id: productId, newUnit: unit }));
      showToast("Cart Updated");
      if (userToken) {
        const newWeight = unit === "kg" ? parseFloat((item.weight / 1000).toFixed(3)) : Math.round(item.weight * 1000);
        cartService.syncCartProduct(productId, newWeight, unit)
          .catch((err) => console.error("Cart DB sync error:", err))
          .finally(() => {
            setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
          });
      } else {
        isCartSyncingRef.current = false;
      }
    },
    [dispatch, showToast, userToken, cartProducts],
  );

  const handleIncrement = useCallback(
    (productId: number) => {
      isCartSyncingRef.current = true;
      dispatch(increaseProductWeight(productId));
      showToast("Cart Updated");
      if (userToken) {
        const item = cartProducts.find((p: ProductCartItem) => p.id === productId);
        if (item) {
          const newWeight = item.unit === "kg"
            ? parseFloat((item.weight + item.step).toFixed(3))
            : Math.round(item.weight + item.step);
          cartService.syncCartProduct(productId, newWeight, item.unit)
            .catch((err) => console.error("Cart DB sync error:", err))
            .finally(() => {
              setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
            });
        }
      } else {
        isCartSyncingRef.current = false;
      }
    },
    [dispatch, showToast, userToken, cartProducts],
  );

  const handleDecrement = useCallback(
    (productId: number) => {
      isCartSyncingRef.current = true;
      const existing = cartProducts.find(
        (p: ProductCartItem) => p.id === productId,
      );
      if (existing && existing.weight <= existing.minimumWeight) {
        dispatch(removeProduct(productId));

        setAddTimeSnapshots((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        showToast("Removed from cart");
        if (userToken) {
          cartService.removeCartProduct(productId)
            .catch((err) => console.error("Cart DB sync error:", err))
            .finally(() => {
              setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
            });
        } else {
          isCartSyncingRef.current = false;
        }
      } else {
        dispatch(decreaseProductWeight(productId));
        showToast("Cart Updated");
        if (existing && userToken) {
          const decremented = existing.unit === "kg"
            ? parseFloat((existing.weight - existing.step).toFixed(3))
            : Math.round(existing.weight - existing.step);
          const newWeight = Math.max(existing.minimumWeight, decremented);
          cartService.syncCartProduct(productId, newWeight, existing.unit)
            .catch((err) => console.error("Cart DB sync error:", err))
            .finally(() => {
              setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
            });
        } else {
          isCartSyncingRef.current = false;
        }
      }
    },
    [dispatch, cartProducts, showToast, userToken],
  );

  const handleAddProduct = useCallback(
    async (product: ProductType) => {
      if (addingItemId === product.id) return;
      setAddingItemId(product.id);
      isCartSyncingRef.current = true;

      const rawStartValue = parseFloat(String(product.startValue ?? "1")) || 1;
      const dbUnitType = (product.unitType || "g").toLowerCase();

      let initialUnit: "g" | "kg" = (dbUnitType === "kg" && rawStartValue < 1) || dbUnitType === "g" ? "g" : "kg";
      let initialWeight = initialUnit === "g"
        ? (dbUnitType === "kg" || rawStartValue <= 10 ? Math.round(rawStartValue * 1000) : Math.round(rawStartValue))
        : (dbUnitType === "kg" || rawStartValue <= 10 ? parseFloat(rawStartValue.toFixed(3)) : parseFloat((rawStartValue / 1000).toFixed(3)));

      const rawChangeBy =
        product.changeby != null && String(product.changeby).trim() !== "" && parseFloat(String(product.changeby)) > 0
          ? parseFloat(String(product.changeby))
          : rawStartValue;

      const step =
        initialUnit === "g"
          ? (dbUnitType === "kg" || rawChangeBy <= 10 ? Math.round(rawChangeBy * 1000) : Math.round(rawChangeBy))
          : (dbUnitType === "kg" || rawChangeBy <= 10 ? parseFloat(rawChangeBy.toFixed(3)) : parseFloat((rawChangeBy / 1000).toFixed(3)));

      const minWeight =
        initialUnit === "g"
          ? (dbUnitType === "kg" || rawStartValue <= 10 ? Math.round(rawStartValue * 1000) : Math.round(rawStartValue))
          : (dbUnitType === "kg" || rawStartValue <= 10 ? parseFloat(rawStartValue.toFixed(3)) : parseFloat((rawStartValue / 1000).toFixed(3)));

      const normalPerUnit = parseFloat(String(product.normalPrice)) || 0;
      const discountedPerUnit =
        product.discountedPrice != null
          ? parseFloat(String(product.discountedPrice))
          : null;

      const hasDiscount =
        discountedPerUnit != null &&
        discountedPerUnit > 0 &&
        discountedPerUnit < normalPerUnit;

      const effectiveUnitPrice = hasDiscount
        ? discountedPerUnit
        : normalPerUnit;

      dispatch(
        addProduct({
          id: product.id,
          name: product.displayName,
          image: product.image,
          price: effectiveUnitPrice,
          normalPrice: normalPerUnit,
          discountedPrice: discountedPerUnit || undefined,
          comPrice: product.comPrice != null ? parseFloat(String(product.comPrice)) : undefined,
          weight: initialWeight,
          unit: initialUnit,
          minimumWeight: minWeight,
          step: step,
        }),
      );

      setAddTimeSnapshots((prev) => ({
        ...prev,
        [product.id]: {
          weight: initialWeight,
          unit: initialUnit,
          price: effectiveUnitPrice,
        },
      }));

      setExpandedItemId(product.id);
      showToast("Added to Cart");

      if (userToken) {
        try {
          await cartService.syncCartProduct(product.id, initialWeight, initialUnit);
        } catch (err) {
          console.error("Cart DB sync error:", err);
        }
      }

      setTimeout(() => {
        setAddingItemId(null);
        isCartSyncingRef.current = false;
      }, 400);
    },
    [dispatch, showToast, userToken, addingItemId],
  );

  const handleAddPackage = useCallback(
    async (pkg: PackageType) => {
      if (addingItemId === pkg.id) return;
      setAddingItemId(pkg.id);
      isCartSyncingRef.current = true;

      const price = parseFloat(pkg.subTotal) || 0;

      dispatch(
        addPackage({
          id: pkg.id,
          name: pkg.displayName,
          image: pkg.image,
          price,
          quantity: 1,
          totalItems: pkg.totalItems || 0,
        }),
      );

      setAddTimeSnapshots((prev) => ({
        ...prev,
        [pkg.id]: { quantity: 1, price },
      }));

      setExpandedItemId(pkg.id);
      showToast("Added to Cart");

      if (userToken) {
        try {
          await cartService.syncCartPackage(pkg.id, 1);
        } catch (err) {
          console.error("Cart DB sync package error:", err);
        }
      }

      setTimeout(() => {
        setAddingItemId(null);
        isCartSyncingRef.current = false;
      }, 400);
    },
    [dispatch, showToast, userToken, addingItemId],
  );

  const handleIncrementPackage = useCallback(
    (packageId: number) => {
      isCartSyncingRef.current = true;
      dispatch(increasePackageQuantity(packageId));
      const existing = cartPackages.find((p: PackageCartItem) => p.id === packageId);
      const newQty = (existing?.quantity || 1) + 1;
      if (userToken) {
        cartService.syncCartPackage(packageId, newQty)
          .catch((err) => console.error("Cart DB sync package increment error:", err))
          .finally(() => {
            setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
          });
      } else {
        isCartSyncingRef.current = false;
      }
      showToast("Cart Updated");
    },
    [dispatch, cartPackages, showToast, userToken],
  );

  const handleDecrementPackage = useCallback(
    (packageId: number) => {
      isCartSyncingRef.current = true;
      const existing = cartPackages.find(
        (p: PackageCartItem) => p.id === packageId,
      );
      if (existing && existing.quantity <= 1) {
        dispatch(removePackage(packageId));
        if (userToken) {
          cartService.removeCartPackage(packageId)
            .catch((err) => console.error("Cart DB remove package error:", err))
            .finally(() => {
              setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
            });
        } else {
          isCartSyncingRef.current = false;
        }

        setAddTimeSnapshots((prev) => {
          const next = { ...prev };
          delete next[packageId];
          return next;
        });
        showToast("Removed from cart");
      } else {
        dispatch(decreasePackageQuantity(packageId));
        const newQty = (existing?.quantity || 1) - 1;
        if (userToken) {
          cartService.syncCartPackage(packageId, newQty)
            .catch((err) => console.error("Cart DB sync package decrement error:", err))
            .finally(() => {
              setTimeout(() => { isCartSyncingRef.current = false; }, 1000);
            });
        } else {
          isCartSyncingRef.current = false;
        }
        showToast("Cart Updated");
      }
    },
    [dispatch, cartPackages, showToast, userToken],
  );

  return (
    <View className="flex-1 bg-white">
      {/* Top Cart Toast Notification */}
      <CartToast visible={toastVisible} message={toastMessage} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9114"]}
            tintColor="#FF9114"
          />
        }
      >
        {/* Top Header */}
        <HomeHeader onPressProfile={handleProfileNavigation} />

        {/* Dynamic Image Slides (Banners) */}
        {loadingBanners ? (
          <BannerSkeleton />
        ) : (
          <HomeBannerSlider bannerSlides={bannerSlides} />
        )}

        {/* Search Bar */}
        <View
          className="flex-row items-center bg-white border border-[#E5E5EA] rounded-full px-5 mx-6 mt-5 shadow-sm"
          style={{ height: 50 }}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#8E8E93"
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search Product..."
            className="text-black text-sm flex-1 font-semibold p-0"
            placeholderTextColor="#848484"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Shop By Categories */}
        <View className="mt-6">
          <Text className="text-black text-lg font-black px-6 mb-4">
            Shop By Categories
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 6, gap: 12 }}
            className="flex-row"
          >
            {visibleCategories.map((category) => {
              const isActive = category.id === selectedCategoryId;
              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.9}
                  onPress={() => getSelectedCategoryProducts(category.id)}
                  style={{
                    width: 76,
                    height: 98,
                    backgroundColor: isActive ? category.activeBg : "#FFFFFF",
                    borderWidth: 1.2,
                    borderColor: isActive
                      ? category.activeBg
                      : category.borderColor,
                    borderTopLeftRadius: 38,
                    borderTopRightRadius: 38,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 4,
                    paddingBottom: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {/* Circular image wrapper */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isActive ? "#FFFFFF" : category.circleBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/*
                      FIX: use the locally required image asset (resolved at
                      build time) instead of `{ uri: category.image }`, which
                      cannot resolve a relative bundler path and silently
                      fails to render.
                    */}
                    <Image
                      source={CATEGORY_IMAGES[category.id]}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Text inside the card */}
                  <Text
                    style={{
                      fontWeight: 500,
                      color: isActive ? "#FFFFFF" : "#1E1E1E",
                      textAlign: "center",
                      marginTop: 6,
                      fontSize: 12
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {searchQuery.trim().length > 0 && (
          <View className="flex-row items-center justify-between px-6 mt-6">
            <Text className="text-black text-base font-bold">
              Results for "{searchQuery.trim()}" ({shopItems.length})
            </Text>
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7}>
              <Text className="text-[#FB4300] text-sm font-bold">Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Product Grid */}
        {loadingProducts ? (
          <ProductGridSkeleton />
        ) : itemRows.length === 0 ? (
          searchQuery.trim().length > 0 ? (
            <View className="items-center justify-center py-10 px-6">
              <NoDataFound message={`No products found matching "${searchQuery.trim()}"`} />
            </View>
          ) : (
            <View className="items-center justify-center py-10 px-6">
              <NoDataFound message="No products found in this category" />
            </View>
          )
        ) : (
          <View className="mt-8 px-4">
            {itemRows.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-between mb-4">
                {row.map((product) => {
                  const isProduct = product.type === "product";
                  const isPackage = product.type === "package";
                  const cartItem = isProduct
                    ? cartProducts.find(
                      (p: ProductCartItem) => p.id === product.id,
                    )
                    : null;
                  const cartPackage = isPackage
                    ? cartPackages.find(
                      (p: PackageCartItem) => p.id === product.id,
                    )
                    : null;

                  const isExpanded = product.id === expandedItemId;
                  const snapshot = addTimeSnapshots[product.id];

                  const rawStartValue = isProduct
                    ? parseFloat(String(product.startValue ?? "1")) || 1
                    : 1;
                  const rawUnitType = isProduct
                    ? (product.unitType || "g").toLowerCase()
                    : "g";

                  const displayWeightText = isProduct
                    ? rawStartValue < 1
                      ? `${Math.round(rawStartValue * 1000)} g`
                      : `${rawStartValue} ${rawUnitType}`
                    : "";

                  const normalPerUnit = isProduct
                    ? parseFloat(String(product.normalPrice)) || 0
                    : 0;
                  const discountedPerUnit =
                    isProduct && product.discountedPrice != null
                      ? parseFloat(String(product.discountedPrice))
                      : null;

                  const hasDiscount =
                    isProduct &&
                    discountedPerUnit != null &&
                    discountedPerUnit > 0 &&
                    discountedPerUnit < normalPerUnit;

                  // ---- Price display type (backend: marketplaceitems.displayType) ----
                  // "AP&SP&D" -> actual price (struck) + sale price + discount% badge
                  // "AP&SP"   -> actual price (struck) + sale price, no badge
                  // "D&AP"    -> only sale price + discount% badge, no struck price
                  // Falls back to showing everything if displayType is unset/unknown,
                  // matching the previous behavior for existing items.
                  const displayType = isProduct
                    ? ((product as any).displayType as DisplayType | undefined)
                    : undefined;

                  const showDiscountBadge =
                    hasDiscount &&
                    (displayType === "AP&SP&D" ||
                      displayType === "D&AP" ||
                      !displayType);

                  const showStruckNormalPrice =
                    hasDiscount &&
                    (displayType === "AP&SP&D" ||
                      displayType === "AP&SP" ||
                      !displayType);

                  const startNormalPrice = isProduct
                    ? normalPerUnit * rawStartValue
                    : 0;
                  const startDiscountedPrice =
                    isProduct && discountedPerUnit != null
                      ? discountedPerUnit * rawStartValue
                      : startNormalPrice;

                  const basePrice = isProduct
                    ? hasDiscount
                      ? startDiscountedPrice
                      : startNormalPrice
                    : parseFloat(String(product.subTotal)) || 0;

                  const weightMultiplier = cartItem
                    ? cartItem.unit === "kg"
                      ? cartItem.weight
                      : cartItem.weight / 1000
                    : 1;
                  const effectiveCartUnitPrice = cartItem
                    ? (cartItem.discountedPrice != null &&
                      cartItem.discountedPrice > 0 &&
                      cartItem.normalPrice != null &&
                      cartItem.discountedPrice < cartItem.normalPrice
                      ? cartItem.discountedPrice
                      : (cartItem.discountedPrice != null &&
                        cartItem.discountedPrice > 0 &&
                        cartItem.price != null &&
                        cartItem.discountedPrice < cartItem.price
                        ? cartItem.discountedPrice
                        : cartItem.price))
                    : (hasDiscount ? discountedPerUnit! : normalPerUnit);
                  const calculatedProductPrice = cartItem
                    ? effectiveCartUnitPrice * weightMultiplier
                    : basePrice;
                  const calculatedPackagePrice = cartPackage
                    ? basePrice * cartPackage.quantity
                    : basePrice;
                  const isMinimum = cartItem
                    ? cartItem.weight <= cartItem.minimumWeight
                    : false;

                  return (
                    <TouchableOpacity
                      key={product.id}
                      activeOpacity={0.9}
                      className="flex-1"
                      onPress={() => {
                        if (product.type === "package") {
                          navigation.navigate("ViewPackage", {
                            packageId: product.id,
                            packageName: product.displayName,
                            image: product.image,
                            price: parseFloat(product.subTotal),
                          });
                        } else {
                          navigation.navigate("ViewProduct", {
                            product: product,
                          });
                        }
                      }}
                    >
                      <View
                        key={product.id!}
                        className="flex-1 bg-[#F4F3F3] pt-10 pb-5 px-3 items-center mx-2 relative mb-6 min-h-[220px]"
                        style={{
                          borderTopLeftRadius: 100,
                          borderTopRightRadius: 100,
                          borderBottomLeftRadius: 18,
                          borderBottomRightRadius: 18,
                        }}
                      >
                        {isProduct && showDiscountBadge && product.discount && (
                          <View
                            style={{
                              position: "absolute",
                              display: "flex",
                              top: 15,
                              left: 4,
                              width: 35,
                              height: 35,
                              backgroundColor: "#F34261",
                              borderRadius: 100,
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                textAlign: "center",
                                color: "#FFF",
                              }}
                            >
                              {product.discount}%
                            </Text>
                          </View>
                        )}


                        <View className="w-28 h-28 rounded-full bg-white items-center justify-center shadow-sm border border-gray-100">
                          <Image
                            source={{ uri: product?.image! }}
                            className="w-20 h-20"
                            resizeMode="contain"
                          />
                        </View>

                        {/* Product Details */}
                        <View style={{ width: "100%", marginTop: 4 }}>
                          <FixedMarqueeText
                            key={product.id}
                            text={product?.displayName!}
                            style={{
                              color: "#000000",
                              fontWeight: "bold",
                              fontSize: 13,
                              textAlign: "center",
                            }}
                          />
                        </View>

                        {/* PRODUCT CARD: Not in cart */}
                        {isProduct && !cartItem && (
                          <>
                            <Text className="text-[#5A5859] text-[11px] mt-0.5 text-center">
                              {displayWeightText}
                            </Text>

                            {showStruckNormalPrice && (
                              <Text className="text-[#5A5859] text-[11px] line-through text-center mt-0.5">
                                Rs. {formatPrice(startNormalPrice)}
                              </Text>
                            )}

                            <Text className="text-[#000000] font-extrabold text-sm mt-0.5 text-center">
                              Rs. {formatPrice(basePrice)}
                            </Text>

                            {/* Black Circular Add Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={addingItemId === product.id}
                              onPress={() => {
                                handleAddProduct(product as ProductType);
                              }}
                              className="w-10 h-10 rounded-full bg-black items-center justify-center absolute -bottom-5"
                              style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 5,
                              }}
                            >
                              {addingItemId === product.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="add" size={22} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          </>
                        )}

                        {/* PRODUCT CARD: In cart, EXPANDED (currently active) */}
                        {isProduct && cartItem && isExpanded && (
                          <>
                            {/* Unit Switcher: kg vs g */}
                            <View className="flex-row items-center justify-center mt-2 mb-1">
                              {/* kg button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleToggleUnit(product.id, "kg");
                                }}
                                style={{
                                  backgroundColor:
                                    cartItem.unit === "kg"
                                      ? "#FF9114"
                                      : "#FFC179",
                                  width: 38,
                                  height: 22,
                                  borderRadius: 11,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    textAlignVertical: "center",
                                    includeFontPadding: false,
                                  }}
                                >
                                  kg
                                </Text>
                              </TouchableOpacity>

                              {/* Arrow icon */}
                              <View
                                style={{
                                  height: 22,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginHorizontal: 6,
                                }}
                              >
                                <FontAwesome6
                                  name="arrows-left-right"
                                  size={13}
                                  color="#000000"
                                />
                              </View>

                              {/* g button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleToggleUnit(product.id, "g");
                                }}
                                style={{
                                  backgroundColor:
                                    cartItem.unit === "g"
                                      ? "#FF9114"
                                      : "#FFC179",
                                  width: 38,
                                  height: 22,
                                  borderRadius: 11,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    textAlignVertical: "center",
                                    includeFontPadding: false,
                                  }}
                                >
                                  g
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Quantity Selector Capsule */}
                            <View className="flex-row items-center justify-between bg-[#F4F3F3] border border-[#A3A3A3] rounded-full px-1.5 py-1 w-full max-w-[130px] mt-3 shadow-sm">
                              {/* Minus / Trash Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDecrement(product.id);
                                }}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                {isMinimum ? (
                                  <FontAwesome6
                                    name="trash"
                                    size={13}
                                    color="#FFFFFF"
                                  />
                                ) : (
                                  <Ionicons
                                    name="remove"
                                    size={14}
                                    color="#FFFFFF"
                                  />
                                )}
                              </TouchableOpacity>

                              {/* Qty value */}
                              <Text className="text-black font-bold text-[12px]">
                                {cartItem.weight} {cartItem.unit}
                              </Text>

                              {/* Plus Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleIncrement(product.id);
                                }}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                <Ionicons
                                  name="add"
                                  size={14}
                                  color="#FFFFFF"
                                />
                              </TouchableOpacity>
                            </View>

                            {/* Price */}
                            <Text className="text-black font-extrabold text-sm mt-2 text-center">
                              Rs. {formatPrice(calculatedProductPrice)}
                            </Text>
                          </>
                        )}

                        {/* PRODUCT CARD: In cart, COLLAPSED (not the active one) */}
                        {isProduct && cartItem && !isExpanded && (
                          <>
                            <Text className="text-[#5A5859] text-[11px] mt-0.5 text-center">
                              {displayWeightText}
                            </Text>

                            {showStruckNormalPrice && (
                              <Text className="text-[#5A5859] text-[11px] line-through text-center mt-0.5">
                                Rs. {formatPrice(startNormalPrice)}
                              </Text>
                            )}

                            <Text className="text-[#000000] font-extrabold text-sm mt-0.5 text-center">
                              Rs. {formatPrice(basePrice)}
                            </Text>

                            {/* Plus Button — tap to re-expand this card and see live controls */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={addingItemId === product.id}
                              onPress={() => {
                                setExpandedItemId(product.id);
                              }}
                              className="w-10 h-10 rounded-full bg-black items-center justify-center absolute -bottom-5"
                              style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 5,
                              }}
                            >
                              <Ionicons name="add" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        )}

                        {/* PACKAGE CARD: Not in cart */}
                        {isPackage && !cartPackage && (
                          <>
                            <Text className="text-black font-extrabold text-sm mt-2 text-center">
                              Rs. {formatPrice(basePrice)}
                            </Text>

                            {/* Add Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={addingItemId === product.id}
                              onPress={() => {
                                handleAddPackage(product as PackageType);
                              }}
                              className="w-10 h-10 rounded-full bg-black items-center justify-center absolute -bottom-5"
                              style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 5,
                              }}
                            >
                              {addingItemId === product.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="add" size={22} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          </>
                        )}

                        {/* PACKAGE CARD: In cart, EXPANDED (currently active) */}
                        {isPackage && cartPackage && isExpanded && (
                          <>
                            {/* Quantity Selector capsule for Package */}
                            <View className="flex-row items-center justify-between bg-[#F4F3F3] border border-[#A3A3A3] rounded-full px-1.5 py-1 w-full max-w-[130px] mt-2 shadow-sm">
                              {/* Minus / Trash Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDecrementPackage(product.id);
                                }}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                {cartPackage.quantity <= 1 ? (
                                  <FontAwesome6
                                    name="trash"
                                    size={13}
                                    color="#FFFFFF"
                                  />
                                ) : (
                                  <Ionicons
                                    name="remove"
                                    size={14}
                                    color="#FFFFFF"
                                  />
                                )}
                              </TouchableOpacity>

                              {/* Quantity value */}
                              <Text className="text-black font-bold text-[12px]">
                                {cartPackage.quantity}
                              </Text>

                              {/* Plus Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleIncrementPackage(product.id);
                                }}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                <Ionicons
                                  name="add"
                                  size={14}
                                  color="#FFFFFF"
                                />
                              </TouchableOpacity>
                            </View>

                            {/* Price */}
                            <Text className="text-black font-extrabold text-sm mt-2 text-center">
                              Rs. {formatPrice(calculatedPackagePrice)}
                            </Text>
                          </>
                        )}

                        {/* PACKAGE CARD: In cart, COLLAPSED (not the active one) */}
                        {/* Shows the FROZEN add-time snapshot, not live cartPackage data. */}
                        {isPackage && cartPackage && !isExpanded && (
                          <>
                            <Text className="text-black font-extrabold text-sm mt-0.5 text-center">
                              Rs.{" "}
                              {formatPrice(
                                snapshot?.price ?? calculatedPackagePrice,
                              )}
                            </Text>

                            {/* Checkmark / Re-expand Button — tap to re-expand this card */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={addingItemId === product.id}
                              onPress={() => {
                                setExpandedItemId(product.id);
                              }}
                              className="w-10 h-10 rounded-full bg-black items-center justify-center absolute -bottom-5"
                              style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 5,
                              }}
                            >
                              <Ionicons name="add" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {row.length === 1 && <View className="flex-1" />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating View Cart Button */}
      <ViewCartPopup
        visible={totalCartItems > 0}
        itemCount={totalCartItems}
        onPress={handleMyCartNavigation}
      />

      {/* Floating Bottom Navigation Bar */}
      <BottomNavigation activeScreen="Home" navigation={navigation} />
    </View>
  );
};

export default Home;