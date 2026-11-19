# UB Terminal

Ulaanbaatar public transport app: nearby stops, bus lines, trip planner (direct + 1 transfer), map. Plain HTML/CSS/JS (ES modules), no build step. Installable PWA. Live at https://uchralpurevdorj.com/ub-terminal/

## Data
- `data/network.json` (if present) is used first. Otherwise the app loads a cached copy, then tries OpenStreetMap (Overpass) live, then falls back to a small built-in **sample network** (labelled "Жишээ сүлжээ" in the UI).
- Build real data (needs Node 18+ and internet): `node scripts/build-data.mjs`, then commit `data/network.json`.
- Arrival times are **schedule estimates**, not real-time. Real-time needs an official data feed.
- Map: Leaflet + OpenStreetMap tiles (attribution shown). Fine for a small site; use a tile provider for heavy traffic.

## Structure
`index.html` shell · `js/app.js` UI + router · `js/data.js` data + trip planner · `js/i18n.js` mn/en · `css/app.css` tokens + styles · `sw.js` offline shell
