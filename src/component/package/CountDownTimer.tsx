import React, { useEffect, useState } from "react";
import {
    View,
    Text,
} from "react-native";

/**
 * Calculates remaining seconds until end time (default 6:00 PM)
 * for the operational window (default 8:00 AM to 6:00 PM).
 */
const calculateRemainingSeconds = (startHour = 8, endHour = 18, endMinute = 0): number => {
    const now = new Date();
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute, 0, 0);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0, 0);

    // If current time is past today's end time (6:00 PM), remaining is 0
    if (now >= endToday) {
        return 0;
    }

    // If before 8:00 AM, show the full available window (8:00 AM to 6:00 PM)
    if (now < startToday) {
        return Math.floor((endToday.getTime() - startToday.getTime()) / 1000);
    }

    // Between 8:00 AM and 6:00 PM: calculate remaining time until 6:00 PM
    const diffMs = endToday.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
};

interface CountdownTimerProps {
    startHour?: number;
    endHour?: number;
    endMinute?: number;
    initialMinutes?: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
    startHour = 8,
    endHour = 18,
    endMinute = 0,
    initialMinutes,
}) => {
    const [secondsLeft, setSecondsLeft] = useState<number>(() => {
        if (initialMinutes !== undefined) {
            return initialMinutes * 60;
        }
        return calculateRemainingSeconds(startHour, endHour, endMinute);
    });

    useEffect(() => {
        if (initialMinutes !== undefined) {
            const interval = setInterval(() => {
                setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(interval);
        }

        const updateTime = () => {
            setSecondsLeft(calculateRemainingSeconds(startHour, endHour, endMinute));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [startHour, endHour, endMinute, initialMinutes]);

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
                <Text className="flex-1 text-center text-[12px] text-[#8A8A8A]">
                    hrs
                </Text>
                <Text className="flex-1 text-center text-[12px] text-[#8A8A8A]">
                    min
                </Text>
            </View>
        </View>
    );
};