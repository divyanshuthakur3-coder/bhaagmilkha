import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

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

    useEffect(() => {
        // Load premium status
        AsyncStorage.getItem('is_premium').then((val) => {
            if (val === 'true') {
                setIsPremium(true);
            }
        });
    }, []);

    const unlockPremium = () => {
        setIsPremium(true);
        AsyncStorage.setItem('is_premium', 'true');
        Alert.alert('💎 Premium Unlocked', 'Thank you for upgrading! All features are now unlocked.');
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
