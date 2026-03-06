import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Spacing } from '@/constants/colors';

interface ErrorBoundaryProps {
    error: Error;
    retry: () => void;
}

export default function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>😱</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
                {error?.message || 'An unexpected error occurred'}
            </Text>
            <Button
                title="Try Again"
                onPress={retry}
                variant="primary"
                style={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxxl,
    },
    icon: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },
    button: {
        minWidth: 160,
    },
});
