import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    title?: string;
    message?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught component error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={[styles.title, { color: Colors.errorLight }]}>
                        {this.props.title || 'Component Error'}
                    </Text>
                    <Text style={[styles.message, { color: Colors.textSecondary }]}>
                        {this.props.message || this.state.error?.message || 'Something went wrong while rendering this part of the app.'}
                    </Text>
                    <Button
                        title="Try Again"
                        onPress={this.handleReset}
                        variant="outline"
                        size="sm"
                        style={styles.button}
                    />
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        margin: Spacing.md,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        marginTop: Spacing.sm,
    },
    message: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    button: {
        minWidth: 120,
    },
});
