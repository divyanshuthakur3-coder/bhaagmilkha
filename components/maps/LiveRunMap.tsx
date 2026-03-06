import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Coordinate } from '@/lib/types';
import { Colors } from '@/constants/colors';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface LiveRunMapProps {
    coordinates: Coordinate[];
    currentLocation: Coordinate | null;
    followUser?: boolean;
}

export function LiveRunMap({
    coordinates,
    currentLocation,
    followUser = true,
}: LiveRunMapProps) {
    const [mapReady, setMapReady] = useState(false);

    const region = currentLocation
        ? {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        }
        : {
            latitude: 28.6139,
            longitude: 77.2090,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

    return (
        <View style={styles.container}>
            {!mapReady && (
                <LoadingSkeleton
                    width="100%"
                    height={400}
                    borderRadius={0}
                    style={StyleSheet.absoluteFillObject}
                />
            )}
            <MapView
                style={styles.map}
                initialRegion={region}
                region={followUser && currentLocation ? region : undefined}
                onMapReady={() => setMapReady(true)}
                showsUserLocation={false}
                showsMyLocationButton={false}
                customMapStyle={darkMapStyle}
                mapType="standard"
            >
                {coordinates.length >= 2 && (
                    <Polyline
                        coordinates={coordinates.map((c) => ({
                            latitude: c.lat,
                            longitude: c.lng,
                        }))}
                        strokeColor={Colors.accent}
                        strokeWidth={4}
                    />
                )}
                {currentLocation && (
                    <Marker
                        coordinate={{
                            latitude: currentLocation.lat,
                            longitude: currentLocation.lng,
                        }}
                    >
                        <View style={styles.currentLocationMarker}>
                            <View style={styles.currentLocationDot} />
                        </View>
                    </Marker>
                )}
                {coordinates.length > 0 && (
                    <Marker
                        coordinate={{
                            latitude: coordinates[0].lat,
                            longitude: coordinates[0].lng,
                        }}
                    >
                        <View style={styles.startMarker}>
                            <View style={styles.startDot} />
                        </View>
                    </Marker>
                )}
            </MapView>
        </View>
    );
}

// Dark map style matching app theme
const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    {
        featureType: 'administrative.country',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#4b6878' }],
    },
    {
        featureType: 'land',
        elementType: 'geometry',
        stylers: [{ color: '#0e1626' }],
    },
    {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#283d6a' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#304a7d' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#255763' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0e1626' }],
    },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    currentLocationMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentLocationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.accent,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
    startMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    startDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.success,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
});
