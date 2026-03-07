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

interface PaceSplitsChartProps {
    data: { split: number; pace: number }[];
    unit?: string;
}

export function PaceSplitsChart({ data, unit = 'km' }: PaceSplitsChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (!data || data.length < 2) {
        return (
            <View style={styles.container}>
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Not enough data for split analysis</Text>
                </View>
            </View>
        );
    }

    const bestSplit = [...data].sort((a, b) => a.pace - b.pace)[0];
    const avgPace = data.reduce((acc, curr) => acc + curr.pace, 0) / data.length;

    return (
        <View style={styles.container}>
            <Svg style={{ height: 0, width: 0 }}>
                <Defs>
                    <LinearGradient id="splitsGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.warning} stopOpacity="0.4" />
                        <Stop offset="100%" stopColor={Colors.warning} stopOpacity="0.0" />
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
                            return `${unit.toUpperCase()} ${datum.split}: ${fMins}:${fSecs.toString().padStart(2, '0')}`;
                        }}
                        labelComponent={
                            <VictoryTooltip
                                flyoutStyle={{ fill: Colors.surface, stroke: Colors.warning, strokeWidth: 1 }}
                                style={{ fill: Colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}
                                cornerRadius={8}
                            />
                        }
                    />
                }
            >
                {/* Average Pace Line */}
                <VictoryAxis
                    dependentAxis
                    invertAxis
                    style={{
                        axis: { stroke: 'transparent' },
                        grid: { stroke: Colors.border, strokeDasharray: '4,4' },
                        tickLabels: { fill: 'transparent' },
                    }}
                />

                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                    }}
                    tickFormat={(t) => `${unit} ${t}`}
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
                        x="split"
                        y="pace"
                        interpolation="monotoneX"
                        style={{
                            data: {
                                fill: "url(#splitsGradient)",
                                stroke: Colors.warning,
                                strokeWidth: 3,
                            },
                        }}
                        animate={{ duration: 1000 }}
                    />
                    <VictoryScatter
                        data={data}
                        x="split"
                        y="pace"
                        size={({ datum }) => (datum.split === bestSplit.split ? 8 : 4)}
                        style={{
                            data: {
                                fill: ({ datum }) => (datum.split === bestSplit.split ? Colors.premium : Colors.textPrimary),
                                stroke: Colors.warning,
                                strokeWidth: 2
                            },
                        }}
                    />
                </VictoryGroup>

                {/* Best Split Highlight */}
                <VictoryScatter
                    data={[bestSplit]}
                    x="split"
                    y="pace"
                    size={10}
                    style={{
                        data: {
                            fill: Colors.premium,
                            stroke: Colors.premium,
                            strokeWidth: 2,
                            strokeOpacity: 0.3
                        },
                    }}
                    labels={({ datum }) => "BEST"}
                    labelComponent={
                        <VictoryTooltip
                            active={true}
                            renderInPortal={false}
                            flyoutStyle={{ fill: Colors.premium, stroke: Colors.premium, strokeWidth: 0 }}
                            style={{ fill: '#000', fontSize: 8, fontWeight: '900' }}
                            cornerRadius={4}
                            pointerLength={4}
                            dy={-10}
                        />
                    }
                />
            </VictoryChart>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    empty: {
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: FontSize.sm,
    },
});
