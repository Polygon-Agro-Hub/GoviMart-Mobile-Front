import React, { useEffect, useState } from "react";
import {
    View,
    Text,
} from "react-native";

export const CountdownTimer: React.FC<{ initialMinutes: number }> = ({
    initialMinutes,
}) => {
    const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 60 : 0));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const hrs = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);

    const TimeBox: React.FC<{ value: string }> = ({ value }) => (
        <View className="bg-black rounded-md px-3 py-1.5 min-w-[42px] items-center">
            <Text className="text-white text-[16px] font-bold">{value}</Text>
        </View>
    );

    return (
        <View className="items-center">
            <Text className="text-[13px] text-black font-semibold mb-1">
                Time Left
            </Text>
            <View className="flex-row items-center">
                <TimeBox value={String(hrs).padStart(2, "0")} />
                <Text className="mx-1.5 font-bold text-black">:</Text>
                <TimeBox value={String(mins).padStart(2, "0")} />
            </View>
            <View className="flex-row mt-1" style={{ width: 96 }}>
                <Text className="flex-1 text-center text-[11px] text-[#8A8A8A]">
                    hrs
                </Text>
                <Text className="flex-1 text-center text-[11px] text-[#8A8A8A]">
                    min
                </Text>
            </View>
        </View>
    );
};