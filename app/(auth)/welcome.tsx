import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const { theme, colors: Colors } = useTheme();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.5)).current;
    const logoPulse = useRef(new Animated.Value(0.8)).current;
    const buttonsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Logo bounce in
        Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Pulse the ring
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoPulse, {
                    toValue: 1.2,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(logoPulse, {
                    toValue: 0.8,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Title fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            delay: 300,
            useNativeDriver: true,
        }).start();

        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            delay: 300,
            useNativeDriver: true,
        }).start();

        // Buttons
        Animated.timing(buttonsAnim, {
            toValue: 1,
            duration: 600,
            delay: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <LinearGradient
                colors={[Colors.background, Colors.backgroundAlt]}
                style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Hero Section */}
                    <View style={styles.hero}>
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                { transform: [{ scale: logoScale }] },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.logoPulseRing,
                                    {
                                        borderColor: Colors.accent,
                                        transform: [{ scale: logoPulse }],
                                        opacity: Animated.subtract(1.2, logoPulse),
                                    },
                                ]}
                            />
                            <LinearGradient
                                colors={[Colors.gradientStart, Colors.gradientEnd]}
                                style={[styles.logoGradient, {
                                    shadowColor: Colors.accent,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }]}
                            >
                                <Ionicons name="walk" size={48} color="#FFFFFF" />
                            </LinearGradient>
                        </Animated.View>

                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                                alignItems: 'center',
                            }}
                        >
                            <Text style={[styles.appName, { color: Colors.textPrimary }]}>RunTracker</Text>
                            <View style={[styles.divider, { backgroundColor: Colors.accent }]} />
                            <Text style={[styles.tagline, { color: Colors.textSecondary }]}>
                                Your Professional{'\n'}Running Companion
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Simple Bottom Section */}
                    <Animated.View style={[styles.actions, { opacity: buttonsAnim }]}>
                        <Text style={[styles.welcomeText, { color: Colors.textSecondary }]}>
                            Ready to transform your fitness journey?
                        </Text>
                        <Button
                            title="Get Started"
                            onPress={() => router.push('/(auth)/signup')}
                            variant="primary"
                            size="lg"
                            style={styles.primaryButton}
                        />
                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/login')}
                            style={styles.loginLink}
                        >
                            <Text style={[styles.loginText, { color: Colors.textMuted }]}>
                                Already have an account? <Text style={{ color: Colors.accent, fontWeight: '700' }}>Log In</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
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
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        justifyContent: 'space-around',
        paddingBottom: Spacing.xxxl,
    },
    hero: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    logoGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoPulseRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
    },
    logoIcon: {
        fontSize: 56,
    },
    appName: {
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: -1,
        textAlign: 'center',
    },
    divider: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginVertical: Spacing.lg,
    },
    tagline: {
        fontSize: FontSize.xl,
        textAlign: 'center',
        lineHeight: 28,
        fontWeight: '500',
    },
    actions: {
        gap: Spacing.xl,
        alignItems: 'center',
        width: '100%',
    },
    welcomeText: {
        fontSize: FontSize.md,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    primaryButton: {
        width: '100%',
        height: 60,
    },
    loginLink: {
        paddingVertical: Spacing.sm,
    },
    loginText: {
        fontSize: FontSize.md,
    },
});
