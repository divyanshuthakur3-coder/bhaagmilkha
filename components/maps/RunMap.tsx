import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Coordinate } from '@/lib/types';
import { Colors } from '@/constants/colors';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface RunMapProps {
    coordinates: Coordinate[];
    height?: number;
    interactive?: boolean;
}

export function RunMap({
    coordinates,
    height = 200,
    interactive = false,
}: RunMapProps) {
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (mapReady && coordinates.length >= 2 && mapRef.current) {
            mapRef.current.fitToCoordinates(
                coordinates.map((c) => ({ latitude: c.lat, longitude: c.lng })),
                {
                    edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                    animated: false,
                }
            );
        }
    }, [mapReady, coordinates]);

    if (coordinates.length < 2) {
        return (
            <View style={[styles.placeholder, { height }]}>
                <LoadingSkeleton width="100%" height={height} borderRadius={12} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { height }]}>
            {!mapReady && (
                <LoadingSkeleton
                    width="100%"
                    height={height}
                    borderRadius={12}
                    style={StyleSheet.absoluteFillObject}
                />
            )}
            <MapView
                ref={mapRef}
                style={styles.map}
                onMapReady={() => setMapReady(true)}
                scrollEnabled={interactive}
                zoomEnabled={interactive}
                rotateEnabled={interactive}
                pitchEnabled={false}
                customMapStyle={darkMapStyle}
            >
                <Polyline
                    coordinates={coordinates.map((c) => ({
                        latitude: c.lat,
                        longitude: c.lng,
                    }))}
                    strokeColor={Colors.accent}
                    strokeWidth={3}
                />
                <Marker
                    coordinate={{
                        latitude: coordinates[0].lat,
                        longitude: coordinates[0].lng,
                    }}
                >
                    <View style={styles.startDot} />
                </Marker>
                <Marker
                    coordinate={{
                        latitude: coordinates[coordinates.length - 1].lat,
                        longitude: coordinates[coordinates.length - 1].lng,
                    }}
                >
                    <View style={styles.endDot} />
                </Marker>
            </MapView>
        </View>
    );
}

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
];

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    placeholder: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    startDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.success,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
    endDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.error,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
});
