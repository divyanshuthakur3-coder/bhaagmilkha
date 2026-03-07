import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { usePremium } from '@/context/PremiumContext';
import { formatPace } from '@/lib/formatters';

/**
 * Audio cues hook for km milestone announcements.
 * Uses expo-av for basic beeps and expo-speech for Premium AI Coaching.
 */
export function useAudioCues() {
    const lastMilestoneRef = useRef(0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const { isPremium } = usePremium();

    const playBeep = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            // Check if file might exist (dynamically) or just skip if it's missing from repo
            // console.log('Playing milestone sound...');

            /* 
               Removing require() which crashes if file is missing. 
               Uncomment once you add assets/milestone.mp3
            const { sound } = await Audio.Sound.createAsync(
                require('@/assets/milestone.mp3'),
                { shouldPlay: true, volume: 1.0 }
            );
            soundRef.current = sound;
            */
        } catch (err) {
            console.warn('Beep failed:', err);
        }
    };

    const speakStats = async (milestone: number, avgPace: number) => {
        if (!isPremium) return;

        try {
            const paceStr = formatPace(avgPace, 'km').replace('min/km', 'minutes per kilometer');
            const message = `Kilometer ${milestone} completed. Your average pace is ${paceStr}. Keep it up!`;

            Speech.speak(message, {
                rate: 0.9,
                pitch: 1.1,
                volume: 1.0,
            });
        } catch (err) {
            console.error('Speech failed:', err);
        }
    };

    const checkMilestone = useCallback(async (distanceKm: number, avgPace: number = 0) => {
        const currentMilestone = Math.floor(distanceKm);

        if (currentMilestone > lastMilestoneRef.current && currentMilestone > 0) {
            lastMilestoneRef.current = currentMilestone;

            // Always play the chime (basic feedback)
            await playBeep();

            // Speak detailed stats (Premium AI Coaching)
            if (isPremium) {
                setTimeout(() => speakStats(currentMilestone, avgPace), 1500);
            }
        }
    }, [isPremium]);

    const reset = useCallback(() => {
        lastMilestoneRef.current = 0;
        if (soundRef.current) {
            soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        Speech.stop();
    }, []);

    return { checkMilestone, reset };
}
