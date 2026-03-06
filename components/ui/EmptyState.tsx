import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { Colors, FontSize, Spacing } from '@/constants/colors';

interface EmptyStateProps {
    icon: string;
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
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.quote}>"{quote}"</Text>
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
    icon: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    quote: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: Spacing.xxl,
        paddingHorizontal: Spacing.lg,
    },
    button: {
        minWidth: 160,
    },
});
