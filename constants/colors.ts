export const Colors = {
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
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    }),
};
