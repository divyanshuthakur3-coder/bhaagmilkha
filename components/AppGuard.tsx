import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Network from 'expo-network';
import Constants from 'expo-constants';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';

// Change this based on your current version
const CURRENT_APP_VERSION = '1.0.0';

export function AppGuard({ children }: { children: React.ReactNode }) {
    const { colors } = useTheme();
    const [isOffline, setIsOffline] = useState(false);
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const [checking, setChecking] = useState(true);

    const checkStatus = async () => {
        setChecking(true);
        try {
            // 1. Internet Check
            const networkState = await Network.getNetworkStateAsync();
            if (!networkState.isConnected) {
                setIsOffline(true);
                setChecking(false);
                return;
            }
            setIsOffline(false);

            // 2. Version Check
            // We fetch the status from our backend
            const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
            const response = await fetch(`${apiBaseUrl}/status`);
            const data = await response.json();

            // Riegel's Formula style check
            if (data.minVersion) {
                const [minMajor, minMinor, minPatch] = data.minVersion.split('.').map(Number);
                const [currMajor, currMinor, currPatch] = CURRENT_APP_VERSION.split('.').map(Number);

                if (currMajor < minMajor || (currMajor === minMajor && currMinor < minMinor)) {
                    setNeedsUpdate(true);
                }
            }
        } catch (err) {
            console.warn('Status check failed:', err);
            // If API fails but we have network, we can still let them in, or stay offline
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    if (checking) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.title, { color: colors.textSecondary, marginTop: Spacing.md }]}>Verifying App...</Text>
            </View>
        );
    }

    if (isOffline) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background, padding: Spacing.xxl }]}>
                <Text style={styles.emoji}>📡</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>No Internet Connection</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                    RunTracker requires an active internet connection to sync your runs and AI coaching. Please check your data or Wi-Fi.
                </Text>
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.accent }]}
                    onPress={checkStatus}
                >
                    <Text style={styles.btnText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (needsUpdate) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background, padding: Spacing.xxl }]}>
                <Text style={styles.emoji}>🚀</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Update Required</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                    A new version of RunTracker is available with essential performance improvements and new features. Please update to continue.
                </Text>
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.premium }]}
                    onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_DOWNLOAD_URL || 'https://runtracker.pro/download')}
                >
                    <Text style={[styles.btnText, { color: '#0F172A' }]}>Update App Now</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 64, marginBottom: Spacing.lg },
    title: { fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md },
    desc: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xxxl },
    btn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.full },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: FontSize.lg },
});
