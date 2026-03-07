import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { usePremium } from '@/context/PremiumContext';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

const FEATURES = [
    { title: 'Advanced Analytics', desc: 'Pace zones, VO2max estimate, and trend charts', icon: 'bar-chart' },
    { title: 'AI Run Coach', desc: 'Personalized tips and performance feedback after runs', icon: 'hardware-chip' },
    { title: 'Custom Training Plans', desc: 'Build your own tailored full-week training schedule', icon: 'calendar' },
    { title: 'Run Replay Animation', desc: 'Watch an animated replay of your route', icon: 'play-circle' },
    { title: 'Unlimited Interval Workouts', desc: 'Unlock all 5 pro interval sessions + custom builder', icon: 'flash' },
    { title: 'Unlimited Shoes', desc: 'Track mileage for unlimited pairs of running shoes', icon: 'walk' },
    { title: 'Data Export', desc: 'Download your run history as CSV or GPX', icon: 'download' },
    { title: 'Ad-Free Experience', desc: 'Zero advertisements, pure focus on your performance', icon: 'shield-check' },
];

export default function PremiumScreen() {
    const { colors: Colors, isDark } = useTheme();
    const router = useRouter();
    const { isPremium, unlockPremium } = usePremium();

    const handleUpgrade = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        unlockPremium();
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <LinearGradient
                colors={['#1a1505', Colors.background]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Text style={[styles.closeText, { color: Colors.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                    <Ionicons name="diamond" size={64} style={{ marginBottom: 16 }} color={Colors.premium} />
                    <Text style={[styles.title, { color: Colors.textPrimary }]}>RunTracker <Text style={[styles.titleAccent, { color: Colors.premium }]}>Pro</Text></Text>
                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Experience a premium, <Text style={{ color: Colors.premium, fontWeight: 'bold' }}>ad-free</Text> journey with advanced tools and performance insights.</Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    {FEATURES.map((feat, i) => (
                        <View key={i} style={styles.featureRow}>
                            <View style={[styles.iconContainer, { backgroundColor: Colors.premiumGlow }]}>
                                <Ionicons name={feat.icon as any} size={24} color={Colors.premium} />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={[styles.featureTitle, { color: Colors.textPrimary }]}>{feat.title}</Text>
                                <Text style={[styles.featureDesc, { color: Colors.textSecondary }]}>{feat.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Subscriptions */}
                {!isPremium ? (
                    <View style={styles.pricingSection}>
                        <Text style={[styles.pricingTitle, { color: Colors.textPrimary }]}>Choose Your Plan</Text>

                        <TouchableOpacity style={[styles.planCard, Shadows.glow(Colors.premium)]} activeOpacity={0.8} onPress={handleUpgrade}>
                            <LinearGradient
                                colors={[Colors.premium, '#D4A517']}
                                style={styles.planGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.planHeader}>
                                    <Text style={styles.planName}>Yearly</Text>
                                    <View style={styles.saveBadge}>
                                        <Text style={[styles.saveLabel, { color: Colors.premium }]}>Save 45%</Text>
                                    </View>
                                </View>
                                <Text style={styles.planPrice}>₹1,999<Text style={styles.planSpan}>/year</Text></Text>
                                <Text style={styles.planAction}>Unlock Pro &rarr;</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.planCardMonthly, { backgroundColor: Colors.surface, borderColor: Colors.border }]} activeOpacity={0.8} onPress={handleUpgrade}>
                            <View style={styles.planHeader}>
                                <Text style={[styles.planNameMonthly, { color: Colors.textPrimary }]}>Monthly</Text>
                                <Text style={[styles.planPriceMonthly, { color: Colors.textPrimary }]}>₹299<Text style={[styles.planSpanMonthly, { color: Colors.textMuted }]}>/month</Text></Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.activeSection, { backgroundColor: Colors.surfaceLight, borderColor: Colors.premiumGlow }]}>
                        <View style={{ marginBottom: Spacing.md }}>
                            <Ionicons name="sparkles" size={48} color={Colors.premium} />
                        </View>
                        <Text style={[styles.activeTitle, { color: Colors.premium }]}>You are a Pro member!</Text>
                        <Text style={[styles.activeDesc, { color: Colors.textSecondary }]}>Thank you for supporting RunTracker. All premium features are unlocked.</Text>
                        <TouchableOpacity style={[styles.manageBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <Text style={[styles.manageBtnText, { color: Colors.textPrimary }]}>Manage Subscription</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl },
    header: { alignItems: 'center', marginBottom: Spacing.xxxl },
    closeBtn: { position: 'absolute', top: 0, right: 0, padding: Spacing.md, zIndex: 10 },
    closeText: { fontSize: FontSize.lg },
    emoji: { fontSize: 64, marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxxl, fontWeight: '800', marginBottom: Spacing.sm },
    titleAccent: {},
    subtitle: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.xl },

    featuresList: { gap: Spacing.xl, marginBottom: Spacing.xxxl },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center'
    },
    icon: { fontSize: 24 },
    featureTextContainer: { flex: 1 },
    featureTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 2 },
    featureDesc: { fontSize: FontSize.sm, lineHeight: 20 },

    pricingSection: { gap: Spacing.lg },
    pricingTitle: { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },

    planCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
    planGradient: { padding: Spacing.xl },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    planName: { fontSize: FontSize.lg, fontWeight: '700', color: '#0F172A' },
    saveBadge: { backgroundColor: '#0F172A', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    saveLabel: { fontSize: FontSize.xs, fontWeight: '700' },
    planPrice: { fontSize: 36, fontWeight: '800', color: '#0F172A', marginBottom: Spacing.md },
    planSpan: { fontSize: FontSize.md, fontWeight: '600', color: 'rgba(15, 23, 42, 0.7)' },
    planAction: { fontSize: FontSize.md, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginTop: Spacing.sm },

    planCardMonthly: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.xl },
    planNameMonthly: { fontSize: FontSize.lg, fontWeight: '700' },
    planPriceMonthly: { fontSize: 24, fontWeight: '800' },
    planSpanMonthly: { fontSize: FontSize.md, fontWeight: '500' },

    activeSection: { alignItems: 'center', padding: Spacing.xxl, borderRadius: BorderRadius.xl, borderWidth: 1 },
    activeEmoji: { fontSize: 48, marginBottom: Spacing.md },
    activeTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
    activeDesc: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
    manageBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.full, borderWidth: 1 },
    manageBtnText: { fontWeight: '600' },
});
