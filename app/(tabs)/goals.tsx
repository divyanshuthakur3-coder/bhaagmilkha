import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGoalStore } from '@/store/useGoalStore';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRings } from '@/components/ui/ProgressRings';
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap';
import { Ionicons } from '@expo/vector-icons';
import { GOAL_TYPES, GoalType } from '@/constants/goalTypes';
import { formatDistance, formatPace } from '@/lib/formatters';

const GOAL_TEMPLATES = [
    { label: '🏃 Consistently', type: 'weekly_run_count', target: 3, description: '3 runs per week' },
    { label: '🎯 5K Training', type: 'weekly_distance', target: 15, description: '15 km per week' },
    { label: '🔥 Streak Starter', type: 'streak', target: 7, description: '7 day streak' },
    { label: '👑 Elite Runner', type: 'weekly_distance', target: 50, description: '50 km per week' },
];
import { Colors as ThemeColors, FontSize, Spacing, BorderRadius } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

export default function GoalsScreen() {
    const { colors: Colors } = useTheme();
    const { goals, fetchGoals, addGoal } = useGoalStore();
    const { runs = [], fetchRuns } = useRunHistoryStore();
    const profile = useUserStore((s) => s.profile);
    const unit = profile?.preferred_unit || 'km';
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedType, setSelectedType] = useState<GoalType>('weekly_distance');
    const [targetValue, setTargetValue] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const goalProgress = useGoalProgress(goals, runs);

    useEffect(() => {
        const controller = new AbortController();
        fetchGoals(controller.signal);
        fetchRuns(controller.signal);
        return () => controller.abort();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchGoals(), fetchRuns()]);
        setRefreshing(false);
    };

    // Personal records
    const personalRecords = React.useMemo(() => {
        if ((runs || []).length === 0) return null;

        const fastest5k = runs
            .filter((r) => r.distance_km >= 5)
            .sort((a, b) => a.avg_pace_min_per_km - b.avg_pace_min_per_km)[0];

        const longestRun = [...runs].sort((a, b) => b.distance_km - a.distance_km)[0];

        const bestPace = runs
            .filter((r) => r.avg_pace_min_per_km > 0)
            .sort((a, b) => a.avg_pace_min_per_km - b.avg_pace_min_per_km)[0];

        return { fastest5k, longestRun, bestPace };
    }, [runs]);

    // Calendar heatmap data
    const heatmapData = React.useMemo(() => {
        return runs.map((r) => ({
            date: r.started_at,
            distanceKm: r.distance_km,
        }));
    }, [runs]);

    // Weekly Consistency (Habits)
    const weeklyConsistency = React.useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const daysWithRuns = new Set(
            runs
                .filter(r => new Date(r.started_at) >= weekStart)
                .map(r => new Date(r.started_at).toDateString())
        );

        return {
            count: daysWithRuns.size,
            days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return { label, active: daysWithRuns.has(d.toDateString()), isToday: d.toDateString() === now.toDateString() };
            })
        };
    }, [runs]);

    const handleAddGoal = async () => {
        if (!targetValue || !profile) return;

        await addGoal({
            user_id: profile.id,
            type: selectedType,
            target_value: parseFloat(targetValue),
            deadline: null,
            is_active: true,
        });

        setShowAddModal(false);
        setTargetValue('');
    };

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
                <View style={styles.headerRow}>
                    <Text style={[styles.header, { color: Colors.textPrimary }]}>Goals</Text>
                    <Button
                        title="+ Add"
                        onPress={() => setShowAddModal(true)}
                        variant="primary"
                        size="sm"
                    />
                </View>

                {/* Overall Progress Rings */}
                {goalProgress.length > 0 && (
                    <Card variant="glass" style={{ marginBottom: Spacing.xl, padding: Spacing.xl }}>
                        <Text style={[styles.sectionTitle, { color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }]}>
                            Current Progress
                        </Text>
                        <ProgressRings
                            rings={[
                                {
                                    progress: goalProgress.find(g => g.goal.type === 'weekly_distance')?.percentage || 0,
                                    label: 'Dist',
                                    icon: 'resize',
                                    colors: [Colors.accent, Colors.accentLight] as [string, string]
                                },
                                {
                                    progress: goalProgress.find(g => g.goal.type === 'weekly_time')?.percentage || 0,
                                    label: 'Time',
                                    icon: 'time',
                                    colors: [Colors.success, Colors.successLight] as [string, string]
                                },
                                {
                                    progress: goalProgress.find(g => g.goal.type === 'weekly_run_count')?.percentage || 0,
                                    label: 'Runs',
                                    icon: 'walk',
                                    colors: [Colors.warning, Colors.warningLight] as [string, string]
                                }
                            ].filter(r => r.progress > 0 || r.label === 'Dist').slice(0, 3)}
                        />
                    </Card>
                )}

                {/* Weekly Consistency (Habit Tracker) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Weekly Consistency</Text>
                    <Card variant="glass" style={styles.habitCard}>
                        <View style={styles.habitDays}>
                            {weeklyConsistency.days.map((day, i) => (
                                <View key={i} style={styles.habitDayColumn}>
                                    <View style={[
                                        styles.habitDot,
                                        day.active && { backgroundColor: Colors.success, borderColor: Colors.success },
                                        day.isToday && !day.active && { borderColor: Colors.accent, borderWidth: 2 }
                                    ]}>
                                        {day.active && <Ionicons name="checkmark" size={12} color="white" />}
                                    </View>
                                    <Text style={[
                                        styles.habitDayLabel,
                                        { color: day.isToday ? Colors.accent : Colors.textMuted },
                                        day.isToday && { fontWeight: '800' }
                                    ]}>
                                        {day.label}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.habitFooter}>
                            <Text style={[styles.habitFooterText, { color: Colors.textSecondary }]}>
                                {weeklyConsistency.count} days active this week. {weeklyConsistency.count >= 3 ? 'Great consistency! 🔥' : 'Keep it up!'}
                            </Text>
                        </View>
                    </Card>
                </View>

                {/* Active Goals */}
                {goalProgress.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Active Goals</Text>
                        {goalProgress.map((gp) => (
                            <Card key={gp.goal.id} variant="glass" style={styles.goalCard}>
                                <View style={styles.goalHeader}>
                                    <View style={[styles.goalIconBg, { backgroundColor: Colors.accentGlow }]}>
                                        <Ionicons
                                            name={GOAL_TYPES.find((t) => t.type === gp.goal.type)?.icon || 'flag'}
                                            size={20}
                                            color={Colors.accent}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.goalName, { color: Colors.textPrimary }]}>
                                            {GOAL_TYPES.find((t) => t.type === gp.goal.type)?.label || gp.goal.type}
                                        </Text>
                                        <Text style={[styles.goalTargetText, { color: Colors.textMuted }]}>
                                            Target: {gp.goal.target_value} {GOAL_TYPES.find((t) => t.type === gp.goal.type)?.unit}
                                        </Text>
                                    </View>
                                    {gp.isCompleted && <Ionicons name="checkmark-circle" size={24} color={Colors.success} />}
                                </View>
                                <ProgressBar
                                    progress={gp.percentage}
                                    label={gp.displayLabel}
                                    color={gp.isCompleted ? Colors.success : Colors.accent}
                                />
                            </Card>
                        ))}
                    </View>
                ) : (
                    <EmptyState
                        icon="flag"
                        title="No active goals"
                        message="Set a running goal to stay motivated and track your progress."
                        actionLabel="Set a Goal"
                        onAction={() => setShowAddModal(true)}
                    />
                )}

                {/* Personal Records */}
                {personalRecords && (
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                            <Ionicons name="trophy" size={24} color={Colors.warning} />
                            <Text style={[styles.sectionTitle, { marginBottom: 0, color: Colors.textPrimary }]}>Records</Text>
                        </View>
                        <View style={styles.recordsGrid}>
                            {personalRecords.fastest5k && (
                                <Card variant="glow" glowColor={Colors.accent} style={styles.recordCard}>
                                    <Text style={[styles.recordLabel, { color: Colors.textSecondary }]}>Fastest 5K</Text>
                                    <Text style={[styles.recordValue, { color: Colors.textPrimary }]}>
                                        {formatPace(personalRecords.fastest5k.avg_pace_min_per_km, unit)}
                                    </Text>
                                </Card>
                            )}
                            {personalRecords.longestRun && (
                                <Card variant="glow" glowColor={Colors.warning} style={styles.recordCard}>
                                    <Text style={[styles.recordLabel, { color: Colors.textSecondary }]}>Longest Run</Text>
                                    <Text style={[styles.recordValue, { color: Colors.textPrimary }]}>
                                        {formatDistance(personalRecords.longestRun.distance_km, unit)}
                                    </Text>
                                </Card>
                            )}
                        </View>
                    </View>
                )}

                {/* Calendar Heatmap */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Activity Map</Text>
                    <Card variant="glass" style={{ padding: Spacing.md }}>
                        <CalendarHeatmap runDates={heatmapData} />
                    </Card>
                </View>
            </ScrollView>

            {/* Add Goal Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>New Goal</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalLabel, { color: Colors.textSecondary, marginTop: Spacing.md }]}>Quick Templates</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                            {GOAL_TEMPLATES.map((template, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.templateButton, { backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                                    onPress={() => {
                                        setSelectedType(template.type as GoalType);
                                        setTargetValue(String(template.target));
                                    }}
                                >
                                    <Text style={[styles.templateLabel, { color: Colors.textPrimary }]}>{template.label}</Text>
                                    <Text style={[styles.templateDesc, { color: Colors.textMuted }]}>{template.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.modalLabel, { color: Colors.textSecondary, marginTop: Spacing.lg }]}>Goal Type</Text>
                        <View style={styles.typeButtons}>
                            {GOAL_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.type}
                                    style={[
                                        styles.typeButton,
                                        { borderColor: Colors.border },
                                        selectedType === type.type && { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
                                    ]}
                                    onPress={() => setSelectedType(type.type)}
                                >
                                    <Ionicons
                                        name={type.icon as any}
                                        size={24}
                                        color={selectedType === type.type ? Colors.accent : Colors.textMuted}
                                    />
                                    <Text
                                        style={[
                                            styles.typeLabel,
                                            { color: Colors.textSecondary },
                                            selectedType === type.type && { color: Colors.accent },
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.modalLabel, { color: Colors.textSecondary }]}>
                            Target ({GOAL_TYPES.find((t) => t.type === selectedType)?.unit})
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: Colors.surfaceLight, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={targetValue}
                            onChangeText={setTargetValue}
                            placeholder="Enter target value"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowAddModal(false)}
                                variant="ghost"
                            />
                            <Button
                                title="Add Goal"
                                onPress={handleAddGoal}
                                variant="primary"
                                disabled={!targetValue}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    header: {
        fontSize: FontSize.xxxl,
        fontWeight: '900',
        letterSpacing: -1,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    goalCard: {
        marginBottom: Spacing.sm,
        padding: Spacing.lg,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    goalIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalName: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    goalTargetText: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    recordsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    recordCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.lg,
    },
    recordLabel: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        marginBottom: 4,
    },
    recordValue: {
        fontSize: FontSize.xl,
        fontWeight: '900',
        letterSpacing: -1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl,
    },
    modalTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        marginBottom: Spacing.xl,
    },
    modalLabel: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        marginBottom: Spacing.sm,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    templateScroll: {
        flexGrow: 0,
        marginBottom: Spacing.md,
    },
    templateButton: {
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginRight: Spacing.sm,
        minWidth: 120,
    },
    templateLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    templateDesc: {
        fontSize: 10,
        marginTop: 2,
    },
    typeButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    typeButton: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        gap: Spacing.xs,
    },
    typeLabel: {
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalInput: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        fontSize: FontSize.lg,
        fontWeight: '600',
        borderWidth: 1,
        marginBottom: Spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    habitCard: {
        padding: Spacing.lg,
    },
    habitDays: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    habitDayColumn: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    habitDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    habitDayLabel: {
        fontSize: 10,
        fontWeight: '700',
    },
    habitFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: Spacing.sm,
        marginTop: Spacing.xs,
    },
    habitFooterText: {
        fontSize: FontSize.xs,
        textAlign: 'center',
        fontWeight: '500',
    },
});
