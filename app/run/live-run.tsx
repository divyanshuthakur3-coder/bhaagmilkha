import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Modal,
    TextInput,
    Dimensions,
    Share,
    Platform,
    Animated,
} from 'react-native';
import { useBackHandler } from '@react-native-community/hooks';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useActiveRunStore } from '@/store/useActiveRunStore';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { useLocation } from '@/hooks/useLocation';
import { useRunTimer } from '@/hooks/useRunTimer';
import { useAudioCues } from '@/hooks/useAudioCues';
import { useStepCadence } from '@/hooks/useStepCadence';
import { LiveRunMap } from '@/components/maps/LiveRunMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StatBadge } from '@/components/ui/StatBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { calculatePace, calculateCalories } from '@/lib/paceCalculator';
import { formatDistance, formatPace, formatDuration, formatCalories, calculateRunScore } from '@/lib/formatters';
import { getPointAtDistance, distanceBetween } from '@/lib/haversine';
import { shoesApi } from '@/lib/api';
import { Shoe, Coordinate } from '@/lib/types';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

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
        ghostPace,
        isGhostEnabled,
        setGhostPace,
        toggleGhost,
        reset,
    } = useActiveRunStore();

    const { saveRun } = useRunHistoryStore();
    const location = useLocation();
    const timer = useRunTimer();
    const audioCues = useAudioCues();
    const { cadence, totalSteps } = useStepCadence(isActive, isPaused || isAutoPaused);

    const [showSummary, setShowSummary] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [runName, setRunName] = useState('');
    const [earnedPrs, setEarnedPrs] = useState<string[]>([]);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showWarmupPicker, setShowWarmupPicker] = useState(false);

    // Prevent accidental back button press during active run
    useBackHandler(() => {
        if (isActive && !showSummary) {
            Alert.alert(
                'Stop Run?',
                'Are you sure you want to stop tracking this run?',
                [
                    { text: 'Keep Tracking', style: 'cancel' },
                    { text: 'Stop', style: 'destructive', onPress: handleStop },
                ]
            );
            return true; // Handle it here, don't go back
        }
        return false; // Let it proceed if not active or summary is shown
    });

    const [showSplits, setShowSplits] = useState(false);
    const [shoes, setShoes] = useState<Shoe[]>([]);
    const [selectedShoeId, setSelectedShoeId] = useState<string | null>(null);
    const countdownScale = useRef(new Animated.Value(1)).current;

    // Ghost Logic
    const [ghostLocation, setGhostLocation] = useState<Coordinate | null>(null);
    const [ghostDiff, setGhostDiff] = useState<number>(0); // negative = ghost ahead, positive = user ahead
    const lastGhostDiff = useRef(0);

    useEffect(() => {
        if (!isActive || !isGhostEnabled || isPaused || isAutoPaused) return;

        // ghostPace is min/km. speed is 1/ghostPace km/min
        const ghostDist = (timer.elapsedSeconds / 60) / ghostPace;
        const pt = getPointAtDistance(storeCoords, ghostDist);
        setGhostLocation(pt);
        setGhostDiff(Math.round((distance - ghostDist) * 1000)); // meters
    }, [timer.elapsedSeconds, isGhostEnabled, isActive, isPaused, isAutoPaused, ghostPace, storeCoords, distance]);

    useEffect(() => {
        if (isActive && isGhostEnabled) {
            if (lastGhostDiff.current >= 0 && ghostDiff < 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // Ghost passed you
            } else if (lastGhostDiff.current < 0 && ghostDiff >= 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // You passed Ghost
            }
            lastGhostDiff.current = ghostDiff;
        }
    }, [ghostDiff, isActive, isGhostEnabled]);

    // Load shoes
    useEffect(() => {
        shoesApi.getAll().then((data) => {
            if (data) {
                const active = data.filter((s: Shoe) => s.is_active);
                setShoes(active);
                if (active.length > 0) setSelectedShoeId(active[0].id);
            }
        });
    }, []);

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

    // Sync location auto-pause to store and trigger feedback
    useEffect(() => {
        if (location.isAutoPaused !== isAutoPaused) {
            setAutoPaused(location.isAutoPaused);
            if (isActive) {
                Haptics.notificationAsync(
                    location.isAutoPaused
                        ? Haptics.NotificationFeedbackType.Warning
                        : Haptics.NotificationFeedbackType.Success
                );
            }
        }
    }, [location.isAutoPaused]);

    // Sync location updates to store
    useEffect(() => {
        if (location.currentLocation && isActive && !isPaused && !isAutoPaused) {
            addCoordinate(location.currentLocation, unit);
        }
    }, [location.currentLocation, isActive, isPaused, isAutoPaused, unit]);

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

        const timerId = setInterval(() => {
            setStartCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
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

        return () => clearInterval(timerId);
    }, [startCountdown]);

    const handleShare = async () => {
        const avgPace = distance > 0 ? calculatePace(distance, timer.elapsedSeconds) : 0;
        const calories = calculateCalories(timer.elapsedSeconds, weightKg);
        const statsMsg = `🏃 ${runName || 'Run'} - ${formatDistance(distance, unit)}\n⏱️ ${formatDuration(timer.elapsedSeconds)} | ⚡ ${formatPace(avgPace, unit)}\n🔥 ${calories} kcal | 🏆 ${calculateRunScore(distance, avgPace, splits)} Score\n\nTracked with RunTracker`;
        try {
            await Share.share({ message: statsMsg });
        } catch (error) {
            console.error('Sharing failed:', error);
        }
    };

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStartCountdown(3);
        Animated.sequence([
            Animated.timing(countdownScale, { toValue: 1.5, duration: 100, useNativeDriver: true }),
            Animated.timing(countdownScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const initiateRun = async () => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            startRun();
            timer.start();
            await location.startTracking();
        } catch (err: any) {
            console.error('Failed to initiate run:', err);
            stopRun();
            timer.reset();
            Alert.alert('Initialization Error', 'Could not start your run. Please check your GPS settings.');
        }
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

                        // Set default name based on time
                        const hour = new Date().getHours();
                        let timeLabel = 'Morning';
                        if (hour >= 12 && hour < 17) timeLabel = 'Afternoon';
                        if (hour >= 17 && hour < 21) timeLabel = 'Evening';
                        if (hour >= 21 || hour < 5) timeLabel = 'Night';
                        setRunName(`${timeLabel} Run`);

                        setShowSummary(true);
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);

        const avgPaceValue = calculatePace(distance, timer.elapsedSeconds);
        const caloriesValue = calculateCalories(timer.elapsedSeconds, weightKg);

        const result = await saveRun({
            user_id: profile.id,
            name: runName.trim() || 'My Run',
            started_at: new Date(Date.now() - timer.elapsedSeconds * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            distance_km: distance,
            duration_seconds: timer.elapsedSeconds,
            avg_pace_min_per_km: avgPaceValue,
            calories_burned: caloriesValue,
            steps: totalSteps,
            route_coordinates: storeCoords,
            splits: splits,
            shoe_id: selectedShoeId,
            notes: null,
        });

        setIsSaving(false);

        if (result && result.prs.length > 0) {
            setEarnedPrs(result.prs);
            setShowCelebration(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setShowSummary(false);
        setShowCelebration(false);
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
    const altitude = location.currentLocation?.altitude || 0;

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
            <ErrorBoundary
                title="Map Error"
                message="The live map encountered an error. Your run is still being recorded."
                fallback={<View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="map-outline" size={48} color={Colors.textMuted} /><Text style={{ color: Colors.textMuted, marginTop: 10 }}>Map currently unavailable</Text></View>}
            >
                <LiveRunMap
                    coordinates={storeCoords}
                    currentLocation={location.currentLocation}
                    ghostLocation={ghostLocation}
                    followUser={true}
                    unit={unit}
                />
            </ErrorBoundary>

            <SafeAreaView style={styles.overlay} edges={['top']}>
                <View style={styles.overlayHeader}>
                    {!isActive ? (
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: Colors.overlay }]}
                            onPress={() => router.back()}
                        >
                            <Text style={[styles.backText, { color: Colors.textPrimary }]}>← Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.altitudeBadge, { backgroundColor: Colors.overlay }]}>
                            <Text style={[styles.altitudeText, { color: Colors.textPrimary }]}>🏔 {altitude.toFixed(0)}m</Text>
                        </View>
                    )}

                    {isActive && isGhostEnabled && (
                        <View style={[
                            styles.ghostMeter,
                            {
                                backgroundColor: ghostDiff >= 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(255, 215, 0, 0.9)',
                                borderColor: ghostDiff >= 0 ? Colors.success : Colors.premium,
                                transform: [{ scale: ghostDiff === 0 ? 1 : 1.05 }]
                            }
                        ]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons
                                    name={ghostDiff >= 0 ? "trending-up" : "trending-down"}
                                    size={18}
                                    color={ghostDiff >= 0 ? '#FFFFFF' : '#0F172A'}
                                />
                                <Text style={[styles.ghostMeterValue, { color: ghostDiff >= 0 ? '#FFFFFF' : '#0F172A' }]}>
                                    {ghostDiff >= 0 ? `+${ghostDiff}m Ahead` : `${Math.abs(ghostDiff)}m Behind`}
                                </Text>
                            </View>
                            <Text style={[styles.ghostMeterLabel, { color: ghostDiff >= 0 ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.6)' }]}>
                                PACER PERFORMANCE
                            </Text>
                        </View>
                    )}

                    {isAutoPaused && (
                        <View style={[styles.autoPauseBanner, { backgroundColor: Colors.warning }]}>
                            <Text style={[styles.autoPauseText, { color: Colors.background }]}>停 Auto-paused</Text>
                        </View>
                    )}
                </View>

                {isActive && splits.length > 0 && (
                    <View style={styles.metricsOverlay}>
                        <TouchableOpacity
                            style={[styles.miniMetric, { backgroundColor: 'rgba(21, 21, 31, 0.8)' }]}
                            onPress={() => setShowSplits(true)}
                        >
                            <Ionicons name="stats-chart" size={14} color={Colors.textSecondary} />
                            <Text style={[styles.miniMetricText, { color: Colors.textPrimary }]}>
                                {splits[splits.length - 1].pace_min_per_km.toFixed(1)}/km
                            </Text>
                        </TouchableOpacity>

                        <View style={[styles.miniMetric, { backgroundColor: 'rgba(21, 21, 31, 0.8)' }]}>
                            <Ionicons name="navigate-outline" size={14} color={Colors.accent} />
                            <Text style={[styles.miniMetricText, { color: Colors.textPrimary }]}>
                                {altitude.toFixed(0)}m
                            </Text>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            <View style={[styles.bottomPanel, { backgroundColor: Colors.surface, borderTopColor: Colors.border }]}>
                <View style={[styles.statsGrid, { marginBottom: Spacing.xl }]}>
                    <View style={styles.statRow}>
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
                            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>Pace</Text>
                        </View>
                        <View style={[styles.statItem, { borderLeftWidth: 1, borderColor: Colors.border, paddingLeft: Spacing.md }]}>
                            <Text style={[styles.statValue, { color: (cadence || 0) > 165 ? Colors.success : Colors.textPrimary }]}>
                                {cadence || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>SPM</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.controls}>
                    {!isActive ? (
                        <View style={styles.startControls}>
                            <TouchableOpacity style={[styles.warmupBtn, { backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]} onPress={() => setShowWarmupPicker(true)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: location.currentLocation ? Colors.success : Colors.warning }} />
                                    <Text style={[styles.warmupBtnText, { color: Colors.textSecondary }]}>
                                        {location.currentLocation ? 'GPS Ready' : 'Searching...'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.ghostControlGroup}>
                                <TouchableOpacity
                                    style={[styles.ghostToggle, { backgroundColor: isGhostEnabled ? Colors.premiumGlow : Colors.surfaceLight, borderColor: isGhostEnabled ? Colors.premium : Colors.border }]}
                                    onPress={() => toggleGhost(!isGhostEnabled)}
                                >
                                    <Ionicons name="flash" size={22} color={isGhostEnabled ? Colors.premium : Colors.textMuted} />
                                    <Text style={[styles.ghostToggleText, { color: isGhostEnabled ? Colors.premium : Colors.textMuted }]}>GHOST</Text>
                                </TouchableOpacity>

                                {isGhostEnabled && (
                                    <View style={[styles.ghostPaceAdjuster, { backgroundColor: Colors.surface, borderColor: Colors.premium }]}>
                                        <TouchableOpacity onPress={() => setGhostPace(Math.max(2, ghostPace - 5 / 60))}>
                                            <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                                        </TouchableOpacity>
                                        <Text style={[styles.ghostPaceVal, { color: Colors.textPrimary }]}>
                                            {formatPace(ghostPace, unit).replace(/\/.*/, '')}
                                        </Text>
                                        <TouchableOpacity onPress={() => setGhostPace(ghostPace + 5 / 60)}>
                                            <Ionicons name="chevron-up" size={18} color={Colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.startButton, { opacity: location.currentLocation ? 1 : 0.6 }]}
                                onPress={handleStart}
                                disabled={!location.currentLocation}
                            >
                                <LinearGradient
                                    colors={location.currentLocation ? [Colors.gradientStart, Colors.gradientEnd] : [Colors.surfaceLight, Colors.surface]}
                                    style={styles.startButtonGradient}
                                >
                                    <Text style={[styles.startButtonText, { color: Colors.textPrimary }]}>
                                        {location.currentLocation ? 'GO' : 'WAITING...'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.activeControls}>
                            {isPaused ? (
                                <TouchableOpacity
                                    style={[styles.controlButton, { backgroundColor: Colors.success }]}
                                    onPress={handleResume}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="play" size={20} color={Colors.textPrimary} />
                                        <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>RESUME</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.controlButton, { backgroundColor: Colors.warning }]}
                                    onPress={handlePause}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="pause" size={20} color={Colors.textPrimary} />
                                        <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>PAUSE</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.controlButton, { backgroundColor: Colors.error }]}
                                onPress={handleStop}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="stop" size={20} color={Colors.textPrimary} />
                                    <Text style={[styles.controlButtonText, { color: Colors.textPrimary }]}>STOP</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <Modal visible={showWarmupPicker} transparent animationType="fade">
                <View style={[styles.warmupPickerOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.warmupPickerContent, { backgroundColor: Colors.surface }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                            <Ionicons name="time" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.warmupPickerTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Warmup Countdown</Text>
                        </View>
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

            <Modal visible={showSplits} transparent animationType="slide">
                <View style={[styles.splitsOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.splitsContent, { borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, maxHeight: '60%' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                            <Ionicons name="stats-chart" size={24} color={Colors.textPrimary} />
                            <Text style={[styles.splitsTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>{unit === 'mi' ? 'Mile' : 'Km'} Splits</Text>
                        </View>
                        <ScrollView>
                            {splits.map((split, i) => (
                                <View key={i} style={[styles.splitRow, { borderBottomColor: Colors.border }]}>
                                    <Text style={[styles.splitKm, { color: Colors.textPrimary }]}>{unit === 'mi' ? 'Mi' : 'Km'} {split.km}</Text>
                                    <Text style={[styles.splitTime, { color: Colors.textSecondary }]}>{formatDuration(split.time_seconds)}</Text>
                                    <Text style={[styles.splitPace, split.pace_min_per_km <= avgPace ? { color: Colors.success } : { color: Colors.error }]}>
                                        {formatPace(split.pace_min_per_km, unit)}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                        {splits.length === 0 && (
                            <Text style={[styles.noSplits, { color: Colors.textMuted }]}>Complete 1 {unit === 'mi' ? 'mile' : 'km'} to see your first split</Text>
                        )}
                        <Button title="Close" onPress={() => setShowSplits(false)} variant="ghost" style={{ marginTop: Spacing.md }} />
                    </View>
                </View>
            </Modal>

            <Modal visible={showSummary} transparent animationType="slide">
                <View style={[styles.summaryOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.summaryContent, { backgroundColor: Colors.surface }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm, justifyContent: 'center' }}>
                                <Ionicons name="trophy" size={28} color={Colors.accent} />
                                <Text style={[styles.summaryTitle, { color: Colors.textPrimary, marginBottom: 0, textAlign: 'left' }]}>Run Complete!</Text>
                            </View>
                            <View style={styles.summaryStats}>
                                <StatBadge icon="resize" value={formatDistance(distance, unit).replace(` ${unit}`, '')} label={unit} color={Colors.accent} />
                                <StatBadge icon="time" value={formatDuration(timer.elapsedSeconds)} label="Duration" color={Colors.success} />
                                <StatBadge icon="flash" value={formatPace(avgPace, unit).replace(/\/.*/, '')} label="Avg Pace" color={Colors.warning} />
                            </View>
                            <View style={[styles.summaryStats, { marginTop: Spacing.md }]}>
                                <StatBadge icon="flame" value={`${calories}`} label="kcal" color={Colors.error} />
                                <StatBadge icon="footsteps" value={`${totalSteps}`} label="Steps" color={Colors.accentGlow} />
                                <StatBadge icon="star" value={`${calculateRunScore(distance, avgPace, splits)}`} label="Score" color={Colors.premium} />
                            </View>

                            <View style={{ marginTop: Spacing.xl, backgroundColor: Colors.surfaceLight, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                                    <Ionicons name="map" size={18} color={Colors.accent} />
                                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary }}>
                                        Name your route
                                    </Text>
                                </View>
                                <TextInput
                                    style={{
                                        backgroundColor: Colors.surface,
                                        borderRadius: BorderRadius.lg,
                                        padding: Spacing.md,
                                        color: Colors.textPrimary,
                                        fontSize: FontSize.lg,
                                        borderWidth: 1,
                                        borderColor: Colors.border,
                                        fontWeight: '600',
                                    }}
                                    value={runName}
                                    onChangeText={setRunName}
                                    placeholder="e.g. Morning Lake Loop"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            {shoes.length > 0 && (
                                <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
                                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm }}>
                                        Shoes
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {shoes.map((shoe) => {
                                            const isSelected = selectedShoeId === shoe.id;
                                            return (
                                                <TouchableOpacity
                                                    key={shoe.id}
                                                    style={{
                                                        paddingVertical: Spacing.sm,
                                                        paddingHorizontal: Spacing.md,
                                                        borderRadius: BorderRadius.lg,
                                                        borderWidth: 1,
                                                        borderColor: isSelected ? Colors.accent : Colors.border,
                                                        backgroundColor: isSelected ? Colors.accentGlow : Colors.surfaceLight,
                                                        marginRight: Spacing.sm,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                    onPress={() => setSelectedShoeId(shoe.id)}
                                                >
                                                    <Ionicons name="walk" size={16} color={isSelected ? Colors.accent : Colors.textMuted} />
                                                    <Text style={{ color: isSelected ? Colors.accent : Colors.textPrimary, fontWeight: '600' }}>
                                                        {shoe.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.summaryActionsRow}>
                                <Button
                                    title={isSaving ? "Saving..." : "SAVE RUN"}
                                    onPress={handleSave}
                                    variant="primary"
                                    style={styles.mainSaveButton}
                                    loading={isSaving}
                                    disabled={isSaving}
                                    size="lg"
                                />

                                <View style={styles.secondaryActionsRow}>
                                    <Button
                                        title="Share"
                                        onPress={handleShare}
                                        variant="secondary"
                                        style={{ flex: 1 }}
                                        icon="share-outline"
                                    />
                                    <Button
                                        title="Discard"
                                        onPress={handleDiscard}
                                        variant="ghost"
                                        style={[{ flex: 1 }]}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={showCelebration} transparent animationType="fade">
                <View style={[styles.celebrationOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.95)' }]}>
                    <LinearGradient
                        colors={[Colors.premiumGlow, 'transparent']}
                        style={styles.celebrationGlow}
                    />
                    <View style={styles.celebrationContent}>
                        <Animated.View style={{ transform: [{ scale: countdownScale }] }}>
                            <Ionicons name="trophy" size={120} color={Colors.premium} />
                        </Animated.View>

                        <Text style={[styles.celebrationTitle, { color: '#FFFFFF' }]}>NEW PERSONAL BEST!</Text>
                        <View style={styles.prList}>
                            {earnedPrs.map((pr, idx) => (
                                <View key={idx} style={[styles.prBadge, { backgroundColor: Colors.premium }]}>
                                    <Text style={styles.prBadgeText}>{pr}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={[styles.celebrationSub, { color: 'rgba(255,255,255,0.7)' }]}>
                            {runName || 'Run'} was one for the books!
                        </Text>

                        <Button
                            title="AWESOME!"
                            onPress={handleComplete}
                            variant="premium"
                            size="lg"
                            style={{ width: '80%', marginTop: Spacing.xxl }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    overlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
    backButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full },
    backText: { fontSize: FontSize.md, fontWeight: '600' },
    altitudeBadge: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full },
    altitudeText: { fontSize: FontSize.md, fontWeight: '700' },
    autoPauseBanner: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
    autoPauseText: { fontSize: FontSize.sm, fontWeight: '600' },
    splitBadgeText: { fontSize: FontSize.sm, fontWeight: '600' },
    metricsOverlay: {
        flexDirection: 'row',
        gap: Spacing.sm,
        justifyContent: 'center',
        marginTop: Spacing.md,
    },
    miniMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    miniMetricText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, paddingTop: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl, paddingHorizontal: Spacing.sm, borderTopWidth: 1 },
    statsGrid: { width: '100%', alignItems: 'center' },
    statRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', alignItems: 'baseline' },
    statItem: { alignItems: 'center', justifyContent: 'center' },
    statItemCenter: { alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Spacing.md },
    statValue: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -1 },
    timerValue: { fontSize: FontSize.xxxl, fontWeight: '900', letterSpacing: -1 },
    statLabel: { fontSize: FontSize.xs, marginTop: Spacing.xs, textTransform: 'uppercase', fontWeight: '600' },
    controls: { alignItems: 'center', width: '100%', paddingHorizontal: Spacing.sm },
    startControls: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'center' },
    warmupBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.full, borderWidth: 1 },
    warmupBtnText: { fontSize: FontSize.md, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    startButton: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 6, borderColor: 'rgba(255,255,255,0.05)', ...Shadows.glow(Colors.accent) },
    startButtonGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
    startButtonText: { fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: 2 },
    ghostControlGroup: { alignItems: 'center', gap: Spacing.sm },
    ghostToggle: {
        width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, gap: 2
    },
    ghostToggleText: { fontSize: 8, fontWeight: '800' },
    ghostPaceAdjuster: {
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6,
        paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1
    },
    ghostPaceVal: { fontSize: 10, fontWeight: '700', minWidth: 28, textAlign: 'center' },
    ghostMeter: {
        paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center'
    },
    ghostMeterValue: { fontSize: FontSize.lg, fontWeight: '800' },
    ghostMeterLabel: { fontSize: 8, fontWeight: '700' },
    activeControls: { flexDirection: 'row', gap: Spacing.lg, width: '100%' },
    controlButton: { flex: 1, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
    controlButtonText: { fontSize: FontSize.md, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    warmupContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    warmupNumber: { fontSize: 140, fontWeight: '900' },
    warmupLabel: { fontSize: FontSize.xxl, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: Spacing.lg },
    warmupSkip: { position: 'absolute', bottom: 80, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl },
    warmupSkipText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.lg, fontWeight: '600' },
    warmupPickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    warmupPickerContent: { borderRadius: BorderRadius.xl, padding: Spacing.xxl, width: '80%' },
    warmupPickerTitle: { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.xl },
    warmupOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center', marginBottom: Spacing.lg },
    warmupOption: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    warmupOptionText: { fontSize: FontSize.lg, fontWeight: '700' },
    splitsOverlay: { flex: 1, justifyContent: 'flex-end' },
    splitsContent: { borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, maxHeight: '60%' },
    splitsTitle: { fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.lg },
    splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
    splitKm: { fontSize: FontSize.md, fontWeight: '600', width: 60 },
    splitTime: { fontSize: FontSize.md, fontVariant: ['tabular-nums'] },
    splitPace: { fontSize: FontSize.md, fontWeight: '600', fontVariant: ['tabular-nums'] },
    noSplits: { fontSize: FontSize.md, textAlign: 'center', paddingVertical: Spacing.xl },
    summaryOverlay: { flex: 1, justifyContent: 'flex-end' },
    summaryContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl, paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl, maxHeight: '85%' },
    summaryTitle: { fontSize: FontSize.xxxl, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.xxl },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.xxl, flexWrap: 'wrap', gap: Spacing.lg },
    summaryActions: { gap: Spacing.md },
    summaryActionsRow: {
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    mainSaveButton: {
        width: '100%',
        height: 56,
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    celebrationOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    celebrationGlow: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    celebrationContent: {
        alignItems: 'center',
        width: '100%',
    },
    celebrationTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '900',
        marginTop: Spacing.xl,
        textAlign: 'center',
        letterSpacing: 1,
    },
    prList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    prBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    prBadgeText: {
        color: '#0F172A',
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    celebrationSub: {
        fontSize: FontSize.lg,
        marginTop: Spacing.xl,
        textAlign: 'center',
    },
});
