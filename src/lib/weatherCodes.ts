import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react'
import type { WeatherInfo } from '../types'

// WMO weather interpretation codes as returned by Open-Meteo.
// https://open-meteo.com/en/docs#weathervariables
export const weatherCodeMap: Record<number, WeatherInfo> = {
  0: { desc: 'Clear sky', icon: Sun, bg: 'sunny' },
  1: { desc: 'Mainly clear', icon: Cloud, bg: 'cloudy' },
  2: { desc: 'Partly cloudy', icon: Cloud, bg: 'cloudy' },
  3: { desc: 'Overcast', icon: Cloud, bg: 'cloudy' },
  45: { desc: 'Fog', icon: CloudFog, bg: 'cloudy' },
  48: { desc: 'Fog', icon: CloudFog, bg: 'cloudy' },
  51: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  53: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  55: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  56: { desc: 'Freezing drizzle', icon: CloudRain, bg: 'rainy' },
  57: { desc: 'Freezing drizzle', icon: CloudRain, bg: 'rainy' },
  61: { desc: 'Rain', icon: CloudRain, bg: 'rainy' },
  63: { desc: 'Rain', icon: CloudRain, bg: 'rainy' },
  65: { desc: 'Heavy rain', icon: CloudRain, bg: 'rainy' },
  66: { desc: 'Freezing rain', icon: CloudRain, bg: 'rainy' },
  67: { desc: 'Freezing rain', icon: CloudRain, bg: 'rainy' },
  71: { desc: 'Snow', icon: CloudSnow, bg: 'snowy' },
  73: { desc: 'Snow', icon: CloudSnow, bg: 'snowy' },
  75: { desc: 'Heavy snow', icon: CloudSnow, bg: 'snowy' },
  77: { desc: 'Snow grains', icon: CloudSnow, bg: 'snowy' },
  80: { desc: 'Showers', icon: CloudRain, bg: 'rainy' },
  81: { desc: 'Showers', icon: CloudRain, bg: 'rainy' },
  82: { desc: 'Heavy showers', icon: CloudRain, bg: 'rainy' },
  85: { desc: 'Snow showers', icon: CloudSnow, bg: 'snowy' },
  86: { desc: 'Snow showers', icon: CloudSnow, bg: 'snowy' },
  95: { desc: 'Thunderstorm', icon: CloudLightning, bg: 'thunder' },
  96: { desc: 'Thunderstorm with hail', icon: CloudLightning, bg: 'thunder' },
  99: { desc: 'Thunderstorm with hail', icon: CloudLightning, bg: 'thunder' },
}

export function describeWeather(code: number): string {
  return weatherCodeMap[code]?.desc ?? 'Unknown'
}
