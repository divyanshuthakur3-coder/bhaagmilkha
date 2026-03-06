import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'premium';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    icon?: string;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    style,
    icon,
}: ButtonProps) {
    const { colors: Colors } = useTheme();
    const isDisabled = disabled || loading;

    const sizeStyle: ViewStyle = {
        sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
        md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
        lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl },
    }[size];

    const textSize = {
        sm: FontSize.sm,
        md: FontSize.md,
        lg: FontSize.lg,
    }[size];

    if (variant === 'primary' || variant === 'success' || variant === 'premium') {
        let gradientColors: readonly string[] = [Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd] as const;
        if (variant === 'success') {
            gradientColors = [Colors.gradientSuccessStart, Colors.gradientSuccessEnd] as const;
        } else if (variant === 'premium') {
            gradientColors = [Colors.premium, '#FFD700', Colors.premium] as const;
        }

        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={[isDisabled && styles.disabled, style]}
            >
                <LinearGradient
                    colors={gradientColors as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.base,
                        sizeStyle,
                        variant === 'premium' ? Shadows.glow(Colors.premium) : {
                            shadowColor: Colors.accent,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 8,
                        },
                        { borderRadius: BorderRadius.lg },
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={(variant === 'primary' || variant === 'success') ? '#FFFFFF' : (variant === 'premium' ? '#0F172A' : Colors.textPrimary)} size="small" />
                    ) : (
                        <Text style={[styles.primaryText, {
                            fontSize: textSize,
                            color: (variant === 'primary' || variant === 'success') ? '#FFFFFF' : (variant === 'premium' ? '#0F172A' : Colors.textPrimary)
                        }]}>
                            {icon ? `${icon} ${title}` : title}
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
        secondary: { bg: Colors.surfaceLight, text: Colors.textPrimary, border: Colors.borderLight },
        ghost: { bg: 'transparent', text: Colors.accent },
        danger: { bg: 'transparent', text: Colors.error, border: Colors.error },
        outline: { bg: 'transparent', text: Colors.accent, border: Colors.borderAccent },
    };

    const v = variantStyles[variant] || variantStyles.secondary;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                styles.base,
                sizeStyle,
                {
                    backgroundColor: v.bg,
                    borderWidth: v.border ? 1 : 0,
                    borderColor: v.border,
                    borderRadius: BorderRadius.lg,
                },
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={v.text} size="small" />
            ) : (
                <Text style={[styles.text, { color: v.text, fontSize: textSize }]}>
                    {icon ? `${icon} ${title}` : title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    primaryText: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    disabled: {
        opacity: 0.5,
    },
});
