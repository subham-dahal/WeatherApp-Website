# WeatherApp

[![CI](https://github.com/subham-dahal/WeatherApp-Website/actions/workflows/ci.yml/badge.svg)](https://github.com/subham-dahal/WeatherApp-Website/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)

A weather app built with React, TypeScript and Vite. Search for any city to see the current conditions, the next 24 hours and a 7-day forecast. The background changes to match the weather.

It uses the free [Open-Meteo](https://open-meteo.com/) forecast and geocoding APIs, so you don't need an API key.

## Features

- City search with suggestions as you type
- Current temperature, feels-like, UV index, humidity, wind, visibility and pressure
- Hourly forecast for the next 24 hours, starting at the city's local time
- 7-day forecast. Click a day to see it hour by hour
- Click any of the stat tiles to see that value hour by hour
- Switch between metric (°C, km/h, km, hPa) and imperial (°F, mph, mi, inHg)
- Featured cities, plus your own location if you allow location access

## Getting started

You need Node.js 20 or newer. The commands are the same on macOS, Linux and Windows.

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |

## Project layout

```
src/
  App.tsx              the UI (home screen, forecast view, pop-ups)
  App.css              styles and weather themes
  types.ts             shared types
  lib/
    openMeteo.ts       API calls and turning the API response into what the UI needs
    units.ts           metric/imperial settings and conversions
    weatherCodes.ts    weather code to label, icon and background
  test/                test setup and sample API data
```

The API calls and data handling live in `lib/`, separate from the UI. That keeps `App.tsx` focused on rendering and makes that logic easy to test.

## Tests

The tests use Vitest and React Testing Library:

- `lib/openMeteo.test.ts`: parsing a sample forecast response (the 24-hour window, daily values, summary text, imperial conversions), the request URLs, search queries with special characters, and API errors
- `lib/units.test.ts`: unit conversions
- `lib/weatherCodes.test.ts`: weather code descriptions
- `App.test.tsx`: the main user flows with the API mocked: opening a city, switching units, the detail pop-ups, error messages and search suggestions

GitHub Actions runs lint, the tests and the production build on Linux, Windows and macOS on every push.
