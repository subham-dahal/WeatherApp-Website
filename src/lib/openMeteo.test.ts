import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentConditions, fetchForecast, parseForecast, searchCities } from './openMeteo'
import { forecastFixture } from '../test/fixtures'

describe('parseForecast', () => {
  it('maps current conditions and today\'s daily values', () => {
    const weather = parseForecast(forecastFixture(), 'Sydney', -33.87, 151.21, 'metric')

    expect(weather).toMatchObject({
      city: 'Sydney',
      lat: -33.87,
      lon: 151.21,
      temp: 21.4,
      feelsLike: 20.1,
      tempMax: 26.6,
      tempMin: 14.1,
      uvIndex: 6.5,
      humidity: 60,
      windSpeed: 12.5,
      visibility: 24,
      pressure: 1013,
      weatherCode: 2,
      description: 'Partly cloudy',
    })
  })

  it('starts the 24-hour strip at the current local hour', () => {
    const weather = parseForecast(forecastFixture(), 'Sydney', 0, 0, 'metric')

    expect(weather.hourly).toHaveLength(24)
    expect(weather.hourly[0].time).toBe('2026-09-25T14:00')
    expect(weather.hourly[23].time).toBe('2026-09-26T13:00')
    expect(weather.allHourly).toHaveLength(48)
  })

  it('falls back to the first hour when the current hour is not in the series', () => {
    const weather = parseForecast(forecastFixture({ time: '2030-01-01T00:00' }), 'X', 0, 0, 'metric')

    expect(weather.hourly[0].time).toBe('2026-09-25T00:00')
    expect(weather.hourly).toHaveLength(24)
  })

  it('builds a daily forecast', () => {
    const weather = parseForecast(forecastFixture(), 'X', 0, 0, 'metric')

    expect(weather.daily).toEqual([
      { date: '2026-09-25', tempMax: 26.6, tempMin: 14.1, weatherCode: 2 },
      { date: '2026-09-26', tempMax: 18.2, tempMin: 12.0, weatherCode: 61 },
    ])
  })

  it('writes a summary using the warm threshold and unit symbol', () => {
    expect(parseForecast(forecastFixture(), 'X', 0, 0, 'metric').summary)
      .toBe('Today will be warm and partly cloudy, with a high of 27°C.')

    const cool = forecastFixture()
    cool.daily.temperature_2m_max[0] = 70
    expect(parseForecast(cool, 'X', 0, 0, 'imperial').summary)
      .toBe('Today will be cool and partly cloudy, with a high of 70°F.')
  })

  it('converts visibility and pressure for imperial units', () => {
    const weather = parseForecast(forecastFixture(), 'X', 0, 0, 'imperial')

    expect(weather.visibility).toBeCloseTo(14.91, 2)
    expect(weather.pressure).toBeCloseTo(29.91, 2)
    expect(weather.hourly[0].visibility).toBeCloseTo(6.21, 2)
  })

  it('describes unknown weather codes as Unknown', () => {
    const weather = parseForecast(forecastFixture({ weather_code: 999 }), 'X', 0, 0, 'metric')

    expect(weather.description).toBe('Unknown')
    expect(weather.summary).toContain('and unknown')
  })
})

describe('Open-Meteo requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  const requestedUrl = () => new URL(fetchMock.mock.calls[0][0] as string)

  it('fetchForecast requests all fields in the chosen units', async () => {
    fetchMock.mockReturnValue(ok(forecastFixture()))

    const weather = await fetchForecast(51.5, -0.12, 'London', 'imperial')

    const url = requestedUrl()
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(url.searchParams.get('latitude')).toBe('51.5')
    expect(url.searchParams.get('longitude')).toBe('-0.12')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit')
    expect(url.searchParams.get('wind_speed_unit')).toBe('mph')
    expect(url.searchParams.get('hourly')).toContain('uv_index')
    expect(weather.city).toBe('London')
  })

  it('fetchCurrentConditions returns temperature and weather code', async () => {
    fetchMock.mockReturnValue(ok({ current: { temperature_2m: 18.3, weather_code: 3 } }))

    await expect(fetchCurrentConditions(1, 2, 'metric')).resolves.toEqual({ temp: 18.3, weatherCode: 3 })
    expect(requestedUrl().searchParams.get('current')).toBe('temperature_2m,weather_code')
    expect(requestedUrl().searchParams.get('temperature_unit')).toBe('celsius')
  })

  it('searchCities URL-encodes the query', async () => {
    fetchMock.mockReturnValue(ok({ results: [{ id: 1, name: 'São Paulo', country: 'Brazil', latitude: -23.5, longitude: -46.6 }] }))

    const results = await searchCities('São Paulo & co')

    expect(requestedUrl().searchParams.get('name')).toBe('São Paulo & co')
    expect(requestedUrl().searchParams.get('count')).toBe('5')
    expect(results[0].name).toBe('São Paulo')
  })

  it('searchCities returns an empty list when there are no results', async () => {
    fetchMock.mockReturnValue(ok({}))

    await expect(searchCities('zzzz')).resolves.toEqual([])
  })

  it('rejects when the API responds with an error status', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) }))

    await expect(fetchForecast(0, 0, 'X', 'metric')).rejects.toThrow('Request failed: 429')
  })
})
