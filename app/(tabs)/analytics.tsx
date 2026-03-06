import React, { useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { usePremium } from '@/context/PremiumContext';
import { Card } from '@/components/ui/Card';
import { StatBadge } from '@/components/ui/StatBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { WeeklyBarChart } from '@/components/charts/WeeklyBarChart';
import { PaceTrendChart } from '@/components/charts/PaceTrendChart';
import { formatDistance, formatPace, formatDuration } from '@/lib/formatters';
import { FontSize, Spacing } from '@/constants/colors';

export default function AnalyticsScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const { runs, fetchRuns, isLoading } = useRunHistoryStore();
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const { isPremium, checkPremiumFeature } = usePremium();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchRuns();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRuns();
        setRefreshing(false);
    };

    // Weekly distance data (last 8 weeks)
    const weeklyData = useMemo(() => {
        const weeks: { week: string; distance: number }[] = [];
        const now = new Date();

        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() - i * 7);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            const weekRuns = runs.filter(
                (r) => {
                    const d = new Date(r.started_at);
                    return d >= weekStart && d < weekEnd;
                }
            );

            const distance = weekRuns.reduce((sum, r) => sum + r.distance_km, 0);
            const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            weeks.push({ week: label, distance: Math.round(distance * 10) / 10 });
        }

        return weeks;
    }, [runs]);

    // Pace trend (last 10 runs)
    const paceTrendData = useMemo(() => {
        const recent = runs
            .filter((r) => r.avg_pace_min_per_km > 0)
            .slice(0, 10)
            .reverse();

        return recent.map((r, i) => ({
            run: i + 1,
            pace: Math.round(r.avg_pace_min_per_km * 100) / 100,
        }));
    }, [runs]);

    // Lifetime stats
    const lifetimeStats = useMemo(() => {
        const totalDistance = runs.reduce((sum, r) => sum + r.distance_km, 0);
        const totalDuration = runs.reduce((sum, r) => sum + r.duration_seconds, 0);
        const totalRuns = runs.length;
        const avgPace = totalDistance > 0
            ? (totalDuration / 60) / totalDistance
            : 0;

        return { totalDistance, totalDuration, totalRuns, avgPace };
    }, [runs]);

    // Best week
    const bestWeek = useMemo(() => {
        if (weeklyData.length === 0) return null;
        return weeklyData.reduce((best, w) =>
            w.distance > best.distance ? w : best
        );
    }, [weeklyData]);

    // Premium Performance Insights
    const performanceLab = useMemo(() => {
        if (!runs.length) return null;

        const validRuns = runs.filter(r => r.avg_pace_min_per_km > 0);
        if (!validRuns.length) return null;

        const bestPace = Math.min(...validRuns.map(r => r.avg_pace_min_per_km));
        const avgPace = validRuns.reduce((sum, r) => sum + r.avg_pace_min_per_km, 0) / validRuns.length;

        // Pace Consistency (0-100%)
        const variance = validRuns.reduce((sum, r) => sum + Math.pow(r.avg_pace_min_per_km - avgPace, 2), 0) / validRuns.length;
        const consistency = Math.max(0, Math.min(100, 100 - (variance * 20)));

        return {
            consistency,
            predictions: {
                '5K': formatDuration(bestPace * 5 * 60),
                '10K': formatDuration(bestPace * 10 * 60 * 1.06), // Riegel's Formula approx
                'Half': formatDuration(bestPace * 21.1 * 60 * 1.12),
                'Full': formatDuration(bestPace * 42.2 * 60 * 1.2),
            }
        };
    }, [runs]);

    if (runs.length === 0 && !isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
                <Text style={[styles.header, { color: Colors.textPrimary }]}>Analytics</Text>
                <EmptyState
                    icon="📊"
                    title="No data yet"
                    message="Complete a few runs to see your analytics and performance trends."
                />
            </SafeAreaView>
        );
    }

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
                <Text style={[styles.header, { color: Colors.textPrimary }]}>Analytics</Text>

                {/* Lifetime Stats */}
                <Card variant="elevated" style={styles.lifetimeCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Lifetime Stats</Text>
                    <View style={styles.statsGrid}>
                        <StatBadge
                            icon="📏"
                            value={formatDistance(lifetimeStats.totalDistance, unit).replace(` ${unit}`, '')}
                            label={`Total ${unit}`}
                            color={Colors.accent}
                        />
                        <StatBadge
                            icon="🏃"
                            value={`${lifetimeStats.totalRuns}`}
                            label="Total Runs"
                            color={Colors.success}
                        />
                        <StatBadge
                            icon="⏱️"
                            value={formatDuration(lifetimeStats.totalDuration)}
                            label="Total Time"
                            color={Colors.warning}
                        />
                        <StatBadge
                            icon="⚡"
                            value={formatPace(lifetimeStats.avgPace, unit).replace(/\/.*/, '')}
                            label={`Avg ${unit === 'mi' ? '/mi' : '/km'}`}
                            color={Colors.accentLight}
                        />
                    </View>
                </Card>

                {/* Best Week */}
                {bestWeek && bestWeek.distance > 0 && (
                    <Card style={[styles.bestWeekCard, { borderColor: Colors.warning }]}>
                        <View style={styles.bestWeekRow}>
                            <Text style={styles.bestWeekIcon}>🏆</Text>
                            <View>
                                <Text style={[styles.bestWeekLabel, { color: Colors.textSecondary }]}>Best Week</Text>
                                <Text style={[styles.bestWeekValue, { color: Colors.warning }]}>
                                    {formatDistance(bestWeek.distance, unit)} — {bestWeek.week}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* Weekly Distance Chart */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Weekly Distance</Text>
                    <Card>
                        <WeeklyBarChart data={weeklyData} unit={unit} />
                    </Card>
                </View>

                {/* Pace Trend */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Pace Trend (Last 10 Runs)</Text>
                    <Card>
                        <PaceTrendChart data={paceTrendData} />
                    </Card>
                </View>

                {/* Performance Lab (Premium) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>🧪 Performance Lab</Text>
                        {!isPremium && <Text style={[styles.proLabel, { backgroundColor: Colors.premium, color: '#0F172A' }]}>PRO</Text>}
                    </View>

                    {isPremium && performanceLab ? (
                        <Card variant="glow" glowColor={Colors.premium}>
                            <View style={styles.labGrid}>
                                <View style={styles.labStat}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary }]}>Pace Consistency</Text>
                                    <Text style={[styles.labValue, { color: Colors.premium }]}>{Math.round(performanceLab.consistency)}%</Text>
                                    <View style={[styles.progressBar, { backgroundColor: Colors.surface }]}>
                                        <View style={[styles.progressFill, { width: `${performanceLab.consistency}%`, backgroundColor: Colors.premium }]} />
                                    </View>
                                </View>

                                <View style={styles.labPredictions}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary }]}>Estimated Race Times</Text>
                                    {Object.entries(performanceLab.predictions).map(([dist, time]) => (
                                        <View key={dist} style={styles.predictionRow}>
                                            <Text style={[styles.predictionDist, { color: Colors.textPrimary }]}>{dist}</Text>
                                            <View style={[styles.predictionLine, { backgroundColor: Colors.border }]} />
                                            <Text style={[styles.predictionTime, { color: Colors.textPrimary }]}>{time}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </Card>
                    ) : (
                        <Card style={[styles.lockedCard, { backgroundColor: Colors.surfaceLight }]}>
                            <Text style={[styles.lockedText, { color: Colors.textSecondary }]}>Upgrade to Pro to unlock race predictions and deep consistency analysis.</Text>
                            <Button
                                title="Explore Pro"
                                variant="premium"
                                size="sm"
                                onPress={() => router.push('/premium')}
                                style={{ marginTop: Spacing.md }}
                            />
                        </Card>
                    )}
                </View>
            </ScrollView>
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
        paddingBottom: 100,
    },
    header: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        marginBottom: Spacing.xl,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        marginBottom: Spacing.md,
    },
    lifetimeCard: {
        marginBottom: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: Spacing.lg,
        flexWrap: 'wrap',
        gap: Spacing.lg,
    },
    bestWeekCard: {
        marginBottom: Spacing.xl,
        borderWidth: 1,
    },
    bestWeekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    bestWeekIcon: {
        fontSize: 32,
    },
    bestWeekLabel: {
        fontSize: FontSize.sm,
    },
    bestWeekValue: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    // Performance Lab
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    proLabel: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    lockedCard: { padding: Spacing.xl, alignItems: 'center' },
    lockedText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
    labGrid: { gap: Spacing.xl },
    labStat: { gap: Spacing.xs },
    labLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
    labValue: { fontSize: 32, fontWeight: '800' },
    progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%' },
    labPredictions: { gap: Spacing.sm },
    predictionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    predictionDist: { width: 40, fontSize: FontSize.md, fontWeight: '700' },
    predictionLine: { flex: 1, height: 1 },
    predictionTime: { fontSize: FontSize.md, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
