import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

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
    color = Colors.accent,
    height = 10,
    showPercentage = true,
    style,
}: ProgressBarProps) {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const isComplete = clampedProgress >= 100;

    const gradientColors = isComplete
        ? ([Colors.gradientSuccessStart, Colors.gradientSuccessEnd] as const)
        : ([Colors.gradientStart, Colors.gradientEnd] as const);

    return (
        <View style={[styles.container, style]}>
            {label && (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {showPercentage && (
                        <Text style={[styles.percentage, isComplete && styles.percentageComplete]}>
                            {Math.round(clampedProgress)}%
                        </Text>
                    )}
                </View>
            )}
            <View style={[styles.track, { height }]}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.fill,
                        {
                            width: `${clampedProgress}%`,
                            height,
                            borderRadius: height / 2,
                        },
                    ]}
                />
            </View>
            {isComplete && (
                <Text style={styles.completeText}>🎉 Goal achieved!</Text>
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
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    percentage: {
        fontSize: FontSize.sm,
        color: Colors.accent,
        fontWeight: '700',
    },
    percentageComplete: {
        color: Colors.success,
    },
    track: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 5,
        overflow: 'hidden',
    },
    fill: {
        borderRadius: 5,
    },
    completeText: {
        fontSize: FontSize.xs,
        color: Colors.success,
        fontWeight: '600',
        textAlign: 'center',
    },
});
