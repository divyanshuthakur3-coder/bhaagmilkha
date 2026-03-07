import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { auth } from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function LoginScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const setProfile = useUserStore((s) => s.setProfile);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { user } = await auth.signIn(email.trim(), password);
            setProfile(user as any);
            (globalThis as any).__setAuthenticated?.(true);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <LinearGradient
                colors={[Colors.background, Colors.backgroundAlt]}
                style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: Colors.textPrimary }]}>Welcome Back</Text>
                            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                                Sign in to continue tracking your runs
                            </Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                icon="mail-outline"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Input
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Your password"
                                icon="lock-closed-outline"
                                secureTextEntry
                            />

                            {error ? (
                                <View style={[styles.errorContainer, { backgroundColor: Colors.errorGlow, borderColor: Colors.error + '30' }]}>
                                    <Ionicons name="warning" size={16} color={Colors.errorLight} style={styles.errorIcon} />
                                    <Text style={[styles.error, { color: Colors.errorLight }]}>{error}</Text>
                                </View>
                            ) : null}

                            <Button
                                title="Sign In"
                                onPress={handleLogin}
                                loading={loading}
                                variant="primary"
                                size="lg"
                                style={styles.submitButton}
                            />

                            <Button
                                title="Forgot Password?"
                                onPress={() => router.push('/(auth)/forgot-password')}
                                variant="ghost"
                            />

                            <Button
                                title="Don't have an account? Sign Up"
                                onPress={() => router.push('/(auth)/signup')}
                                variant="ghost"
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 60,
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: FontSize.display,
        fontWeight: '800',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSize.lg,
    },
    form: {
        gap: Spacing.xl,
    },
    inputGroup: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.md,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    errorIcon: {
        fontSize: 16,
    },
    error: {
        fontSize: FontSize.sm,
        flex: 1,
    },
    submitButton: {
        width: '100%',
        height: 56,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.sm,
    },
});
