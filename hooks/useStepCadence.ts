import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';

export function useStepCadence(isActive: boolean, isPaused: boolean) {
    const [cadence, setCadence] = useState(0); // steps per minute
    const [totalSteps, setTotalSteps] = useState(0);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    // Tracking refs
    const lastSteps = useRef(0);
    const lastUpdateTime = useRef(Date.now());
    const cadenceHistory = useRef<number[]>([]);

    useEffect(() => {
        Pedometer.isAvailableAsync().then(
            result => setIsAvailable(result),
            error => {
                console.log('Pedometer not available:', error);
                setIsAvailable(false);
            }
        );
    }, []);

    useEffect(() => {
        if (!isActive || isPaused || !isAvailable) {
            setCadence(0);
            return;
        }

        let subscription: Pedometer.Subscription | null = null;

        lastSteps.current = 0;
        lastUpdateTime.current = Date.now();
        setTotalSteps(0);
        cadenceHistory.current = [];

        // Start watching steps
        subscription = Pedometer.watchStepCount(result => {
            const now = Date.now();
            const timeDiffSec = (now - lastUpdateTime.current) / 1000;

            setTotalSteps(result.steps);

            // Calculate instantaneous SPM every ~3 seconds to avoid erratic values
            if (timeDiffSec >= 3) {
                const stepsDiff = result.steps - lastSteps.current;

                // SPM = (steps / seconds) * 60
                const instCadence = (stepsDiff / timeDiffSec) * 60;

                cadenceHistory.current.push(instCadence);
                if (cadenceHistory.current.length > 4) {
                    cadenceHistory.current.shift(); // Keep last 4 readings (approx 12 seconds)
                }

                const avgCadence = cadenceHistory.current.reduce((a, b) => a + b, 0) / cadenceHistory.current.length;
                setCadence(Math.round(avgCadence));

                lastSteps.current = result.steps;
                lastUpdateTime.current = now;
            }
        });

        // If no new steps after several seconds, drop cadence to 0
        const intervalId = setInterval(() => {
            const timeSinceLastUpdate = (Date.now() - lastUpdateTime.current) / 1000;
            if (timeSinceLastUpdate > 5) {
                setCadence(0);
                cadenceHistory.current = [];
            }
        }, 5000);

        return () => {
            clearInterval(intervalId);
            if (subscription) {
                subscription.remove();
            }
        };
    }, [isActive, isPaused, isAvailable]);

    return { cadence, totalSteps, isAvailable };
}
