import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    Animated,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

interface InputProps extends TextInputProps {
    label?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    error?: string;
    containerStyle?: ViewStyle;
}

export function Input({
    label,
    icon,
    error,
    containerStyle,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const { colors: Colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    // Animation for focus glow
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
        setIsFocused(true);
        Animated.timing(focusAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: false, // Animating shadow/border
        }).start();
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
        onBlur?.(e);
    };

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [Colors.border, Colors.accent],
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [Colors.surface, Colors.surfaceLight],
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: isFocused ? Colors.accent : Colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <Animated.View
                style={[
                    styles.inputWrapper,
                    {
                        borderColor,
                        backgroundColor,
                        borderWidth: isFocused ? 2 : 1,
                        ...(isFocused ? Shadows.glow(Colors.accent) : {}),
                    },
                    error ? { borderColor: Colors.error, borderWidth: 2 } : null,
                ]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={isFocused ? Colors.accent : Colors.textMuted}
                        style={styles.icon}
                    />
                )}

                <TextInput
                    style={[styles.input, { color: Colors.textPrimary }]}
                    placeholderTextColor={Colors.textMuted}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    selectionColor={Colors.accent}
                    {...props}
                />
            </Animated.View>

            {error ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        marginBottom: Spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        height: 56,
    },
    icon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: '500',
        height: '100%',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        paddingLeft: 4,
    },
    errorText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
});
