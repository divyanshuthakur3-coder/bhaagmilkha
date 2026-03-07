import { useEffect, useRef, useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { Coordinate } from '@/lib/types';
import { calculateSpeed } from '@/lib/paceCalculator';
import { KalmanFilter, isOutlier } from '@/lib/gpsProcessing';

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
        if (locations && locations.length > 0) {
            const loc = locations[locations.length - 1];

            // Filter out low-accuracy GPS points in background
            if (loc.coords.accuracy && loc.coords.accuracy > 20) {
                return;
            }

            // Store the latest background location
            // We use globalThis as a temporary bridge to the store/hook
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
    const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const watchRef = useRef<Location.LocationSubscription | null>(null);
    const lowSpeedCountRef = useRef(0);
    const coordinatesRef = useRef<Coordinate[]>([]);
    const latFilter = useRef(new KalmanFilter()).current;
    const lngFilter = useRef(new KalmanFilter()).current;

    const requestPermissions = useCallback(async (): Promise<boolean> => {
        try {
            // 1. Check if location services (GPS) are enabled globally
            const gpsEnabled = await Location.hasServicesEnabledAsync();
            if (!gpsEnabled) {
                Alert.alert(
                    'GPS is Disabled',
                    'Please turn on your device location (GPS) to track your runs.',
                    [{ text: 'OK' }]
                );
                return false;
            }

            // 2. Request Foreground Permission (Step 1)
            const { status: foreground } = await Location.requestForegroundPermissionsAsync();
            if (foreground !== 'granted') {
                Alert.alert(
                    'Location Required',
                    'RunTracker needs location access to track your route.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return false;
            }

            // 3. Request Background Permission (Step 2 - crucial for Android 10+)
            if (Platform.OS === 'android') {
                const { status: background } = await Location.getBackgroundPermissionsAsync();

                if (background !== 'granted') {
                    // Inform the user WHY we need "Always allow"
                    await new Promise<void>((resolve) => {
                        Alert.alert(
                            'Background Tracking',
                            'To track your run while the screen is off or while using other apps, please select "Allow all the time" in the next screen.',
                            [{ text: 'Continue', onPress: () => resolve() }],
                            { cancelable: false }
                        );
                    });

                    const { status: bgRequest } = await Location.requestBackgroundPermissionsAsync();
                    if (bgRequest !== 'granted') {
                        // We don't HARD block here because foreground might be enough for some, 
                        // but background tracking will fail/stop if app is killed.
                        console.warn('Background permission denied.');
                    }
                }

                // 4. Battery Optimization Check (Xiaomi, Samsung, etc. fixes)
                const isOptimized = await Battery.isBatteryOptimizationEnabledAsync();
                if (isOptimized) {
                    Alert.alert(
                        'Reliable Tracking',
                        'To prevent Android from stopping your run tracking, please disable battery optimization for RunTracker in your system settings.',
                        [
                            { text: 'Later', style: 'cancel' },
                            {
                                text: 'Settings',
                                onPress: () => Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')
                            }
                        ]
                    );
                }
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

        coordinatesRef.current = [];
        setIsTracking(true);
        setIsAutoPaused(false);
        lowSpeedCountRef.current = 0;

        try {
            // Foreground location watch
            watchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 3000,
                    distanceInterval: 2,
                },
                (location) => {
                    // 1. Accuracy Filter
                    if (location.coords.accuracy && location.coords.accuracy > 20) return;

                    const rawCoord: Coordinate = {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                        timestamp: location.timestamp,
                        speed: location.coords.speed ?? 0,
                        altitude: location.coords.altitude ?? undefined,
                    };

                    // 2. Outlier Rejection (Speed-based)
                    const prevCoords = coordinatesRef.current;
                    if (prevCoords.length > 0 && isOutlier(prevCoords[prevCoords.length - 1], rawCoord)) {
                        console.warn('GPS Outlier rejected:', rawCoord);
                        return;
                    }

                    // 3. Kalman Smoothing
                    if (prevCoords.length === 0) {
                        latFilter.reset(rawCoord.lat);
                        lngFilter.reset(rawCoord.lng);
                    }

                    const coord: Coordinate = {
                        ...rawCoord,
                        lat: latFilter.filter(rawCoord.lat),
                        lng: lngFilter.filter(rawCoord.lng),
                    };

                    setCurrentLocation(coord);

                    // Auto-pause detection
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
                }
            );
        } catch (err: any) {
            console.error('Foreground location tracking failed:', err);
            Alert.alert('Tracking Error', `Failed to start foreground tracking: ${err.message}`);
            setError(err.message);
            setIsTracking(false);
            return;
        }

        // Start background location tracking
        try {
            const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
            if (bgStatus === 'granted') {
                const isBgRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
                if (!isBgRunning) {
                    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 5000,
                        distanceInterval: 10,
                        deferredUpdatesInterval: 5000,
                        showsBackgroundLocationIndicator: true,
                        foregroundService: {
                            notificationTitle: 'RunTracker Live',
                            notificationBody: 'Your run is being tracked...',
                            notificationColor: '#3B82F6',
                        },
                    });
                }
            }
        } catch (err: any) {
            console.error('Background location task failed to start:', err);
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
