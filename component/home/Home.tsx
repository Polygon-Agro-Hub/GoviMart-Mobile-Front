import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import HomeHeader from "./HomeHeader";
import axios from "axios";
import { environment } from "@/environment/environment";
import HomeBannerSlider from "./HomeBannerSlider";


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

interface Product {
  id: number;
  name: string;
  weight: string;
  price: string;
  image: string;
  isNew: boolean;
}

const CATEGORIES: Category[] = [
  {
    id: "packages",
    name: "Packages",
    image: "https://cdn-icons-png.flaticon.com/512/2956/2956820.png",
    circleBg: "#FFE4E6",
    borderColor: "#FDA4AF",
    activeBg: "#F43F5E",
    active: false
  },
  {
    id: "veggies",
    name: "Veggies",
    image: "https://cdn-icons-png.flaticon.com/512/2909/2909848.png",
    circleBg: "#FFFFFF",
    borderColor: "#84CC16",
    activeBg: "#84CC16",
    active: true
  },
  {
    id: "fruits",
    name: "Fruits",
    image: "https://cdn-icons-png.flaticon.com/512/415/415733.png",
    circleBg: "#FFE4E6",
    borderColor: "#F87171",
    activeBg: "#EF4444",
    active: false
  },
  {
    id: "cereal",
    name: "Cereal",
    image: "https://cdn-icons-png.flaticon.com/512/2674/2674486.png",
    circleBg: "#FEF9C3",
    borderColor: "#FDE047",
    activeBg: "#EAB308",
    active: false
  },
  {
    id: "spices",
    name: "Spices",
    image: "https://cdn-icons-png.flaticon.com/512/8106/8106571.png",
    circleBg: "#FFEDD5",
    borderColor: "#FDBA74",
    activeBg: "#D97706",
    active: false
  },
];

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Cantaloup",
    weight: "500 g",
    price: "Rs. 800.00",
    image: "https://cdn-icons-png.flaticon.com/512/4156/4156827.png",
    isNew: true,
  },
  {
    id: 2,
    name: "Green Cornet",
    weight: "500 g",
    price: "Rs. 1,200.00",
    image: "https://cdn-icons-png.flaticon.com/512/1135/1135534.png",
    isNew: false,
  },
  {
    id: 3,
    name: "Lettuce",
    weight: "100 g",
    price: "Rs. 800.00",
    image: "https://cdn-icons-png.flaticon.com/512/1143/1143828.png",
    isNew: false,
  },
  {
    id: 4,
    name: "Luffa",
    weight: "500 g",
    price: "Rs. 1,200.00",
    image: "https://cdn-icons-png.flaticon.com/512/3014/3014502.png",
    isNew: false,
  },
  {
    id: 5,
    name: "Okra",
    weight: "100 g",
    price: "Rs. 800.00",
    image: "https://cdn-icons-png.flaticon.com/512/4056/4056860.png",
    isNew: false,
  },
  {
    id: 6,
    name: "Pumpkin",
    weight: "500 g",
    price: "Rs. 1,200.00",
    image: "https://cdn-icons-png.flaticon.com/512/1041/1041355.png",
    isNew: false,
  },
];



const Home: React.FC<HomeProps> = ({ navigation }) => {
  const [bannerSlides, setBannerSlides] = useState<{ id: number; image: string; details: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("veggies");
  const [activeProducts, setActiveProducts] = useState<{ [id: number]: { quantity: number; unit: "g" | "kg" } }>({});

  // Fetch dynamic banners from backend
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get(`${environment.API_BASE_URL}api/home/slides`);
        if (response.data && response.data.status) {
          const fetchedSlides = response.data.slides || [];
          // Filter for Retail marketplace slides
          const retailSlides = fetchedSlides.filter((slide: any) => slide.type === "Retail");
          setBannerSlides(retailSlides);
        }
      } catch (err) {
        console.error("Failed to load banner slides from backend:", err);
        // Fallback to static mock banners
        setBannerSlides([
          {
            id: 114,
            image: "https://pub-79ee03a4a23e4dbbb70c7d799d3cb786.r2.dev/marketplacebanners/image/279a2be8-3a9b-4b4c-ad2b-883e757b1fe6.png",
            details: "New Banner -She",
          },
          {
            id: 109,
            image: "https://pub-79ee03a4a23e4dbbb70c7d799d3cb786.r2.dev/marketplacebanners/image/d58e9ee6-085b-4c2d-b5b7-5fd0a0dff956.png",
            details: "Banner2",
          },
          {
            id: 108,
            image: "https://pub-79ee03a4a23e4dbbb70c7d799d3cb786.r2.dev/marketplacebanners/image/e9f2e884-c168-41e4-9d6c-9205028f5560.png",
            details: "demo",
          },
        ]);
      }
    };
    fetchBanners();
  }, []);

  // Chunk products into rows of 2 for grid layout
  const productRows: Product[][] = [];
  for (let i = 0; i < PRODUCTS.length; i += 2) {
    productRows.push(PRODUCTS.slice(i, i + 2));
  }

  const handleProfileNavigation = () => {
    navigation.navigate("Profile");
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        className="flex-1"
      >
        {/* Top Header */}
        <HomeHeader onPressProfile={handleProfileNavigation} />

        {/* Dynamic Image Slides (Banners) */}
        <HomeBannerSlider bannerSlides={bannerSlides} />

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
                  onPress={() => setSelectedCategoryId(category.id)}
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
        <View className="mt-8 px-4">
          {productRows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row justify-between mb-4">
              {row.map((product) => {
                const cartItem = activeProducts[product.id];

                // Switcher toggle
                const toggleUnit = (unit: "g" | "kg") => {
                  setActiveProducts(prev => ({
                    ...prev,
                    [product.id]: {
                      unit,
                      quantity: unit === "g" ? 500 : 1
                    }
                  }));
                };

                const handleIncrement = () => {
                  setActiveProducts(prev => {
                    const item = prev[product.id];
                    if (!item) return prev;
                    const step = item.unit === "g" ? 100 : 0.5;
                    return {
                      ...prev,
                      [product.id]: {
                        ...item,
                        quantity: Number((item.quantity + step).toFixed(1))
                      }
                    };
                  });
                };

                const handleDecrement = () => {
                  setActiveProducts(prev => {
                    const item = prev[product.id];
                    if (!item) return prev;
                    const step = item.unit === "g" ? 100 : 0.5;
                    const nextQty = item.quantity - step;
                    if (nextQty <= 0) {
                      const updated = { ...prev };
                      delete updated[product.id];
                      return updated;
                    }
                    return {
                      ...prev,
                      [product.id]: {
                        ...item,
                        quantity: Number(nextQty.toFixed(1))
                      }
                    };
                  });
                };

                const handleAddProduct = () => {
                  setActiveProducts(prev => ({
                    ...prev,
                    [product.id]: { quantity: 500, unit: "g" }
                  }));
                };

                return (
                  <TouchableOpacity
                    key={product.id}
                    activeOpacity={0.9}
                    className="flex-1"
                    onPress={() =>
                      navigation.navigate("ViewProduct", {
                        product,
                      })
                    }
                  >
                    <View
                      key={product.id}
                      className="flex-1 bg-[#F4F3F3] pt-12 pb-6 px-4 items-center mx-2 relative mb-6"
                      style={{
                        borderTopLeftRadius: 100,
                        borderTopRightRadius: 100,
                        borderBottomLeftRadius: 18,
                        borderBottomRightRadius: 18,
                      }}
                    >
                      {/* Circular Product Image Container */}
                      <View className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center shadow-sm border border-gray-100">
                        <Image
                          source={{ uri: product.image }}
                          className="w-12 h-12"
                          resizeMode="contain"
                        />
                      </View>

                      {/* Product Details */}
                      <Text className="text-black font-bold text-sm mt-1 text-center" numberOfLines={1}>
                        {product.name}
                      </Text>

                      {!cartItem ? (
                        <>
                          <Text className="text-gray-400 text-[11px] mt-0.5 text-center">
                            {product.weight}
                          </Text>
                          <Text className="text-black font-extrabold text-sm mt-1 text-center">
                            {product.price}
                          </Text>

                          {/* Add Button */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleAddProduct}
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
                              onPress={() => toggleUnit("kg")}
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
                              onPress={() => toggleUnit("g")}
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
                              onPress={handleDecrement}
                              className="w-6 h-6 rounded-full bg-black items-center justify-center"
                            >
                              <Ionicons name="remove" size={14} color="#FFFFFF" />
                            </TouchableOpacity>

                            {/* Qty value */}
                            <Text className="text-black font-bold text-[11px]">
                              {cartItem.quantity} {cartItem.unit}
                            </Text>

                            {/* Plus Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={handleIncrement}
                              className="w-6 h-6 rounded-full bg-black items-center justify-center"
                            >
                              <Ionicons name="add" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>

                          {/* Price */}
                          <Text className="text-black font-extrabold text-sm mt-3 text-center">
                            {product.price}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Navigation Bar */}
      <View className="absolute bottom-6 left-6 right-6 bg-black rounded-[32px] h-[64px] flex-row items-center justify-around px-3 shadow-lg z-20">
        {/* Home Tab (Active) */}
        <TouchableOpacity
          activeOpacity={0.9}
          className="flex-row items-center px-4 py-2 rounded-full"
          style={{ backgroundColor: "#FFA07A" }}
        >
          <Ionicons name="home" size={18} color="#FFFFFF" />
          <Text className="text-white text-xs font-extrabold ml-1.5">Home</Text>
        </TouchableOpacity>

        {/* Cart Tab */}
        <TouchableOpacity activeOpacity={0.8} className="p-2">
          <Ionicons name="basket-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Notifications Tab */}
        <TouchableOpacity activeOpacity={0.8} className="p-2">
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity onPress={handleProfileNavigation} activeOpacity={0.8} className="p-2">
          <Ionicons name="person-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Home;
