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
import { Ionicons } from '@expo/vector-icons';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { usePremium } from '@/context/PremiumContext';
import { RunMap } from '@/components/maps/RunMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReplayMap } from '@/components/maps/ReplayMap';
import { StatBadge } from '@/components/ui/StatBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PaceSplitsChart } from '@/components/charts/PaceSplitsChart';
import {
    formatDistance,
    formatPace,
    formatDuration,
    formatCalories,
    formatDateTime,
    calculateRunScore,
} from '@/lib/formatters';
import { generateRunInsights } from '@/lib/aiCoach';
import { shoesApi } from '@/lib/api';
import { Shoe } from '@/lib/types';
import { detectPersonalRecords, compareToAverage } from '@/lib/performance';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function RunDetailScreen() {
    const { colors: Colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getRunById, updateRun, deleteRun, runs } = useRunHistoryStore(useShallow(s => ({
        getRunById: s.getRunById,
        updateRun: s.updateRun,
        deleteRun: s.deleteRun,
        runs: s.runs,
    })));
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const { isPremium, checkPremiumFeature } = usePremium();

    const run = getRunById(id || '');
    const insights = run ? generateRunInsights(run, unit) : [];
    const prs = run ? detectPersonalRecords(run, runs) : [];
    const avgComparison = run ? compareToAverage(run, runs) : null;
    const [shoeName, setShoeName] = useState<string | null>(null);
    const [notes, setNotes] = useState(run?.notes || '');
    const [runName, setRunName] = useState(run?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (run?.shoe_id) {
            shoesApi.getAll().then((shoes: Shoe[]) => {
                const shoe = shoes?.find((s: Shoe) => s.id === run.shoe_id);
                if (shoe) setShoeName(`${shoe.brand} ${shoe.name}`);
            });
        }
    }, [run?.shoe_id]);
    const [notesTimeout, setNotesTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [showReplay, setShowReplay] = useState(false);

    const avgSpm = run?.steps ? Math.round((run.steps / run.duration_seconds) * 60) : 0;

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
        setIsSaving(true);
        const timeout = setTimeout(async () => {
            await updateRun(run.id, { notes: text });
            setIsSaving(false);
        }, 1200);
        setNotesTimeout(timeout);
    };

    const [nameTimeout, setNameTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    
    // Auto-save name with debounce
    const handleNameChange = (text: string) => {
        setRunName(text);
        if (nameTimeout) clearTimeout(nameTimeout);
        setIsSaving(true);
        const timeout = setTimeout(async () => {
            await updateRun(run.id, { name: text });
            setIsSaving(false);
        }, 1200);
        setNameTimeout(timeout);
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
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={[styles.nameInput, { color: Colors.textPrimary }]}
                            value={runName}
                            onChangeText={handleNameChange}
                            placeholder={formatDateTime(run.started_at)}
                            placeholderTextColor={Colors.textMuted}
                            maxLength={50}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.dateSub, { color: Colors.textSecondary }]}>
                                {formatDateTime(run.started_at)}
                            </Text>
                            {isSaving && (
                                <Text style={{ fontSize: 10, color: Colors.accent, fontWeight: '600' }}>
                                    • Saving...
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Map */}
                {run.route_coordinates && run.route_coordinates.length >= 2 && (
                    <ErrorBoundary
                        title="Route Preview Error"
                        message="Failed to display the route map."
                        fallback={<View style={{ height: 250, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="map-outline" size={48} color={Colors.textMuted} /><Text style={{ color: Colors.textMuted, marginTop: 10 }}>Map currently unavailable</Text></View>}
                    >
                        <RunMap
                            coordinates={run.route_coordinates}
                            height={250}
                            interactive={true}
                        />
                    </ErrorBoundary>
                )}

                {/* Stats */}
                <Card variant="glass" style={styles.statsCard}>
                    <View style={styles.statsGrid}>
                        <StatBadge
                            icon="resize"
                            value={formatDistance(run.distance_km, unit).replace(` ${unit}`, '')}
                            label={unit}
                            color={Colors.accent}
                        />
                        <StatBadge
                            icon="time"
                            value={formatDuration(run.duration_seconds)}
                            label="Duration"
                            color={Colors.success}
                        />
                        <StatBadge
                            icon="flash"
                            value={formatPace(run.avg_pace_min_per_km, unit).replace(/\/.*/, '')}
                            label={`Pace`}
                            color={Colors.warning}
                        />
                        <StatBadge
                            icon="star"
                            value={`${calculateRunScore(run.distance_km, run.avg_pace_min_per_km, run.splits || [])}`}
                            label="Score"
                            color={Colors.premium}
                            variant="featured"
                        />
                    </View>

                    {/* PR Badges & Performance Comparison */}
                    {(prs.length > 0 || avgComparison) && (
                        <View style={{ marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md, gap: Spacing.md }}>
                            {prs.length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                                    {prs.map(pr => (
                                        <View key={pr} style={{ backgroundColor: Colors.premium, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="trophy" size={12} color="#0F172A" />
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#0F172A' }}>{pr.toUpperCase()}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {avgComparison && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Compared to 30-day avg:</Text>
                                    <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: avgComparison.distanceDiff >= 0 ? Colors.success : Colors.error }}>
                                                {avgComparison.distanceDiff >= 0 ? '+' : ''}{Math.round(avgComparison.distanceDiff)}% dist
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: avgComparison.paceDiff >= 0 ? Colors.success : Colors.error }}>
                                                {avgComparison.paceDiff >= 0 ? '+' : ''}{Math.round(avgComparison.paceDiff)}% pace
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Score Breakdown (New Detailing) */}
                    <View style={{ marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, textAlign: 'center' }}>
                            Score Breakdown
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }}>95%</Text>
                                <Text style={{ fontSize: 8, color: Colors.textSecondary }}>Distance</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }}>88%</Text>
                                <Text style={{ fontSize: 8, color: Colors.textSecondary }}>Pace</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }}>92%</Text>
                                <Text style={{ fontSize: 8, color: Colors.textSecondary }}>Consistency</Text>
                            </View>
                        </View>
                    </View>
                </Card>

                {/* Main Stats Grid */}
                <Card variant="glass" style={[styles.statsCard, { marginTop: Spacing.md }]}>
                    <View style={styles.statsGrid}>
                        <StatBadge
                            icon="flame"
                            value={`${run.calories_burned}`}
                            label="kcal"
                            color={Colors.error}
                        />
                        {run.steps ? (
                            <>
                                <StatBadge
                                    icon="footsteps"
                                    value={`${run.steps}`}
                                    label="Steps"
                                    color={Colors.accentLight}
                                />
                                <StatBadge
                                    icon="walk"
                                    value={`${avgSpm}`}
                                    label="SPM"
                                    color={avgSpm > 165 ? Colors.success : Colors.textPrimary}
                                />
                            </>
                        ) : null}
                    </View>
                </Card>

                {/* Weather & Gear */}
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    {run.weather && (
                        <Card variant="glass" style={[styles.gearCard, { flex: 1, marginTop: 0 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.gearIcon, { backgroundColor: Colors.warningGlow }]}>
                                    <Ionicons name="cloudy" size={24} color={Colors.warning} />
                                </View>
                                <View>
                                    <Text style={[styles.gearLabel, { color: Colors.textSecondary }]}>Weather</Text>
                                    <Text style={[styles.gearValue, { color: Colors.textPrimary }]}>{run.weather}</Text>
                                </View>
                            </View>
                        </Card>
                    )}
                    {shoeName && (
                        <Card variant="glass" style={[styles.gearCard, { flex: 1, marginTop: 0 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.gearIcon, { backgroundColor: Colors.accentGlow }]}>
                                    <Ionicons name="walk" size={24} color={Colors.accent} />
                                </View>
                                <View>
                                    <Text style={[styles.gearLabel, { color: Colors.textSecondary }]}>Gear Used</Text>
                                    <Text style={[styles.gearValue, { color: Colors.textPrimary }]}>{shoeName}</Text>
                                </View>
                            </View>
                        </Card>
                    )}
                </View>

                {/* Splits Analysis (Premium Feature) */}
                <View style={[styles.section, !isPremium && { opacity: 0.6 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="analytics" size={20} color={Colors.textPrimary} />
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Split Analysis</Text>
                        {!isPremium && <Text style={[styles.proLabel, { backgroundColor: Colors.premium, color: '#0F172A' }]}>PRO</Text>}
                    </View>

                    {run.splits && run.splits.length > 0 ? (
                        <View>
                            <Card variant="glass" style={{ paddingVertical: Spacing.md }}>
                                <PaceSplitsChart
                                    data={run.splits.map(s => ({ split: s.km, pace: s.pace_min_per_km }))}
                                    unit={unit}
                                />
                            </Card>
                            {!isPremium && (
                                <View style={styles.premiumOverlay}>
                                    <Ionicons name="lock-closed" size={32} color={Colors.premium} />
                                    <Text style={[styles.premiumOverlayText, { color: Colors.textPrimary }]}>
                                        Unlock Split Analysis in Pro
                                    </Text>
                                    <Button
                                        title="Explore Pro"
                                        variant="premium"
                                        size="sm"
                                        onPress={() => router.push('/premium')}
                                        style={{ marginTop: Spacing.md }}
                                    />
                                </View>
                            )}
                        </View>
                    ) : (
                        <Card variant="glass" style={{ padding: Spacing.xl, alignItems: 'center' }}>
                            <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>
                                Not enough data for graphical split analysis.
                            </Text>
                        </Card>
                    )}
                </View>

                {/* --- PREMIUM FEATURE: AI Coach Insights --- */}
                <Card variant={isPremium ? 'glow' : 'glass'} glowColor={Colors.premiumGlow} style={styles.coachCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md }}>
                        <Ionicons name="hardware-chip" size={20} color={isPremium ? Colors.premium : Colors.textMuted} />
                        <Text style={[styles.coachTitle, { color: isPremium ? Colors.premium : Colors.textMuted, marginBottom: 0 }]}>AI Coach Insights</Text>
                    </View>
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
                <Card variant="glass" style={styles.notesCard}>
                    <Text style={[styles.notesLabel, { color: Colors.textPrimary }]}>Notes</Text>
                    <TextInput
                        style={[styles.notesInput, { backgroundColor: 'transparent', borderColor: Colors.borderLight, color: Colors.textPrimary }]}
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
    dateSub: {
        fontSize: 12,
        fontWeight: '500',
    },
    nameInput: {
        fontSize: FontSize.lg,
        fontWeight: '800',
        letterSpacing: -0.5,
        padding: 0,
        margin: 0,
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
    section: {
        gap: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    proLabel: {
        fontSize: 10,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 'auto',
    },
    premiumOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: BorderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    premiumOverlayText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: Spacing.sm,
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
    gearCard: {
        padding: Spacing.md,
        marginTop: Spacing.sm,
    },
    gearIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gearLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    gearValue: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
});
