import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibre, { CameraRef } from '@maplibre/maplibre-react-native';
import { Coordinate } from '@/lib/types';
import { Colors } from '@/constants/colors';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

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
    const cameraRef = useRef<CameraRef>(null);

    const validCoords = useMemo(() => coordinates
        .filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number')
        .map(c => [c.lng, c.lat]), [coordinates]);

    useEffect(() => {
        if (mapReady && validCoords.length >= 2 && cameraRef.current) {
            let minLng = validCoords[0][0];
            let maxLng = validCoords[0][0];
            let minLat = validCoords[0][1];
            let maxLat = validCoords[0][1];

            validCoords.forEach(c => {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
            });

            const pLat = (maxLat - minLat) * 0.1;
            const pLng = (maxLng - minLng) * 0.1;

            cameraRef.current.fitBounds(
                [maxLng + pLng, maxLat + pLat],
                [minLng - pLng, minLat - pLat],
                20,
                0
            );
        }
    }, [mapReady, validCoords]);

    if (validCoords.length < 2) {
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
            <MapLibre.MapView
                style={styles.map}
                mapStyle={DETAILED_FREE_STYLE}
                onDidFinishLoadingMap={() => setMapReady(true)}
                scrollEnabled={interactive}
                zoomEnabled={interactive}
                rotateEnabled={interactive}
                pitchEnabled={false}
                logoEnabled={false}
                attributionEnabled={false}
                surfaceView={true}
            >
                <MapLibre.Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: validCoords[Math.floor(validCoords.length / 2)],
                        zoomLevel: 14,
                    }}
                />

                <MapLibre.ShapeSource
                    id="routeSourceHistory"
                    shape={{
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: validCoords },
                        properties: {}
                    }}
                >
                    <MapLibre.LineLayer
                        id="routeLayerHistory"
                        style={{
                            lineColor: Colors.accent,
                            lineWidth: 4,
                            lineJoin: 'round',
                            lineCap: 'round',
                        }}
                    />
                </MapLibre.ShapeSource>

                <MapLibre.MarkerView coordinate={validCoords[0]}>
                    <View style={styles.startDot} />
                </MapLibre.MarkerView>

                <MapLibre.MarkerView coordinate={validCoords[validCoords.length - 1]}>
                    <View style={styles.endDot} />
                </MapLibre.MarkerView>
            </MapLibre.MapView>
        </View>
    );
}

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
        borderColor: '#05050A',
    },
    endDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.error,
        borderWidth: 2,
        borderColor: '#05050A',
    },
});
