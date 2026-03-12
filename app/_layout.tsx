import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, systemApi } from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import { PremiumProvider } from '@/context/PremiumContext';
import { AppGuard } from '@/components/AppGuard';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import ExpoConstants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.

const APP_VERSION = ExpoConstants.expoConfig?.version || '1.0.0';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <InnerLayout />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

function InnerLayout() {
    const { colors, theme } = useTheme();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isAppReady, setIsAppReady] = useState(false);
    const segments = useSegments();
    const router = useRouter();
    const setProfile = useUserStore((s) => s.setProfile);

    useEffect(() => {
        async function prepare() {
            try {
                // Run non-critical initializations in parallel with critical ones
                // but we wait for critical ones before hiding splash
                await Promise.all([
                    checkAuth(),
                    checkAppStatus(),
                    requestNotificationPermissions(),
                    Platform.OS === 'ios' ? checkBackgroundLocation() : Promise.resolve(),
                ]);
            } catch (e) {
                console.warn('Initialization error:', e);
            } finally {
                setIsAppReady(true);
                await SplashScreen.hideAsync();
            }
        }

        prepare();
    }, []);

    const requestNotificationPermissions = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Notification permissions not granted');
            }

            // Just start the request to warm up GPS
            const { status: locStatus } = await Location.getForegroundPermissionsAsync();
            if (locStatus === 'granted') {
                // Non-blocking warmup
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
        } catch (e) {
            console.log('Location warmup/notification permission failed', e);
        }
    };

    const checkBackgroundLocation = async () => {
        try {
            const { status } = await Location.getBackgroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Background Location Required',
                    'RunTracker needs "Always" location access to track your runs while the screen is off. Please update this in settings.',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (e) {
            console.warn('Background location check failed', e);
        }
    };

    const checkAppStatus = async () => {
        try {
            const status = await systemApi.getStatus();
            if (status && status.minVersion) {
                if (compareVersions(APP_VERSION, status.minVersion) < 0) {
                    Alert.alert(
                        'Update Required',
                        'A mandatory update is required to continue using the app.',
                        [{ text: 'Update Now', onPress: () => Linking.openURL('https://runtracker.app/update') }],
                        { cancelable: false }
                    );
                }
            }
        } catch (err) {
            console.warn('Failed to check app status:', err);
        }
    };

    const compareVersions = (v1: string, v2: string) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    };

    const checkAuth = async () => {
        try {
            const session = await auth.getSession();
            if (session) {
                setProfile(session.user as any);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        } catch {
            setIsAuthenticated(false);
        }
    };

    // Auth guard — redirect based on session state
    useEffect(() => {
        if (!isAppReady || isAuthenticated === null) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/welcome');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, segments, isAppReady]);

    // Expose a way for auth screens to update state
    (globalThis as any).__setAuthenticated = (val: boolean) => setIsAuthenticated(val);

    if (!isAppReady) {
        return null;
    }

    return (
        <PremiumProvider>
            <AppGuard>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
                    <Slot />
                </View>
            </AppGuard>
        </PremiumProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
