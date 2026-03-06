import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

interface CalendarHeatmapProps {
    runDates: { date: string; distanceKm: number }[];
    month?: Date;
}

export function CalendarHeatmap({ runDates, month }: CalendarHeatmapProps) {
    const targetMonth = month || new Date();
    const year = targetMonth.getFullYear();
    const monthIdx = targetMonth.getMonth();

    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay(); // 0=Sun

    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // Create a map of date -> distance
    const dateMap = new Map<string, number>();
    runDates.forEach(({ date, distanceKm }) => {
        const key = new Date(date).toDateString();
        dateMap.set(key, (dateMap.get(key) || 0) + distanceKm);
    });

    const maxDistance = Math.max(...Array.from(dateMap.values()), 1);

    const getIntensity = (day: number): number => {
        const date = new Date(year, monthIdx, day);
        const km = dateMap.get(date.toDateString()) || 0;
        if (km === 0) return 0;
        return Math.max(0.2, km / maxDistance);
    };

    const cells: React.ReactNode[] = [];

    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
        cells.push(<View key={`empty-${i}`} style={styles.cell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const intensity = getIntensity(day);
        const isToday = new Date().toDateString() === new Date(year, monthIdx, day).toDateString();

        cells.push(
            <View
                key={day}
                style={[
                    styles.cell,
                    {
                        backgroundColor:
                            intensity > 0
                                ? `rgba(59, 130, 246, ${intensity})`
                                : Colors.surfaceLight,
                    },
                    isToday && styles.todayCell,
                ]}
            >
                <Text
                    style={[
                        styles.dayText,
                        intensity > 0.5 && styles.dayTextActive,
                        isToday && styles.todayText,
                    ]}
                >
                    {day}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.monthLabel}>{monthName}</Text>
            <View style={styles.daysRow}>
                {dayLabels.map((label, i) => (
                    <View key={i} style={styles.dayLabelCell}>
                        <Text style={styles.dayLabel}>{label}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.grid}>{cells}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.md,
    },
    monthLabel: {
        color: Colors.textPrimary,
        fontSize: FontSize.lg,
        fontWeight: '600',
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    daysRow: {
        flexDirection: 'row',
        marginBottom: Spacing.xs,
    },
    dayLabelCell: {
        flex: 1,
        alignItems: 'center',
    },
    dayLabel: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.sm,
        marginBottom: 2,
    },
    todayCell: {
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    dayText: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
    },
    dayTextActive: {
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    todayText: {
        color: Colors.accent,
        fontWeight: '700',
    },
});
