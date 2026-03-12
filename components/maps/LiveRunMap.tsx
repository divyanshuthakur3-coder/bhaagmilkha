import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import MapLibre, { CameraRef } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { Coordinate } from '@/lib/types';
import { Colors, Spacing, Shadows, BorderRadius, FontSize } from '@/constants/colors';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

// Higher accuracy/detail tiles for small towns
const DETAILED_FREE_STYLE = {
    version: 8,
    sources: {
        'osm': {
            type: 'raster',
            tiles: [process.env.EXPO_PUBLIC_MAP_TILE_SERVER || 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap, © CARTO'
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

interface LiveRunMapProps {
    coordinates: Coordinate[];
    currentLocation: Coordinate | null;
    ghostLocation?: Coordinate | null;
    followUser?: boolean;
    unit?: 'km' | 'mi';
}

function LiveRunMapComponent({
    coordinates,
    currentLocation,
    ghostLocation,
    followUser = true,
    unit = 'km',
}: LiveRunMapProps) {
    const [mapReady, setMapReady] = useState(false);
    const cameraRef = useRef<CameraRef>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ghostPulseAnim = useRef(new Animated.Value(1)).current;
    const hasCenteredInitial = useRef(false);

    // Pulse animations
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(ghostPulseAnim, { toValue: 1.8, duration: 1500, useNativeDriver: true }),
                Animated.timing(ghostPulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Track intervals for unit markers (Km or Mile)
    const unitMarkers = useMemo(() => {
        if (coordinates.length < 2) return [];
        
        const markers: { val: number; coord: [number, number] }[] = [];
        let totalDistKm = 0;
        const intervalKm = unit === 'mi' ? 1.60934 : 1.0;
        
        // Use a simpler distance calculation for marker positioning
        const getDist = (c1: Coordinate, c2: Coordinate) => {
            const dLat = (c2.lat - c1.lat);
            const dLng = (c2.lng - c1.lng);
            // Rough approximation for performance since it's just for markers
            return Math.sqrt(dLat * dLat + dLng * dLng) * 111; 
        };

        let nextThreshold = intervalKm;
        let lastCoord = coordinates[0];
        
        // We can skip some coordinates for marker calculation to save CPU
        for (let i = 1; i < coordinates.length; i += 5) {
            const currentCoord = coordinates[i];
            totalDistKm += getDist(lastCoord, currentCoord);
            lastCoord = currentCoord;

            if (totalDistKm >= nextThreshold) {
                markers.push({ 
                    val: markers.length + 1, 
                    coord: [currentCoord.lng, currentCoord.lat] 
                });
                nextThreshold += intervalKm;
            }
        }
        return markers;
    }, [coordinates.length > 0 ? Math.floor(coordinates.length / 10) : 0, unit]);

    // Smooth camera updates
    useEffect(() => {
        if (currentLocation && mapReady && cameraRef.current) {
            if (!hasCenteredInitial.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: [currentLocation.lng, currentLocation.lat],
                    zoomLevel: 17,
                    pitch: 45,
                    animationDuration: 2000, // Smooth fly in on first load
                });
                hasCenteredInitial.current = true;
            } else if (followUser) {
                cameraRef.current.setCamera({
                    centerCoordinate: [currentLocation.lng, currentLocation.lat],
                    zoomLevel: 17,
                    pitch: 45,
                    animationDuration: 2500, // Slower, smoother following
                });
            }
        }
    }, [currentLocation, mapReady, followUser]);

    const handleRecenter = () => {
        if (currentLocation && cameraRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            cameraRef.current.setCamera({
                centerCoordinate: [currentLocation.lng, currentLocation.lat],
                zoomLevel: 18,
                pitch: 60,
                animationDuration: 1000,
            });
        }
    };

    const routeCoords = useMemo(() => coordinates
        .filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number')
        .map(c => [c.lng, c.lat]), [coordinates]);

    const initialCenter: [number, number] = currentLocation
        ? [currentLocation.lng, currentLocation.lat]
        : [78.9629, 20.5937]; // Center of India fallback instead of Delhi

    return (
        <View style={styles.container}>
            {!mapReady && <LoadingSkeleton width="100%" height="100%" borderRadius={0} style={StyleSheet.absoluteFillObject} />}

            <MapLibre.MapView
                style={styles.map}
                mapStyle={DETAILED_FREE_STYLE}
                onDidFinishLoadingMap={() => setMapReady(true)}
                logoEnabled={false}
                attributionEnabled={false}
                pitchEnabled={true}
            >
                <MapLibre.Camera
                    ref={cameraRef}
                    zoomLevel={currentLocation ? 17 : 4}
                    pitch={currentLocation ? 45 : 0}
                    centerCoordinate={initialCenter}
                />

                {routeCoords.length >= 2 && (
                    <MapLibre.ShapeSource
                        id="routeSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: routeCoords },
                            properties: {}
                        }}
                    >
                        <MapLibre.LineLayer
                            id="routeLayer"
                            style={{
                                lineColor: Colors.accent,
                                lineWidth: 6,
                                lineJoin: 'round',
                                lineCap: 'round',
                            }}
                        />
                    </MapLibre.ShapeSource>
                )}

                {/* Unit Markers */}
                {unitMarkers.map((marker, i) => (
                    <MapLibre.MarkerView key={`m-${i}`} coordinate={marker.coord}>
                        <View style={styles.kmMarker}>
                            <Text style={styles.kmText}>{marker.val}</Text>
                        </View>
                    </MapLibre.MarkerView>
                ))}

                {ghostLocation && (
                    <MapLibre.MarkerView coordinate={[ghostLocation.lng, ghostLocation.lat]}>
                        <View style={styles.ghostMarkerPlacement}>
                            <Animated.View style={[styles.ghostPulseCircle, { transform: [{ scale: ghostPulseAnim }], opacity: 0.3 }]} />
                            <View style={styles.ghostSolidDot}>
                                <Text style={{ fontSize: 8 }}>👻</Text>
                            </View>
                            <View style={[styles.ghostLabel, { backgroundColor: Colors.surface, borderColor: Colors.premium }]}>
                                <Text style={[styles.ghostLabelText, { color: Colors.textPrimary }]}>GHOST</Text>
                            </View>
                        </View>
                    </MapLibre.MarkerView>
                )}

                {currentLocation && (
                    <MapLibre.MarkerView coordinate={[currentLocation.lng, currentLocation.lat]}>
                        <View style={styles.markerPlacement}>
                            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: 0.5 }]} />
                            <View style={styles.solidDot} />
                        </View>
                    </MapLibre.MarkerView>
                )}

                {coordinates.length > 0 && (
                    <MapLibre.MarkerView coordinate={[coordinates[0].lng, coordinates[0].lat]}>
                        <View style={styles.startBadge}>
                            <Text style={styles.startBadgeText}>🏁</Text>
                        </View>
                    </MapLibre.MarkerView>
                )}
            </MapLibre.MapView>

            {mapReady && (
                <View style={styles.uiContainer}>
                    <TouchableOpacity style={[styles.floatingBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={handleRecenter}>
                        <Text style={styles.icon}>🎯</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    uiContainer: { position: 'absolute', top: 120, right: Spacing.md },
    floatingBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        ...Shadows.lg,
    },
    icon: { fontSize: 22 },
    markerPlacement: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    pulseCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accent },
    solidDot: {
        position: 'absolute', width: 14, height: 14, borderRadius: 7,
        backgroundColor: Colors.accent, borderWidth: 2, borderColor: '#FFFFFF',
    },
    kmMarker: {
        backgroundColor: '#FFFFFF',
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.accent, ...Shadows.sm,
    },
    kmText: { fontSize: 10, fontWeight: '800', color: Colors.accent },
    startBadge: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.success, ...Shadows.sm,
    },
    startBadgeText: { fontSize: 16 },
    // Ghost Runner Styles
    ghostMarkerPlacement: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    ghostPulseCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.premium },
    ghostSolidDot: {
        position: 'absolute', width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1.5, borderColor: Colors.premium,
        alignItems: 'center', justifyContent: 'center', ...Shadows.glow(Colors.premium)
    },
    ghostLabel: {
        position: 'absolute', bottom: -12, paddingHorizontal: 6, paddingVertical: 1,
        borderRadius: 4, borderWidth: 1, opacity: 0.9, ...Shadows.sm
    },
    ghostLabelText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
});

export const LiveRunMap = React.memo(LiveRunMapComponent);
