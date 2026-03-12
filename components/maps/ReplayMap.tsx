import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapLibre, { CameraRef } from '@maplibre/maplibre-react-native';
import { Coordinate } from '@/lib/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/colors';

const DETAILED_FREE_STYLE = {
    version: 8,
    sources: {
        'osm': {
            type: 'raster',
            tiles: [process.env.EXPO_PUBLIC_MAP_TILE_SERVER || 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
        }
    },
    layers: [
        {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 20
        }
    ]
};

interface ReplayMapProps {
    coordinates: Coordinate[];
    height?: number;
    onClose: () => void;
}

export function ReplayMap({ coordinates, height = 400, onClose }: ReplayMapProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const mapRef = useRef<CameraRef>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const validCoords = useMemo(() => coordinates
        .filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number')
        .map(c => [c.lng, c.lat] as [number, number]), [coordinates]);

    const animate = () => {
        setCurrentIndex((prev) => {
            if (prev >= validCoords.length - 1) {
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
    }, [isPlaying, validCoords.length]);

    useEffect(() => {
        // Auto-center map on runner
        if (mapRef.current && validCoords[currentIndex]) {
            mapRef.current.setCamera({
                centerCoordinate: validCoords[currentIndex],
                zoomLevel: 17,
                animationDuration: 100,
            });
        }
    }, [currentIndex, validCoords]);

    if (validCoords.length === 0) return null;

    const activeCoords = validCoords.slice(0, currentIndex + 1);

    return (
        <View style={[styles.container, { height }]}>
            <MapLibre.MapView
                style={styles.map}
                mapStyle={DETAILED_FREE_STYLE}
                logoEnabled={false}
                attributionEnabled={false}
                pitchEnabled={false}
                surfaceView={true}
            >
                <MapLibre.Camera
                    ref={mapRef}
                    defaultSettings={{
                        centerCoordinate: validCoords[0],
                        zoomLevel: 17,
                    }}
                />

                {activeCoords.length >= 2 && (
                    <MapLibre.ShapeSource
                        id="replayRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: activeCoords },
                            properties: {}
                        }}
                    >
                        <MapLibre.LineLayer
                            id="replayRouteLayer"
                            style={{
                                lineColor: Colors.accent,
                                lineWidth: 4,
                                lineJoin: 'round',
                                lineCap: 'round',
                            }}
                        />
                    </MapLibre.ShapeSource>
                )}

                <MapLibre.MarkerView coordinate={validCoords[currentIndex]} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.runnerContainer}>
                        <View style={styles.runnerPulse} />
                        <View style={styles.runnerDot} />
                    </View>
                </MapLibre.MarkerView>
            </MapLibre.MapView>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => {
                        if (currentIndex >= validCoords.length - 1) setCurrentIndex(0);
                        setIsPlaying(!isPlaying);
                    }}
                >
                    <Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${(currentIndex / validCoords.length) * 100}%` }]} />
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
        borderColor: Colors.background,
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
