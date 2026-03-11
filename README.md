# WeatherApp

An **experimental** weather app built with **React + TypeScript + Vite**.

It uses the **Open‑Meteo** APIs for both **forecast data** and **place search** (geocoding), so there’s **no API key required**.

## Features

- **City search** with suggestions (Open‑Meteo geocoding)
- **Current conditions** + hourly and daily forecasts
- **Unit toggle**: metric / imperial
- **Featured cities** overview
- **Local weather** (when the browser allows location access)

## Tech stack

- React, TypeScript, Vite
- `lucide-react` icons
- Open‑Meteo: forecast + geocoding

## Getting started

### Prerequisites

- Node.js (LTS recommended)
- npm (or your preferred package manager)

### Install and run

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal (typically `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

## Notes

- **No secrets**: this project does not require API keys.
- **Experimental**: expect rough edges; contributions and improvements are welcome.
