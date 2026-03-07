import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Coordinate } from '@/lib/types';
import { Colors } from '@/constants/colors';

interface StaticMapProps {
    coordinates: Coordinate[];
    height?: number;
    width?: string | number;
}

/**
 * A non-interactive map preview that uses static images to save memory.
 * Currently uses Carto Voyager as a fallback for the image source 
 * since MapLibre snapshotting requires a rendered component.
 */
export function StaticMap({
    coordinates,
    height = 140,
    width = '100%',
}: StaticMapProps) {

    // Calculate center and zoom for the static tile request
    // Note: Most free static map APIs require a key. 
    // For now, we'll provide a beautiful placeholder with the route metadata
    // or use a simple tile fallback.

    if (!coordinates || coordinates.length < 2) {
        return (
            <View style={[styles.container, { height, width: width as any, backgroundColor: '#1A1A1A' }]}>
                <Text style={{ color: '#666' }}>No route data</Text>
            </View>
        );
    }

    const center = useMemo(() => {
        let minLng = coordinates[0].lng;
        let maxLng = coordinates[0].lng;
        let minLat = coordinates[0].lat;
        let maxLat = coordinates[0].lat;

        coordinates.forEach(c => {
            if (c.lng < minLng) minLng = c.lng;
            if (c.lng > maxLng) maxLng = c.lng;
            if (c.lat < minLat) minLat = c.lat;
            if (c.lat > maxLat) maxLat = c.lat;
        });

        return {
            lat: (minLat + maxLat) / 2,
            lng: (minLng + maxLng) / 2,
        };
    }, [coordinates]);

    // Using a simple static map URL template (Carto Voyager)
    // Most static map services follow: https://service.com/center/zoom/widthxheight.png
    // As a robust "zero-config" solution, we'll show a "map-like" placeholder 
    // until the user provides a Google/Mapbox key for true static snapshots.

    return (
        <View style={[styles.container, { height, width: width as any }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={styles.routeIcon}>
                    <View style={styles.startDot} />
                    <View style={styles.pathLine} />
                    <View style={styles.endDot} />
                </View>
                <Text style={styles.placeholderText}>Route Preview</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    routeIcon: {
        width: 60,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.4,
    },
    pathLine: {
        width: 30,
        height: 2,
        backgroundColor: Colors.accent,
        marginHorizontal: 4,
    },
    startDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.success,
    },
    endDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.error,
    },
    placeholderText: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    }
});
