import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { RunMap } from '@/components/maps/RunMap';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/LoadingSkeleton';
import { formatDistance, formatPace, formatDuration, formatDate } from '@/lib/formatters';
import { Run } from '@/lib/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function HistoryScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const { runs, isLoading, fetchRuns } = useRunHistoryStore();
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchRuns();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRuns();
        setRefreshing(false);
    };

    const renderRunCard = ({ item }: { item: Run }) => (
        <TouchableOpacity
            style={[styles.runCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
            onPress={() => router.push(`/run/${item.id}`)}
            activeOpacity={0.7}
        >
            {/* Map thumbnail */}
            {item.route_coordinates && item.route_coordinates.length >= 2 && (
                <RunMap coordinates={item.route_coordinates} height={140} />
            )}

            <View style={styles.runInfo}>
                <Text style={[styles.runDate, { color: Colors.textMuted }]}>{formatDate(item.started_at)}</Text>
                <View style={styles.runStatsRow}>
                    <View style={styles.runStat}>
                        <Text style={[styles.runStatValue, { color: Colors.textPrimary }]}>
                            {formatDistance(item.distance_km, unit)}
                        </Text>
                        <Text style={[styles.runStatLabel, { color: Colors.textMuted }]}>Distance</Text>
                    </View>
                    <View style={styles.runStat}>
                        <Text style={[styles.runStatValue, { color: Colors.textPrimary }]}>
                            {formatDuration(item.duration_seconds)}
                        </Text>
                        <Text style={[styles.runStatLabel, { color: Colors.textMuted }]}>Duration</Text>
                    </View>
                    <View style={styles.runStat}>
                        <Text style={[styles.runStatValue, { color: Colors.accent }]}>
                            {formatPace(item.avg_pace_min_per_km, unit)}
                        </Text>
                        <Text style={[styles.runStatLabel, { color: Colors.textMuted }]}>Pace</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading && runs.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
                <Text style={[styles.header, { color: Colors.textPrimary }]}>Run History</Text>
                <View style={styles.skeletonContainer}>
                    <SkeletonGroup count={4} height={200} gap={16} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
            <Text style={[styles.header, { color: Colors.textPrimary }]}>Run History</Text>
            <FlatList
                data={runs}
                keyExtractor={(item) => item.id}
                renderItem={renderRunCard}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="📋"
                        title="No runs recorded"
                        message="Your run history will appear here after your first run."
                        actionLabel="Start a Run"
                        onAction={() => router.push('/run/live-run')}
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    list: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
        gap: Spacing.lg,
    },
    skeletonContainer: {
        paddingHorizontal: Spacing.lg,
    },
    runCard: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
    },
    runInfo: {
        padding: Spacing.lg,
    },
    runDate: {
        fontSize: FontSize.sm,
        marginBottom: Spacing.md,
    },
    runStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    runStat: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    runStatValue: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    runStatLabel: {
        fontSize: FontSize.xs,
    },
});
