import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '@/constants/colors';

interface LoadingSkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function LoadingSkeleton({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.sm,
    style,
}: LoadingSkeletonProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: Colors.surfaceLight,
                    opacity,
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
