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
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { StatBadge } from '@/components/ui/StatBadge';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { WeeklyBarChart } from '@/components/charts/WeeklyBarChart';
import { PaceTrendChart } from '@/components/charts/PaceTrendChart';
import { TrainingLoadChart } from '@/components/charts/TrainingLoadChart';
import { IntensityZonesChart } from '@/components/charts/IntensityZonesChart';
import { ScoreTrendChart } from '@/components/charts/ScoreTrendChart';
import { ReadinessTrendChart } from '@/components/charts/ReadinessTrendChart';
import { formatDistance, formatPace, formatDuration, calculateRunScore } from '@/lib/formatters';
import { calculateTRIMP } from '@/lib/performance';
import { FontSize, Spacing } from '@/constants/colors';

export default function AnalyticsScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const { runs = [], fetchRuns, isLoading } = useRunHistoryStore(useShallow(s => ({
        runs: s.runs,
        fetchRuns: s.fetchRuns,
        isLoading: s.isLoading
    })));
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const { isPremium, checkPremiumFeature } = usePremium();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetchRuns(controller.signal);
        return () => controller.abort();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRuns();
        setRefreshing(false);
    };

    // Weekly distance data (last 12 weeks)
    const weeklyData = useMemo(() => {
        const weeks: { week: string; distance: number }[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
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
        const safeRuns = runs || [];
        const totalDistance = safeRuns.reduce((sum, r) => sum + r.distance_km, 0);
        const totalDuration = safeRuns.reduce((sum, r) => sum + r.duration_seconds, 0);
        const totalRuns = safeRuns.length;
        const avgPace = totalDistance > 0
            ? (totalDuration / 60) / totalDistance
            : 0;

        return { totalDistance, totalDuration, totalRuns, avgPace };
    }, [runs]);

    // Training Load (Acute:Chronic ratio)
    const loadAnalysis = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000);

        const acuteRuns = runs.filter(r => new Date(r.started_at) > sevenDaysAgo);
        const chronicRuns = runs.filter(r => new Date(r.started_at) > twentyEightDaysAgo);

        const acuteTotal = acuteRuns.reduce((sum, r) => sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0);
        const chronicTotal = chronicRuns.reduce((sum, r) => sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0);

        const dailyAcute = acuteTotal / 7;
        const dailyChronic = chronicTotal / 28;

        const ratio = dailyChronic > 0 ? dailyAcute / dailyChronic : 1.0;

        let status = 'Optimal';
        let color = Colors.success;
        let message = 'Your training load is in the "sweet spot". Keep it up!';

        if (ratio > 1.5) {
            status = 'Overreaching';
            color = Colors.error;
            message = 'Risk of injury is high! Consider extra recovery days.';
        } else if (ratio > 1.3) {
            status = 'High Load';
            color = Colors.warning;
            message = 'You are pushing hard. Listen to your body.';
        } else if (ratio < 0.8) {
            status = 'Underload';
            color = Colors.accentLight;
            message = 'You have room to increase intensity safely.';
        }

        return { acuteTotal, chronicTotal, ratio, status, color, message };
    }, [runs, Colors]);

    // Readiness Trend (last 14 days)
    const readinessTrend = useMemo(() => {
        const now = new Date();
        const trend = [];

        for (let i = 13; i >= 0; i--) {
            const day = new Date(now.getTime() - i * 86400000);
            const dayStr = day.toDateString();

            // For each day, we need the rolling 7d and 28d totals up to that day
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const sevenDaysBefore = new Date(dayEnd.getTime() - 7 * 86400000);
            const twentyEightDaysBefore = new Date(dayEnd.getTime() - 28 * 86400000);

            const acuteRuns = runs.filter(r => {
                const d = new Date(r.started_at);
                return d > sevenDaysBefore && d <= dayEnd;
            });
            const chronicRuns = runs.filter(r => {
                const d = new Date(r.started_at);
                return d > twentyEightDaysBefore && d <= dayEnd;
            });

            const acute = acuteRuns.reduce((sum, r) => sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0) / 7;
            const chronic = chronicRuns.reduce((sum, r) => sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0) / 28;

            trend.push({
                day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                acute,
                chronic
            });
        }
        return trend;
    }, [runs]);

    // Training Load (last 30 days) for chart
    const trainingLoad = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        const recentRuns = runs.filter(r => new Date(r.started_at) > thirtyDaysAgo);
        const totalLoad = recentRuns.reduce((sum, r) =>
            sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0);

        // Daily load for trend chart (last 14 days)
        const dailyLoad = [];
        for (let i = 13; i >= 0; i--) {
            const day = new Date(now.getTime() - i * 86400000);
            const dayStr = day.toDateString();
            const dayRuns = runs.filter(r => new Date(r.started_at).toDateString() === dayStr);
            const dayLoad = dayRuns.reduce((sum, r) =>
                sum + calculateTRIMP(r.duration_seconds, r.avg_pace_min_per_km), 0);
            dailyLoad.push({
                day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                load: dayLoad
            });
        }

        return { totalLoad, dailyLoad };
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
        if (!(runs || []).length) return null;

        const validRuns = runs.filter(r => r.avg_pace_min_per_km > 0);
        if (!validRuns.length) return null;

        const bestPace = Math.min(...validRuns.map(r => r.avg_pace_min_per_km));
        const avgPace = validRuns.reduce((sum, r) => sum + r.avg_pace_min_per_km, 0) / validRuns.length;

        // Pace Consistency (0-100%)
        const variance = validRuns.reduce((sum, r) => sum + Math.pow(r.avg_pace_min_per_km - avgPace, 2), 0) / validRuns.length;
        const consistency = Math.max(0, Math.min(100, 100 - (variance * 20)));

        // Score Trend
        const scoreTrend = validRuns.slice(0, 10).reverse().map((r, i) => ({
            run: i + 1,
            score: calculateRunScore(r.distance_km, r.avg_pace_min_per_km, r.splits || [])
        }));

        // Intensity Zones (Mocked based on pace distribution)
        // Recovery (>7:00), Aerobic (5:00-7:00), Tempo (4:15-5:00), Threshold/VO2 (<4:15)
        let recoveryCount = 0, aerobicCount = 0, tempoCount = 0, thresholdCount = 0;
        validRuns.forEach(r => {
            const p = r.avg_pace_min_per_km;
            if (p > 7) recoveryCount++;
            else if (p > 5) aerobicCount++;
            else if (p > 4.25) tempoCount++;
            else thresholdCount++;
        });

        const total = validRuns.length;
        const intensityData = [
            { x: 'VO2 Max', y: Math.round((thresholdCount / total) * 100), color: Colors.error },
            { x: 'Tempo', y: Math.round((tempoCount / total) * 100), color: Colors.warning },
            { x: 'Aerobic', y: Math.round((aerobicCount / total) * 100), color: Colors.accent },
            { x: 'Recovery', y: Math.round((recoveryCount / total) * 100), color: Colors.success },
        ].filter(d => d.y > 0);

        return {
            consistency,
            scoreTrend,
            intensityData,
            predictions: {
                '5K': formatDuration(bestPace * 5 * 60),
                '10K': formatDuration(bestPace * 10 * 60 * 1.06),
                'Half': formatDuration(bestPace * 21.1 * 60 * 1.12),
                'Full': formatDuration(bestPace * 42.2 * 60 * 1.2),
            }
        };
    }, [runs, Colors]);

    if ((runs || []).length === 0 && !isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
                <Text style={[styles.header, { color: Colors.textPrimary }]}>Analytics</Text>
                <EmptyState
                    icon="bar-chart"
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
                <Card variant="glass" style={styles.lifetimeCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Lifetime Stats</Text>
                    <View style={styles.statsGrid}>
                        <StatBadge
                            icon="flash"
                            value={`${trainingLoad.totalLoad}`}
                            label="Training Load"
                            color={Colors.premium}
                        />
                        <StatBadge
                            icon="footsteps"
                            value={formatDistance(lifetimeStats.totalDistance, unit).replace(` ${unit}`, '')}
                            label={`Total ${unit}`}
                            color={Colors.accent}
                        />
                        <StatBadge
                            icon="walk"
                            value={`${lifetimeStats.totalRuns}`}
                            label="Total Runs"
                            color={Colors.success}
                        />
                        <StatBadge
                            icon="time"
                            value={formatDuration(lifetimeStats.totalDuration)}
                            label="Total Time"
                            color={Colors.warning}
                        />
                        <StatBadge
                            icon="flash"
                            value={formatPace(lifetimeStats.avgPace, unit).replace(/\/.*/, '')}
                            label={`Avg ${unit === 'mi' ? '/mi' : '/km'}`}
                            color={Colors.accentLight}
                        />
                    </View>
                </Card>

                {/* Best Week */}
                {bestWeek && bestWeek.distance > 0 && (
                    <Card variant="glow" glowColor={Colors.warning} style={[styles.bestWeekCard]}>
                        <View style={styles.bestWeekRow}>
                            <Ionicons name="trophy" size={32} color={Colors.warning} />
                            <View>
                                <Text style={[styles.bestWeekLabel, { color: Colors.textSecondary }]}>Best Week</Text>
                                <Text style={[styles.bestWeekValue, { color: Colors.warning }]}>
                                    {formatDistance(bestWeek.distance, unit)} — {bestWeek.week}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* Training Readiness (Acute/Chronic) */}
                <Card variant="glass" style={{ marginBottom: Spacing.xl, borderColor: loadAnalysis.color, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="pulse" size={24} color={loadAnalysis.color} />
                            <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Training Readiness</Text>
                        </View>
                        <View style={[styles.proBadge, { backgroundColor: loadAnalysis.color }]}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>{loadAnalysis.status.toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={{ fontSize: 42, fontWeight: '900', color: Colors.textPrimary }}>{loadAnalysis.ratio.toFixed(2)}</Text>
                        <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' }}>ACWR RATIO</Text>
                    </View>
                    <Text style={{ color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 20 }}>{loadAnalysis.message}</Text>

                    <View style={{ height: 200, marginTop: Spacing.md }}>
                        <ErrorBoundary title="Trend Error" message="Failed to load Readiness trend.">
                            <ReadinessTrendChart data={readinessTrend} />
                        </ErrorBoundary>
                    </View>

                    <View style={styles.loadSplit}>
                        <View>
                            <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>ACUTE (7d)</Text>
                            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary }}>{Math.round(loadAnalysis.acuteTotal)} load</Text>
                        </View>
                        <View style={{ width: 1, height: 20, backgroundColor: Colors.border }} />
                        <View>
                            <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>CHRONIC (28d)</Text>
                            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary }}>{Math.round(loadAnalysis.chronicTotal)} load</Text>
                        </View>
                    </View>
                </Card>

                {/* Training Load Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="fitness" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Training Load (14 Days)</Text>
                        </View>
                    </View>
                    <Card variant="glass">
                        <ErrorBoundary title="Loading Error" message="Failed to load Training Load chart.">
                            <TrainingLoadChart data={trainingLoad.dailyLoad} />
                        </ErrorBoundary>
                    </Card>
                </View>

                {/* Weekly Distance Chart */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Weekly Distance (12 Weeks)</Text>
                    <Card variant="glass">
                        <ErrorBoundary title="Distance Error" message="Failed to load Weekly Distance chart.">
                            <WeeklyBarChart data={weeklyData} unit={unit} />
                        </ErrorBoundary>
                    </Card>
                </View>

                {/* Pace Trend */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Pace Trend (Last 10 Runs)</Text>
                    <Card variant="glass">
                        <ErrorBoundary title="Pace Error" message="Failed to load Pace Trend chart.">
                            <PaceTrendChart data={paceTrendData} />
                        </ErrorBoundary>
                    </Card>
                </View>

                {/* Performance Lab (Premium) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="flask" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Performance Lab</Text>
                        </View>
                        {!isPremium && <Text style={[styles.proLabel, { backgroundColor: Colors.premium, color: '#0F172A' }]}>PRO</Text>}
                    </View>

                    {isPremium && performanceLab ? (
                        <Card variant="glass" style={{ padding: Spacing.xl }}>
                            <View style={styles.labGrid}>
                                <View style={styles.labStat}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary }]}>Fitness Score Trend</Text>
                                    <ErrorBoundary fallback={<Text style={{ color: Colors.textMuted }}>Chart error</Text>}>
                                        <ScoreTrendChart data={performanceLab.scoreTrend} />
                                    </ErrorBoundary>
                                </View>

                                <View style={[styles.labStat, { marginTop: Spacing.md }]}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary }]}>Intensity Breakdown</Text>
                                    <ErrorBoundary fallback={<Text style={{ color: Colors.textMuted }}>Chart error</Text>}>
                                        <IntensityZonesChart data={performanceLab.intensityData} />
                                    </ErrorBoundary>
                                </View>

                                <View style={[styles.labStat, { marginTop: Spacing.md }]}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary }]}>Pace Consistency</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
                                        <Text style={[styles.labValue, { color: Colors.premium, fontSize: 24 }]}>{Math.round(performanceLab.consistency)}%</Text>
                                        <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: '700' }}>STABILITY INDEX</Text>
                                    </View>
                                    <View style={[styles.progressBar, { backgroundColor: Colors.surface }]}>
                                        <View style={[styles.progressFill, { width: `${performanceLab.consistency}%`, backgroundColor: Colors.premium }]} />
                                    </View>
                                </View>

                                <View style={styles.labPredictions}>
                                    <Text style={[styles.labLabel, { color: Colors.textSecondary, marginBottom: Spacing.md }]}>Estimated Race Potentials</Text>
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
        fontWeight: '900',
        letterSpacing: -1,
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
    loadSplit: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xl,
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    proBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
});
