import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip } from 'victory-native';
import { Svg, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FontSize, Spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface WeeklyBarChartProps {
    data: { week: string; distance: number }[];
    unit?: string;
}

export const WeeklyBarChart = React.memo(function WeeklyBarChart({ data, unit = 'km' }: WeeklyBarChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No data yet</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Svg style={{ height: 0, width: 0 }}>
                <Defs>
                    <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.accentLight} />
                        <Stop offset="100%" stopColor={Colors.accent} />
                    </LinearGradient>
                </Defs>
            </Svg>

            <VictoryChart
                width={screenWidth - 48}
                height={220}
                padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
                domainPadding={{ x: 20 }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `${datum.distance} ${unit}`}
                        labelComponent={
                            <VictoryTooltip
                                flyoutStyle={{ fill: Colors.surface, stroke: Colors.accent, strokeWidth: 1 }}
                                style={{ fill: Colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}
                                cornerRadius={8}
                            />
                        }
                    />
                }
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: {
                            fill: Colors.textMuted,
                            fontSize: 10,
                        },
                        grid: { stroke: 'transparent' },
                    }}
                />
                <VictoryAxis
                    dependentAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                        grid: { stroke: Colors.border, strokeDasharray: '4,4' },
                    }}
                    tickFormat={(t: number) => `${t}${unit}`}
                />
                <VictoryBar
                    data={data}
                    x="week"
                    y="distance"
                    cornerRadius={{ top: 6 }}
                    style={{
                        data: {
                            fill: "url(#barGradient)",
                            width: 14,
                        },
                    }}
                    animate={{
                        duration: 1000,
                        onLoad: { duration: 1000 }
                    }}
                />
            </VictoryChart>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    empty: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: FontSize.sm,
    },
});
