import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryArea, VictoryChart, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip } from 'victory-native';
import { Svg, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Spacing } from '@/constants/colors';

interface ScoreTrendChartProps {
    data: { run: number; score: number }[];
}

export const ScoreTrendChart = React.memo(function ScoreTrendChart({ data }: ScoreTrendChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (!data || data.length < 2) return null;

    return (
        <View style={styles.container}>
            <Svg style={{ height: 0, width: 0 }}>
                <Defs>
                    <LinearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={Colors.premium} stopOpacity="0.4" />
                        <Stop offset="100%" stopColor={Colors.premium} stopOpacity="0.0" />
                    </LinearGradient>
                </Defs>
            </Svg>

            <VictoryChart
                width={screenWidth - 48}
                height={160}
                padding={{ top: 10, bottom: 40, left: 40, right: 20 }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `Score: ${datum.score}`}
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
                        axis: { stroke: 'transparent' },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                    }}
                    tickFormat={(t) => `Run ${t}`}
                />
                <VictoryAxis
                    dependentAxis
                    style={{
                        axis: { stroke: 'transparent' },
                        tickLabels: { fill: Colors.textMuted, fontSize: 10 },
                        grid: { stroke: Colors.border, strokeDasharray: '4,4' },
                    }}
                />
                <VictoryArea
                    data={data}
                    x="run"
                    y="score"
                    interpolation="monotoneX"
                    style={{
                        data: {
                            fill: "url(#scoreGradient)",
                            stroke: Colors.premium,
                            strokeWidth: 3,
                        },
                    }}
                    animate={{ duration: 1500, onLoad: { duration: 1500 } }}
                />
            </VictoryChart>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
});
