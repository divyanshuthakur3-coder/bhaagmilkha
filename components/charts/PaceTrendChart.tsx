import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
    VictoryArea,
    VictoryChart,
    VictoryAxis,
    VictoryVoronoiContainer,
    VictoryTooltip,
    VictoryGroup,
    VictoryScatter
} from 'victory-native';
import { Svg, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FontSize } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface PaceTrendChartProps {
    data: { run: number; pace: number }[];
}

export const PaceTrendChart = React.memo(function PaceTrendChart({ data }: PaceTrendChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (data.length < 2) {
        return (
            <View style={styles.container}>
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Need at least 2 runs for trend</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Svg style={{ height: 0, width: 0 }}>
                <Defs>
                    <LinearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.accent} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={Colors.accent} stopOpacity="0.0" />
                    </LinearGradient>
                </Defs>
            </Svg>

            <VictoryChart
                width={screenWidth - 48}
                height={200}
                padding={{ top: 30, bottom: 40, left: 50, right: 30 }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => {
                            const mins = Math.floor(datum.pace);
                            const secs = Math.round((datum.pace - mins) * 60);
                            const fMins = secs === 60 ? mins + 1 : mins;
                            const fSecs = secs === 60 ? 0 : secs;
                            return `${fMins}:${fSecs.toString().padStart(2, '0')} /km`;
                        }}
                        labelComponent={
                            <VictoryTooltip
                                flyoutStyle={{ fill: Colors.surface, stroke: Colors.accent, strokeWidth: 1 }}
                                style={{ fill: Colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}
                                cornerRadius={8}
                                pointerLength={6}
                            />
                        }
                    />
                }
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                        grid: { stroke: 'transparent' },
                    }}
                    tickFormat={(t) => `#${t}`}
                />
                <VictoryAxis
                    dependentAxis
                    invertAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                        grid: { stroke: Colors.border, strokeDasharray: '4,4' },
                    }}
                    tickFormat={(t: number) => {
                        const mins = Math.floor(t);
                        const secs = Math.round((t - mins) * 60);
                        const fMins = secs === 60 ? mins + 1 : mins;
                        const fSecs = secs === 60 ? 0 : secs;
                        return `${fMins}:${fSecs.toString().padStart(2, '0')}`;
                    }}
                />
                <VictoryGroup>
                    <VictoryArea
                        data={data}
                        x="run"
                        y="pace"
                        interpolation="basis" // Butter smooth curves
                        style={{
                            data: {
                                fill: "url(#paceGradient)",
                                stroke: Colors.accent,
                                strokeWidth: 3,
                            },
                        }}
                        animate={{
                            duration: 1000,
                            onLoad: { duration: 1000 }
                        }}
                    />
                    <VictoryScatter
                        data={data}
                        x="run"
                        y="pace"
                        size={({ active }) => (active ? 6 : 4)}
                        style={{
                            data: {
                                fill: Colors.textPrimary,
                                stroke: Colors.accent,
                                strokeWidth: 2
                            },
                        }}
                    />
                </VictoryGroup>
            </VictoryChart>
        </View >
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
