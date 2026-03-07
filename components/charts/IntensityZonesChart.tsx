import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryPie, VictoryTooltip } from 'victory-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/colors';

interface IntensityZonesChartProps {
    data: { x: string; y: number; color: string }[];
}

export const IntensityZonesChart = React.memo(function IntensityZonesChart({ data }: IntensityZonesChartProps) {
    const { colors: Colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    if (!data || data.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.chartWrapper}>
                <VictoryPie
                    data={data}
                    width={200}
                    height={200}
                    innerRadius={70}
                    padAngle={4}
                    cornerRadius={6}
                    colorScale={data.map(d => d.color)}
                    labels={() => null}
                    animate={{ duration: 1500, easing: 'bounceOut' }}
                />
                <View style={styles.centerLabel}>
                    <Text style={[styles.centerTitle, { color: Colors.textSecondary }]}>EFFORT</Text>
                    <Text style={[styles.centerValue, { color: Colors.textPrimary }]}>MIX</Text>
                </View>
            </View>

            <View style={styles.legend}>
                {data.map((item, i) => (
                    <View key={i} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.legendText, { color: Colors.textPrimary }]}>{item.x}</Text>
                            <Text style={[styles.legendSubtext, { color: Colors.textMuted }]}>{item.y}% of time</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
    },
    chartWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    centerValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    legend: {
        flex: 1,
        marginLeft: Spacing.xl,
        gap: Spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '700',
    },
    legendSubtext: {
        fontSize: 10,
    },
});
