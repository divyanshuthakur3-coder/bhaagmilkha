import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// Local dev: password reset email is simulated
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }
        setLoading(true);
        // Local dev: simulate password reset (no email server)
        await new Promise((r) => setTimeout(r, 800));
        setLoading(false);
        setSent(true);
    };

    if (sent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centeredContent}>
                    <Text style={styles.icon}>📧</Text>
                    <Text style={styles.title}>Check Your Email</Text>
                    <Text style={styles.subtitle}>
                        We've sent a password reset link to {email}
                    </Text>
                    <Button
                        title="Back to Login"
                        onPress={() => router.push('/(auth)/login')}
                        variant="primary"
                        size="lg"
                        style={styles.submitButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your email and we'll send you a reset link
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <Button
                            title="Send Reset Link"
                            onPress={handleReset}
                            loading={loading}
                            variant="primary"
                            size="lg"
                            style={styles.submitButton}
                        />

                        <Button
                            title="Back to Login"
                            onPress={() => router.back()}
                            variant="ghost"
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 60,
    },
    centeredContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    icon: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.display,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
    submitButton: {
        width: '100%',
        height: 56,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
    },
});
