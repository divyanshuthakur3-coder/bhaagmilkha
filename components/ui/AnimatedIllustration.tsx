import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing } from '@/constants/colors';

interface AnimatedIllustrationProps {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    size?: number;
}

export function AnimatedIllustration({ icon, color, size = 64 }: AnimatedIllustrationProps) {
    const { colors: Colors } = useTheme();

    // Floating animation
    const translateY = useSharedValue(0);

    // Pulsing background glow
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.2);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const pulsingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.glowSphere,
                    { backgroundColor: color },
                    pulsingStyle,
                ]}
            />
            <Animated.View style={[styles.iconWrapper, floatingStyle, { backgroundColor: Colors.surface, borderColor: Colors.borderLight }]}>
                <Ionicons name={icon} size={size} color={color} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 140,
        height: 140,
        marginBottom: Spacing.xl,
    },
    glowSphere: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        filter: 'blur(10px)', // Web/New RN blur
    },
    iconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
});
