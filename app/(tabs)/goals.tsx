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
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap';
import { GOAL_TYPES, GoalType } from '@/constants/goalTypes';
import { formatDistance, formatPace, formatDuration } from '@/lib/formatters';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function GoalsScreen() {
    const { goals, isLoading, fetchGoals, addGoal } = useGoalStore();
    const { runs, fetchRuns } = useRunHistoryStore();
    const profile = useUserStore((s) => s.profile);
    const unit = profile?.preferred_unit || 'km';
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedType, setSelectedType] = useState<GoalType>('weekly_distance');
    const [targetValue, setTargetValue] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const goalProgress = useGoalProgress(goals, runs);

    useEffect(() => {
        fetchGoals();
        fetchRuns();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchGoals(), fetchRuns()]);
        setRefreshing(false);
    };

    // Personal records
    const personalRecords = React.useMemo(() => {
        if (runs.length === 0) return null;

        const fastest5k = runs
            .filter((r) => r.distance_km >= 5)
            .sort((a, b) => a.avg_pace_min_per_km - b.avg_pace_min_per_km)[0];

        const longestRun = runs.sort((a, b) => b.distance_km - a.distance_km)[0];

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
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                }
            >
                <View style={styles.headerRow}>
                    <Text style={styles.header}>Goals & Progress</Text>
                    <Button
                        title="+ Add Goal"
                        onPress={() => setShowAddModal(true)}
                        variant="primary"
                        size="sm"
                    />
                </View>

                {/* Active Goals */}
                {goalProgress.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Active Goals</Text>
                        {goalProgress.map((gp) => (
                            <Card key={gp.goal.id} style={styles.goalCard}>
                                <View style={styles.goalHeader}>
                                    <Text style={styles.goalIcon}>
                                        {GOAL_TYPES.find((t) => t.type === gp.goal.type)?.icon || '🎯'}
                                    </Text>
                                    <Text style={styles.goalName}>
                                        {GOAL_TYPES.find((t) => t.type === gp.goal.type)?.label || gp.goal.type}
                                    </Text>
                                    {gp.isCompleted && <Text style={styles.completedBadge}>✅</Text>}
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
                        icon="🎯"
                        title="No active goals"
                        message="Set a running goal to stay motivated and track your progress."
                        actionLabel="Set a Goal"
                        onAction={() => setShowAddModal(true)}
                    />
                )}

                {/* Personal Records */}
                {personalRecords && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
                        <View style={styles.recordsGrid}>
                            {personalRecords.fastest5k && (
                                <Card style={styles.recordCard}>
                                    <Text style={styles.recordLabel}>Fastest 5K</Text>
                                    <Text style={styles.recordValue}>
                                        {formatPace(personalRecords.fastest5k.avg_pace_min_per_km, unit)}
                                    </Text>
                                </Card>
                            )}
                            {personalRecords.longestRun && (
                                <Card style={styles.recordCard}>
                                    <Text style={styles.recordLabel}>Longest Run</Text>
                                    <Text style={styles.recordValue}>
                                        {formatDistance(personalRecords.longestRun.distance_km, unit)}
                                    </Text>
                                </Card>
                            )}
                            {personalRecords.bestPace && (
                                <Card style={styles.recordCard}>
                                    <Text style={styles.recordLabel}>Best Pace</Text>
                                    <Text style={styles.recordValue}>
                                        {formatPace(personalRecords.bestPace.avg_pace_min_per_km, unit)}
                                    </Text>
                                </Card>
                            )}
                        </View>
                    </View>
                )}

                {/* Calendar Heatmap */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity Calendar</Text>
                    <Card>
                        <CalendarHeatmap runDates={heatmapData} />
                    </Card>
                </View>
            </ScrollView>

            {/* Add Goal Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Goal</Text>

                        <Text style={styles.modalLabel}>Goal Type</Text>
                        <View style={styles.typeButtons}>
                            {GOAL_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.type}
                                    style={[
                                        styles.typeButton,
                                        selectedType === type.type && styles.typeButtonActive,
                                    ]}
                                    onPress={() => setSelectedType(type.type)}
                                >
                                    <Text style={styles.typeIcon}>{type.icon}</Text>
                                    <Text
                                        style={[
                                            styles.typeLabel,
                                            selectedType === type.type && styles.typeLabelActive,
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalLabel}>
                            Target ({GOAL_TYPES.find((t) => t.type === selectedType)?.unit})
                        </Text>
                        <TextInput
                            style={styles.modalInput}
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
        backgroundColor: Colors.background,
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
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    goalCard: {
        marginBottom: Spacing.sm,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    goalIcon: {
        fontSize: 20,
    },
    goalName: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        flex: 1,
    },
    completedBadge: {
        fontSize: 16,
    },
    recordsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    recordCard: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    recordLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    recordValue: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.accent,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl,
    },
    modalTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xl,
    },
    modalLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '500',
        marginBottom: Spacing.sm,
    },
    typeButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    typeButton: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    typeButtonActive: {
        borderColor: Colors.accent,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    typeIcon: {
        fontSize: 24,
    },
    typeLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    typeLabelActive: {
        color: Colors.accent,
    },
    modalInput: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        marginBottom: Spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
});
