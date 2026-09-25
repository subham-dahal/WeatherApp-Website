import { describe, expect, it } from 'vitest'
import { describeWeather, weatherCodeMap } from './weatherCodes'

describe('weatherCodes', () => {
  it('describes known WMO codes', () => {
    expect(describeWeather(0)).toBe('Clear sky')
    expect(describeWeather(65)).toBe('Heavy rain')
    expect(describeWeather(99)).toBe('Thunderstorm with hail')
  })

  it('falls back to Unknown for unmapped codes', () => {
    expect(describeWeather(12345)).toBe('Unknown')
  })

  it('maps each code to a background theme', () => {
    const themes = new Set(Object.values(weatherCodeMap).map((info) => info.bg))
    expect(themes).toEqual(new Set(['sunny', 'cloudy', 'rainy', 'snowy', 'thunder']))
  })
})
