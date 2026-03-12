import { Ionicons } from '@expo/vector-icons';

export interface WeatherData {
    temperature: number;
    condition: string;
    icon: keyof typeof Ionicons.glyphMap;
}

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
const WEATHER_CODES: Record<number, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    0: { label: 'Clear Sky', icon: 'sunny' },
    1: { label: 'Mainly Clear', icon: 'partly-sunny' },
    2: { label: 'Partly Cloudy', icon: 'partly-sunny' },
    3: { label: 'Overcast', icon: 'cloud' },
    45: { label: 'Foggy', icon: 'cloud-outline' },
    48: { label: 'Foggy', icon: 'cloud-outline' },
    51: { label: 'Light Drizzle', icon: 'rainy-outline' },
    53: { label: 'Moderate Drizzle', icon: 'rainy-outline' },
    55: { label: 'Dense Drizzle', icon: 'rainy-outline' },
    61: { label: 'Slight Rain', icon: 'rainy' },
    63: { label: 'Moderate Rain', icon: 'rainy' },
    65: { label: 'Heavy Rain', icon: 'rainy' },
    71: { label: 'Slight Snow', icon: 'snow' },
    73: { label: 'Moderate Snow', icon: 'snow' },
    75: { label: 'Heavy Snow', icon: 'snow' },
    80: { label: 'Slight Showers', icon: 'rainy' },
    81: { label: 'Moderate Showers', icon: 'rainy' },
    82: { label: 'Violent Showers', icon: 'rainy' },
    95: { label: 'Thunderstorm', icon: 'thunderstorm' },
};

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        const data = await response.json();

        if (!data.current_weather) return null;

        const { temperature, weathercode } = data.current_weather;
        const info = WEATHER_CODES[weathercode] || { label: 'Unknown', icon: 'help-circle' };

        return {
            temperature: Math.round(temperature),
            condition: info.label,
            icon: info.icon,
        };
    } catch (err) {
        console.warn('Weather fetch failed:', err);
        return null;
    }
}
