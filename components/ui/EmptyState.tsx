import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, Spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './Button';
import { AnimatedIllustration } from './AnimatedIllustration';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

const motivationalQuotes = [
    "Every champion was once a contender who refused to give up.",
    "The miracle isn't that I finished. The miracle is that I had the courage to start.",
    "Run when you can, walk if you have to, crawl if you must; just never give up.",
    "The body achieves what the mind believes.",
    "Your only limit is you.",
];

export function EmptyState({
    icon,
    title,
    message,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    const { colors: Colors } = useTheme();
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    return (
        <View style={styles.container}>
            <AnimatedIllustration icon={icon as any} color={Colors.accent} size={48} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: Colors.textSecondary }]}>{message}</Text>
            <Text style={[styles.quote, { color: Colors.textMuted }]}>"{quote}"</Text>
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="primary"
                    style={styles.button}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxxl,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    message: {
        fontSize: FontSize.md,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 24,
    },
    quote: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: Spacing.xxl,
        paddingHorizontal: Spacing.lg,
    },
    button: {
        minWidth: 160,
        borderRadius: 30, // Pill button look
    },
});
