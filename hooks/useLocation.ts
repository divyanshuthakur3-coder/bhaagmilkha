import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Coordinate } from '@/lib/types';
import { calculateSpeed } from '@/lib/paceCalculator';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const AUTO_PAUSE_SPEED_THRESHOLD = 0.5; // m/s
const AUTO_PAUSE_READINGS_THRESHOLD = 5; // consecutive low-speed readings

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        // Background locations are processed via the store
        // This task just keeps GPS active in background
        if (locations && locations.length > 0) {
            const loc = locations[locations.length - 1];
            // Store the latest background location
            (globalThis as any).__lastBackgroundLocation = {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                timestamp: loc.timestamp,
                speed: loc.coords.speed ?? 0,
                altitude: loc.coords.altitude ?? undefined,
            };
        }
    }
});

interface UseLocationReturn {
    coordinates: Coordinate[];
    currentLocation: Coordinate | null;
    isTracking: boolean;
    isAutoPaused: boolean;
    hasPermission: boolean;
    error: string | null;
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    requestPermissions: () => Promise<boolean>;
}

export function useLocation(): UseLocationReturn {
    const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const watchRef = useRef<Location.LocationSubscription | null>(null);
    const lowSpeedCountRef = useRef(0);
    const coordinatesRef = useRef<Coordinate[]>([]);

    const requestPermissions = useCallback(async (): Promise<boolean> => {
        try {
            const { status: foreground } = await Location.requestForegroundPermissionsAsync();
            if (foreground !== 'granted') {
                setError('Foreground location permission denied');
                return false;
            }

            const { status: background } = await Location.requestBackgroundPermissionsAsync();
            if (background !== 'granted') {
                console.warn('Background location permission denied — tracking will only work in foreground');
            }

            setHasPermission(true);
            setError(null);
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const startTracking = useCallback(async () => {
        const permitted = await requestPermissions();
        if (!permitted) return;

        setCoordinates([]);
        coordinatesRef.current = [];
        setIsTracking(true);
        setIsAutoPaused(false);
        lowSpeedCountRef.current = 0;

        // Foreground location watch
        watchRef.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 3000,
                distanceInterval: 2,
            },
            (location) => {
                const coord: Coordinate = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    timestamp: location.timestamp,
                    speed: location.coords.speed ?? 0,
                    altitude: location.coords.altitude ?? undefined,
                };

                setCurrentLocation(coord);

                // Auto-pause detection
                const prevCoords = coordinatesRef.current;
                if (prevCoords.length > 0) {
                    const speed = calculateSpeed(prevCoords[prevCoords.length - 1], coord);
                    if (speed < AUTO_PAUSE_SPEED_THRESHOLD) {
                        lowSpeedCountRef.current++;
                        if (lowSpeedCountRef.current >= AUTO_PAUSE_READINGS_THRESHOLD) {
                            setIsAutoPaused(true);
                            return; // Don't add coordinate when auto-paused
                        }
                    } else {
                        lowSpeedCountRef.current = 0;
                        setIsAutoPaused(false);
                    }
                }

                coordinatesRef.current = [...coordinatesRef.current, coord];
                setCoordinates((prev) => [...prev, coord]);
            }
        );

        // Start background location tracking
        try {
            const isBgRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            if (!isBgRunning) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 3000,
                    distanceInterval: 2,
                    deferredUpdatesInterval: 3000,
                    showsBackgroundLocationIndicator: true,
                    foregroundService: {
                        notificationTitle: 'RunTracker',
                        notificationBody: 'Tracking your run...',
                        notificationColor: '#3B82F6',
                    },
                });
            }
        } catch (err) {
            console.warn('Background location not available:', err);
        }
    }, [requestPermissions]);

    const stopTracking = useCallback(async () => {
        // Stop foreground watch
        if (watchRef.current) {
            watchRef.current.remove();
            watchRef.current = null;
        }

        // Stop background task
        try {
            const isBgRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            if (isBgRunning) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            }
        } catch (err) {
            console.warn('Error stopping background location:', err);
        }

        setIsTracking(false);
        setIsAutoPaused(false);
        lowSpeedCountRef.current = 0;
    }, []);

    // Cleanup  
    useEffect(() => {
        return () => {
            if (watchRef.current) {
                watchRef.current.remove();
            }
        };
    }, []);

    return {
        coordinates,
        currentLocation,
        isTracking,
        isAutoPaused,
        hasPermission,
        error,
        startTracking,
        stopTracking,
        requestPermissions,
    };
}
