import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip, VictoryArea, VictoryGroup } from 'victory-native';
import { Svg, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FontSize, Spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface ReadinessTrendChartProps {
    data: { day: string; acute: number; chronic: number }[];
}

export const ReadinessTrendChart = React.memo(function ReadinessTrendChart({ data }: ReadinessTrendChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Insufficient data for trend</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Svg style={{ height: 0, width: 0 }}>
                <Defs>
                    <LinearGradient id="acuteGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.accent} stopOpacity={0.4} />
                        <Stop offset="100%" stopColor={Colors.accent} stopOpacity={0.0} />
                    </LinearGradient>
                </Defs>
            </Svg>

            <VictoryChart
                width={screenWidth - 48}
                height={180}
                padding={{ top: 20, bottom: 40, left: 40, right: 10 }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `Acute: ${Math.round(datum.acute)}\nChronic: ${Math.round(datum.chronic)}`}
                        labelComponent={
                            <VictoryTooltip
                                flyoutStyle={{ fill: Colors.surface, stroke: Colors.border, strokeWidth: 1 }}
                                style={{ fill: Colors.textPrimary, fontSize: 10 }}
                                cornerRadius={8}
                            />
                        }
                    />
                }
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.borderLight },
                        tickLabels: { fill: Colors.textMuted, fontSize: 8 },
                        grid: { stroke: 'transparent' },
                    }}
                />
                <VictoryAxis
                    dependentAxis
                    style={{
                        axis: { stroke: 'transparent' },
                        tickLabels: { fill: Colors.textMuted, fontSize: 8 },
                        grid: { stroke: Colors.borderLight, strokeDasharray: '4,4' },
                    }}
                />

                {/* Chronic Load (Fitness) - Solid Line */}
                <VictoryLine
                    data={data}
                    x="day"
                    y="chronic"
                    style={{
                        data: { stroke: Colors.textSecondary, strokeWidth: 2, strokeDasharray: '4,4' },
                    }}
                />

                {/* Acute Load (Fatigue) - Area + Line */}
                <VictoryArea
                    data={data}
                    x="day"
                    y="acute"
                    style={{
                        data: { fill: "url(#acuteGradient)" },
                    }}
                />
                <VictoryLine
                    data={data}
                    x="day"
                    y="acute"
                    style={{
                        data: { stroke: Colors.accent, strokeWidth: 3 },
                    }}
                    animate={{ duration: 1000 }}
                />
            </VictoryChart>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
                    <Text style={[styles.legendText, { color: Colors.textSecondary }]}>Acute (Fatigue)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: Colors.textSecondary, borderRadius: 0, height: 2 }]} />
                    <Text style={[styles.legendText, { color: Colors.textSecondary }]}>Chronic (Fitness)</Text>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { alignItems: 'center' },
    empty: { height: 150, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: FontSize.sm },
    legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, fontWeight: '600' },
});
