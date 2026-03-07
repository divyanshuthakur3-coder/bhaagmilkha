import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
    withSpring
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Spacing } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
    progress: number; // 0 to 1
    size: number;
    strokeWidth: number;
    color: string;
    gradientId: string;
    index: number;
}

const Ring = ({ progress, size, strokeWidth, color, gradientId, index }: RingProps) => {
    const radius = (size - strokeWidth) / 2 - (index * (strokeWidth + 4));
    const circumference = 2 * Math.PI * radius;
    const animatedProgress = useSharedValue(0);

    React.useEffect(() => {
        animatedProgress.value = withTiming(progress, { duration: 1500 });
    }, [progress]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - animatedProgress.value),
    }));

    return (
        <>
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.1}
                fill="transparent"
            />
            <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeLinecap="round"
                fill="transparent"
                animatedProps={animatedProps}
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
            />
        </>
    );
};

interface ProgressRingsProps {
    rings: {
        progress: number;
        label: string;
        icon: string;
        colors: [string, string];
    }[];
}

export const ProgressRings = React.memo(function ProgressRings({ rings }: ProgressRingsProps) {
    const { colors: Colors } = useTheme();
    const size = 180;
    const strokeWidth = 14;

    return (
        <View style={styles.container}>
            <View style={styles.svgWrapper}>
                <Svg width={size} height={size}>
                    <Defs>
                        {rings.map((ring, i) => (
                            <LinearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0%" stopColor={ring.colors[0]} />
                                <Stop offset="100%" stopColor={ring.colors[1]} />
                            </LinearGradient>
                        ))}
                    </Defs>
                    {rings.map((ring, i) => (
                        <Ring
                            key={i}
                            index={i}
                            progress={Math.min(1, ring.progress)}
                            size={size}
                            strokeWidth={strokeWidth}
                            color={ring.colors[0]}
                            gradientId={`grad-${i}`}
                        />
                    ))}
                </Svg>
            </View>
            <View style={styles.legend}>
                {rings.map((ring, i) => (
                    <View key={i} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: ring.colors[0] }]} />
                        <Text style={[styles.legendText, { color: Colors.textPrimary }]}>
                            {Math.round(ring.progress * 100)}% {ring.label}
                        </Text>
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
    svgWrapper: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    legend: {
        marginLeft: Spacing.xl,
        gap: Spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
