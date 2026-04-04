import type { WeatherData } from '@/types';

export type { WeatherData };

// Open-Meteo API - Free weather API without API key required
const BASE_URL = 'https://api.open-meteo.com/v1';

// City coordinates
const cityCoords: Record<string, { lat: number; lon: number; name: string }> = {
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  kyoto: { lat: 35.0116, lon: 135.7681, name: 'Kyoto' },
  osaka: { lat: 34.6937, lon: 135.5023, name: 'Osaka' },
  nara: { lat: 34.6851, lon: 135.8048, name: 'Nara' },
};

// WMO Weather interpretation codes
const weatherCodes: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Fog', icon: '🌫️' },
  48: { condition: 'Depositing rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌦️' },
  53: { condition: 'Moderate drizzle', icon: '🌦️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  61: { condition: 'Slight rain', icon: '🌦️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '⛈️' },
  71: { condition: 'Slight snow', icon: '🌨️' },
  73: { condition: 'Moderate snow', icon: '❄️' },
  75: { condition: 'Heavy snow', icon: '❄️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
};

export async function getWeather(city: string): Promise<WeatherData | null> {
  const coords = cityCoords[city.toLowerCase()];
  if (!coords) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Tokyo`
    );
    
    if (!response.ok) throw new Error('Weather API error');
    
    const data = await response.json();
    const current = data.current;
    const weatherCode = current.weather_code;
    const weatherInfo = weatherCodes[weatherCode] || { condition: 'Unknown', icon: '❓' };

    return {
      city: coords.name,
      temperature: Math.round(current.temperature_2m),
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Return default data if API fails
    return {
      city: coords.name,
      temperature: 18,
      condition: 'Partly cloudy',
      icon: '⛅',
      humidity: 60,
      windSpeed: 10,
    };
  }
}

export function getCurrentWeatherSync(city: string): WeatherData {
  const coords = cityCoords[city.toLowerCase()];
  return {
    city: coords?.name || city,
    temperature: 18,
    condition: 'Partly cloudy',
    icon: '⛅',
    humidity: 60,
    windSpeed: 10,
  };
}
