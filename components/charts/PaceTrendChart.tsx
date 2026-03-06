import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryScatter } from 'victory-native';
import { Colors, FontSize } from '@/constants/colors';

interface PaceTrendChartProps {
    data: { run: number; pace: number }[];
}

export function PaceTrendChart({ data }: PaceTrendChartProps) {
    const screenWidth = Dimensions.get('window').width;

    if (data.length < 2) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>Need at least 2 runs for trend</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <VictoryChart
                width={screenWidth - 48}
                height={200}
                padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                        grid: { stroke: 'transparent' },
                    }}
                    label="Run #"
                    axisLabelComponent={<></>}
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
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                    }}
                />
                <VictoryLine
                    data={data}
                    x="run"
                    y="pace"
                    style={{
                        data: { stroke: Colors.success, strokeWidth: 2 },
                    }}
                    animate={{ duration: 500 }}
                />
                <VictoryScatter
                    data={data}
                    x="run"
                    y="pace"
                    size={4}
                    style={{
                        data: { fill: Colors.success },
                    }}
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
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
    },
});
