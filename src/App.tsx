import { useState, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Search, Navigation, Wind, Droplets, Sun, Thermometer,
  Cloud, Clock, Globe, X, ArrowLeft, Eye, Gauge, Settings
} from 'lucide-react'
import './App.css'
import type { CitySuggestion, FeaturedCityData, HourlyForecast, UnitSystem, WeatherData } from './types'
import { weatherCodeMap } from './lib/weatherCodes'
import { UNIT_LABELS } from './lib/units'
import { fetchCurrentConditions, fetchForecast, searchCities } from './lib/openMeteo'

const FEATURED_CITIES = [
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US' },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917, country: 'JP' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU' }
];

interface SelectedLocation {
  lat: number;
  lon: number;
  name: string;
}

function App() {
  const [city, setCity] = useState('')
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')
  const [showSettings, setShowSettings] = useState(false)
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [featuredWeather, setFeaturedWeather] = useState<FeaturedCityData[]>([])
  const [localWeather, setLocalWeather] = useState<FeaturedCityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])

  // Modal states
  const [modalType, setModalType] = useState<'day' | 'metric' | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<{ date: string, hourly: HourlyForecast[] } | null>(null)
  const [selectedMetricData, setSelectedMetricData] = useState<{ label: string, icon: LucideIcon, unit: string, data: { time: string, value: number }[] } | null>(null)

  const searchTimeout = useRef<number | null>(null)
  const isDown = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const labels = UNIT_LABELS[unitSystem]

  // Home screen tiles: featured cities plus the user's location when permitted.
  useEffect(() => {
    let cancelled = false
    Promise.all(FEATURED_CITIES.map(async (c) => ({ ...c, ...(await fetchCurrentConditions(c.lat, c.lon, unitSystem)) })))
      .then((results) => { if (!cancelled) setFeaturedWeather(results) })
      .catch(() => { if (!cancelled) setError('Failed to load featured cities.') })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const current = await fetchCurrentConditions(lat, lon, unitSystem)
          if (!cancelled) {
            setLocalWeather({ name: 'Your Location', country: 'Local', lat, lon, isLocal: true, ...current })
          }
        } catch {
          // The local tile is optional; ignore failures.
        }
      })
    }
    return () => { cancelled = true }
  }, [unitSystem])

  // Detailed forecast for the selected location; refetches when the unit system changes.
  useEffect(() => {
    if (!location) return
    let cancelled = false
    fetchForecast(location.lat, location.lon, location.name, unitSystem)
      .then((data) => {
        if (cancelled) return
        setWeather(data)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch(() => { if (!cancelled) setError('Failed to fetch weather.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [location, unitSystem])

  const selectLocation = (lat: number, lon: number, name: string) => {
    setShowSuggestions(false); setCity('')
    setLoading(true); setError(null)
    setLocation({ lat, lon, name })
  }

  const changeUnits = (units: UnitSystem) => {
    setShowSettings(false)
    if (units === unitSystem) return
    if (location) { setLoading(true); setError(null) }
    setUnitSystem(units)
  }

  const handleSearchChange = (value: string) => {
    setCity(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = window.setTimeout(async () => {
      if (value.length > 2) {
        try {
          setSuggestions(await searchCities(value))
          setShowSuggestions(true)
        } catch {
          setError('City search failed.')
        }
      } else {
        setSuggestions([]); setShowSuggestions(false)
      }
    }, 300)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const slider = e.currentTarget as HTMLDivElement;
    isDown.current = true;
    slider.classList.add('active');
    startX.current = e.pageX - slider.offsetLeft;
    scrollLeft.current = slider.scrollLeft;
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    isDown.current = false;
    (e.currentTarget as HTMLDivElement).classList.remove('active');
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    isDown.current = false;
    (e.currentTarget as HTMLDivElement).classList.remove('active');
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const slider = e.currentTarget as HTMLDivElement;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX.current) * 2;
    slider.scrollLeft = scrollLeft.current - walk;
  }

  const openDayDetails = (dateStr: string) => {
    if (!weather) return
    const filtered = weather.allHourly.filter(h => h.time.startsWith(dateStr))
    setSelectedDayData({ date: dateStr, hourly: filtered })
    setModalType('day')
  }

  const openMetricDetails = (label: string, icon: LucideIcon, unit: string, key: keyof HourlyForecast) => {
    if (!weather) return
    const data = weather.hourly.map(h => ({ time: h.time, value: h[key] as number }))
    setSelectedMetricData({ label, icon, unit, data })
    setModalType('metric')
  }

  const formatDay = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const goHome = () => { setLocation(null); setWeather(null); setModalType(null); setCity(''); setError(null); }

  return (
    <div className={`app-container ${weather ? weatherCodeMap[weather.weatherCode]?.bg : 'default'}`}>
      <div className="content-wrapper">
        <header>
          <div className="header-left">
            <h1 onClick={goHome} className="logo-text">Weather</h1>
            <div className="settings-container">
              <button className="settings-btn" aria-label="Settings" onClick={() => setShowSettings(!showSettings)}>
                <Settings size={26} />
              </button>
              {showSettings && (
                <div className="settings-dropdown">
                  <div className={`unit-option ${unitSystem === 'metric' ? 'active' : ''}`} onClick={() => changeUnits('metric')}>Metric (°C, km/h)</div>
                  <div className={`unit-option ${unitSystem === 'imperial' ? 'active' : ''}`} onClick={() => changeUnits('imperial')}>Imperial (°F, mph)</div>
                </div>
              )}
            </div>
          </div>
          <div className="search-container">
            <form className="search-bar" onSubmit={(e) => e.preventDefault()}>
              <Search size={20} />
              <input type="text" placeholder="Search city..." value={city} onChange={(e) => handleSearchChange(e.target.value)} />
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map(s => <li key={s.id} onClick={() => selectLocation(s.latitude, s.longitude, `${s.name}, ${s.country}`)}>{s.name}, {s.country}</li>)}
              </ul>
            )}
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="error-dismiss" aria-label="Dismiss error" onClick={() => setError(null)}><X size={18} /></button>
          </div>
        )}

        {loading && <div className="loading-indicator">Loading weather...</div>}

        {!weather && !loading && (
          <section className="welcome-screen">
            <h2>Explore Local & Popular Cities</h2>
            <div className="city-tiles">
              {localWeather && (
                <div className={`city-tile local ${weatherCodeMap[localWeather.weatherCode]?.bg}`} onClick={() => selectLocation(localWeather.lat, localWeather.lon, localWeather.name)}>
                  <div className="tile-header"><span>Your Location</span><Navigation size={20} /></div>
                  <div className="tile-body"><span className="tile-temp">{Math.round(localWeather.temp)}{labels.temp}</span><span className="tile-desc">{weatherCodeMap[localWeather.weatherCode]?.desc}</span></div>
                </div>
              )}
              {featuredWeather.map(c => (
                <div key={c.name} className={`city-tile ${weatherCodeMap[c.weatherCode]?.bg}`} onClick={() => selectLocation(c.lat, c.lon, c.name)}>
                  <div className="tile-header"><span>{c.name}</span><Globe size={20} /></div>
                  <div className="tile-body"><span className="tile-temp">{Math.round(c.temp)}{labels.temp}</span><span className="tile-desc">{weatherCodeMap[c.weatherCode]?.desc}</span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {weather && !loading && (
          <main className="weather-main-flow">
            <button className="back-btn" onClick={goHome}><ArrowLeft size={18} /> Back to Home</button>

            <section className="hero-section">
              <h2 className="hero-city">{weather.city}</h2>
              <div className="hero-temp">{Math.round(weather.temp)}°</div>
              <div className="hero-desc">{weather.description}</div>
              <div className="hero-high-low">
                <span>H:{Math.round(weather.tempMax)}°</span>
                <span>L:{Math.round(weather.tempMin)}°</span>
              </div>
            </section>

            <section className="weather-card hourly-section">
              <h3 className="card-title"><Clock size={16} /> HOURLY FORECAST</h3>
              <div className="hourly-slider" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                <div className="hourly-list">
                  {weather.hourly.map((h, i) => {
                    const Icon = weatherCodeMap[h.weatherCode]?.icon || Cloud
                    return (
                      <div key={i} className="hourly-item">
                        <span className="hour-time">{i === 0 ? 'Now' : h.time.split('T')[1].slice(0,5)}</span>
                        <Icon size={24} />
                        <span className="hour-temp">{Math.round(h.temp)}°</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="weather-card forecast-section">
              <h3 className="card-title"><Clock size={16} /> 7-DAY FORECAST</h3>
              <div className="forecast-list">
                {weather.daily.map((day, i) => {
                  const Icon = weatherCodeMap[day.weatherCode]?.icon || Cloud
                  return (
                    <div key={i} className="forecast-item clickable" onClick={() => openDayDetails(day.date)}>
                      <span className="date">{i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <Icon size={24} className="forecast-icon" />
                      <div className="forecast-temps">
                        <span className="min">{Math.round(day.tempMin)}°</span>
                        <div className="temp-bar-placeholder"></div>
                        <span className="max">{Math.round(day.tempMax)}°</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="stats-grid">
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Feels Like', Thermometer, '°', 'feelsLike')}>
                <div className="stat-label"><Thermometer size={14} /> FEELS LIKE</div>
                <div className="stat-value">{Math.round(weather.feelsLike)}°</div>
                <div className="stat-footer">Wind is making it feel colder.</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('UV Index', Sun, '', 'uvIndex')}>
                <div className="stat-label"><Sun size={14} /> UV INDEX</div>
                <div className="stat-value">{weather.uvIndex}</div>
                <div className="stat-footer">{weather.uvIndex > 5 ? 'Use sun protection.' : 'Low for rest of day.'}</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Humidity', Droplets, '%', 'humidity')}>
                <div className="stat-label"><Droplets size={14} /> HUMIDITY</div>
                <div className="stat-value">{weather.humidity}%</div>
                <div className="stat-footer">The dew point is {Math.round(weather.temp - (100 - weather.humidity) / 5)}° right now.</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Wind Speed', Wind, ` ${labels.wind}`, 'windSpeed')}>
                <div className="stat-label"><Wind size={14} /> WIND</div>
                <div className="stat-value">{weather.windSpeed} <small>{labels.wind}</small></div>
                <div className="stat-footer">Direction: West</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Visibility', Eye, ` ${labels.visibility}`, 'visibility')}>
                <div className="stat-label"><Eye size={14} /> VISIBILITY</div>
                <div className="stat-value">{Math.round(weather.visibility)} <small>{labels.visibility}</small></div>
                <div className="stat-footer">Clear view.</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Pressure', Gauge, ` ${labels.pressure}`, 'pressure')}>
                <div className="stat-label"><Gauge size={14} /> PRESSURE</div>
                <div className="stat-value">{weather.pressure.toFixed(unitSystem === 'metric' ? 0 : 2)} <small>{labels.pressure}</small></div>
                <div className="stat-footer">Stable.</div>
              </div>
            </div>
          </main>
        )}

        {/* FLOATING MODAL OVERLAY */}
        {modalType && (
          <div className="modal-overlay" onClick={() => setModalType(null)}>
            <div className="modal-content" role="dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {modalType === 'day' ? formatDay(selectedDayData!.date) : selectedMetricData!.label}
                </h3>
                <button className="close-modal-btn" aria-label="Close" onClick={() => setModalType(null)}><X size={32} /></button>
              </div>

              <div className="hourly-slider active" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                <div className="hourly-list">
                  {modalType === 'day' && selectedDayData && selectedDayData.hourly.map((h, i) => {
                    const Icon = weatherCodeMap[h.weatherCode]?.icon || Cloud
                    return (
                      <div key={i} className="hourly-item">
                        <span>{h.time.split('T')[1].slice(0,5)}</span>
                        <Icon size={22} />
                        <span className="temp">{Math.round(h.temp)}°</span>
                      </div>
                    )
                  })}
                  {modalType === 'metric' && selectedMetricData && selectedMetricData.data.map((item, i) => (
                    <div key={i} className="hourly-item">
                      <span>{item.time.split('T')[1].slice(0,5)}</span>
                      <selectedMetricData.icon size={22} />
                      <span className="temp">{Math.round(item.value)}{selectedMetricData.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
