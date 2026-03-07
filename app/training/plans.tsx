import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Platform, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePremium } from '@/context/PremiumContext';
import { useUserStore } from '@/store/useUserStore';
import { TRAINING_PLANS } from '@/constants/trainingData';
import { TrainingPlan, TrainingWeek, TrainingDay } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

const dayIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    easy: 'leaf',
    tempo: 'pulse',
    interval: 'flash',
    long: 'footsteps',
    rest: 'bed',
    cross: 'bicycle',
};

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrainingPlansScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const { isPremium, checkPremiumFeature } = usePremium();
    const profile = useUserStore((s) => s.profile);
    const unit = profile?.preferred_unit || 'km';
    const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [showWizard, setShowWizard] = useState(false);
    const [targetDistance, setTargetDistance] = useState('5');
    const [targetWeeks, setTargetWeeks] = useState('8');
    const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

    const dayColors: Record<string, string> = {
        easy: Colors.success,
        tempo: Colors.warning,
        interval: Colors.error,
        long: Colors.accent,
        rest: Colors.textMuted,
        cross: Colors.secondary,
    };

    const handleCreateCustom = () => {
        if (checkPremiumFeature('Custom Plans', () => router.push('/premium'))) {
            setShowWizard(true);
        }
    };

    const generatePlan = () => {
        const dist = parseFloat(targetDistance);
        const weeks = parseInt(targetWeeks);

        if (isNaN(dist) || isNaN(weeks) || weeks < 1) {
            Alert.alert('Error', 'Please enter valid numbers');
            return;
        }

        const newPlan: TrainingPlan = {
            id: `custom-${Date.now()}`,
            name: `My ${dist}${unit.toUpperCase()} Plan`,
            description: `A custom ${weeks}-week schedule for a ${dist}${unit} goal.`,
            icon: 'star',
            difficulty: fitnessLevel,
            duration_weeks: weeks,
            weeks: Array.from({ length: weeks }, (_, i) => ({
                week: i + 1,
                label: i === weeks - 1 ? 'Race Week' : `Build Phase ${i + 1}`,
                days: [
                    { day: 0, type: 'easy', description: `Easy Run (${Math.round(dist * 0.5 * (1 + i / weeks))}${unit})` },
                    { day: 1, type: 'rest', description: 'Rest or cross-train' },
                    { day: 2, type: 'tempo', description: `Tempo Run (${Math.round(dist * 0.7 * (1 + i / weeks))}${unit} at goal pace)` },
                    { day: 3, type: 'rest', description: 'Rest day' },
                    { day: 4, type: 'easy', description: `Recovery Jog (${Math.round(dist * 0.4)}${unit})` },
                    { day: 5, type: 'long', description: `Long Run (${Math.round(dist * (0.8 + (i / weeks) * 0.4))}${unit})` },
                    { day: 6, type: 'rest', description: 'Complete rest' },
                ] as TrainingDay[]
            }))
        };

        setSelectedPlan(newPlan);
        setShowWizard(false);
        Alert.alert('Success', 'Your custom plan has been generated!');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            {!selectedPlan ? (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={[styles.backText, { color: Colors.accent }]}>← Back</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.xs }}>
                        <Ionicons name="barbell" size={32} color={Colors.textPrimary} />
                        <Text style={[styles.header, { color: Colors.textPrimary, marginBottom: 0 }]}>Training Plans</Text>
                    </View>
                    <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Pick a plan and start training with purpose</Text>

                    {/* Premium Up-sell */}
                    <TouchableOpacity activeOpacity={0.8} onPress={handleCreateCustom}>
                        <Card variant="glow" glowColor={Colors.premiumGlow} style={styles.planCard}>
                            <View style={styles.planRow}>
                                <Ionicons name={isPremium ? 'sparkles' : 'lock-closed'} size={32} color={isPremium ? Colors.premium : Colors.textMuted} />
                                <View style={styles.planInfo}>
                                    <Text style={[styles.planName, { color: Colors.premium }]}>Create Custom Plan</Text>
                                    <Text style={[styles.planDesc, { color: Colors.textSecondary }]}>Build your own schedule and target paces.</Text>
                                    {!isPremium && <Text style={[styles.proBadge, { backgroundColor: Colors.premium, color: Colors.backgroundAlt }]}>PRO FEATURE</Text>}
                                </View>
                            </View>
                        </Card>
                    </TouchableOpacity>

                    {TRAINING_PLANS.map((plan) => (
                        <TouchableOpacity key={plan.id} activeOpacity={0.8} onPress={() => { setSelectedPlan(plan); setSelectedWeek(0); }}>
                            <Card variant="glass" style={styles.planCard}>
                                <View style={styles.planRow}>
                                    <Ionicons name={plan.icon as any} size={32} color={Colors.accent} />
                                    <View style={styles.planInfo}>
                                        <Text style={[styles.planName, { color: Colors.textPrimary }]}>{plan.name}</Text>
                                        <Text style={[styles.planDesc, { color: Colors.textSecondary }]}>{plan.description}</Text>
                                        <View style={styles.planMeta}>
                                            <View style={[styles.diffBadge, { backgroundColor: plan.difficulty === 'beginner' ? Colors.successGlow : plan.difficulty === 'intermediate' ? Colors.warningGlow : Colors.errorGlow }]}>
                                                <Text style={[styles.diffText, { color: plan.difficulty === 'beginner' ? Colors.success : plan.difficulty === 'intermediate' ? Colors.warning : Colors.error }]}>
                                                    {plan.difficulty}
                                                </Text>
                                            </View>
                                            <Text style={[styles.planWeeks, { color: Colors.textMuted }]}>{plan.duration_weeks} weeks</Text>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity onPress={() => setSelectedPlan(null)} style={styles.backBtn}>
                        <Text style={[styles.backText, { color: Colors.accent }]}>← Back to Plans</Text>
                    </TouchableOpacity>

                    <View style={styles.planHeaderSection}>
                        <Ionicons name={selectedPlan.icon as any} size={60} color={Colors.accent} style={{ marginBottom: Spacing.sm }} />
                        <Text style={[styles.planHeaderName, { color: Colors.textPrimary }]}>{selectedPlan.name}</Text>
                        <Text style={[styles.planHeaderDesc, { color: Colors.textSecondary }]}>{selectedPlan.description}</Text>
                    </View>

                    {/* Week selector */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
                        {selectedPlan.weeks.map((w, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.weekTab, { backgroundColor: Colors.surface, borderColor: Colors.border }, selectedWeek === i && { borderColor: Colors.accent, backgroundColor: Colors.accentGlow }]}
                                onPress={() => setSelectedWeek(i)}
                            >
                                <Text style={[styles.weekTabNum, { color: Colors.textMuted }, selectedWeek === i && { color: Colors.accent }]}>W{w.week}</Text>
                                <Text style={[styles.weekTabLabel, { color: Colors.textMuted }, selectedWeek === i && { color: Colors.accentLight }]} numberOfLines={1}>{w.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Week detail */}
                    <View style={styles.weekDetail}>
                        <Text style={[styles.weekTitle, { color: Colors.textPrimary }]}>Week {selectedPlan.weeks[selectedWeek].week}: {selectedPlan.weeks[selectedWeek].label}</Text>
                        {selectedPlan.weeks[selectedWeek].days.map((day, i) => (
                            <Card key={i} variant={day.type === 'rest' ? 'default' : 'glass'} style={styles.dayCard}>
                                <View style={styles.dayRow}>
                                    <View style={styles.dayLeft}>
                                        <Text style={[styles.dayLabel, { color: Colors.textMuted }]}>{dayLabels[i]}</Text>
                                        <Ionicons name={dayIcons[day.type]} size={24} color={dayColors[day.type]} />
                                    </View>
                                    <View style={styles.dayContent}>
                                        <Text style={[styles.dayType, { color: dayColors[day.type] }]}>
                                            {day.type.charAt(0).toUpperCase() + day.type.slice(1)}
                                        </Text>
                                        <Text style={[styles.dayDesc, { color: Colors.textPrimary }]}>{day.description}</Text>
                                        <View style={styles.dayMeta}>
                                            {day.distance_km && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Ionicons name="resize" size={14} color={Colors.textSecondary} />
                                                    <Text style={[styles.dayMetaText, { color: Colors.textSecondary }]}>{day.distance_km} km</Text>
                                                </View>
                                            )}
                                            {day.duration_min && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Ionicons name="time" size={14} color={Colors.textSecondary} />
                                                    <Text style={[styles.dayMetaText, { color: Colors.textSecondary }]}>{day.duration_min} min</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Plan Wizard Modal */}
            <Modal visible={showWizard} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
                    <Card style={styles.wizardContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                            <Ionicons name="star" size={28} color={Colors.textPrimary} />
                            <Text style={[styles.wizardTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Plan Generator</Text>
                        </View>
                        <Text style={[styles.wizardLabel, { color: Colors.textSecondary }]}>What is your target distance ({unit})?</Text>
                        <TextInput
                            style={[styles.wizardInput, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={targetDistance}
                            onChangeText={setTargetDistance}
                            keyboardType="numeric"
                            placeholder={unit === 'mi' ? "e.g. 3.1, 6.2, 13.1, 26.2" : "e.g. 5, 10, 21.1, 42.2"}
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={[styles.wizardLabel, { color: Colors.textSecondary }]}>How many weeks do you want to train?</Text>
                        <TextInput
                            style={[styles.wizardInput, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={targetWeeks}
                            onChangeText={setTargetWeeks}
                            keyboardType="numeric"
                            placeholder="e.g. 8, 12, 16"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={[styles.wizardLabel, { color: Colors.textSecondary }]}>Fitness Level</Text>
                        <View style={styles.levelRow}>
                            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                                <TouchableOpacity
                                    key={lvl}
                                    style={[styles.levelBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }, fitnessLevel === lvl && { borderColor: Colors.accent, backgroundColor: Colors.accentGlow }]}
                                    onPress={() => setFitnessLevel(lvl)}
                                >
                                    <Text style={[styles.levelBtnText, { color: Colors.textMuted }, fitnessLevel === lvl && { color: Colors.accent }]}>
                                        {lvl}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.wizardActions}>
                            <Button title="Cancel" variant="outline" onPress={() => setShowWizard(false)} style={{ flex: 1 }} />
                            <Button title="Generate" variant="primary" onPress={generatePlan} style={{ flex: 1 }} />
                        </View>
                    </Card>
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
    planCard: { marginBottom: Spacing.md },
    planRow: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
    planIcon: { fontSize: 44 },
    planInfo: { flex: 1, gap: Spacing.xs },
    planName: { fontSize: FontSize.xl, fontWeight: '700' },
    planDesc: { fontSize: FontSize.sm, lineHeight: 20 },
    planMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
    diffBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    diffText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
    planWeeks: { fontSize: FontSize.xs },
    proBadge: { fontSize: 10, fontWeight: '800', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    // Plan detail
    planHeaderSection: { alignItems: 'center', marginBottom: Spacing.xl },
    planHeaderIcon: { fontSize: 60, marginBottom: Spacing.sm },
    planHeaderName: { fontSize: FontSize.xxxl, fontWeight: '800' },
    planHeaderDesc: { fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.xs },
    // Week selector
    weekScroll: { marginBottom: Spacing.xl },
    weekTab: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, marginRight: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1, alignItems: 'center', minWidth: 70 },
    weekTabNum: { fontSize: FontSize.md, fontWeight: '700' },
    weekTabLabel: { fontSize: FontSize.xs, maxWidth: 60 },
    // Week detail
    weekDetail: { gap: Spacing.sm },
    weekTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.md },
    dayCard: { marginBottom: Spacing.xs },
    dayRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    dayLeft: { alignItems: 'center', width: 44, gap: Spacing.xs },
    dayLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
    dayIcon: { fontSize: 20 },
    dayContent: { flex: 1, gap: 2 },
    dayType: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    dayDesc: { fontSize: FontSize.md },
    dayMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
    dayMetaText: { fontSize: FontSize.xs },

    // Wizard Modal
    modalOverlay: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
    wizardContent: { gap: Spacing.md },
    wizardTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.sm },
    wizardLabel: { fontSize: FontSize.sm, fontWeight: '600', marginTop: Spacing.xs },
    wizardInput: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md },
    levelRow: { flexDirection: 'row', gap: Spacing.sm },
    levelBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
    levelBtnText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
    wizardActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
