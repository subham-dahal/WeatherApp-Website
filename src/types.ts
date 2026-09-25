import type { LucideIcon } from 'lucide-react'

export type UnitSystem = 'metric' | 'imperial'

export interface HourlyForecast {
  time: string;
  temp: number;
  weatherCode: number;
  windSpeed: number;
  uvIndex: number;
  feelsLike: number;
  humidity: number;
  visibility: number;
  pressure: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

export interface WeatherData {
  city: string;
  lat: number;
  lon: number;
  temp: number;
  tempMax: number;
  tempMin: number;
  feelsLike: number;
  windSpeed: number;
  precipitation: number;
  uvIndex: number;
  humidity: number;
  visibility: number;
  pressure: number;
  weatherCode: number;
  description: string;
  summary: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  allHourly: HourlyForecast[];
}

export interface FeaturedCityData {
  name: string;
  country: string;
  temp: number;
  weatherCode: number;
  lat: number;
  lon: number;
  isLocal?: boolean;
}

export interface CitySuggestion {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherInfo {
  desc: string;
  icon: LucideIcon;
  bg: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunder';
}
