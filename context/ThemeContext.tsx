import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceLight: string;
    surfaceGlass: string;

    accent: string;
    accentLight: string;
    accentDark: string;
    accentGlow: string;

    secondary: string;
    secondaryLight: string;
    secondaryGlow: string;

    success: string;
    successLight: string;
    successGlow: string;

    warning: string;
    warningLight: string;
    warningGlow: string;

    error: string;
    errorLight: string;
    errorGlow: string;

    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;

    border: string;
    borderLight: string;
    borderAccent: string;

    overlay: string;
    overlayLight: string;

    gradientStart: string;
    gradientMiddle: string;
    gradientEnd: string;

    gradientSuccessStart: string;
    gradientSuccessEnd: string;

    gradientWarningStart: string;
    gradientWarningEnd: string;

    mapDark: string;

    // Premium
    premium: string;
    premiumGlow: string;
}

export const DarkTheme: ThemeColors = {
    background: '#0A0A0F',
    backgroundAlt: '#0F0F18',
    surface: '#141425',
    surfaceLight: '#1E1E38',
    surfaceGlass: 'rgba(30, 30, 60, 0.6)',

    accent: '#3B82F6',
    accentLight: '#60A5FA',
    accentDark: '#2563EB',
    accentGlow: 'rgba(59, 130, 246, 0.25)',

    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryGlow: 'rgba(139, 92, 246, 0.25)',

    success: '#10B981',
    successLight: '#34D399',
    successGlow: 'rgba(16, 185, 129, 0.2)',

    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningGlow: 'rgba(245, 158, 11, 0.2)',

    error: '#EF4444',
    errorLight: '#F87171',
    errorGlow: 'rgba(239, 68, 68, 0.2)',

    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    textAccent: '#93C5FD',

    border: '#1F1F3A',
    borderLight: '#2D2D50',
    borderAccent: 'rgba(59, 130, 246, 0.3)',

    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',

    gradientStart: '#3B82F6',
    gradientMiddle: '#6366F1',
    gradientEnd: '#8B5CF6',

    gradientSuccessStart: '#10B981',
    gradientSuccessEnd: '#059669',

    gradientWarningStart: '#F59E0B',
    gradientWarningEnd: '#D97706',

    mapDark: '#141425',

    premium: '#FFD700',
    premiumGlow: 'rgba(255, 215, 0, 0.2)',
};

export const LightTheme: ThemeColors = {
    background: '#F8FAFC',
    backgroundAlt: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceLight: '#F1F5F9',
    surfaceGlass: 'rgba(255, 255, 255, 0.8)',

    accent: '#2563EB',
    accentLight: '#3B82F6',
    accentDark: '#1D4ED8',
    accentGlow: 'rgba(37, 99, 235, 0.15)',

    secondary: '#7C3AED',
    secondaryLight: '#8B5CF6',
    secondaryGlow: 'rgba(124, 58, 237, 0.15)',

    success: '#059669',
    successLight: '#10B981',
    successGlow: 'rgba(5, 150, 105, 0.1)',

    warning: '#D97706',
    warningLight: '#F59E0B',
    warningGlow: 'rgba(217, 119, 6, 0.1)',

    error: '#DC2626',
    errorLight: '#EF4444',
    errorGlow: 'rgba(220, 38, 38, 0.1)',

    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textAccent: '#2563EB',

    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    borderAccent: 'rgba(37, 99, 235, 0.2)',

    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.2)',

    gradientStart: '#2563EB',
    gradientMiddle: '#4F46E5',
    gradientEnd: '#7C3AED',

    gradientSuccessStart: '#059669',
    gradientSuccessEnd: '#047857',

    gradientWarningStart: '#D97706',
    gradientWarningEnd: '#B45309',

    mapDark: '#FFFFFF',

    premium: '#D4A517',
    premiumGlow: 'rgba(212, 165, 23, 0.15)',
};

interface ThemeContextType {
    theme: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    isLight: boolean;
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    colors: DarkTheme,
    isDark: true,
    isLight: false,
    toggleTheme: () => { },
    setTheme: () => { },
});

const THEME_KEY = 'theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>('dark');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_KEY);
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeState(savedTheme as ThemeMode);
            }
        } catch (e) {
            console.error('Failed to load theme', e);
        } finally {
            setIsLoading(false);
        }
    };

    const setTheme = async (mode: ThemeMode) => {
        try {
            setThemeState(mode);
            await AsyncStorage.setItem(THEME_KEY, mode);
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    const toggleTheme = () => {
        const nextMode = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextMode);
    };

    const colors = theme === 'dark' ? DarkTheme : LightTheme;
    const isDark = theme === 'dark';
    const isLight = theme === 'light';

    if (isLoading) {
        return null; // Or a splash screen
    }

    return (
        <ThemeContext.Provider value={{ theme, colors, isDark, isLight, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
