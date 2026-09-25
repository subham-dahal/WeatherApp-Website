import { describe, expect, it } from 'vitest'
import { convertPressure, convertVisibility, isWarm, openMeteoUnitParams, UNIT_LABELS } from './units'

describe('units', () => {
  it('requests metric and imperial units from Open-Meteo', () => {
    expect(openMeteoUnitParams('metric')).toEqual({ temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' })
    expect(openMeteoUnitParams('imperial')).toEqual({ temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch' })
  })

  it('converts visibility from metres to km or miles', () => {
    expect(convertVisibility(10000, 'metric')).toBe(10)
    expect(convertVisibility(10000, 'imperial')).toBeCloseTo(6.21371)
  })

  it('converts pressure from hPa to inHg for imperial only', () => {
    expect(convertPressure(1013, 'metric')).toBe(1013)
    expect(convertPressure(1013, 'imperial')).toBeCloseTo(29.91, 2)
  })

  it('uses a warm threshold of 25 °C / 77 °F', () => {
    expect(isWarm(25, 'metric')).toBe(false)
    expect(isWarm(25.1, 'metric')).toBe(true)
    expect(isWarm(77, 'imperial')).toBe(false)
    expect(isWarm(78, 'imperial')).toBe(true)
  })

  it('has labels for each unit system', () => {
    expect(UNIT_LABELS.metric.temp).toBe('°C')
    expect(UNIT_LABELS.imperial.wind).toBe('mph')
  })
})
