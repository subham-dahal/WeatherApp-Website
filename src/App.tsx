import { useState, useEffect, useRef, FormEvent } from 'react'
import { 
  Search, Navigation, Wind, Droplets, Sun, Thermometer, 
  Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  MapPin, Clock, Globe, ChevronRight, X, ArrowLeft, Eye, Gauge, Settings
} from 'lucide-react'
import './App.css'

interface HourlyForecast {
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

interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

interface WeatherData {
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

interface FeaturedCityData {
  name: string;
  country: string;
  temp: number;
  weatherCode: number;
  lat: number;
  lon: number;
  isLocal?: boolean;
}

const FEATURED_CITIES = [
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US' },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917, country: 'JP' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU' }
];

const weatherCodeMap: Record<number, { desc: string, icon: any, bg: string }> = {
  0: { desc: 'Clear sky', icon: Sun, bg: 'sunny' },
  1: { desc: 'Mainly clear', icon: Cloud, bg: 'cloudy' },
  2: { desc: 'Partly cloudy', icon: Cloud, bg: 'cloudy' },
  3: { desc: 'Overcast', icon: Cloud, bg: 'cloudy' },
  45: { desc: 'Fog', icon: CloudFog, bg: 'cloudy' },
  48: { desc: 'Fog', icon: CloudFog, bg: 'cloudy' },
  51: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  53: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  55: { desc: 'Drizzle', icon: CloudRain, bg: 'rainy' },
  61: { desc: 'Rain', icon: CloudRain, bg: 'rainy' },
  63: { desc: 'Rain', icon: CloudRain, bg: 'rainy' },
  65: { desc: 'Heavy rain', icon: CloudRain, bg: 'rainy' },
  71: { desc: 'Snow', icon: CloudSnow, bg: 'snowy' },
  73: { desc: 'Snow', icon: CloudSnow, bg: 'snowy' },
  75: { desc: 'Heavy snow', icon: CloudSnow, bg: 'snowy' },
  80: { desc: 'Showers', icon: CloudRain, bg: 'rainy' },
  81: { desc: 'Showers', icon: CloudRain, bg: 'rainy' },
  82: { desc: 'Heavy showers', icon: CloudRain, bg: 'rainy' },
  95: { desc: 'Thunderstorm', icon: CloudLightning, bg: 'thunder' },
}

function App() {
  const [city, setCity] = useState('')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [showSettings, setShowSettings] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [featuredWeather, setFeaturedWeather] = useState<FeaturedCityData[]>([])
  const [localWeather, setLocalWeather] = useState<FeaturedCityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  // Modal states
  const [modalType, setModalType] = useState<'day' | 'metric' | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<{ date: string, hourly: HourlyForecast[] } | null>(null)
  const [selectedMetricData, setSelectedMetricData] = useState<{ label: string, icon: any, unit: string, data: { time: string, value: number }[] } | null>(null)

  const searchTimeout = useRef<number | null>(null)
  const isDown = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => {
    const fetchAllData = async () => {
      const tempUnit = unitSystem === 'metric' ? 'celsius' : 'fahrenheit';
      const promises = FEATURED_CITIES.map(async (c) => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`)
        const data = await res.json()
        return { ...c, temp: data.current.temperature_2m, weatherCode: data.current.weather_code }
      })
      const results = await Promise.all(promises)
      setFeaturedWeather(results)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`)
          const data = await res.json()
          setLocalWeather({
            name: 'Your Location',
            country: 'Local',
            temp: data.current.temperature_2m,
            weatherCode: data.current.weather_code,
            lat,
            lon,
            isLocal: true
          })
        })
      }
    }
    fetchAllData()
  }, [unitSystem])

  const fetchWeatherByCoords = async (lat: number, lon: number, cityName: string) => {
    setLoading(true); setError(null); setShowSuggestions(false); setCity('');
    const tempUnit = unitSystem === 'metric' ? 'celsius' : 'fahrenheit';
    const windUnit = unitSystem === 'metric' ? 'kmh' : 'mph';
    const precipUnit = unitSystem === 'metric' ? 'mm' : 'inch';
    
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code,wind_speed_10m,uv_index,apparent_temperature,relative_humidity_2m,visibility,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}`
      )
      const data = await res.json()
      
      const allHourly: HourlyForecast[] = data.hourly.time.map((time: string, i: number) => ({
        time, 
        temp: data.hourly.temperature_2m[i], 
        weatherCode: data.hourly.weather_code[i],
        windSpeed: data.hourly.wind_speed_10m[i],
        uvIndex: data.hourly.uv_index[i],
        feelsLike: data.hourly.apparent_temperature[i],
        humidity: data.hourly.relative_humidity_2m[i],
        visibility: unitSystem === 'metric' ? data.hourly.visibility[i] / 1000 : (data.hourly.visibility[i] / 1000) * 0.621371,
        pressure: unitSystem === 'metric' ? data.hourly.surface_pressure[i] : data.hourly.surface_pressure[i] * 0.02953
      }))

      const now = new Date();
      const currentHourStr = now.toISOString().split(':')[0] + ':00';
      const startIndex = data.hourly.time.findIndex((t: string) => t.startsWith(currentHourStr)) || 0;
      
      const tempSymbol = unitSystem === 'metric' ? '°C' : '°F';

      setWeather({
        city: cityName,
        lat,
        lon,
        temp: data.current.temperature_2m,
        tempMax: data.daily.temperature_2m_max[0],
        tempMin: data.daily.temperature_2m_min[0],
        feelsLike: data.current.apparent_temperature,
        windSpeed: data.current.wind_speed_10m,
        precipitation: data.current.precipitation,
        uvIndex: data.daily.uv_index_max[0],
        humidity: data.current.relative_humidity_2m,
        visibility: unitSystem === 'metric' ? data.current.visibility / 1000 : (data.current.visibility / 1000) * 0.621371,
        pressure: unitSystem === 'metric' ? data.current.surface_pressure : data.current.surface_pressure * 0.02953,
        weatherCode: data.current.weather_code,
        description: weatherCodeMap[data.current.weather_code]?.desc || 'Unknown',
        summary: `Today will be ${data.daily.temperature_2m_max[0] > (unitSystem === 'metric' ? 25 : 77) ? 'warm' : 'cool'} and ${weatherCodeMap[data.current.weather_code]?.desc.toLowerCase()}, with a high of ${Math.round(data.daily.temperature_2m_max[0])}${tempSymbol}.`,
        hourly: allHourly.slice(startIndex, startIndex + 24),
        daily: data.daily.time.map((time: string, i: number) => ({
          date: time, tempMax: data.daily.temperature_2m_max[i], tempMin: data.daily.temperature_2m_min[i], weatherCode: data.daily.weather_code[i]
        })),
        allHourly
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) { setError('Failed to fetch weather.') } finally { setLoading(false) }
  }

  useEffect(() => {
    if (weather) {
      fetchWeatherByCoords(weather.lat, weather.lon, weather.city)
    }
  }, [unitSystem])

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

  const openMetricDetails = (label: string, icon: any, unit: string, key: keyof HourlyForecast) => {
    if (!weather) return
    const data = weather.hourly.map(h => ({ time: h.time, value: h[key] as number }))
    setSelectedMetricData({ label, icon, unit, data })
    setModalType('metric')
  }

  const formatDay = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const goHome = () => { setWeather(null); setModalType(null); setCity(''); }

  return (
    <div className={`app-container ${weather ? weatherCodeMap[weather.weatherCode]?.bg : 'default'}`}>
      <div className="content-wrapper">
        <header>
          <div className="header-left">
            <h1 onClick={goHome} className="logo-text">Weather</h1>
            <div className="settings-container">
              <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                <Settings size={26} />
              </button>
              {showSettings && (
                <div className="settings-dropdown">
                  <div className={`unit-option ${unitSystem === 'metric' ? 'active' : ''}`} onClick={() => { setUnitSystem('metric'); setShowSettings(false); }}>Metric (°C, km/h)</div>
                  <div className={`unit-option ${unitSystem === 'imperial' ? 'active' : ''}`} onClick={() => { setUnitSystem('imperial'); setShowSettings(false); }}>Imperial (°F, mph)</div>
                </div>
              )}
            </div>
          </div>
          <div className="search-container">
            <form className="search-bar" onSubmit={(e) => e.preventDefault()}>
              <Search size={20} />
              <input type="text" placeholder="Search city..." value={city} onChange={(e) => {
                setCity(e.target.value)
                if (searchTimeout.current) clearTimeout(searchTimeout.current)
                searchTimeout.current = window.setTimeout(async () => {
                  if (e.target.value.length > 2) {
                    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${e.target.value}&count=5`)
                    const d = await res.json()
                    setSuggestions(d.results || [])
                    setShowSuggestions(true)
                  } else {
                    setSuggestions([]); setShowSuggestions(false)
                  }
                }, 300)
              }} />
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map(s => <li key={s.id} onClick={() => fetchWeatherByCoords(s.latitude, s.longitude, `${s.name}, ${s.country}`)}>{s.name}, {s.country}</li>)}
              </ul>
            )}
          </div>
        </header>

        {!weather && !loading && (
          <section className="welcome-screen">
            <h2>Explore Local & Popular Cities</h2>
            <div className="city-tiles">
              {localWeather && (
                <div className={`city-tile local ${weatherCodeMap[localWeather.weatherCode]?.bg}`} onClick={() => fetchWeatherByCoords(localWeather.lat, localWeather.lon, localWeather.name)}>
                  <div className="tile-header"><span>Your Location</span><Navigation size={20} /></div>
                  <div className="tile-body"><span className="tile-temp">{Math.round(localWeather.temp)}{unitSystem === 'metric' ? '°C' : '°F'}</span><span className="tile-desc">{weatherCodeMap[localWeather.weatherCode]?.desc}</span></div>
                </div>
              )}
              {featuredWeather.map(c => (
                <div key={c.name} className={`city-tile ${weatherCodeMap[c.weatherCode]?.bg}`} onClick={() => fetchWeatherByCoords(c.lat, c.lon, c.name)}>
                  <div className="tile-header"><span>{c.name}</span><Globe size={20} /></div>
                  <div className="tile-body"><span className="tile-temp">{Math.round(c.temp)}{unitSystem === 'metric' ? '°C' : '°F'}</span><span className="tile-desc">{weatherCodeMap[c.weatherCode]?.desc}</span></div>
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
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Feels Like', Thermometer, unitSystem === 'metric' ? '°' : '°', 'feelsLike')}>
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
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Wind Speed', Wind, unitSystem === 'metric' ? ' km/h' : ' mph', 'windSpeed')}>
                <div className="stat-label"><Wind size={14} /> WIND</div>
                <div className="stat-value">{weather.windSpeed} <small>{unitSystem === 'metric' ? 'km/h' : 'mph'}</small></div>
                <div className="stat-footer">Direction: West</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Visibility', Eye, unitSystem === 'metric' ? ' km' : ' mi', 'visibility')}>
                <div className="stat-label"><Eye size={14} /> VISIBILITY</div>
                <div className="stat-value">{Math.round(weather.visibility)} <small>{unitSystem === 'metric' ? 'km' : 'mi'}</small></div>
                <div className="stat-footer">Clear view.</div>
              </div>
              <div className="stat-tile square clickable" onClick={() => openMetricDetails('Pressure', Gauge, unitSystem === 'metric' ? ' hPa' : ' inHg', 'pressure')}>
                <div className="stat-label"><Gauge size={14} /> PRESSURE</div>
                <div className="stat-value">{weather.pressure.toFixed(unitSystem === 'metric' ? 0 : 2)} <small>{unitSystem === 'metric' ? 'hPa' : 'inHg'}</small></div>
                <div className="stat-footer">Stable.</div>
              </div>
            </div>
          </main>
        )}

        {/* FLOATING MODAL OVERLAY */}
        {modalType && (
          <div className="modal-overlay" onClick={() => setModalType(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {modalType === 'day' ? formatDay(selectedDayData!.date) : selectedMetricData!.label}
                </h3>
                <button className="close-modal-btn" onClick={() => setModalType(null)}><X size={32} /></button>
              </div>
              
              <div className="hourly-slider active" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                <div className="hourly-list">
                  {modalType === 'day' ? (
                    selectedDayData!.hourly.map((h, i) => {
                      const Icon = weatherCodeMap[h.weatherCode]?.icon || Cloud
                      return (
                        <div key={i} className="hourly-item">
                          <span>{h.time.split('T')[1].slice(0,5)}</span>
                          <Icon size={22} />
                          <span className="temp">{Math.round(h.temp)}°</span>
                        </div>
                      )
                    })
                  ) : (
                    selectedMetricData!.data.map((item, i) => (
                      <div key={i} className="hourly-item">
                        <span>{item.time.split('T')[1].slice(0,5)}</span>
                        <selectedMetricData.icon size={22} />
                        <span className="temp">{Math.round(item.value)}{selectedMetricData.unit}</span>
                      </div>
                    ))
                  )}
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
