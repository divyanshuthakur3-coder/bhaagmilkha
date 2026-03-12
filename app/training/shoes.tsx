import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useUserStore } from '@/store/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { shoesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Shoe } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function ShoesScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const unit = useUserStore(useShallow((s) => s.profile?.preferred_unit || 'km'));
    const [shoes, setShoes] = useState<Shoe[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [newMaxKm, setNewMaxKm] = useState('800');

    useEffect(() => {
        fetchShoes();
    }, []);

    const fetchShoes = async () => {
        try {
            const data = await shoesApi.getAll();
            setShoes(data || []);
        } catch (err) {
            console.error('Failed to fetch shoes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Please enter a shoe name');
            return;
        }
        try {
            await shoesApi.create({
                name: newName.trim(),
                brand: newBrand.trim(),
                max_km: parseFloat(newMaxKm) || 800,
            });
            setShowAdd(false);
            setNewName('');
            setNewBrand('');
            setNewMaxKm('800');
            fetchShoes();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleRetire = (shoe: Shoe) => {
        Alert.alert(
            'Retire Shoe',
            `Retire "${shoe.name}"? It won't appear in shoe selection for new runs.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Retire',
                    onPress: async () => {
                        await shoesApi.retire(shoe.id);
                        fetchShoes();
                    },
                },
            ]
        );
    };

    const handleDelete = (shoe: Shoe) => {
        Alert.alert(
            'Delete Shoe',
            `Permanently delete "${shoe.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await shoesApi.delete(shoe.id);
                        fetchShoes();
                    },
                },
            ]
        );
    };

    const activeShoes = shoes.filter((s) => s.is_active);
    const retiredShoes = shoes.filter((s) => !s.is_active);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={[styles.backText, { color: Colors.accent }]}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="walk" size={32} color={Colors.textPrimary} />
                        <Text style={[styles.header, { color: Colors.textPrimary, marginBottom: 0 }]}>My Shoes</Text>
                    </View>
                    <Button title="+ Add" onPress={() => setShowAdd(true)} variant="primary" size="sm" />
                </View>
                <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Track mileage on your running shoes</Text>

                {activeShoes.length === 0 && !loading && (
                    <Card variant="glass" style={styles.emptyCard}>
                        <Ionicons name="walk" size={48} color={Colors.textMuted} style={{ marginBottom: Spacing.md }} />
                        <Text style={[styles.emptyTitle, { color: Colors.textPrimary }]}>No shoes added yet</Text>
                        <Text style={[styles.emptyDesc, { color: Colors.textSecondary }]}>Add your running shoes to track their mileage and know when to replace them.</Text>
                        <Button title="Add Your First Shoe" onPress={() => setShowAdd(true)} variant="primary" style={{ marginTop: Spacing.md }} />
                    </Card>
                )}

                {activeShoes.map((shoe) => {
                    const max = parseFloat(String(shoe.max_km)) || 1;
                    const total = parseFloat(String(shoe.total_km));
                    const wearPercent = Math.min((total / max) * 100, 100);
                    const needsReplacing = wearPercent >= 80;

                    const displayTotal = unit === 'mi' ? total / 1.609 : total;
                    const displayMax = unit === 'mi' ? max / 1.609 : max;

                    return (
                        <Card key={shoe.id} variant={needsReplacing ? 'glow' : 'glass'} glowColor={needsReplacing ? Colors.warning : undefined} style={styles.shoeCard}>
                            <View style={styles.shoeHeader}>
                                <View style={{ flexDirection: 'row', gap: Spacing.md, flex: 1 }}>
                                    <View style={[styles.shoeIconHolder, { backgroundColor: Colors.surfaceLight }]}>
                                        <Ionicons
                                            name={wearPercent > 80 ? "alert-circle" : (wearPercent > 50 ? "walk" : "footsteps")}
                                            size={24}
                                            color={needsReplacing ? Colors.warning : Colors.accent}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.shoeName, { color: Colors.textPrimary }]}>{shoe.name}</Text>
                                        {shoe.brand ? <Text style={[styles.shoeBrand, { color: Colors.textSecondary }]}>{shoe.brand}</Text> : null}
                                    </View>
                                </View>
                                {needsReplacing && (
                                    <View style={[styles.replaceBadge, { backgroundColor: Colors.warningGlow, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                        <Ionicons name="warning" size={14} color={Colors.warning} />
                                        <Text style={[styles.replaceBadgeText, { color: Colors.warning }]}>Replace</Text>
                                    </View>
                                )}
                            </View>

                            <ProgressBar
                                progress={wearPercent}
                                label={`${displayTotal.toFixed(0)} / ${displayMax.toFixed(0)} ${unit}`}
                                color={needsReplacing ? Colors.warning : Colors.accent}
                            />

                            <View style={styles.shoeActions}>
                                <TouchableOpacity onPress={() => handleRetire(shoe)}>
                                    <Text style={[styles.actionText, { color: Colors.textMuted }]}>Retire</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(shoe)}>
                                    <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                })}

                {retiredShoes.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Retired Shoes</Text>
                        {retiredShoes.map((shoe) => (
                            <Card key={shoe.id} variant="default" style={[styles.shoeCard, { opacity: 0.5 }]}>
                                <Text style={[styles.shoeName, { color: Colors.textPrimary }]}>{shoe.name}</Text>
                                <Text style={[styles.shoeBrand, { color: Colors.textSecondary }]}>
                                    {shoe.brand} · {(unit === 'mi' ? shoe.total_km / 1.609 : shoe.total_km).toFixed(0)} {unit} total
                                </Text>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Add Shoe Modal */}
            <Modal visible={showAdd} transparent animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.xxl }}>
                            <Ionicons name="add-circle" size={28} color={Colors.textPrimary} />
                            <Text style={[styles.modalTitle, { color: Colors.textPrimary, marginBottom: 0 }]}>Add New Shoe</Text>
                        </View>

                        <View style={{ gap: Spacing.md }}>
                            <Input
                                label="Shoe Name *"
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="e.g. Nike Pegasus 40"
                                icon="walk"
                            />

                            <Input
                                label="Brand"
                                value={newBrand}
                                onChangeText={setNewBrand}
                                placeholder="e.g. Nike"
                                icon="pricetag-outline"
                            />

                            <Input
                                label={`Max Lifespan (${unit})`}
                                value={newMaxKm}
                                onChangeText={setNewMaxKm}
                                keyboardType="numeric"
                                placeholder={unit === 'km' ? "800" : "500"}
                                icon="timer-outline"
                            />
                            <Text style={[styles.inputHint, { color: Colors.textMuted }]}>
                                Running shoes typically last 300-500 miles (500-800 km).
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <Button title="Cancel" onPress={() => setShowAdd(false)} variant="ghost" style={{ flex: 1 }} />
                            <Button title="Add Shoe" onPress={handleAdd} variant="primary" style={{ flex: 1 }} />
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    header: { fontSize: FontSize.xxxl, fontWeight: '800' },
    subtitle: { fontSize: FontSize.md, marginBottom: Spacing.xxl },
    emptyCard: { alignItems: 'center', padding: Spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
    emptyDesc: { fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm },
    shoeCard: { marginBottom: Spacing.md },
    shoeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    shoeName: { fontSize: FontSize.lg, fontWeight: '700' },
    shoeBrand: { fontSize: FontSize.sm },
    replaceBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    replaceBadgeText: { fontSize: FontSize.xs, fontWeight: '600' },
    shoeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xl, marginTop: Spacing.md },
    actionText: { fontSize: FontSize.sm, fontWeight: '600' },
    section: { marginTop: Spacing.xxl },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.md },
    shoeIconHolder: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl },
    modalTitle: { fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xxl },
    inputGroup: { marginBottom: Spacing.lg },
    inputLabel: { fontSize: FontSize.sm, fontWeight: '500', marginBottom: Spacing.xs },
    input: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, fontSize: FontSize.md },
    inputHint: { fontSize: FontSize.xs, marginTop: Spacing.xs },
    modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
