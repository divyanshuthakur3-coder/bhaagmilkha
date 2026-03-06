import React, { useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/store/useUserStore';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useGoalStore } from '@/store/useGoalStore';
import { usePremium } from '@/context/PremiumContext';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/LoadingSkeleton';
import { getGreeting, formatDistance, formatPace, formatDuration, formatDate } from '@/lib/formatters';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function HomeScreen() {
    const { theme, colors: Colors } = useTheme();
    const router = useRouter();
    const profile = useUserStore((s) => s.profile);
    const { isPremium } = usePremium();
    const { runs, isLoading: runsLoading, fetchRuns } = useRunHistoryStore();
    const { goals, fetchGoals } = useGoalStore();
    const [refreshing, setRefreshing] = React.useState(false);

    const unit = profile?.preferred_unit || 'km';

    useEffect(() => {
        fetchRuns();
        fetchGoals();
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

        const thisWeek = runs.filter((r) => new Date(r.started_at) >= weekStart);
        const totalDistance = thisWeek.reduce((sum, r) => sum + r.distance_km, 0);
        const totalDuration = thisWeek.reduce((sum, r) => sum + r.duration_seconds, 0);
        const totalRuns = thisWeek.length;
        const totalCalories = thisWeek.reduce((sum, r) => sum + (r.calories_burned || 0), 0);

        return { totalDistance, totalDuration, totalRuns, totalCalories };
    }, [runs]);

    // Streak
    const streak = useMemo(() => {
        if (runs.length === 0) return 0;
        const runDates = new Set(runs.map((r) => new Date(r.started_at).toDateString()));
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
    const goalProgress = useMemo(() => {
        const weeklyGoal = profile?.weekly_goal_km || 20;
        return Math.min(100, (weeklyStats.totalDistance / weeklyGoal) * 100);
    }, [weeklyStats, profile]);

    const recentRuns = runs.slice(0, 3);

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
                            <Text style={[styles.greetingText, { color: Colors.textPrimary }]}>
                                {getGreeting()},{' '}
                                <Text style={[styles.userName, { color: Colors.accent }]}>{profile?.name || 'Runner'}</Text>
                            </Text>
                            <Text style={[styles.greetingSubtext, { color: Colors.textSecondary }]}>Let's crush it today! 💪</Text>
                        </View>
                        <View style={[styles.avatarSmall, { backgroundColor: Colors.surfaceLight, borderColor: Colors.accent }]}>
                            <Text style={[styles.avatarSmallText, { color: Colors.accent }]}>
                                {(profile?.name || 'R')[0].toUpperCase()}
                            </Text>
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
                        {goalProgress >= 100 && <Text style={[styles.completeBadge, { backgroundColor: Colors.successGlow, color: Colors.success }]}>✨ DONE</Text>}
                    </View>
                    <ProgressBar
                        progress={goalProgress}
                        label={`${weeklyStats.totalDistance.toFixed(1)} / ${profile?.weekly_goal_km || 20} ${unit}`}
                        color={goalProgress >= 100 ? Colors.success : Colors.accent}
                    />
                </Card>

                {/* Streak + Calories Row */}
                <View style={styles.miniCardsRow}>
                    <Card variant={streak > 0 ? 'glow' : 'default'} glowColor={Colors.warning} style={styles.miniCard}>
                        <Text style={styles.miniCardIcon}>🔥</Text>
                        <Text style={[styles.miniCardValue, { color: Colors.warning }]}>{streak}</Text>
                        <Text style={[styles.miniCardLabel, { color: Colors.textMuted }]}>Day Streak</Text>
                    </Card>
                    <Card variant="default" style={styles.miniCard}>
                        <Text style={styles.miniCardIcon}>⚡</Text>
                        <Text style={[styles.miniCardValue, { color: Colors.success }]}>
                            {Math.round(weeklyStats.totalCalories)}
                        </Text>
                        <Text style={[styles.miniCardLabel, { color: Colors.textMuted }]}>Calories</Text>
                    </Card>
                </View>

                {/* Recent Runs */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>📋 Recent Runs</Text>
                        {runs.length > 3 && (
                            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                                <Text style={[styles.seeAll, { color: Colors.accent }]}>See All →</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {runsLoading ? (
                        <SkeletonGroup count={3} height={80} />
                    ) : recentRuns.length === 0 ? (
                        <EmptyState
                            icon="🏃‍♂️"
                            title="No runs yet"
                            message="Start your first run and see your progress here!"
                            actionLabel="Start a Run"
                            onAction={() => router.push('/run/live-run')}
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
                                        <View style={[styles.runCardIndex, { backgroundColor: Colors.surfaceLight }]}>
                                            <Text style={[styles.runCardIndexText, { color: Colors.accent }]}>{index + 1}</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.runDistance, { color: Colors.textPrimary }]}>
                                                {formatDistance(run.distance_km, unit)}
                                            </Text>
                                            <Text style={[styles.runDate, { color: Colors.textMuted }]}>{formatDate(run.started_at)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.runCardRight}>
                                        <Text style={[styles.runPace, { color: Colors.accent }]}>
                                            {formatPace(run.avg_pace_min_per_km, unit)}
                                        </Text>
                                        <Text style={[styles.runDuration, { color: Colors.textSecondary }]}>
                                            {formatDuration(run.duration_seconds)}
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
                                    <Text style={styles.premiumTitle}>💎 Upgrade to Pro</Text>
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
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>🚀 Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => {
                                if (runs.length > 0) {
                                    router.push(`/run/${runs[0].id}`);
                                } else {
                                    Alert.alert('AI Coach', 'Start a run first to get AI insights!');
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <LinearGradient colors={['#F43F5E', '#BE123C']} style={styles.quickActionGradient}>
                                <Text style={styles.quickActionIcon}>🤖</Text>
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>AI Coach{'\n'}Insights</Text>
                                {!isPremium && <View style={styles.lockBadge}><Text style={[styles.lockText, { color: Colors.premium }]}>PRO</Text></View>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/training/plans')} activeOpacity={0.7}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionGradient}>
                                <Text style={styles.quickActionIcon}>🏋️</Text>
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>Training{'\n'}Plans</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/training/intervals')} activeOpacity={0.7}>
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.quickActionGradient}>
                                <Text style={styles.quickActionIcon}>⚡</Text>
                                <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>Interval{'\n'}Workouts</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Start Run FAB */}
            <TouchableOpacity
                style={[styles.fab, Shadows.glow(Colors.accent)]}
                onPress={() => router.push('/run/live-run')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fabGradient}
                >
                    <Text style={[styles.fabIcon, { color: '#FFFFFF' }]}>▶</Text>
                    <Text style={[styles.fabText, { color: '#FFFFFF' }]}>Start Run</Text>
                </LinearGradient>
            </TouchableOpacity>
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
        padding: Spacing.lg,
        paddingBottom: 120,
    },
    greeting: {
        marginBottom: Spacing.xl,
    },
    greetingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: FontSize.xxl,
        fontWeight: '600',
    },
    userName: {
        fontWeight: '700',
    },
    greetingSubtext: {
        fontSize: FontSize.md,
        marginTop: Spacing.xs,
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarSmallText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    statsCardWrapper: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
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
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    goalCard: {
        marginBottom: Spacing.md,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    completeBadge: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    miniCardsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    miniCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    miniCardIcon: {
        fontSize: 28,
        marginBottom: Spacing.xs,
    },
    miniCardValue: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
    },
    miniCardLabel: {
        fontSize: FontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    section: {
        marginBottom: Spacing.xl,
        marginTop: Spacing.md,
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
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
    },
    runCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    runCardIndex: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    runCardIndexText: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    runCardRight: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
    runDate: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    runDistance: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    runPace: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    runDuration: {
        fontSize: FontSize.sm,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    fabGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
    },
    fabIcon: {
        fontSize: 16,
    },
    fabText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
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
});
