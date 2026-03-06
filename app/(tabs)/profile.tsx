import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TextInput,
    Switch,
    Alert,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { usePremium } from '@/context/PremiumContext';
import { useTheme } from '@/context/ThemeContext';
import { achievementsApi, auth } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ACHIEVEMENTS } from '@/constants/achievements';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function ProfileScreen() {
    const { theme, colors: Colors } = useTheme();
    const router = useRouter();
    const { isPremium, checkPremiumFeature } = usePremium();
    const { profile, updateProfile, signOut } = useUserStore();
    const [name, setName] = useState(profile?.name || '');
    const [weeklyGoal, setWeeklyGoal] = useState(String(profile?.weekly_goal_km || 20));
    const [weight, setWeight] = useState(String(profile?.weight_kg || 70));
    const [useMetric, setUseMetric] = useState(profile?.preferred_unit === 'km');
    const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        try {
            const data = await achievementsApi.getAll();
            setEarnedBadges(new Set((data || []).map((a: any) => a.badge_type)));
        } catch (err) {
            console.error('Failed to fetch achievements:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({
            name: name.trim(),
            weekly_goal_km: parseFloat(weeklyGoal) || 20,
            weight_kg: parseFloat(weight) || 70,
            preferred_unit: useMetric ? 'km' : 'mi',
        });
        setSaving(false);
        Alert.alert('✅ Saved', 'Your profile has been updated.');
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        (globalThis as any).__setAuthenticated?.(false);
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This action is irreversible. All your run data, goals, and achievements will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await auth.deleteAccount();
                            (globalThis as any).__setAuthenticated?.(false);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to delete account');
                        }
                    },
                },
            ]
        );
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        try {
            await auth.changePassword(currentPassword, newPassword);
            Alert.alert('✅ Password Changed', 'Your password has been updated.');
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to change password');
        }
    };

    const earnedCount = earnedBadges.size;
    const totalCount = ACHIEVEMENTS.length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.header, { color: Colors.textPrimary }]}>Profile</Text>

                {/* Premium Status Card */}
                <TouchableOpacity
                    onPress={() => router.push('/premium')}
                    activeOpacity={0.8}
                    style={[styles.premiumStatusCard, { shadowColor: Colors.premium }]}
                >
                    <LinearGradient
                        colors={isPremium ? [Colors.surface, Colors.surfaceLight] : [Colors.premium, '#D4A517']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.premiumStatusGradient}
                    >
                        <View style={styles.premiumStatusContent}>
                            <View style={styles.premiumStatusText}>
                                <Text style={[styles.premiumStatusTitle, !isPremium ? { color: '#0F172A' } : { color: Colors.textPrimary }]}>
                                    {isPremium ? '✨ Pro Member' : '💎 Go Pro'}
                                </Text>
                                <Text style={[styles.premiumStatusSubtitle, !isPremium ? { color: 'rgba(15, 23, 42, 0.7)' } : { color: Colors.textSecondary }]}>
                                    {isPremium ? 'Active Subscription' : 'Unlock AI Coach & Plans'}
                                </Text>
                            </View>
                            <Text style={styles.premiumStatusIcon}>{isPremium ? '💎' : '→'}</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Avatar & Name */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarRing, Shadows.glow(Colors.accent)]}>
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientEnd]}
                            style={styles.avatarGradient}
                        >
                            <View style={[styles.avatarInner, { backgroundColor: Colors.background }]}>
                                <Text style={[styles.avatarText, { color: Colors.accent }]}>
                                    {(profile?.name || 'R')[0].toUpperCase()}
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>
                    <Text style={[styles.profileName, { color: Colors.textPrimary }]}>{profile?.name || 'Runner'}</Text>
                    <Text style={[styles.email, { color: Colors.textSecondary }]}>{profile?.email || ''}</Text>
                    <View style={[styles.memberBadge, { backgroundColor: Colors.accentGlow }]}>
                        <Text style={[styles.memberBadgeText, { color: Colors.accent }]}>🏃 RunTracker Member</Text>
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={[styles.quickStatsRow, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.quickStat}>
                        <Text style={[styles.quickStatValue, { color: Colors.textPrimary }]}>{earnedCount}</Text>
                        <Text style={[styles.quickStatLabel, { color: Colors.textMuted }]}>Badges</Text>
                    </View>
                    <View style={[styles.quickStatDivider, { backgroundColor: Colors.border }]} />
                    <View style={styles.quickStat}>
                        <Text style={[styles.quickStatValue, { color: Colors.textPrimary }]}>{profile?.weekly_goal_km || 20}</Text>
                        <Text style={[styles.quickStatLabel, { color: Colors.textMuted }]}>Weekly Goal</Text>
                    </View>
                    <View style={[styles.quickStatDivider, { backgroundColor: Colors.border }]} />
                    <View style={styles.quickStat}>
                        <Text style={[styles.quickStatValue, { color: Colors.textPrimary }]}>{useMetric ? 'km' : 'mi'}</Text>
                        <Text style={[styles.quickStatLabel, { color: Colors.textMuted }]}>Unit</Text>
                    </View>
                </View>

                {/* Settings */}
                <Card variant="glass" style={styles.settingsCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>⚙️ Settings</Text>

                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: Colors.textSecondary }]}>Name</Text>
                        <TextInput
                            style={[styles.settingInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: Colors.textSecondary }]}>Weekly Goal (km)</Text>
                        <TextInput
                            style={[styles.settingInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={weeklyGoal}
                            onChangeText={setWeeklyGoal}
                            keyboardType="numeric"
                            placeholder="20"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: Colors.textSecondary }]}>Weight (kg)</Text>
                        <TextInput
                            style={[styles.settingInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                            placeholder="70"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>

                    <View style={[styles.settingRowSwitch, { marginBottom: Spacing.xl }]}>
                        <Text style={[styles.settingLabel, { color: Colors.textSecondary }]}>Use Metric (km)</Text>
                        <Switch
                            value={useMetric}
                            onValueChange={setUseMetric}
                            trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                            thumbColor={Colors.textPrimary}
                        />
                    </View>

                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        loading={saving}
                        variant="primary"
                        style={styles.saveButton}
                    />
                </Card>

                {/* Security Section */}
                <Card variant="default" style={styles.securityCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>🔒 Security</Text>

                    <TouchableOpacity
                        style={styles.securityOption}
                        onPress={() => setShowPasswordModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.securityOptionLeft}>
                            <Text style={styles.securityIcon}>🔑</Text>
                            <Text style={[styles.securityText, { color: Colors.textPrimary }]}>Change Password</Text>
                        </View>
                        <Text style={[styles.chevron, { color: Colors.textMuted }]}>›</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: Colors.border }]} />

                    <TouchableOpacity
                        style={styles.securityOption}
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                    >
                        <View style={styles.securityOptionLeft}>
                            <Text style={styles.securityIcon}>🗑️</Text>
                            <Text style={[styles.securityText, { color: Colors.error }]}>
                                Delete Account
                            </Text>
                        </View>
                        <Text style={[styles.chevron, { color: Colors.error }]}>›</Text>
                    </TouchableOpacity>
                </Card>

                {/* Data & Features */}
                <Card variant="default" style={styles.securityCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>📦 Data & Features</Text>

                    <TouchableOpacity
                        style={styles.securityOption}
                        onPress={() => {
                            if (checkPremiumFeature('Data Export', () => router.push('/premium'))) {
                                Alert.alert('Export', 'Your run data will be exported as CSV. Check the server logs for the download link.');
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.securityOptionLeft}>
                            <Text style={styles.securityIcon}>{isPremium ? '📥' : '🔒'}</Text>
                            <Text style={[styles.securityText, { color: isPremium ? Colors.textPrimary : Colors.premium }]}>Export Runs (CSV)</Text>
                        </View>
                        {!isPremium && <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', backgroundColor: Colors.premium, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: Spacing.sm }}>PRO</Text>}
                        <Text style={[styles.chevron, { color: Colors.textMuted }]}>›</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: Colors.border }]} />

                    <TouchableOpacity
                        style={styles.securityOption}
                        onPress={() => router.push('/training/shoes')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.securityOptionLeft}>
                            <Text style={styles.securityIcon}>👟</Text>
                            <Text style={[styles.securityText, { color: Colors.textPrimary }]}>Shoe Tracker</Text>
                        </View>
                        <Text style={[styles.chevron, { color: Colors.textMuted }]}>›</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: Colors.border }]} />

                    <TouchableOpacity
                        style={styles.securityOption}
                        onPress={() => router.push('/training/plans')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.securityOptionLeft}>
                            <Text style={styles.securityIcon}>🏋️</Text>
                            <Text style={[styles.securityText, { color: Colors.textPrimary }]}>Training Plans</Text>
                        </View>
                        <Text style={[styles.chevron, { color: Colors.textMuted }]}>›</Text>
                    </TouchableOpacity>
                </Card>

                {/* Achievements */}
                <View style={styles.section}>
                    <View style={styles.achievementsHeader}>
                        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>🏆 Achievements</Text>
                        <Text style={[styles.badgeCount, { color: Colors.accent }]}>
                            {earnedCount}/{totalCount}
                        </Text>
                    </View>
                    <View style={styles.badgesGrid}>
                        {ACHIEVEMENTS.map((achievement) => {
                            const earned = earnedBadges.has(achievement.id);
                            return (
                                <Card
                                    key={achievement.id}
                                    variant={earned ? 'glow' : 'default'}
                                    glowColor={earned ? Colors.accent : undefined}
                                    style={[
                                        styles.badgeCard,
                                        earned ? {} : styles.badgeLocked,
                                    ]}
                                >
                                    <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                                        {achievement.icon}
                                    </Text>
                                    <Text style={[styles.badgeTitle, { color: earned ? Colors.textPrimary : Colors.textMuted }]}>
                                        {achievement.title}
                                    </Text>
                                    <Text style={[styles.badgeDesc, { color: Colors.textMuted }]}>
                                        {earned ? achievement.description : '🔒 Locked'}
                                    </Text>
                                </Card>
                            );
                        })}
                    </View>
                </View>

                {/* About */}
                <Card variant="default" style={styles.aboutCard}>
                    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>ℹ️ About</Text>
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: Colors.textSecondary }]}>App Version</Text>
                        <Text style={[styles.aboutValue, { color: Colors.textPrimary }]}>1.0.0</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: Colors.textSecondary }]}>Build</Text>
                        <Text style={[styles.aboutValue, { color: Colors.textPrimary }]}>Expo SDK 53</Text>
                    </View>
                </Card>

                {/* Sign Out */}
                <Button
                    title="Sign Out"
                    onPress={handleSignOut}
                    variant="danger"
                    size="lg"
                    style={styles.signOutButton}
                />
            </ScrollView>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>🔑 Change Password</Text>

                        <View style={styles.modalInputGroup}>
                            <Text style={[styles.modalLabel, { color: Colors.textSecondary }]}>Current Password</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry
                                placeholder="Enter current password"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={[styles.modalLabel, { color: Colors.textSecondary }]}>New Password</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholder="Min 6 characters"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={[styles.modalLabel, { color: Colors.textSecondary }]}>Confirm New Password</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.textPrimary }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                placeholder="Re-enter new password"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowPasswordModal(false)}
                                variant="ghost"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Update"
                                onPress={handleChangePassword}
                                variant="primary"
                                style={{ flex: 1 }}
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
        paddingBottom: 120,
    },
    header: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        marginBottom: Spacing.xl,
    },
    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    avatarRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    avatarGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInner: {
        width: 86,
        height: 86,
        borderRadius: 43,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: FontSize.display,
        fontWeight: '700',
    },
    profileName: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
    },
    email: {
        fontSize: FontSize.md,
        marginTop: 2,
    },
    memberBadge: {
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    memberBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    // Quick Stats
    quickStatsRow: {
        flexDirection: 'row',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
    },
    quickStat: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: FontSize.xl,
        fontWeight: '800',
    },
    quickStatLabel: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    quickStatDivider: {
        width: 1,
        marginVertical: Spacing.xs,
    },
    // Settings
    settingsCard: {
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        marginBottom: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    settingRow: {
        marginBottom: Spacing.lg,
    },
    settingRowSwitch: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    settingLabel: {
        fontSize: FontSize.sm,
        fontWeight: '500',
        marginBottom: Spacing.xs,
    },
    settingInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        fontSize: FontSize.md,
    },
    saveButton: {
        width: '100%',
        marginTop: Spacing.sm,
    },
    // Security
    securityCard: {
        marginBottom: Spacing.xl,
    },
    securityOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    securityOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    securityIcon: {
        fontSize: 20,
    },
    securityText: {
        fontSize: FontSize.md,
        fontWeight: '500',
    },
    chevron: {
        fontSize: FontSize.xxl,
        fontWeight: '300',
    },
    divider: {
        height: 1,
    },
    // Achievements
    achievementsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    badgeCount: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    badgeCard: {
        width: '48%',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    badgeLocked: {
        opacity: 0.35,
    },
    badgeIcon: {
        fontSize: 32,
    },
    badgeIconLocked: {
        opacity: 0.3,
    },
    badgeTitle: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        textAlign: 'center',
    },
    badgeDesc: {
        fontSize: FontSize.xs,
        textAlign: 'center',
    },
    // About
    aboutCard: {
        marginBottom: Spacing.xl,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
    },
    aboutLabel: {
        fontSize: FontSize.md,
    },
    aboutValue: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    // Sign Out
    signOutButton: {
        width: '100%',
        marginBottom: Spacing.xxxl,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.xxl,
        paddingBottom: Spacing.xxxxl,
    },
    modalTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        marginBottom: Spacing.xxl,
    },
    modalInputGroup: {
        marginBottom: Spacing.lg,
    },
    modalLabel: {
        fontSize: FontSize.sm,
        fontWeight: '500',
        marginBottom: Spacing.xs,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        fontSize: FontSize.md,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    // Premium Status Card
    premiumStatusCard: {
        marginBottom: Spacing.xl,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        elevation: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    premiumStatusGradient: {
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
    },
    premiumStatusContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    premiumStatusText: {
        flex: 1,
    },
    premiumStatusTitle: {
        fontSize: FontSize.lg,
        fontWeight: '800',
    },
    premiumStatusSubtitle: {
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    premiumStatusIcon: {
        fontSize: 24,
    },
});
