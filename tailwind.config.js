/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0F0F0F',
                surface: '#1A1A2E',
                'surface-light': '#252540',
                accent: '#3B82F6',
                'accent-light': '#60A5FA',
                success: '#10B981',
                warning: '#F59E0B',
                error: '#EF4444',
                'text-primary': '#FFFFFF',
                'text-secondary': '#9CA3AF',
                'text-muted': '#6B7280',
                border: '#2D2D44',
            },
            fontFamily: {
                sans: ['Inter', 'System'],
                mono: ['SpaceMono', 'monospace'],
            },
        },
    },
    plugins: [],
};
