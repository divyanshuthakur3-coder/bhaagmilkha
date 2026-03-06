import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Coordinate } from '@/lib/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface ReplayMapProps {
    coordinates: Coordinate[];
    height?: number;
    onClose: () => void;
}

export function ReplayMap({ coordinates, height = 400, onClose }: ReplayMapProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const mapRef = useRef<MapView>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const animate = () => {
        setCurrentIndex((prev) => {
            if (prev >= coordinates.length - 1) {
                setIsPlaying(false);
                if (timerRef.current) clearInterval(timerRef.current);
                return prev;
            }
            return prev + 1;
        });
    };

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(animate, 50);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying]);

    useEffect(() => {
        // Auto-center map on runner
        if (mapRef.current && coordinates[currentIndex]) {
            mapRef.current.animateToRegion({
                latitude: coordinates[currentIndex].lat,
                longitude: coordinates[currentIndex].lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 100);
        }
    }, [currentIndex]);

    const activeCoords = coordinates.slice(0, currentIndex + 1);

    return (
        <View style={[styles.container, { height }]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: coordinates[0].lat,
                    longitude: coordinates[0].lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Polyline
                    coordinates={activeCoords.map(c => ({ latitude: c.lat, longitude: c.lng }))}
                    strokeColor={Colors.accent}
                    strokeWidth={4}
                />
                <Marker
                    coordinate={{
                        latitude: coordinates[currentIndex].lat,
                        longitude: coordinates[currentIndex].lng,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View style={styles.runnerContainer}>
                        <View style={styles.runnerPulse} />
                        <View style={styles.runnerDot} />
                    </View>
                </Marker>
            </MapView>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => {
                        if (currentIndex >= coordinates.length - 1) setCurrentIndex(0);
                        setIsPlaying(!isPlaying);
                    }}
                >
                    <Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${(currentIndex / coordinates.length) * 100}%` }]} />
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        backgroundColor: Colors.background,
    },
    map: {
        flex: 1,
    },
    runnerContainer: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    runnerPulse: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.accentGlow,
        opacity: 0.6,
    },
    runnerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.accent,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
    controls: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: Spacing.lg,
        right: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
    },
    controlBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlIcon: {
        fontSize: 20,
        color: Colors.textPrimary,
    },
    progressContainer: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.accent,
    },
    closeBtn: {
        padding: Spacing.xs,
    },
    closeText: {
        color: Colors.textPrimary,
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
});
