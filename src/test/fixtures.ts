import type { ForecastResponse } from '../lib/openMeteo'

/** Builds a small but realistic Open-Meteo forecast response: 48 hourly points over 2 days. */
export function forecastFixture(overrides: Partial<ForecastResponse['current']> = {}): ForecastResponse {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '2026-09-25' : '2026-09-26'
    return `${day}T${String(i % 24).padStart(2, '0')}:00`
  })
  return {
    current: {
      time: '2026-09-25T14:15',
      temperature_2m: 21.4,
      relative_humidity_2m: 60,
      apparent_temperature: 20.1,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 12.5,
      surface_pressure: 1013,
      visibility: 24000,
      ...overrides,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 10 + i),
      weather_code: hours.map(() => 0),
      wind_speed_10m: hours.map(() => 10),
      uv_index: hours.map(() => 3),
      apparent_temperature: hours.map((_, i) => 9 + i),
      relative_humidity_2m: hours.map(() => 55),
      visibility: hours.map(() => 10000),
      surface_pressure: hours.map(() => 1000),
    },
    daily: {
      time: ['2026-09-25', '2026-09-26'],
      weather_code: [2, 61],
      temperature_2m_max: [26.6, 18.2],
      temperature_2m_min: [14.1, 12.0],
      uv_index_max: [6.5, 2.0],
    },
  }
}
