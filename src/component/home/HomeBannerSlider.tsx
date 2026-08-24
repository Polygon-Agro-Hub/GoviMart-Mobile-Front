import React, { useEffect, useRef, useState } from "react";
import {
    View,
    ScrollView,
    Image,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";

const { width } = Dimensions.get("window");

interface BannerSlide {
    id: number | string;
    image: string;
    details: string;
}

interface BannerSliderProps {
    bannerSlides: BannerSlide[];
}

const HomeBannerSlider: React.FC<BannerSliderProps> = ({ bannerSlides }) => {
    const slideScrollRef = useRef<ScrollView>(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    // Auto-slide banner effect
    useEffect(() => {
        if (bannerSlides.length === 0) return;
        const timer = setInterval(() => {
            const nextIndex = (activeSlideIndex + 1) % bannerSlides.length;
            setActiveSlideIndex(nextIndex);
            slideScrollRef.current?.scrollTo({
                x: nextIndex * (width - 48),
                animated: true,
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [activeSlideIndex, bannerSlides.length]);

    if (!bannerSlides || bannerSlides.length === 0) {
        return null;
    }

    const handleScrollEnd = (
        e: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        const slideWidth = width - 48;
        const index = Math.round(
            e.nativeEvent.contentOffset.x / slideWidth
        );
        setActiveSlideIndex(index);
    };

    return (
        <View className="mx-6 mt-4">
            <ScrollView
                ref={slideScrollRef}
                horizontal
                pagingEnabled
                snapToInterval={width - 48}
                snapToAlignment="center"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollEnd}
                style={{
                    height: 160,
                    borderRadius: 20,
                    width: width - 48,
                }}
            >
                {bannerSlides.map((slide) => (
                    <Image
                        key={slide.id}
                        source={{ uri: slide.image }}
                        style={{
                            width: width - 48,
                            height: 160,
                            borderRadius: 20,
                        }}
                        resizeMode="cover"
                    />
                ))}
            </ScrollView>

            {/* Indicators */}
            <View className="flex-row justify-center items-center gap-1.5 mt-3">
                {bannerSlides.map((_, index) => (
                    <View
                        key={index}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor:
                                activeSlideIndex === index
                                    ? "#6D5AE6"
                                    : "#E5E5EA",
                        }}
                    />
                ))}
            </View>
        </View>
    );
};

export default HomeBannerSlider;