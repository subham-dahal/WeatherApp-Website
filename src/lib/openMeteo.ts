import type { CitySuggestion, HourlyForecast, UnitSystem, WeatherData } from '../types'
import { convertPressure, convertVisibility, isWarm, openMeteoUnitParams, UNIT_LABELS } from './units'
import { describeWeather } from './weatherCodes'

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility'
const HOURLY_FIELDS = 'temperature_2m,weather_code,wind_speed_10m,uv_index,apparent_temperature,relative_humidity_2m,visibility,surface_pressure'
const DAILY_FIELDS = 'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max'

/** The subset of the Open-Meteo forecast response this app requests. */
export interface ForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    surface_pressure: number;
    visibility: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    uv_index: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    visibility: number[];
    surface_pressure: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    uv_index_max: number[];
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

function forecastUrl(lat: number, lon: number, params: Record<string, string>): string {
  const query = new URLSearchParams({ latitude: String(lat), longitude: String(lon), ...params })
  return `${FORECAST_URL}?${query}`
}

/** Current temperature and weather code only, used for the city tiles on the home screen. */
export async function fetchCurrentConditions(lat: number, lon: number, units: UnitSystem) {
  const data = await getJson<{ current: { temperature_2m: number; weather_code: number } }>(
    forecastUrl(lat, lon, {
      current: 'temperature_2m,weather_code',
      temperature_unit: openMeteoUnitParams(units).temperature_unit,
    })
  )
  return { temp: data.current.temperature_2m, weatherCode: data.current.weather_code }
}

export async function fetchForecast(lat: number, lon: number, city: string, units: UnitSystem): Promise<WeatherData> {
  const data = await getJson<ForecastResponse>(
    forecastUrl(lat, lon, {
      current: CURRENT_FIELDS,
      hourly: HOURLY_FIELDS,
      daily: DAILY_FIELDS,
      timezone: 'auto',
      ...openMeteoUnitParams(units),
    })
  )
  return parseForecast(data, city, lat, lon, units)
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const params = new URLSearchParams({ name: query, count: '5' })
  const data = await getJson<{ results?: CitySuggestion[] }>(`${GEOCODING_URL}?${params}`)
  return data.results ?? []
}

/** Converts a raw Open-Meteo forecast response into the app's view model. */
export function parseForecast(data: ForecastResponse, city: string, lat: number, lon: number, units: UnitSystem): WeatherData {
  const allHourly: HourlyForecast[] = data.hourly.time.map((time, i) => ({
    time,
    temp: data.hourly.temperature_2m[i],
    weatherCode: data.hourly.weather_code[i],
    windSpeed: data.hourly.wind_speed_10m[i],
    uvIndex: data.hourly.uv_index[i],
    feelsLike: data.hourly.apparent_temperature[i],
    humidity: data.hourly.relative_humidity_2m[i],
    visibility: convertVisibility(data.hourly.visibility[i], units),
    pressure: convertPressure(data.hourly.surface_pressure[i], units),
  }))

  // Hourly times are in the location's local timezone (timezone=auto), as is current.time,
  // so match on the "YYYY-MM-DDTHH" prefix to find the current hour.
  const currentHour = data.current.time.slice(0, 13)
  const foundIndex = data.hourly.time.findIndex((t) => t.startsWith(currentHour))
  const startIndex = foundIndex === -1 ? 0 : foundIndex

  const description = describeWeather(data.current.weather_code)
  const todayMax = data.daily.temperature_2m_max[0]

  return {
    city,
    lat,
    lon,
    temp: data.current.temperature_2m,
    tempMax: todayMax,
    tempMin: data.daily.temperature_2m_min[0],
    feelsLike: data.current.apparent_temperature,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    uvIndex: data.daily.uv_index_max[0],
    humidity: data.current.relative_humidity_2m,
    visibility: convertVisibility(data.current.visibility, units),
    pressure: convertPressure(data.current.surface_pressure, units),
    weatherCode: data.current.weather_code,
    description,
    summary: `Today will be ${isWarm(todayMax, units) ? 'warm' : 'cool'} and ${description.toLowerCase()}, with a high of ${Math.round(todayMax)}${UNIT_LABELS[units].temp}.`,
    hourly: allHourly.slice(startIndex, startIndex + 24),
    daily: data.daily.time.map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      weatherCode: data.daily.weather_code[i],
    })),
    allHourly,
  }
}
