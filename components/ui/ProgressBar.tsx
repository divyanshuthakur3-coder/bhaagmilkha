import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface ProgressBarProps {
    progress: number; // 0 - 100
    label?: string;
    color?: string;
    height?: number;
    showPercentage?: boolean;
    style?: ViewStyle;
}

export function ProgressBar({
    progress,
    label,
    color,
    height = 10,
    showPercentage = true,
    style,
}: ProgressBarProps) {
    const { colors: Colors } = useTheme();
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const isComplete = clampedProgress >= 100;

    // Smooth width animation
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(widthAnim, {
            toValue: clampedProgress,
            useNativeDriver: false, // Animating width
            tension: 20,
            friction: 7,
        }).start();
    }, [clampedProgress]);

    const animatedWidth = widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const gradientColors = isComplete
        ? ([Colors.gradientSuccessStart, Colors.gradientSuccessEnd] as const)
        : ([Colors.gradientStart, Colors.gradientEnd] as const);

    const barColor = color || (isComplete ? Colors.success : Colors.accent);

    return (
        <View style={[styles.container, style]}>
            {label && (
                <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: Colors.textSecondary }]}>{label}</Text>
                    {showPercentage && (
                        <Text style={[styles.percentage, { color: barColor }]}>
                            {Math.round(clampedProgress)}%
                        </Text>
                    )}
                </View>
            )}
            <View style={[styles.track, { height, backgroundColor: Colors.surfaceLight }]}>
                <Animated.View style={{ width: animatedWidth, height: '100%' }}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                            styles.fill,
                            {
                                height,
                                borderRadius: height / 2,
                            },
                        ]}
                    />
                </Animated.View>
            </View>
            {isComplete && (
                <Text style={[styles.completeText, { color: Colors.success }]}>🎉 Goal achieved!</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '500',
    },
    percentage: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    track: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    fill: {
        width: '100%',
    },
    completeText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        textAlign: 'center',
    },
});
