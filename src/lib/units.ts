import type { UnitSystem } from '../types'

export const UNIT_LABELS: Record<UnitSystem, { temp: string; wind: string; visibility: string; pressure: string }> = {
  metric: { temp: '°C', wind: 'km/h', visibility: 'km', pressure: 'hPa' },
  imperial: { temp: '°F', wind: 'mph', visibility: 'mi', pressure: 'inHg' },
}

/** Open-Meteo query params that make the API return values in the chosen unit system. */
export function openMeteoUnitParams(units: UnitSystem): Record<string, string> {
  return units === 'metric'
    ? { temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' }
    : { temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch' }
}

/** Open-Meteo always reports visibility in metres; convert to km or miles. */
export function convertVisibility(metres: number, units: UnitSystem): number {
  const km = metres / 1000
  return units === 'metric' ? km : km * 0.621371
}

/** Open-Meteo always reports pressure in hPa; convert to inHg for imperial. */
export function convertPressure(hPa: number, units: UnitSystem): number {
  return units === 'metric' ? hPa : hPa * 0.02953
}

/** A day counts as "warm" above 25 °C / 77 °F. */
export function isWarm(temp: number, units: UnitSystem): boolean {
  return temp > (units === 'metric' ? 25 : 77)
}
