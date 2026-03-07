import React, { useRef, useEffect } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    Animated,
    Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
    style?: ViewStyle | ViewStyle[];
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
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (variant === 'premium') {
            const animation = Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            animation.start();
            return () => animation.stop();
        }
    }, [variant]);

    const handlePressIn = () => {
        if (!isDisabled) {
            Animated.spring(scaleAnim, {
                toValue: 0.96,
                useNativeDriver: true,
                speed: 20,
                bounciness: 0,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (!isDisabled) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 10,
                bounciness: 5,
            }).start();
        }
    };

    const handlePress = () => {
        if (!isDisabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    });

    const sizeStyle: ViewStyle = {
        sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
        md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
        lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, height: 56 },
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
            <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, isDisabled && styles.disabled, style]}>
                <Pressable
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    style={({ pressed }) => [
                        styles.base,
                        sizeStyle,
                        variant === 'premium' ? Shadows.glow(Colors.premium) : (pressed ? {} : styles.primaryShadow),
                        { overflow: 'hidden' }
                    ]}
                >
                    <LinearGradient
                        colors={gradientColors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {variant === 'premium' && (
                        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    )}

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
                </Pressable>
            </Animated.View>
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
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, isDisabled && styles.disabled, style]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                style={[
                    styles.base,
                    sizeStyle,
                    {
                        backgroundColor: v.bg,
                        borderWidth: v.border ? 1 : 0,
                        borderColor: v.border,
                        borderRadius: BorderRadius.lg,
                    },
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={v.text} size="small" />
                ) : (
                    <Text style={[styles.text, { color: v.text, fontSize: textSize }]}>
                        {icon ? `${icon} ${title}` : title}
                    </Text>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    primaryText: {
        fontWeight: '700',
        letterSpacing: 0.5,
        zIndex: 1,
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    disabled: {
        opacity: 0.5,
    },
    primaryShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    }
});
