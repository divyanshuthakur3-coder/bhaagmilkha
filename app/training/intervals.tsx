import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePremium } from '@/context/PremiumContext';
import { Ionicons } from '@expo/vector-icons';
import { INTERVAL_WORKOUTS } from '@/constants/trainingData';
import { IntervalWorkout, IntervalStep } from '@/lib/types';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function IntervalsScreen() {
    const { colors: Colors, isDark } = useTheme();
    const router = useRouter();
    const { isPremium, checkPremiumFeature } = usePremium();
    const [selectedWorkout, setSelectedWorkout] = useState<IntervalWorkout | null>(null);
    const [customWorkouts, setCustomWorkouts] = useState<IntervalWorkout[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);

    // Builder State
    const [buildName, setBuildName] = useState('');
    const [buildSteps, setBuildSteps] = useState<IntervalStep[]>([]);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepTimeLeft, setStepTimeLeft] = useState(0);

    const stepColors: Record<string, string> = {
        warmup: Colors.success,
        work: Colors.error,
        rest: Colors.accent,
        cooldown: Colors.success,
    };

    const handleCreateCustom = () => {
        if (checkPremiumFeature('Custom Builder', () => router.push('/premium'))) {
            setBuildName('Custom Speed Session');
            setBuildSteps([
                { type: 'warmup', label: 'Warmup', duration_seconds: 300 },
                { type: 'work', label: 'Fast Interval', duration_seconds: 60 },
                { type: 'rest', label: 'Recovery', duration_seconds: 60 },
                { type: 'cooldown', label: 'Cooldown', duration_seconds: 300 },
            ]);
            setShowBuilder(true);
        }
    };

    const addBuildStep = (type: IntervalStep['type']) => {
        const newStep: IntervalStep = {
            type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            duration_seconds: type === 'work' ? 60 : 120
        };
        setBuildSteps([...buildSteps, newStep]);
    };

    const saveCustomWorkout = () => {
        if (!buildName.trim()) {
            Alert.alert('Error', 'Please name your workout');
            return;
        }
        const total_duration = buildSteps.reduce((sum, s) => sum + s.duration_seconds, 0);
        const newWorkout: IntervalWorkout = {
            id: `custom-${Date.now()}`,
            name: buildName,
            description: 'Custom build workout',
            icon: 'flash',
            steps: buildSteps,
            total_duration_seconds: total_duration
        };
        setCustomWorkouts([newWorkout, ...customWorkouts]);
        setShowBuilder(false);
    };
    const [totalElapsed, setTotalElapsed] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentStep = selectedWorkout?.steps[currentStepIndex];

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startWorkout = (workout: IntervalWorkout) => {
        setSelectedWorkout(workout);
        setCurrentStepIndex(0);
        setStepTimeLeft(workout.steps[0].duration_seconds);
        setTotalElapsed(0);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            setStepTimeLeft((prev) => {
                if (prev <= 1) {
                    // Move to next step
                    setCurrentStepIndex((prevIdx) => {
                        const nextIdx = prevIdx + 1;
                        if (nextIdx >= workout.steps.length) {
                            // Workout complete
                            if (intervalRef.current) clearInterval(intervalRef.current);
                            setIsRunning(false);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            return prevIdx;
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        return nextIdx;
                    });
                    return 0; // Will be set by effect
                }
                return prev - 1;
            });
            setTotalElapsed((prev) => prev + 1);
        }, 1000);
    };

    // Sync step time when step changes
    useEffect(() => {
        if (selectedWorkout && isRunning && currentStepIndex < selectedWorkout.steps.length) {
            const step = selectedWorkout.steps[currentStepIndex];
            setStepTimeLeft(step.duration_seconds);
        }
    }, [currentStepIndex, isRunning]);

    const stopWorkout = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
        setSelectedWorkout(null);
        setCurrentStepIndex(0);
        setStepTimeLeft(0);
        setTotalElapsed(0);
    };

    // Browse workouts view
    if (!selectedWorkout || (!isRunning && totalElapsed === 0)) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={[styles.backText, { color: Colors.accent }]}>← Back</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.xs }}>
                        <Ionicons name="flash" size={32} color={Colors.textPrimary} />
                        <Text style={[styles.header, { color: Colors.textPrimary, marginBottom: 0 }]}>Interval Workouts</Text>
                    </View>
                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Structured speed sessions to boost your fitness</Text>

                    {/* Premium Up-sell */}
                    <TouchableOpacity activeOpacity={0.8} onPress={handleCreateCustom}>
                        <Card variant="glow" glowColor={Colors.premiumGlow} style={styles.workoutCard}>
                            <View style={styles.workoutRow}>
                                <View style={{ width: 40, alignItems: 'center' }}>
                                    {isPremium ? <Ionicons name="sparkles" size={32} color={Colors.premium} /> : <Ionicons name="lock-closed" size={32} color={Colors.textMuted} />}
                                </View>
                                <View style={styles.workoutInfo}>
                                    <Text style={[styles.workoutName, { color: Colors.premium }]}>Custom Builder</Text>
                                    <Text style={[styles.workoutDesc, { color: Colors.textSecondary }]}>Create your own custom interval workouts.</Text>
                                    {!isPremium && <Text style={[styles.proBadge, { backgroundColor: Colors.premium, color: Colors.background }]}>PRO FEATURE</Text>}
                                </View>
                            </View>
                        </Card>
                    </TouchableOpacity>

                    {customWorkouts.map((w) => (
                        <TouchableOpacity key={w.id} activeOpacity={0.7} onPress={() => startWorkout(w)}>
                            <Card variant="glow" glowColor={Colors.accent} style={styles.workoutCard}>
                                <View style={styles.workoutRow}>
                                    <View style={{ width: 40, alignItems: 'center' }}>
                                        <Ionicons name="flash" size={32} color={Colors.accent} />
                                    </View>
                                    <View style={styles.workoutInfo}>
                                        <Text style={[styles.workoutName, { color: Colors.textPrimary }]}>{w.name}</Text>
                                        <Text style={[styles.workoutDesc, { color: Colors.textSecondary }]}>Saved Custom Workout</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="time" size={12} color={Colors.textMuted} />
                                            <Text style={[styles.workoutDuration, { color: Colors.textMuted }]}>
                                                {Math.round(w.total_duration_seconds / 60)} min · {w.steps.length} steps
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}

                    {INTERVAL_WORKOUTS.map((w) => (
                        <TouchableOpacity key={w.id} activeOpacity={0.7} onPress={() => startWorkout(w)}>
                            <Card variant="glass" style={styles.workoutCard}>
                                <View style={styles.workoutRow}>
                                    <View style={{ width: 40, alignItems: 'center' }}>
                                        <Ionicons name={w.icon as any} size={32} color={Colors.textPrimary} />
                                    </View>
                                    <View style={styles.workoutInfo}>
                                        <Text style={[styles.workoutName, { color: Colors.textPrimary }]}>{w.name}</Text>
                                        <Text style={[styles.workoutDesc, { color: Colors.textSecondary }]}>{w.description}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="time" size={12} color={Colors.textMuted} />
                                            <Text style={[styles.workoutDuration, { color: Colors.textMuted }]}>
                                                {Math.round(w.total_duration_seconds / 60)} min · {w.steps.filter(s => s.type === 'work').length} intervals
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                {/* Mini step preview */}
                                <View style={styles.miniSteps}>
                                    {w.steps.map((s, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.miniStep,
                                                {
                                                    backgroundColor: stepColors[s.type],
                                                    flex: s.duration_seconds,
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Active / complete workout view
    const stepColor = currentStep ? stepColors[currentStep.type] : Colors.accent;
    const progress = selectedWorkout ? (totalElapsed / selectedWorkout.total_duration_seconds) * 100 : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <View style={styles.activeContainer}>
                {/* Header */}
                <View style={styles.activeHeader}>
                    <Text style={[styles.activeTitle, { color: Colors.textPrimary }]}>{selectedWorkout.name}</Text>
                    <Text style={[styles.activeTotal, { color: Colors.textSecondary }]}>Total: {formatTime(totalElapsed)}</Text>
                </View>

                {/* Overall progress */}
                <View style={[styles.overallProgress, { backgroundColor: Colors.surfaceLight }]}>
                    <View style={[styles.overallFill, { width: `${Math.min(100, progress)}%`, backgroundColor: Colors.accent }]} />
                </View>

                {/* Current step big display */}
                {isRunning && currentStep ? (
                    <View style={styles.bigDisplay}>
                        <Text style={[styles.bigStepType, { color: stepColor }]}>
                            {currentStep.type.toUpperCase()}
                        </Text>
                        <Text style={[styles.bigLabel, { color: Colors.textPrimary }]}>{currentStep.label}</Text>
                        <Text style={[styles.bigTimer, { color: stepColor }]}>
                            {formatTime(stepTimeLeft)}
                        </Text>
                        <Text style={[styles.stepProgress, { color: Colors.textMuted }]}>
                            Step {currentStepIndex + 1} of {selectedWorkout.steps.length}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.bigDisplay}>
                        <Ionicons name="trophy" size={64} color={Colors.success} style={{ marginBottom: Spacing.md }} />
                        <Text style={[styles.completeTitle, { color: Colors.success }]}>Workout Complete!</Text>
                        <Text style={[styles.completeTime, { color: Colors.textSecondary }]}>Total time: {formatTime(totalElapsed)}</Text>
                    </View>
                )}

                {/* Steps list */}
                <ScrollView style={styles.stepsScroll} showsVerticalScrollIndicator={false}>
                    {selectedWorkout.steps.map((step, i) => (
                        <View
                            key={i}
                            style={[
                                styles.stepRow,
                                i === currentStepIndex && isRunning && [styles.stepRowActive, { backgroundColor: Colors.surfaceGlass }],
                                i < currentStepIndex && styles.stepRowDone,
                            ]}
                        >
                            <View style={[styles.stepDot, { backgroundColor: i <= currentStepIndex ? stepColors[step.type] : Colors.surfaceLight }]} />
                            <Text style={[styles.stepLabel, { color: Colors.textSecondary }, i === currentStepIndex && isRunning && { color: stepColors[step.type] }]}>
                                {step.label}
                            </Text>
                            <Text style={[styles.stepDuration, { color: Colors.textMuted }]}>{formatTime(step.duration_seconds)}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Stop button */}
                <View style={styles.activeActions}>
                    <Button
                        title={isRunning ? 'Stop Workout' : 'Done'}
                        onPress={stopWorkout}
                        variant={isRunning ? 'danger' : 'primary'}
                        size="lg"
                        style={styles.stopBtn}
                    />
                </View>
            </View>
            <Modal visible={showBuilder} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.builderContent, { backgroundColor: Colors.surface }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg }}>
                            <Ionicons name="hammer" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.builderTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Custom Builder</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.builderLabel, { color: Colors.textSecondary }]}>Session Name</Text>
                            <TextInput
                                style={[styles.builderInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                                value={buildName}
                                onChangeText={setBuildName}
                                placeholder="e.g. Morning Sprints"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <Text style={[styles.builderLabel, { color: Colors.textSecondary }]}>Steps ({buildSteps.length})</Text>
                        <ScrollView style={styles.builderList} horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.builderStepsRow}>
                                {buildSteps.map((s, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.builderStep, { backgroundColor: stepColors[s.type] }]}
                                        onPress={() => setBuildSteps(buildSteps.filter((_, idx) => idx !== i))}
                                    >
                                        <Text style={[styles.builderStepText, { color: Colors.textPrimary }]}>{s.type[0].toUpperCase()}</Text>
                                        <Text style={[styles.builderStepTime, { color: Colors.textPrimary }]}>{s.duration_seconds}s</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.addButtons}>
                            {(['work', 'rest', 'warmup', 'cooldown'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.addBtn, { borderColor: stepColors[type] }]}
                                    onPress={() => addBuildStep(type)}
                                >
                                    <Text style={[styles.addBtnText, { color: stepColors[type] }]}>+{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.builderActions}>
                            <Button title="Cancel" variant="outline" onPress={() => setShowBuilder(false)} style={{ flex: 1 }} />
                            <Button title="Save Workout" variant="primary" onPress={saveCustomWorkout} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: Spacing.lg, paddingBottom: 120 },
    backBtn: { marginBottom: Spacing.md },
    backText: { fontSize: FontSize.md, fontWeight: '600' },
    header: { fontSize: FontSize.xxxl, fontWeight: '800', marginBottom: Spacing.xs },
    subtitle: { fontSize: FontSize.md, marginBottom: Spacing.xxl },
    workoutCard: { marginBottom: Spacing.md },
    workoutRow: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
    workoutIcon: { fontSize: 40 },
    workoutInfo: { flex: 1, gap: 2 },
    workoutName: { fontSize: FontSize.lg, fontWeight: '700' },
    workoutDesc: { fontSize: FontSize.sm },
    workoutDuration: { fontSize: FontSize.xs, marginTop: Spacing.xs },
    proBadge: { fontSize: 10, fontWeight: '800', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    miniSteps: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 },
    miniStep: { borderRadius: 3 },
    // Active workout
    activeContainer: { flex: 1, padding: Spacing.lg },
    activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    activeTitle: { fontSize: FontSize.xl, fontWeight: '700' },
    activeTotal: { fontSize: FontSize.md },
    overallProgress: { height: 4, borderRadius: 2, marginBottom: Spacing.xl, overflow: 'hidden' },
    overallFill: { height: 4, borderRadius: 2 },
    bigDisplay: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxxl },
    bigStepType: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 2, marginBottom: Spacing.sm },
    bigLabel: { fontSize: FontSize.xl, fontWeight: '600', marginBottom: Spacing.lg },
    bigTimer: { fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2 },
    stepProgress: { fontSize: FontSize.sm, marginTop: Spacing.md },
    completeEmoji: { fontSize: 60, marginBottom: Spacing.md },
    completeTitle: { fontSize: FontSize.xxxl, fontWeight: '800' },
    completeTime: { fontSize: FontSize.lg, marginTop: Spacing.sm },
    stepsScroll: { flex: 1 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: 2 },
    stepRowActive: {},
    stepRowDone: { opacity: 0.4 },
    stepDot: { width: 10, height: 10, borderRadius: 5 },
    stepLabel: { flex: 1, fontSize: FontSize.md },
    stepDuration: { fontSize: FontSize.sm, fontVariant: ['tabular-nums'] },
    activeActions: { paddingTop: Spacing.lg },
    stopBtn: { width: '100%' },

    // Builder Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    builderContent: { borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xl, maxHeight: '80%' },
    builderTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.lg },
    inputGroup: { marginBottom: Spacing.lg },
    builderLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
    builderInput: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
    builderList: { maxHeight: 100, marginBottom: Spacing.lg },
    builderStepsRow: { flexDirection: 'row', gap: Spacing.sm },
    builderStep: { width: 60, height: 60, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    builderStepText: { fontSize: FontSize.xs, fontWeight: '800' },
    builderStepTime: { fontSize: 10, opacity: 0.8 },
    addButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    addBtn: { flex: 1, minWidth: '45%', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
    addBtnText: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'capitalize' },
    builderActions: { flexDirection: 'row', gap: Spacing.md },
});
