import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    StyleSheet,
    Alert,
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { usePremium } from '@/context/PremiumContext';
import { RunMap } from '@/components/maps/RunMap';
import { ReplayMap } from '@/components/maps/ReplayMap';
import { StatBadge } from '@/components/ui/StatBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    formatDistance,
    formatPace,
    formatDuration,
    formatCalories,
    formatDateTime,
} from '@/lib/formatters';
import { generateRunInsights } from '@/lib/aiCoach';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function RunDetailScreen() {
    const { colors: Colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getRunById, updateRunNotes, deleteRun } = useRunHistoryStore();
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const { isPremium, checkPremiumFeature } = usePremium();

    const run = getRunById(id || '');
    const insights = run ? generateRunInsights(run) : [];
    const [notes, setNotes] = useState(run?.notes || '');
    const [notesTimeout, setNotesTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [showReplay, setShowReplay] = useState(false);

    if (!run) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
                <View style={styles.notFound}>
                    <Text style={[styles.notFoundText, { color: Colors.textSecondary }]}>Run not found</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="primary" />
                </View>
            </SafeAreaView>
        );
    }

    // Auto-save notes with debounce
    const handleNotesChange = (text: string) => {
        setNotes(text);
        if (notesTimeout) clearTimeout(notesTimeout);
        const timeout = setTimeout(() => {
            updateRunNotes(run.id, text);
        }, 1000);
        setNotesTimeout(timeout);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Run',
            'Are you sure you want to delete this run? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteRun(run.id);
                        router.back();
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Button
                        title="← Back"
                        onPress={() => router.back()}
                        variant="ghost"
                        size="sm"
                    />
                    <Text style={[styles.date, { color: Colors.textPrimary }]}>{formatDateTime(run.started_at)}</Text>
                </View>

                {/* Map */}
                {run.route_coordinates && run.route_coordinates.length >= 2 && (
                    <RunMap
                        coordinates={run.route_coordinates}
                        height={250}
                        interactive={true}
                    />
                )}

                {/* Stats */}
                <Card variant="elevated" style={styles.statsCard}>
                    <View style={styles.statsGrid}>
                        <StatBadge
                            icon="📏"
                            value={formatDistance(run.distance_km, unit).replace(` ${unit}`, '')}
                            label={unit}
                            color={Colors.accent}
                        />
                        <StatBadge
                            icon="⏱️"
                            value={formatDuration(run.duration_seconds)}
                            label="Duration"
                            color={Colors.success}
                        />
                    </View>
                    <View style={[styles.statsGrid, { marginTop: Spacing.xl }]}>
                        <StatBadge
                            icon="⚡"
                            value={formatPace(run.avg_pace_min_per_km, unit).replace(/\/.*/, '')}
                            label={`min/${unit}`}
                            color={Colors.warning}
                        />
                        <StatBadge
                            icon="🔥"
                            value={`${run.calories_burned}`}
                            label="kcal"
                            color={Colors.error}
                        />
                    </View>
                </Card>

                {/* --- PREMIUM FEATURE: AI Coach Insights --- */}
                <Card variant={isPremium ? 'glow' : 'glass'} glowColor={Colors.premiumGlow} style={styles.coachCard}>
                    <Text style={[styles.coachTitle, { color: isPremium ? Colors.premium : Colors.textMuted }]}>🤖 AI Coach Insights</Text>
                    {isPremium ? (
                        <View style={styles.coachActive}>
                            {insights.map((insight, idx) => (
                                <View key={idx} style={styles.insightRow}>
                                    <Text style={[
                                        styles.insightTitle,
                                        insight.type === 'praise' ? { color: Colors.success } :
                                            insight.type === 'correction' ? { color: Colors.warning } :
                                                { color: Colors.accent }
                                    ]}>
                                        {insight.title}
                                    </Text>
                                    <Text style={[styles.coachText, { color: Colors.textPrimary }]}>{insight.message}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.coachLocked}>
                            <Text style={[styles.coachLockedText, { color: Colors.textSecondary }]}>Unlock personalized performance insights based on your pace and splits.</Text>
                            <Button
                                title="Unlock Premium"
                                onPress={() => checkPremiumFeature('AI Coach Insights', () => router.push('/premium'))}
                                variant="outline"
                                size="sm"
                            />
                        </View>
                    )}
                </Card>

                {/* --- PREMIUM FEATURE: Run Replay --- */}
                {run.route_coordinates && run.route_coordinates.length >= 2 && (
                    <Button
                        title="🎬 View Run Replay Animation"
                        variant="secondary"
                        onPress={() => {
                            if (checkPremiumFeature('Run Replay', () => router.push('/premium'))) {
                                setShowReplay(true);
                            }
                        }}
                    />
                )}

                {/* Replay Modal */}
                <Modal visible={showReplay} animationType="slide" transparent>
                    <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
                        <View style={[styles.replayContent, { backgroundColor: Colors.background }]}>
                            <ReplayMap
                                coordinates={run.route_coordinates}
                                onClose={() => setShowReplay(false)}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Notes */}
                <Card style={styles.notesCard}>
                    <Text style={[styles.notesLabel, { color: Colors.textPrimary }]}>Notes</Text>
                    <TextInput
                        style={[styles.notesInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                        value={notes}
                        onChangeText={handleNotesChange}
                        placeholder="Add notes about this run..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </Card>

                {/* Delete */}
                <Button
                    title="Delete Run"
                    onPress={handleDelete}
                    variant="danger"
                    size="lg"
                    style={styles.deleteButton}
                />
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
        gap: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    date: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        flex: 1,
    },
    statsCard: {
        paddingVertical: Spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    notesCard: {
        gap: Spacing.sm,
    },
    notesLabel: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    notesInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        fontSize: FontSize.md,
        minHeight: 100,
    },
    coachCard: { gap: Spacing.sm },
    coachTitle: { fontSize: FontSize.lg, fontWeight: '700' },
    coachActive: { paddingVertical: Spacing.xs, gap: Spacing.md },
    insightRow: { gap: 2 },
    insightTitle: { fontSize: FontSize.md, fontWeight: '700' },
    coachText: { fontSize: FontSize.sm, lineHeight: 20 },
    coachLocked: { gap: Spacing.md, alignItems: 'flex-start', paddingTop: Spacing.sm },
    coachLockedText: { fontSize: FontSize.md, lineHeight: 20 },
    deleteButton: {
        width: '100%',
        marginTop: Spacing.md,
    },
    notFound: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xl,
    },
    notFoundText: {
        fontSize: FontSize.xl,
    },
    // Modal & Replay
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg
    },
    replayContent: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden'
    },
});
