import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/colors';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'glass' | 'glow' | 'outlined' | 'premium';
    glowColor?: string;
    style?: ViewStyle | ViewStyle[];
}

export function Card({ children, variant = 'default', glowColor, style }: CardProps) {
    const { colors: Colors } = useTheme();

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: Colors.surface,
                    ...Shadows.md,
                };
            case 'glass':
                return {
                    backgroundColor: Colors.surfaceGlass,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    ...Shadows.sm,
                };
            case 'glow':
                return {
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: glowColor || Colors.borderAccent,
                    ...Shadows.glow(glowColor || Colors.accent),
                };
            case 'premium':
                return {
                    backgroundColor: Colors.surface,
                    borderWidth: 1.5,
                    borderColor: '#D4A517',
                    ...Shadows.glow('#D4A517'),
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: Colors.border,
                };
            default:
                return {
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border,
                };
        }
    };

    return (
        <View style={[styles.base, getVariantStyle(), style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        overflow: 'hidden',
    },
});
