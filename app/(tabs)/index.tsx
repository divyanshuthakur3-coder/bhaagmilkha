import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/store/useUserStore';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useGoalStore } from '@/store/useGoalStore';
import { useShallow } from 'zustand/react/shallow';
import { usePremium } from '@/context/PremiumContext';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/LoadingSkeleton';
import { getGreeting, formatDistance, formatPace, formatDuration, formatDate, calculateRunScore } from '@/lib/formatters';
import { useLocation } from '@/hooks/useLocation';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function HomeScreen() {
    const { theme, colors: Colors } = useTheme();
    const router = useRouter();
    const profile = useUserStore((s) => s.profile);
    const { isPremium } = usePremium();
    const { runs, isLoading: runsLoading, fetchRuns } = useRunHistoryStore(useShallow(s => ({
        runs: s.runs,
        isLoading: s.isLoading,
        fetchRuns: s.fetchRuns,
    })));
    const { goals, fetchGoals } = useGoalStore(useShallow(s => ({
        goals: s.goals,
        fetchGoals: s.fetchGoals,
    })));
    const [refreshing, setRefreshing] = React.useState(false);
    const { requestPermissions, hasPermission } = useLocation();

    const unit = profile?.preferred_unit || 'km';

    const fabPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchRuns();
        fetchGoals();
        requestPermissions(); // Location

        // Request Activity & Notifications
        (async () => {
            try {
                const { status: notifStatus } = await Notifications.getPermissionsAsync();
                if (notifStatus !== 'granted') {
                    await Notifications.requestPermissionsAsync();
                }

                const hasPedometer = await Pedometer.isAvailableAsync();
                if (hasPedometer) {
                    await Pedometer.requestPermissionsAsync();
                }
            } catch (e) {
                console.log('Permission request error', e);
            }
        })();

        // FAB Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(fabPulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
                Animated.timing(fabPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchRuns(), fetchGoals()]);
        setRefreshing(false);
    };

    // Weekly stats
    const weeklyStats = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const safeRuns = runs || [];
        const thisWeek = safeRuns.filter((r) => new Date(r.started_at) >= weekStart);
        const totalDistance = thisWeek.reduce((sum, r) => sum + r.distance_km, 0);
        const totalDuration = thisWeek.reduce((sum, r) => sum + r.duration_seconds, 0);
        const totalRuns = thisWeek.length;
        const totalCalories = thisWeek.reduce((sum, r) => sum + (r.calories_burned || 0), 0);

        return { totalDistance, totalDuration, totalRuns, totalCalories };
    }, [runs]);

    // Streak
    const streak = useMemo(() => {
        const safeRuns = runs || [];
        if (safeRuns.length === 0) return 0;
        const runDates = new Set(safeRuns.map((r) => new Date(r.started_at).toDateString()));
        let count = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            if (runDates.has(d.toDateString())) {
                count++;
            } else if (i > 0) {
                break;
            }
        }
        return count;
    }, [runs]);

    // Goal progress
    const weeklyGoal = profile?.weekly_goal_km || 20;
    const goalProgress = useMemo(() => {
        return Math.min(100, (weeklyStats.totalDistance / weeklyGoal) * 100);
    }, [weeklyStats, weeklyGoal]);

    const recentRuns = (runs || []).slice(0, 3);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                }
            >
                {/* Greeting */}
                <View style={styles.greeting}>
                    <View style={styles.greetingRow}>
                        <View>
                            <Text style={[styles.greetingSubtext, { color: Colors.textSecondary }]}>{getGreeting()}</Text>
                            <Text style={[styles.greetingText, { color: Colors.textPrimary }]}>
                                {profile?.name || 'Runner'}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ alignItems: 'flex-end' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: hasPermission ? Colors.success : Colors.error }} />
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary }}>GPS {hasPermission ? 'READY' : 'OFF'}</Text>
                                </View>
                                <View style={[styles.avatarSmall, { backgroundColor: Colors.surface, borderColor: Colors.border, marginTop: 4 }]}>
                                    <Text style={[styles.avatarSmallText, { color: Colors.textPrimary }]}>
                                        {(profile?.name || 'R')[0].toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Weekly Stats Card - Gradient */}
                <View style={[styles.statsCardWrapper, theme === 'light' ? Shadows.md : Shadows.lg]}>
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statsGradient}
                    >
                        <Text style={styles.statsTitle}>This Week</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                                    {weeklyStats.totalDistance.toFixed(1)}
                                </Text>
                                <Text style={styles.statLabel}>{unit}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{weeklyStats.totalRuns}</Text>
                                <Text style={styles.statLabel}>runs</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                                    {formatDuration(weeklyStats.totalDuration)}
                                </Text>
                                <Text style={styles.statLabel}>time</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Goal Progress */}
                <Card variant="glass" style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Target Goal</Text>
                        {goalProgress >= 100 && (
                            <View style={[styles.completeBadge, { backgroundColor: Colors.successGlow, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.success }}>DONE</Text>
                            </View>
                        )}
                    </View>
                    <ProgressBar
                        progress={goalProgress}
                        label={`${unit === 'mi' ? (weeklyStats.totalDistance * 0.621371).toFixed(1) : weeklyStats.totalDistance.toFixed(1)} / ${unit === 'mi' ? (weeklyGoal * 0.621371).toFixed(1) : weeklyGoal} ${unit}`}
                        color={goalProgress >= 100 ? Colors.success : Colors.accent}
                    />
                </Card>

                {/* Streak + Calories Row */}
                <View style={styles.miniCardsRow}>
                    <Card variant="glass" style={styles.miniCard}>
                        <Ionicons name="flame" size={32} color={Colors.error} />
                        <View style={styles.miniCardTextContainer}>
                            <Text style={[styles.miniCardValue, { color: Colors.textPrimary }]}>{streak}</Text>
                            <Text style={[styles.miniCardLabel, { color: Colors.textMuted }]}>Day Streak</Text>
                        </View>
                    </Card>
                    <Card variant="glass" style={styles.miniCard}>
                        <Ionicons name="flash" size={32} color={Colors.warning} />
                        <View style={styles.miniCardTextContainer}>
                            <Text style={[styles.miniCardValue, { color: Colors.textPrimary }]}>
                                {Math.round(weeklyStats.totalCalories)}
                            </Text>
                            <Text style={[styles.miniCardLabel, { color: Colors.textMuted }]}>Kcal</Text>
                        </View>
                    </Card>
                </View>

                {/* Recent Runs */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="reader" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Recent Runs</Text>
                        </View>
                        {(runs || []).length > 3 && (
                            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                                <Text style={[styles.seeAll, { color: Colors.accent }]}>See All →</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {runsLoading ? (
                        <SkeletonGroup count={3} height={80} />
                    ) : recentRuns.length === 0 ? (
                        <EmptyState
                            icon="walk"
                            title="No runs yet"
                            message="Start your first run and see your progress here!"
                            actionLabel="Start a Run"
                            onAction={async () => {
                                const permitted = await requestPermissions();
                                if (permitted) {
                                    router.push('/run/live-run');
                                }
                            }}
                        />
                    ) : (
                        <View style={styles.runsList}>
                            {recentRuns.map((run, index) => (
                                <TouchableOpacity
                                    key={run.id}
                                    style={[styles.runCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                                    onPress={() => router.push(`/run/${run.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.runCardLeft}>
                                        <View style={[styles.runCardIconHolder, { backgroundColor: Colors.surfaceLight }]}>
                                            <Ionicons name="walk" size={20} color={Colors.accent} />
                                        </View>
                                        <View>
                                            <Text style={[styles.runDistance, { color: Colors.textPrimary }]}>
                                                {formatDistance(run.distance_km, unit)}
                                            </Text>
                                            <Text style={[styles.runDate, { color: Colors.textSecondary }]}>
                                                {formatDate(run.started_at)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.runCardRight}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
                                            <Ionicons name="star" size={12} color={Colors.premium} />
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.premium }}>
                                                {calculateRunScore(run.distance_km, run.avg_pace_min_per_km, run.splits || [])}
                                            </Text>
                                        </View>
                                        <Text style={[styles.runDuration, { color: Colors.textPrimary, textAlign: 'right' }]}>
                                            {formatDuration(run.duration_seconds)}
                                        </Text>
                                        <Text style={[styles.runPace, { color: Colors.textMuted, textAlign: 'right' }]}>
                                            {formatPace(run.avg_pace_min_per_km, unit)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Premium Banner */}
                {!isPremium && (
                    <TouchableOpacity
                        style={[styles.premiumBanner, { borderColor: Colors.premium }]}
                        activeOpacity={0.9}
                        onPress={() => router.push('/premium')}
                    >
                        <LinearGradient
                            colors={[Colors.premium, '#D4A517']}
                            style={styles.premiumGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.premiumContent}>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="diamond" size={20} color="#FFFFFF" />
                                        <Text style={styles.premiumTitle}>Upgrade to Pro</Text>
                                    </View>
                                    <Text style={styles.premiumSubtitle}>AI Coach, Custom Plans & More</Text>
                                </View>
                                <View style={[styles.premiumBadge, { backgroundColor: '#0F172A' }]}>
                                    <Text style={[styles.premiumBadgeText, { color: Colors.premium }]}>SAVE 45%</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                        <Ionicons name="rocket" size={24} color={Colors.textPrimary} />
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Quick Actions</Text>
                    </View>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => {
                                if ((runs || []).length > 0) {
                                    router.push(`/run/${runs[0].id}`);
                                } else {
                                    Alert.alert('AI Coach', 'Start a run first to get AI insights!');
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <LinearGradient colors={['#F43F5E', '#BE123C']} style={styles.quickActionGradient}>
                                <Ionicons name="hardware-chip" size={32} color="#FFFFFF" style={{ marginBottom: Spacing.md }} />
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>AI Coach{'\n'}Insights</Text>
                                {!isPremium && <View style={styles.lockBadge}><Text style={[styles.lockText, { color: Colors.premium }]}>PRO</Text></View>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/training/plans')} activeOpacity={0.7}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionGradient}>
                                <Ionicons name="barbell" size={32} color="#FFFFFF" style={{ marginBottom: Spacing.md }} />
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>Training{'\n'}Plans</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/training/intervals')} activeOpacity={0.7}>
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.quickActionGradient}>
                                <Ionicons name="flash" size={32} color="#FFFFFF" style={{ marginBottom: Spacing.md }} />
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>Interval{'\n'}Workouts</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Start Run FAB */}
            <Animated.View style={[styles.fabWrapper, { transform: [{ scale: fabPulse }] }]}>
                <TouchableOpacity
                    style={[styles.fab, Shadows.glow(Colors.accent)]}
                    onPress={async () => {
                        const permitted = await requestPermissions();
                        if (permitted) {
                            router.push('/run/live-run');
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                        <Text style={[styles.fabText, { color: '#FFFFFF' }]}>Start Run</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Spacing.xxl + Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 200, // Increased to clear the larger tab bar
    },
    greeting: {
        marginBottom: Spacing.xxxl,
    },
    greetingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        letterSpacing: -1,
        marginTop: 4,
    },
    greetingSubtext: {
        fontSize: FontSize.md,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    avatarSmall: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    avatarSmallText: {
        fontSize: FontSize.xl,
        fontWeight: '800',
    },
    statsCardWrapper: {
        marginBottom: Spacing.xxl,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
    },
    statsGradient: {
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
    },
    statsTitle: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    goalCard: {
        marginBottom: Spacing.xxl,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    completeBadge: {
        fontSize: FontSize.xs,
        fontWeight: '800',
        letterSpacing: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    miniCardsRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginBottom: Spacing.xxxl,
    },
    miniCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    miniCardIcon: {
        fontSize: 32,
    },
    miniCardTextContainer: {
        flex: 1,
    },
    miniCardValue: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        letterSpacing: -1,
    },
    miniCardLabel: {
        fontSize: FontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
        marginTop: 2,
    },
    section: {
        marginBottom: Spacing.xxxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    runsList: {
        gap: Spacing.sm,
    },
    runCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        ...Shadows.sm,
    },
    runCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    runCardIconHolder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    runCardIconText: {
        fontSize: FontSize.lg,
    },
    runCardRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    runDate: {
        fontSize: FontSize.xs,
        fontWeight: '500',
        marginTop: 4,
    },
    runDistance: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    runDuration: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    runPace: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 110, // A bit higher to clear the new tab bar
        alignSelf: 'center',
        borderRadius: BorderRadius.full,
        overflow: 'visible', // Allow shadow spread
        ...Shadows.glow('#3B82F6'),
    },
    fabGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: BorderRadius.full,
    },
    fabIcon: {
        fontSize: 18,
    },
    fabText: {
        fontSize: FontSize.lg,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    quickAction: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    quickActionGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    quickActionIcon: {
        fontSize: 28,
    },
    quickActionText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 16,
    },
    premiumBanner: {
        marginBottom: Spacing.xl,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
    },
    premiumGradient: {
        padding: Spacing.md,
    },
    premiumContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    premiumTitle: {
        fontSize: FontSize.md,
        fontWeight: '800',
        color: '#0F172A',
    },
    premiumSubtitle: {
        fontSize: FontSize.xs,
        color: 'rgba(15, 23, 42, 0.7)',
        marginTop: 2,
    },
    premiumBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    premiumBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    lockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    lockText: {
        fontSize: 10,
        fontWeight: '900',
    },
    fabWrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 140 : 125,
        alignSelf: 'center',
        zIndex: 100,
    },
});
