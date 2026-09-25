import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as openMeteo from './lib/openMeteo'
import { forecastFixture } from './test/fixtures'

vi.mock('./lib/openMeteo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/openMeteo')>()
  return {
    ...actual,
    fetchCurrentConditions: vi.fn(),
    fetchForecast: vi.fn(),
    searchCities: vi.fn(),
  }
})

const mocked = vi.mocked(openMeteo)

function forecastFor(city: string, units: 'metric' | 'imperial' = 'metric') {
  return openMeteo.parseForecast(forecastFixture(), city, 0, 0, units)
}

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    window.scrollTo = vi.fn()
    mocked.fetchCurrentConditions.mockResolvedValue({ temp: 19.6, weatherCode: 0 })
    mocked.fetchForecast.mockImplementation(async (_lat, _lon, city, units) => forecastFor(city, units))
  })

  it('shows the featured cities on the home screen', async () => {
    render(<App />)

    expect(await screen.findByText('London')).toBeInTheDocument()
    for (const city of ['New York', 'Tokyo', 'Sydney']) {
      expect(screen.getByText(city)).toBeInTheDocument()
    }
    expect(screen.getAllByText('20°C')).toHaveLength(4)
    expect(mocked.fetchCurrentConditions).toHaveBeenCalledWith(51.5074, -0.1278, 'metric')
  })

  it('opens the detailed forecast when a city tile is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByText('Tokyo'))

    expect(await screen.findByRole('heading', { name: 'Tokyo' })).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText('H:27°')).toBeInTheDocument()
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(mocked.fetchForecast).toHaveBeenCalledWith(35.6895, 139.6917, 'Tokyo', 'metric')
  })

  it('returns to the home screen with the back button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('Sydney'))

    await user.click(await screen.findByRole('button', { name: /Back to Home/ }))

    expect(screen.getByText('Explore Local & Popular Cities')).toBeInTheDocument()
  })

  it('refetches in imperial units when the unit system changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('London'))
    await screen.findByRole('heading', { name: 'London' })

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByText('Imperial (°F, mph)'))

    expect(await screen.findByText('mph')).toBeInTheDocument()
    expect(mocked.fetchForecast).toHaveBeenLastCalledWith(51.5074, -0.1278, 'London', 'imperial')
    expect(mocked.fetchCurrentConditions).toHaveBeenCalledWith(51.5074, -0.1278, 'imperial')
  })

  it('opens an hourly breakdown for a metric tile', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('London'))

    await user.click(await screen.findByText('HUMIDITY'))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Humidity')
    expect(dialog).toHaveTextContent('55%')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a dismissible error when the forecast request fails', async () => {
    mocked.fetchForecast.mockRejectedValue(new Error('Request failed: 500'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByText('London'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch weather.')
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('searches for cities after the user stops typing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      mocked.searchCities.mockResolvedValue([
        { id: 1, name: 'Kathmandu', country: 'Nepal', latitude: 27.7, longitude: 85.3 },
      ])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<App />)

      await user.type(screen.getByPlaceholderText('Search city...'), 'Kath')
      expect(mocked.searchCities).not.toHaveBeenCalled()
      await act(() => vi.advanceTimersByTimeAsync(300))

      expect(mocked.searchCities).toHaveBeenCalledTimes(1)
      expect(mocked.searchCities).toHaveBeenCalledWith('Kath')

      await user.click(await screen.findByText('Kathmandu, Nepal'))
      expect(await screen.findByRole('heading', { name: 'Kathmandu, Nepal' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not search for queries shorter than three characters', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<App />)

      await user.type(screen.getByPlaceholderText('Search city...'), 'Ka')
      await act(() => vi.advanceTimersByTimeAsync(300))

      expect(mocked.searchCities).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
