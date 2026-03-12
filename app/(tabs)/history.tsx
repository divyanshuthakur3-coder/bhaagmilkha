import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useRunHistoryStore } from '@/store/useRunHistoryStore';
import { useUserStore } from '@/store/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { StaticMap } from '@/components/maps/StaticMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/LoadingSkeleton';
import { formatDistance, formatPace, formatDuration, formatDate } from '@/lib/formatters';
import { Run } from '@/lib/types';
import { useLocation } from '@/hooks/useLocation';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

export default function HistoryScreen() {
    const { colors: Colors } = useTheme();
    const router = useRouter();
    const { runs = [], isLoading, fetchRuns } = useRunHistoryStore(useShallow(s => ({
        runs: s.runs,
        isLoading: s.isLoading,
        fetchRuns: s.fetchRuns,
    })));
    const unit = useUserStore((s) => s.profile?.preferred_unit || 'km');
    const [refreshing, setRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortBy, setSortBy] = React.useState<'date' | 'distance' | 'pace'>('date');
    const { requestPermissions } = useLocation();

    const filteredRuns = React.useMemo(() => {
        let result = [...runs];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.name?.toLowerCase().includes(query)) ||
                (r.notes?.toLowerCase().includes(query)) ||
                formatDate(r.started_at).toLowerCase().includes(query)
            );
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
            } else if (sortBy === 'distance') {
                return b.distance_km - a.distance_km;
            } else if (sortBy === 'pace') {
                return a.avg_pace_min_per_km - b.avg_pace_min_per_km;
            }
            return 0;
        });

        return result;
    }, [runs, searchQuery, sortBy, unit]);

    useEffect(() => {
        const controller = new AbortController();
        fetchRuns(controller.signal);
        return () => controller.abort();
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
            {/* Map thumbnail (Static for performance) */}
            <View style={{ height: 140, backgroundColor: Colors.backgroundAlt }}>
                {item.route_coordinates && item.route_coordinates.length >= 2 ? (
                    <StaticMap coordinates={item.route_coordinates} height={140} />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="map-outline" size={32} color={Colors.border} />
                    </View>
                )}
            </View>

            <View style={styles.runInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.runName, { color: Colors.textPrimary }]}>{item.name || 'Run'}</Text>
                        <Text style={[styles.runDate, { color: Colors.textMuted }]}>{formatDate(item.started_at)}</Text>
                    </View>
                </View>
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

    if (isLoading && (runs || []).length === 0) {
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
            <View style={styles.headerRow}>
                <Text style={[styles.header, { color: Colors.textPrimary }]}>History</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Ionicons name="search" size={20} color={Colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: Colors.textPrimary }]}
                        placeholder="Search runs..."
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.sortContainer}>
                    {[
                        { id: 'date', label: 'Recent', icon: 'time-outline' },
                        { id: 'distance', label: 'Distance', icon: 'resize-outline' },
                        { id: 'pace', label: 'Pace', icon: 'speedometer-outline' }
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            onPress={() => setSortBy(opt.id as any)}
                            style={[
                                styles.sortButton,
                                sortBy === opt.id && { backgroundColor: Colors.accentGlow, borderColor: Colors.accent }
                            ]}
                        >
                            <Ionicons
                                name={opt.icon as any}
                                size={14}
                                color={sortBy === opt.id ? Colors.accent : Colors.textMuted}
                            />
                            <Text style={[
                                styles.sortButtonText,
                                { color: sortBy === opt.id ? Colors.accent : Colors.textMuted }
                            ]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ErrorBoundary title="History Error" message="Failed to load your run list.">
                <FlatList
                    data={filteredRuns}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRunCard}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={6}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    getItemLayout={(_, index) => ({
                        length: 256, // 240 height + 16 gap
                        offset: 256 * index,
                        index,
                    })}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon="reader"
                            title="No runs recorded"
                            message="Your run history will appear here after your first run."
                            actionLabel="Start a Run"
                            onAction={async () => {
                                const permitted = await requestPermissions();
                                if (permitted) {
                                    router.push('/run/live-run');
                                }
                            }}
                        />
                    }
                />
            </ErrorBoundary>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        fontSize: FontSize.xxxl,
        fontWeight: '900',
        letterSpacing: -1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    searchContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.xs,
        fontSize: FontSize.md,
    },
    sortContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sortButtonText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
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
        minHeight: 240, // Match getItemLayout (256 - gap)
    },
    runInfo: {
        padding: Spacing.lg,
    },
    runName: {
        fontSize: FontSize.md,
        fontWeight: '700',
        marginBottom: 2,
    },
    runDate: {
        fontSize: FontSize.xs,
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
