import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useUserStore } from '@/store/useUserStore';

interface PremiumContextType {
    isPremium: boolean;
    unlockPremium: () => void;
    checkPremiumFeature: (featureName: string, onUnlock: () => void) => boolean;
}

const PremiumContext = createContext<PremiumContextType>({
    isPremium: false,
    unlockPremium: () => { },
    checkPremiumFeature: () => false,
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
    const [isPremium, setIsPremium] = useState(false);
    const profile = useUserStore((s) => s.profile);

    // Dynamic key based on current user (or global fallback)
    const getPremiumKey = () => {
        return profile?.id ? `is_premium_${profile.id}` : 'is_premium_global';
    };

    useEffect(() => {
        // Load premium status: check user-specific key AND global device key
        const userKey = profile?.id ? `is_premium_${profile.id}` : null;

        const checkStatus = async () => {
            const globalVal = await AsyncStorage.getItem('is_premium_global');
            if (globalVal === 'true') {
                setIsPremium(true);
                return;
            }

            if (userKey) {
                const userVal = await AsyncStorage.getItem(userKey);
                setIsPremium(userVal === 'true');
            } else {
                setIsPremium(false);
            }
        };

        checkStatus();
    }, [profile?.id]);

    const unlockPremium = () => {
        setIsPremium(true);
        const key = getPremiumKey();
        AsyncStorage.setItem(key, 'true');
        // If we have a profile, also ensure the global fallback is updated 
        // to maintain premium feel on device-level for this machine
        AsyncStorage.setItem('is_premium_global', 'true');

        Alert.alert('💎 Premium Unlocked', 'Thank you for upgrading! All features are now unlocked for your account.');
    };

    // Helper to check if a feature is allowed, triggers up-sell if not
    const checkPremiumFeature = (featureName: string, onUnlock: () => void) => {
        if (isPremium) {
            return true;
        }

        Alert.alert(
            '💎 Premium Feature',
            `${featureName} is a premium feature. Upgrade to unlock this and much more!`,
            [
                { text: 'Maybe Later', style: 'cancel' },
                {
                    text: 'View Premium',
                    style: 'default',
                    onPress: onUnlock,
                },
            ]
        );
        return false;
    };

    return (
        <PremiumContext.Provider value={{ isPremium, unlockPremium, checkPremiumFeature }}>
            {children}
        </PremiumContext.Provider>
    );
}

export function usePremium() {
    return useContext(PremiumContext);
}
