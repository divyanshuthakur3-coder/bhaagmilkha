export const Colors = {
    background: '#05050A', // Deeper OLED black
    backgroundAlt: '#0A0A12',
    surface: '#15151F',
    surfaceLight: '#1C1C28',
    surfaceGlass: 'rgba(255, 255, 255, 0.05)', // Increased opacity for better visibility

    accent: '#3B82F6',
    accentLight: '#60A5FA',
    accentDark: '#2563EB',
    accentGlow: 'rgba(59, 130, 246, 0.15)', // Softer glow

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

    border: 'rgba(255, 255, 255, 0.05)', // Softer subtle borders
    borderLight: 'rgba(255, 255, 255, 0.15)',
    borderAccent: 'rgba(59, 130, 246, 0.3)',

    overlay: 'rgba(0, 0, 0, 0.75)',
    overlayLight: 'rgba(0, 0, 0, 0.45)',

    gradientStart: '#2563EB', // Deeper blue start
    gradientMiddle: '#4F46E5', // Indigo middle
    gradientEnd: '#8B5CF6', // Purple end

    gradientSuccessStart: '#10B981',
    gradientSuccessEnd: '#059669',

    gradientWarningStart: '#F59E0B',
    gradientWarningEnd: '#D97706',

    mapDark: '#141425',

    premium: '#FFD700',
    premiumGlow: 'rgba(255, 215, 0, 0.2)',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 48,
};

export const FontSize = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
    hero: 48,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 12,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 24, // Wider, softer glow spread
        elevation: 8,
    }),
};
