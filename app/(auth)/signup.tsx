import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { auth } from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/Button';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

function getPasswordStrength(password: string, colors: any) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'Weak', color: colors.error, width: 20 };
    if (score <= 2) return { level: 'Fair', color: colors.warning, width: 40 };
    if (score <= 3) return { level: 'Good', color: colors.accentLight, width: 60 };
    if (score <= 4) return { level: 'Strong', color: colors.success, width: 80 };
    return { level: 'Excellent', color: colors.successLight, width: 100 };
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const setProfile = useUserStore((s) => s.setProfile);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);

    const passwordStrength = useMemo(() => getPasswordStrength(password, Colors), [password, Colors]);
    const emailValid = useMemo(() => isValidEmail(email), [email]);

    const handleSignUp = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }
        if (!emailValid) {
            setError('Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { user } = await auth.signUp(email.trim(), password, name.trim());
            setProfile(user as any);
            (globalThis as any).__setAuthenticated?.(true);
        } catch (err: any) {
            setError(err.message || 'Sign up failed');
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
                            <Text style={[styles.title, { color: Colors.textPrimary }]}>Create Account</Text>
                            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                                Start your running journey today 🏃‍♂️
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {/* Name Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: Colors.textSecondary }]}>Full Name</Text>
                                <View style={[styles.inputContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <Text style={styles.inputIcon}>👤</Text>
                                    <TextInput
                                        style={[styles.input, { color: Colors.textPrimary }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        placeholderTextColor={Colors.textMuted}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: Colors.textSecondary }]}>Email Address</Text>
                                <View style={[
                                    styles.inputContainer,
                                    { backgroundColor: Colors.surface, borderColor: Colors.border },
                                    emailTouched && email.length > 0 && !emailValid && { borderColor: Colors.error },
                                    emailTouched && emailValid && { borderColor: Colors.success },
                                ]}>
                                    <Text style={styles.inputIcon}>📧</Text>
                                    <TextInput
                                        style={[styles.input, { color: Colors.textPrimary }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        onBlur={() => setEmailTouched(true)}
                                        placeholder="your@email.com"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {emailTouched && email.length > 0 && (
                                        <Text style={styles.validationIcon}>
                                            {emailValid ? '✅' : '❌'}
                                        </Text>
                                    )}
                                </View>
                                {emailTouched && email.length > 0 && !emailValid && (
                                    <Text style={[styles.fieldError, { color: Colors.error }]}>Enter a valid email address</Text>
                                )}
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: Colors.textSecondary }]}>Password</Text>
                                <View style={[styles.inputContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <Text style={styles.inputIcon}>🔒</Text>
                                    <TextInput
                                        style={[styles.input, { color: Colors.textPrimary }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Minimum 6 characters"
                                        placeholderTextColor={Colors.textMuted}
                                        secureTextEntry
                                    />
                                </View>

                                {/* Password Strength Meter */}
                                {password.length > 0 && (
                                    <View style={styles.strengthContainer}>
                                        <View style={[styles.strengthBar, { backgroundColor: Colors.surfaceLight }]}>
                                            <View
                                                style={[
                                                    styles.strengthFill,
                                                    {
                                                        width: `${passwordStrength.width}%`,
                                                        backgroundColor: passwordStrength.color,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                                            {passwordStrength.level}
                                        </Text>
                                    </View>
                                )}

                                {password.length > 0 && password.length < 6 && (
                                    <Text style={[styles.fieldHint, { color: Colors.textMuted }]}>
                                        Need {6 - password.length} more character{6 - password.length > 1 ? 's' : ''}
                                    </Text>
                                )}
                            </View>

                            {error ? (
                                <View style={[styles.errorContainer, { backgroundColor: Colors.errorGlow, borderColor: Colors.error + '30' }]}>
                                    <Text style={styles.errorIcon}>⚠️</Text>
                                    <Text style={[styles.error, { color: Colors.errorLight }]}>{error}</Text>
                                </View>
                            ) : null}

                            <Button
                                title="Create Account"
                                onPress={handleSignUp}
                                loading={loading}
                                variant="primary"
                                size="lg"
                                style={styles.submitButton}
                            />

                            <Button
                                title="Already have an account? Sign In"
                                onPress={() => router.push('/(auth)/login')}
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
        paddingTop: 40,
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
    validationIcon: {
        fontSize: 14,
    },
    fieldError: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    fieldHint: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthFill: {
        height: 4,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        minWidth: 60,
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
