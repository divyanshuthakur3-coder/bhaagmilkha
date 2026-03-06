import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import { Colors, FontSize, Spacing } from '@/constants/colors';

interface WeeklyBarChartProps {
    data: { week: string; distance: number }[];
    unit?: string;
}

export function WeeklyBarChart({ data, unit = 'km' }: WeeklyBarChartProps) {
    const screenWidth = Dimensions.get('window').width;

    if (data.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No data yet</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <VictoryChart
                width={screenWidth - 48}
                height={220}
                padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
                domainPadding={{ x: 15 }}
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.border },
                        tickLabels: {
                            fill: Colors.textMuted,
                            fontSize: 10,
                            angle: -45,
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
                    cornerRadius={{ top: 4 }}
                    style={{
                        data: {
                            fill: Colors.accent,
                            width: 20,
                        },
                    }}
                    animate={{ duration: 500 }}
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
