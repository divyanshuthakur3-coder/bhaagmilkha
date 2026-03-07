import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip } from 'victory-native';
import { Svg, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FontSize, Spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

interface TrainingLoadChartProps {
    data: { day: string; load: number }[];
}

export const TrainingLoadChart = React.memo(function TrainingLoadChart({ data }: TrainingLoadChartProps) {
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
                    <LinearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.premium} />
                        <Stop offset="100%" stopColor={Colors.premiumGlow} />
                    </LinearGradient>
                </Defs>
            </Svg>

            <VictoryChart
                width={screenWidth - 48}
                height={180}
                padding={{ top: 20, bottom: 40, left: 40, right: 10 }}
                domainPadding={{ x: 10 }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `Load: ${datum.load}`}
                        labelComponent={
                            <VictoryTooltip
                                flyoutStyle={{ fill: Colors.surface, stroke: Colors.premium, strokeWidth: 1 }}
                                style={{ fill: Colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}
                                cornerRadius={8}
                            />
                        }
                    />
                }
            >
                <VictoryAxis
                    style={{
                        axis: { stroke: Colors.borderLight },
                        tickLabels: {
                            fill: Colors.textMuted,
                            fontSize: 8,
                        },
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
                <VictoryBar
                    data={data}
                    x="day"
                    y="load"
                    cornerRadius={{ top: 4 }}
                    style={{
                        data: {
                            fill: "url(#loadGradient)",
                            width: 10,
                        },
                    }}
                    animate={{
                        duration: 800,
                        onLoad: { duration: 800 }
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
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: FontSize.sm,
    },
});
