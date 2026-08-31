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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, ProductType, PackageType, ShopItem } from "@/types/types";
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
} from "@/store/cartSlice";

import HomeHeader from "@/component/home/HomeHeader";
import HomeBannerSlider from "@/component/home/HomeBannerSlider";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import productService from "@/services/product/product.service";

// Re-export for backward compatibility with any screens importing ProductType from here
export type { ProductType, PackageType } from "@/types/types";

type HomeNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeProps {
  navigation: HomeNavigationProp;
}

interface Category {
  id: string;
  name: string;
  image: string;
  circleBg: string;
  borderColor: string;
  activeBg: string;
  active: boolean;
}

const CATEGORIES: Category[] = [

  {
    id: "Packages",
    name: "Packages",
    image: "https://cdn-icons-png.flaticon.com/512/2956/2956820.png",
    circleBg: "#FFE4E6",
    borderColor: "#FDA4AF",
    activeBg: "#F43F5E",
    active: false
  },
  {
    id: "Vegetables",
    name: "Veggies",
    image: "https://cdn-icons-png.flaticon.com/512/2909/2909848.png",
    circleBg: "#FFFFFF",
    borderColor: "#84CC16",
    activeBg: "#84CC16",
    active: true
  },
  {
    id: "Fruits",
    name: "Fruits",
    image: "https://cdn-icons-png.flaticon.com/512/415/415733.png",
    circleBg: "#FFE4E6",
    borderColor: "#F87171",
    activeBg: "#EF4444",
    active: false
  },
  {
    id: "Cereals",
    name: "Cereal",
    image: "https://cdn-icons-png.flaticon.com/512/2674/2674486.png",
    circleBg: "#FEF9C3",
    borderColor: "#FDE047",
    activeBg: "#EAB308",
    active: false
  },
  {
    id: "Spices",
    name: "Spices",
    image: "https://cdn-icons-png.flaticon.com/512/8106/8106571.png",
    circleBg: "#FFEDD5",
    borderColor: "#FDBA74",
    activeBg: "#D97706",
    active: false
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
      ])
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
          <View
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-[#E5E5EA]"
          />
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
      ])
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
  const cartProducts = useSelector((state: RootState) => state.cart.products);

  const [bannerSlides, setBannerSlides] = useState<{ id: number; image: string; details: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("Packages");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // initial fetching
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoadingBanners(true);
        const response = await productService.getBanners();
        if (response.data && response.data.status) {
          const fetchedSlides = response.data.slides || [];
          const retailSlides = fetchedSlides.filter((slide: any) => slide.type === "Retail");
          setBannerSlides(retailSlides);
        }
      } catch (err) {
        console.error("Failed to load banner slides from backend:", err);
      } finally {
        setLoadingBanners(false);
      }
    };

    const fetchPackages = async () => {
      try {
        setLoadingProducts(true);
        const response = await productService.getAllPackages();
        if (response.data && response.data.status) {
          const packages = response.data?.product.map((item: any) => ({
            ...item,
            type: "package",
          }));
          setShopItems(packages);
        }
      } catch (error) {
        console.error("Failed to load packages from backend:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchBanners();
    fetchPackages();
  }, []);

  const getSelectedCategoryProducts = async (categoryId: string) => {
    try {
      setSelectedCategoryId(categoryId);
      setLoadingProducts(true);
      if (categoryId === "Packages") {
        const response = await productService.getAllPackages();
        if (response.data?.status) {
          const packages = response.data?.product.map((item: any) => ({
            ...item,
            type: "package",
          }));
          setShopItems(packages);
        }
        setLoadingProducts(false);
        return;
      }

      const response = await productService.getProductsByCategory(categoryId);

      if (response.data?.status) {
        const products = response.data.products.map(
          (item: any) => ({
            ...item,
            type: "product",
          })
        );
        setShopItems(products);
      }
    } catch (error) {
      console.error("Failed to load selected category products from backend:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

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

  const handleToggleUnit = useCallback((productId: number, unit: "g" | "kg") => {
    dispatch(changeProductUnit({ id: productId, newUnit: unit }));
  }, [dispatch]);

  const handleIncrement = useCallback((productId: number) => {
    dispatch(increaseProductWeight(productId));
  }, [dispatch]);

  const handleDecrement = useCallback((productId: number) => {
    const existing = cartProducts.find((p) => p.id === productId);
    if (existing && existing.weight <= existing.minimumWeight) {
      dispatch(removeProduct(productId));
    } else {
      dispatch(decreaseProductWeight(productId));
    }
  }, [dispatch, cartProducts]);

  const handleAddProduct = useCallback((product: ProductType) => {
    dispatch(
      addProduct({
        id: product.id,
        name: product.displayName,
        image: product.image,
        price: parseFloat(product.normalPrice) || 0,
        weight: 500,
        unit: "g",
        minimumWeight: 500,
        step: 100,
      })
    );
  }, [dispatch]);


  return (
    <View className="flex-1 bg-white">

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        className="flex-1"
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
          />
        </View>

        {/* Shop By Categories */}
        <View className="mt-6">
          <Text className="text-black text-lg font-black px-6 mb-4">
            Shop By Categories
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            className="flex-row"
          >
            {CATEGORIES.map((category) => {
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
                    borderColor: isActive ? category.activeBg : category.borderColor,
                    borderTopLeftRadius: 38,
                    borderTopRightRadius: 38,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 4,
                    paddingBottom: 4,
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
                    <Image
                      source={{ uri: category.image }}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Text inside the card */}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: isActive ? "#FFFFFF" : "#1E1E1E",
                      textAlign: "center",
                      marginTop: 6,
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Product Grid */}
        {loadingProducts ? (
          <ProductGridSkeleton />
        ) : (
          <View className="mt-8 px-4">
            {itemRows.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-between mb-4">
                {row.map((product) => {
                  const cartItem = cartProducts.find((p) => p.id === product.id);

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
                        className="flex-1 bg-[#F4F3F3] pt-12 pb-6 px-4 items-center mx-2 relative mb-6"
                        style={{
                          borderTopLeftRadius: 100,
                          borderTopRightRadius: 100,
                          borderBottomLeftRadius: 18,
                          borderBottomRightRadius: 18,
                        }}
                      >
                        {(product.type == "product" && product.discount) &&
                          <View style={{ position: "absolute", display: "flex", top: 15, left: 2, width: 35, height: 35, backgroundColor: "#F34261", borderRadius: 100, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", textAlign: "center", alignItems: "center", color: "#FFF" }}>{product.discount + "%"}</Text>
                          </View>}


                        {/* Circular Product Image Container */}
                        <View className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center shadow-sm border border-gray-100">
                          <Image
                            source={{ uri: product?.image! }}
                            className="w-12 h-12"
                            resizeMode="contain"
                          />
                        </View>

                        {/* Product Details */}
                        <Text className="text-black font-bold text-sm mt-1 text-center" numberOfLines={1}>
                          {product?.displayName!}
                        </Text>

                        {!cartItem ? (
                          <>
                            {product.type == "product" && <Text className="   text-gray-400 text-[11px] mt-0.5 text-center">
                              {product.type == "product" && product?.startValue! + " " + (product.unitType!).toLowerCase()}
                            </Text>}
                            {product.type == "package" && <Text className="text-black font-extrabold text-sm mt-1 text-center">
                              {product.type == "package" && "Rs. " + product?.subTotal!}
                            </Text>}
                            {product.type == "product" &&
                              <Text className="text-black font-extrabold text-sm mt-1 text-center">
                                {product.type == "product" && "Rs. " + product.normalPrice}
                              </Text>
                            }

                            {/* Add Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                if (product.type === "product") {
                                  handleAddProduct(product as ProductType);
                                }
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
                        ) : (
                          <>
                            {/* Unit Switcher: kg vs g */}
                            <View className="flex-row items-center justify-center mt-2 mb-1">
                              {/* kg button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleToggleUnit(product.id, "kg")}
                                style={{
                                  backgroundColor: cartItem.unit === "kg" ? "#FF9114" : "#FFC179",
                                  width: 36,
                                  height: 22,
                                  borderRadius: 11,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text className="text-white text-[11px] font-bold">kg</Text>
                              </TouchableOpacity>

                              {/* Arrow icon */}
                              <Text className="text-black font-black text-xs mx-1.5">↔</Text>

                              {/* g button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleToggleUnit(product.id, "g")}
                                style={{
                                  backgroundColor: cartItem.unit === "g" ? "#FF9114" : "#FFC179",
                                  width: 36,
                                  height: 22,
                                  borderRadius: 11,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text className="text-white text-[11px] font-bold">g</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Quantity Selector capsule */}
                            <View className="flex-row items-center justify-between bg-white border border-[#E5E5EA] rounded-full px-1 py-1 w-full max-w-[124px] mt-1.5 shadow-sm">
                              {/* Minus Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleDecrement(product.id)}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                <Ionicons name="remove" size={14} color="#FFFFFF" />
                              </TouchableOpacity>

                              {/* Qty value */}
                              <Text className="text-black font-bold text-[11px]">
                                {cartItem.weight} {cartItem.unit}
                              </Text>

                              {/* Plus Button */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleIncrement(product.id)}
                                className="w-6 h-6 rounded-full bg-black items-center justify-center"
                              >
                                <Ionicons name="add" size={14} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>

                            {/* Price */}
                            <Text className="text-black font-extrabold text-sm mt-3 text-center">
                              {product.type == "package" ? "Rs. " + product?.subTotal! : "Rs. " + product?.normalPrice!}
                            </Text>
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

      {/* Floating Bottom Navigation Bar */}
      <BottomNavigation activeScreen="Home" navigation={navigation} />
    </View>
  );
};

export default Home;
