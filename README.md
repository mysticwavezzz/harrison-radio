# 📻 Harrison Radio Station

A modern, high-fidelity internet radio station web app modeled after **[euno.cc/#radio](https://euno.cc/#radio)** and rebranded with Spotify's sleek dark/neon-green aesthetic.

---

## ✨ Features

- **24/7 Synchronized Live Broadcast**: All connected listeners hear the exact same song at the exact same second, driven by a centralized master broadcast clock and WebSocket sync (`Socket.io`).
- **Spotify Playlist Ingestion**: Analyzes any Spotify playlist (defaults to your specified 33-track playlist: `#1 Playlist by mysticwavezzz`). Extracts high-res 640x640 album covers, artist names, titles, durations, and metadata.
- **Popularity-Weighted Rotation Algorithm**:
  - Automatically categorizes songs into rotation tiers (**Power/Heavy Rotation**, **Medium**, **Discovery**).
  - Enforces **Artist Separation** (prevents the same artist playing back-to-back).
  - Enforces **Cooldown Buffers** (prevents tracks from replaying too soon).
- **Background YouTube Audio Streaming**: Accurately resolves Spotify tracks to high-quality YouTube audio streams, handling seeking, playback, volume, and seamless crossfade cueing.
- **Euno.cc Inspired UI**:
  - Signature dark theme with Spotify Green accents (`#1DB954`).
  - Album artwork with glowing corner brackets and hover zoom.
  - Giant italic uppercase song titles and artist display.
  - History carousel with ▲ / ▼ controls for recently played tracks.
  - Schedule panel with "ON AIR NOW", "UP NEXT", "LIVE" badge, and station listener metrics.
  - Lower Bento Grid featuring active playlist stats, up next queue, and a form to load any new Spotify playlist link on the fly!
  - Pop-out Mini Player (`/?mini=true`) for desktop multitasking.

---

## 🚀 Quick Start

### 1. Run the Station
From the `radio-station` directory:
```bash
npm start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser!

### 2. Development Mode (Optional)
If you want to edit the React frontend with instant Vite hot-module replacement:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```
Frontend dev server runs at `http://localhost:3000` (automatically proxies API and WebSocket requests to backend on port 4000).

---

## ⚙️ Configuration

Station settings can be adjusted in [`server/src/stationConfig.js`](file:///c:/Users/Nolan/Documents/antigravity/blissful-borg/radio-station/server/src/stationConfig.js):
- `stationName`: Display name
- `callsign`: Station callsign
- `accentColor`: Hex color for branding
- `defaultPlaylistUrl`: Primary Spotify playlist URL
- `artistSeparationCount`: Minimum songs between the same artist
- `trackCooldownFraction`: Cooldown buffer before a song can replay
