import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    ScrollView,
    Platform,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useActiveRunStore } from '@/store/useActiveRunStore';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { useLocation } from '@/hooks/useLocation';
import { useRunTimer } from '@/hooks/useRunTimer';
import { useAudioCues } from '@/hooks/useAudioCues';
import { LiveRunMap } from '@/components/maps/LiveRunMap';
import { StatBadge } from '@/components/ui/StatBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { calculatePace, calculateCalories } from '@/lib/paceCalculator';
import { formatDistance, formatPace, formatDuration, formatCalories } from '@/lib/formatters';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function LiveRunScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const profile = useUserStore((s) => s.profile);
    const unit = profile?.preferred_unit || 'km';
    const weightKg = profile?.weight_kg || 70;

    const {
        isActive,
        isPaused,
        isAutoPaused,
        distance,
        coordinates: storeCoords,
        splits,
        warmupCountdown,
        warmupActive,
        startRun,
        pauseRun,
        resumeRun,
        stopRun,
        addCoordinate,
        updateDuration,
        setAutoPaused,
        setWarmup,
        tickWarmup,
        reset,
    } = useActiveRunStore();

    const { saveRun } = useRunHistoryStore();
    const location = useLocation();
    const timer = useRunTimer();
    const audioCues = useAudioCues();

    const [showSummary, setShowSummary] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showWarmupPicker, setShowWarmupPicker] = useState(false);
    const [showSplits, setShowSplits] = useState(false);
    const countdownScale = useRef(new Animated.Value(1)).current;

    // Warmup countdown timer
    useEffect(() => {
        if (!warmupActive) return;
        const interval = setInterval(() => {
            const finished = tickWarmup();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Pulse animation
            Animated.sequence([
                Animated.timing(countdownScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
                Animated.timing(countdownScale, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
            if (finished) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                handleStart();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [warmupActive]);

    // Sync location updates to store
    useEffect(() => {
        if (location.currentLocation && isActive && !isPaused) {
            addCoordinate(location.currentLocation);
        }
    }, [location.currentLocation, isActive, isPaused]);

    // Sync timer to store
    useEffect(() => {
        if (isActive) {
            updateDuration(timer.elapsedSeconds);
        }
    }, [timer.elapsedSeconds, isActive]);

    // Sync auto-pause
    useEffect(() => {
        if (location.isAutoPaused && isActive && !isPaused) {
            setAutoPaused(true);
        } else if (!location.isAutoPaused && isAutoPaused) {
            setAutoPaused(false);
        }
    }, [location.isAutoPaused]);

    // Audio cues for km splits
    useEffect(() => {
        if (isActive && !isPaused) {
            const currentPace = calculatePace(distance, timer.elapsedSeconds);
            audioCues.checkMilestone(distance, currentPace);
        }
    }, [distance, isActive, isPaused, timer.elapsedSeconds]);

    const [startCountdown, setStartCountdown] = useState(0);

    // Run start countdown logic
    useEffect(() => {
        if (startCountdown === 0) return;

        const timer = setInterval(() => {
            setStartCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    initiateRun();
                    return 0;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Pulse animation
                Animated.sequence([
                    Animated.timing(countdownScale, { toValue: 1.5, duration: 100, useNativeDriver: true }),
                    Animated.timing(countdownScale, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]).start();
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [startCountdown]);

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStartCountdown(3);
        // Initial pulse
        Animated.sequence([
            Animated.timing(countdownScale, { toValue: 1.5, duration: 100, useNativeDriver: true }),
            Animated.timing(countdownScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const initiateRun = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startRun();
        timer.start();
        await location.startTracking();
    };

    const handleStartWithWarmup = (seconds: number) => {
        setShowWarmupPicker(false);
        setWarmup(seconds);
    };

    const handlePause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        pauseRun();
        timer.pause();
    };

    const handleResume = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resumeRun();
        timer.resume();
    };

    const handleStop = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            'Stop Run',
            'Are you sure you want to stop this run?',
            [
                { text: 'Continue Running', style: 'cancel' },
                {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: () => {
                        stopRun();
                        timer.pause();
                        location.stopTracking();
                        setShowSummary(true);
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);

        const avgPace = calculatePace(distance, timer.elapsedSeconds);
        const calories = calculateCalories(timer.elapsedSeconds, weightKg);

        await saveRun({
            user_id: profile.id,
            started_at: new Date(Date.now() - timer.elapsedSeconds * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            distance_km: distance,
            duration_seconds: timer.elapsedSeconds,
            avg_pace_min_per_km: avgPace,
            calories_burned: calories,
            route_coordinates: storeCoords,
            splits: splits,
            notes: null,
        });

        setSaving(false);
        setShowSummary(false);
        reset();
        timer.reset();
        audioCues.reset();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
    };

    const handleDiscard = () => {
        Alert.alert(
            'Discard Run',
            'Are you sure you want to discard this run?',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                        setShowSummary(false);
                        reset();
                        timer.reset();
                        audioCues.reset();
                        router.back();
                    },
                },
            ]
        );
    };

    const avgPace = distance > 0 ? calculatePace(distance, timer.elapsedSeconds) : 0;
    const calories = calculateCalories(timer.elapsedSeconds, weightKg);

    // Warmup or start countdown overlay
    if (warmupActive || startCountdown > 0) {
        return (
            <View style={styles.warmupContainer}>
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    style={StyleSheet.absoluteFillObject}
                />
                <Animated.Text style={[styles.warmupNumber, { transform: [{ scale: countdownScale }], color: '#FFFFFF' }]}>
                    {warmupActive ? warmupCountdown : startCountdown}
                </Animated.Text>
                <Text style={styles.warmupLabel}>{warmupActive ? 'Warmup' : 'Get Ready!'}</Text>
                {warmupActive && (
                    <TouchableOpacity onPress={() => { setWarmup(0); initiateRun(); }} style={styles.warmupSkip}>
                        <Text style={styles.warmupSkipText}>Skip →</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Full screen map */}
            <LiveRunMap
                coordinates={storeCoords}
                currentLocation={location.currentLocation}
                followUser={true}
            />

            {/* Stats Overlay */}
            <SafeAreaView style={styles.overlay} edges={['top']}>
                {/* Back button */}
                {!isActive && (
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: Colors.overlay }]}
                        onPress={() => router.back()}
                    >
                        <Text style={[styles.backText, { color: Colors.textPrimary }]}>← Back</Text>
                    </TouchableOpacity>
                )}

                {/* Auto-pause indicator */}
                {isAutoPaused && (
                    <View style={[styles.autoPauseBanner, { backgroundColor: Colors.warning }]}>
                        <Text style={[styles.autoPauseText, { color: Colors.background }]}>停 Auto-paused (not moving)</Text>
                    </View>
                )}

                {/* Live splits badge */}
                {isActive && splits.length > 0 && (
                    <TouchableOpacity style={[styles.splitBadge, { backgroundColor: Colors.overlay }]} onPress={() => setShowSplits(true)}>
                        <Text style={[styles.splitBadgeText, { color: Colors.textPrimary }]}>
                            📊 Last: {splits[splits.length - 1].pace_min_per_km.toFixed(1)} min/km
                        </Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>

            {/* Bottom Stats Panel */}
            <View style={[styles.bottomPanel, { backgroundColor: Colors.surface, borderTopColor: Colors.border }]}>
                <View style={[styles.statsGrid, { marginBottom: Spacing.xl }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Colors.textPrimary }]}>
                            {formatDistance(distance, unit).replace(` ${unit}`, '')}
                        </Text>
                        <Text style={[styles.statLabel, { color: Colors.textMuted }]}>{unit}</Text>
                    </View>
                    <View style={[styles.statItemCenter, { borderColor: Colors.border }]}>
                        <Text style={[styles.timerValue, { color: Colors.accent }]}>
                            {formatDuration(timer.elapsedSeconds)}
                        </Text>
                        <Text style={[styles.statLabel, { color: Colors.textMuted }]}>Duration</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Colors.textPrimary }]}>
                            {formatPace(avgPace, unit).replace(/\/.*/, '')}
                        </Text>
                        <Text style={[styles.statLabel, { color: Colors.textMuted }]}>Avg Pace</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    {!isActive ? (
                        <View style={styles.startControls}>
                            <TouchableOpacity style={[styles.warmupBtn, { backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]} onPress={() => setShowWarmupPicker(true)}>
                                <Text style={[styles.warmupBtnText, { color: Colors.textSecondary }]}>⏱ Warmup</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                                <LinearGradient
                                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                                    style={styles.startButtonGradient}
                                >
                                    <Text style={[styles.startButtonText, { color: Colors.textPrimary }]}>START</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.activeControls}>
                            {isPaused ? (
                                <TouchableOpacity
                                    style={[styles.controlButton, styles.resumeButton, { backgroundColor: Colors.success }]}
                                    onPress={handleResume}
                                >
                                    <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>▶ RESUME</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.controlButton, styles.pauseButton, { backgroundColor: Colors.warning }]}
                                    onPress={handlePause}
                                >
                                    <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>⏸ PAUSE</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.controlButton, styles.stopButton, { backgroundColor: Colors.error }]}
                                onPress={handleStop}
                            >
                                <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>⏹ STOP</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Warmup Picker Modal */}
            <Modal visible={showWarmupPicker} transparent animationType="fade">
                <View style={[styles.warmupPickerOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.warmupPickerContent, { backgroundColor: Colors.surface }]}>
                        <Text style={[styles.warmupPickerTitle, { color: Colors.textPrimary }]}>⏱ Warmup Countdown</Text>
                        <View style={styles.warmupOptions}>
                            {[5, 10, 15, 30, 60].map((sec) => (
                                <TouchableOpacity key={sec} style={[styles.warmupOption, { backgroundColor: Colors.accentGlow, borderColor: Colors.accentGlow }]} onPress={() => handleStartWithWarmup(sec)}>
                                    <Text style={[styles.warmupOptionText, { color: Colors.accent }]}>{sec}s</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Button title="Cancel" onPress={() => setShowWarmupPicker(false)} variant="ghost" />
                    </View>
                </View>
            </Modal>

            {/* Live Splits Modal */}
            <Modal visible={showSplits} transparent animationType="slide">
                <View style={[styles.splitsOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.splitsContent, { backgroundColor: Colors.surface }]}>
                        <Text style={[styles.splitsTitle, { color: Colors.textPrimary }]}>📊 Km Splits</Text>
                        {splits.map((split, i) => (
                            <View key={i} style={[styles.splitRow, { borderBottomColor: Colors.border }]}>
                                <Text style={[styles.splitKm, { color: Colors.textPrimary }]}>Km {split.km}</Text>
                                <Text style={[styles.splitTime, { color: Colors.textSecondary }]}>{formatDuration(split.time_seconds)}</Text>
                                <Text style={[styles.splitPace, split.pace_min_per_km <= avgPace ? { color: Colors.success } : { color: Colors.error }]}>
                                    {split.pace_min_per_km.toFixed(1)} min/km
                                </Text>
                            </View>
                        ))}
                        {splits.length === 0 && (
                            <Text style={[styles.noSplits, { color: Colors.textMuted }]}>Complete 1 km to see your first split</Text>
                        )}
                        <Button title="Close" onPress={() => setShowSplits(false)} variant="ghost" style={{ marginTop: Spacing.md }} />
                    </View>
                </View>
            </Modal>

            {/* Run Summary Modal */}
            <Modal visible={showSummary} transparent animationType="slide">
                <View style={[styles.summaryOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.summaryContent, { backgroundColor: Colors.surface }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.summaryTitle, { color: Colors.textPrimary }]}>🎉 Run Complete!</Text>

                            <View style={styles.summaryStats}>
                                <StatBadge icon="📏" value={formatDistance(distance, unit).replace(` ${unit}`, '')} label={unit} color={Colors.accent} />
                                <StatBadge icon="⏱️" value={formatDuration(timer.elapsedSeconds)} label="Duration" color={Colors.success} />
                                <StatBadge icon="⚡" value={formatPace(avgPace, unit).replace(/\/.*/, '')} label="Avg Pace" color={Colors.warning} />
                                <StatBadge icon="🔥" value={`${calories}`} label="kcal" color={Colors.error} />
                            </View>

                            {/* Splits in summary */}
                            {splits.length > 0 && (
                                <View style={styles.summarySplits}>
                                    <Text style={[styles.summarySplitsTitle, { color: Colors.textPrimary }]}>📊 Splits</Text>
                                    {splits.map((split, i) => (
                                        <View key={i} style={[styles.splitRow, { borderBottomColor: Colors.border }]}>
                                            <Text style={[styles.splitKm, { color: Colors.textPrimary }]}>Km {split.km}</Text>
                                            <Text style={[styles.splitTime, { color: Colors.textSecondary }]}>{formatDuration(split.time_seconds)}</Text>
                                            <Text style={[styles.splitPace, { color: Colors.accent }]}>{split.pace_min_per_km.toFixed(1)} min/km</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View style={styles.summaryActions}>
                                <Button
                                    title="Save Run"
                                    onPress={handleSave}
                                    loading={saving}
                                    variant="primary"
                                    size="lg"
                                    style={styles.summaryButton}
                                />
                                <Button
                                    title="Discard"
                                    onPress={handleDiscard}
                                    variant="ghost"
                                    size="lg"
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        marginLeft: Spacing.lg,
        marginTop: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    backText: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    autoPauseBanner: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.sm,
        alignSelf: 'center',
    },
    autoPauseText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    splitBadge: {
        alignSelf: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        marginTop: Spacing.sm,
    },
    splitBadgeText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
        paddingHorizontal: Spacing.xl,
        borderTopWidth: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: { alignItems: 'center', flex: 1 },
    statItemCenter: {
        alignItems: 'center',
        flex: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
    },
    statValue: { fontSize: FontSize.xxl, fontWeight: '700' },
    timerValue: { fontSize: FontSize.xxxl, fontWeight: '700' },
    statLabel: { fontSize: FontSize.xs, marginTop: Spacing.xs },
    controls: { alignItems: 'center' },
    startControls: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
    warmupBtn: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    warmupBtnText: { fontSize: FontSize.md, fontWeight: '600' },
    startButton: {
        width: 140,
        height: 140,
        borderRadius: 70,
        overflow: 'hidden',
    },
    startButtonGradient: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        letterSpacing: 2,
    },
    activeControls: { flexDirection: 'row', gap: Spacing.lg, width: '100%' },
    controlButton: {
        flex: 1,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    pauseButton: {},
    resumeButton: {},
    stopButton: {},
    controlButtonText: { fontSize: FontSize.lg, fontWeight: '700' },
    // Warmup
    warmupContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warmupNumber: {
        fontSize: 120,
        fontWeight: '800',
    },
    warmupLabel: {
        fontSize: FontSize.xxl,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: Spacing.lg,
    },
    warmupSkip: {
        position: 'absolute',
        bottom: 80,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
    },
    warmupSkipText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: FontSize.lg,
        fontWeight: '600',
    },
    // Warmup picker
    warmupPickerOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warmupPickerContent: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        width: '80%',
    },
    warmupPickerTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    warmupOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    warmupOption: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    warmupOptionText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    // Splits
    splitsOverlay: { flex: 1, justifyContent: 'flex-end' },
    splitsContent: {
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.xxl,
        maxHeight: '60%',
    },
    splitsTitle: { fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.lg },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    splitKm: { fontSize: FontSize.md, fontWeight: '600', width: 60 },
    splitTime: { fontSize: FontSize.md, fontVariant: ['tabular-nums'] },
    splitPace: { fontSize: FontSize.md, fontWeight: '600', fontVariant: ['tabular-nums'] },
    noSplits: { fontSize: FontSize.md, textAlign: 'center', paddingVertical: Spacing.xl },
    // Summary
    summaryOverlay: { flex: 1, justifyContent: 'flex-end' },
    summaryContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
        maxHeight: '85%',
    },
    summaryTitle: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.xxl,
        flexWrap: 'wrap',
        gap: Spacing.lg,
    },
    summarySplits: {
        marginBottom: Spacing.xl,
    },
    summarySplitsTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        marginBottom: Spacing.md,
    },
    summaryActions: { gap: Spacing.md },
    summaryButton: { width: '100%', height: 56, borderRadius: BorderRadius.lg },
});
