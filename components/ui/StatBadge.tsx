import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

interface StatBadgeProps {
    icon: string;
    value: string;
    label: string;
    color?: string;
    style?: ViewStyle;
}

export function StatBadge({ icon, value, label, color = Colors.accent, style }: StatBadgeProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={[styles.value, { color }]}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.xs,
        flex: 1,
    },
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    icon: {
        fontSize: 20,
    },
    value: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    label: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
