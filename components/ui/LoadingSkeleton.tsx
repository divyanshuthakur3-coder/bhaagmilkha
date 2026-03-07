import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Easing } from 'react-native';
import { BorderRadius, Spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface LoadingSkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
}

export function LoadingSkeleton({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.sm,
    style,
}: LoadingSkeletonProps) {
    const { colors: Colors } = useTheme();
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.bezier(0.4, 0, 0.6, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.bezier(0.4, 0, 0.6, 1),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    const scale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.02],
    });

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    backgroundColor: Colors.surfaceLight,
                    opacity,
                    transform: [{ scale }],
                },
                style,
            ]}
        />
    );
}

interface SkeletonGroupProps {
    count?: number;
    height?: number;
    gap?: number;
    style?: ViewStyle;
}

export function SkeletonGroup({
    count = 3,
    height = 60,
    gap = 12,
    style,
}: SkeletonGroupProps) {
    return (
        <View style={[{ gap }, style]}>
            {Array.from({ length: count }).map((_, i) => (
                <LoadingSkeleton key={i} height={height} borderRadius={BorderRadius.md} />
            ))}
        </View>
    );
}
