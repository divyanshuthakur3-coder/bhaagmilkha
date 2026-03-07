import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface StatBadgeProps {
    icon: keyof typeof Ionicons.glyphMap;
    value: string | number;
    label: string;
    color?: string;
    style?: ViewStyle;
    variant?: 'default' | 'featured' | 'horizontal';
}

export function StatBadge({ icon, value, label, color = Colors.accent, style, variant = 'default' }: StatBadgeProps) {
    const isFeatured = variant === 'featured';
    const isHorizontal = variant === 'horizontal';

    return (
        <View style={[
            styles.container,
            isHorizontal && styles.containerHorizontal,
            style
        ]}>
            <LinearGradient
                colors={[color + '30', color + '10']}
                style={[
                    styles.iconBg,
                    isFeatured && styles.iconBgFeatured,
                    isHorizontal && styles.iconBgHorizontal
                ]}
            >
                <Ionicons name={icon} size={isFeatured ? 28 : 22} color={color} />
            </LinearGradient>
            <View style={[styles.textContainer, isHorizontal && styles.textContainerHorizontal]}>
                <Text style={[
                    styles.value,
                    { color: Colors.textPrimary },
                    isFeatured && styles.valueFeatured
                ]}>
                    {value}
                </Text>
                <Text style={[
                    styles.label,
                    isFeatured && styles.labelFeatured
                ]}>
                    {label}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        flex: 1,
    },
    containerHorizontal: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconBgFeatured: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: Spacing.sm,
    },
    iconBgHorizontal: {
        marginBottom: 0,
    },
    textContainer: {
        alignItems: 'center',
    },
    textContainerHorizontal: {
        alignItems: 'flex-start',
    },
    value: {
        fontSize: FontSize.lg,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    valueFeatured: {
        fontSize: FontSize.xxl,
    },
    label: {
        fontSize: 9,
        color: Colors.textMuted,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    labelFeatured: {
        fontSize: 11,
    },
});
