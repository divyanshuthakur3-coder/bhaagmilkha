import { useRef, useCallback, useState, useEffect } from 'react';

interface UseRunTimerReturn {
    elapsedSeconds: number;
    isRunning: boolean;
    start: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
}

/**
 * Timer hook using useRef for interval ID (avoids re-render loops).
 * Uses Date.now() delta for drift correction.
 */
export function useRunTimer(): UseRunTimerReturn {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const accumulatedRef = useRef<number>(0);

    const clearTimer = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        clearTimer();
        accumulatedRef.current = 0;
        startTimeRef.current = Date.now();
        setIsRunning(true);
        setElapsedSeconds(0);

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = accumulatedRef.current + (now - startTimeRef.current) / 1000;
            setElapsedSeconds(Math.floor(elapsed));
        }, 1000);
    }, [clearTimer]);

    const pause = useCallback(() => {
        if (!isRunning) return;
        clearTimer();
        accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
        setIsRunning(false);
    }, [isRunning, clearTimer]);

    const resume = useCallback(() => {
        if (isRunning) return;
        startTimeRef.current = Date.now();
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = accumulatedRef.current + (now - startTimeRef.current) / 1000;
            setElapsedSeconds(Math.floor(elapsed));
        }, 1000);
    }, [isRunning]);

    const reset = useCallback(() => {
        clearTimer();
        accumulatedRef.current = 0;
        startTimeRef.current = 0;
        setIsRunning(false);
        setElapsedSeconds(0);
    }, [clearTimer]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    return { elapsedSeconds, isRunning, start, pause, resume, reset };
}
