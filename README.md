# Leaflet City Autocomplete USA

[![npm version](https://img.shields.io/npm/v/leaflet-city-autocomplete-usa.svg)](https://www.npmjs.com/package/leaflet-city-autocomplete-usa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Leaflet](https://img.shields.io/badge/Leaflet-Plugin-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/plugins.html)
[![Demo](https://img.shields.io/badge/Live%20Demo-Online-blue)](https://slbarriosdev.github.io/leaflet-city-autocomplete-usa/demo/)

<p align="center">
  <img src="https://slbarriosdev.github.io/leaflet-city-autocomplete-usa/demo/screenshot.JPG" alt="Leaflet City Autocomplete USA Demo" width="800"/>
</p>

A lightweight **Leaflet plugin** that adds an autocomplete search control for **50,000+ U.S. cities, towns, and ZIP codes** using U.S. Census and GeoNames data.

Search by city name, full state name, state abbreviation, or ZIP code. The map flies to the result and drops a customizable marker with a popup.

---

## Features

- **50,000+ locations** — cities, towns, CDPs, villages, boroughs across all 50 states + DC and territories
- **Smart search ranking** — exact matches appear first, then starts-with, then contains; state abbreviation search (`CA`, `TX`) returns only that state's cities
- **County info** — county name shown in suggestions and popups when available
- **Clean city names** — strips Census suffixes ("city", "CDP", "town") from display; badge shows the place type
- **Customizable marker** — set any color via `markerColor`, pass full Leaflet options via `markerOptions`, or disable with `showMarker: false`
- **Built-in geolocation** — locate button sits inline next to the search input
- **Event callbacks** — `onSelect`, `onClear`, `onLocate`
- **Dark mode** — automatic via `prefers-color-scheme`, or manual with `.lca-dark` / `.lca-light`
- **ESM + UMD** — works as a `<script>` tag, `require()`, or ES module `import`
- **Zero extra dependencies** — only Leaflet

---

## Installation

### npm

```bash
npm install leaflet-city-autocomplete-usa
```

### CDN (script tag)

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.css" />
<script src="https://unpkg.com/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.js"></script>
```

---

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.css" />
  <script src="https://unpkg.com/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.js"></script>
  <style> #map { width: 100%; height: 600px; } </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map("map").setView([39.8283, -98.5795], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    L.cityAutocompleteUSA({
      dataUrl: "node_modules/leaflet-city-autocomplete-usa/data/us_states_with_cities.json"
    }).addTo(map);
  </script>
</body>
</html>
```

### ES Module (bundler / Vite / webpack)

```js
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.css";
import "leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.esm.js";

const map = L.map("map").setView([39.8283, -98.5795], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

L.cityAutocompleteUSA({ dataUrl: "/data/us_states_with_cities.json" }).addTo(map);
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `string` | `"topright"` | Leaflet control position |
| `placeholder` | `string` | `"Search city, state, or ZIP..."` | Input placeholder |
| `dataUrl` | `string` | `"./data/us_states_with_cities.json"` | Path to the JSON dataset |
| `maxResults` | `number` | `25` | Max suggestions shown |
| `showMarker` | `boolean` | `true` | Place a marker on the map on selection |
| `markerColor` | `string` | `"#1a73e8"` | Marker pin color (any CSS color) |
| `markerOptions` | `object` | `{}` | Full [`L.marker` options](https://leafletjs.com/reference.html#marker-option) — overrides `markerColor` if `icon` is set |
| `cleanCityNames` | `boolean` | `true` | Strip "city", "CDP", "town" etc. from displayed names |
| `showPlaceType` | `boolean` | `true` | Show place type badge (CITY, CDP, TOWN…) in suggestions |
| `onSelect` | `function` | `null` | Called when a result is selected — receives the full result object |
| `onClear` | `function` | `null` | Called when the input is cleared |
| `onLocate` | `function` | `null` | Called after geolocation succeeds — receives `{ lat, lng }` |

---

## Callbacks

```js
L.cityAutocompleteUSA({
  dataUrl: "/data/us_states_with_cities.json",

  onSelect: function (result) {
    console.log(result.cleanCity);   // "San Francisco"
    console.log(result.state);       // "CA"
    console.log(result.zip);         // "94102"
    console.log(result.county);      // "San Francisco County" (when available)
    console.log(result.lat);
    console.log(result.lon);
    console.log(result.timezone);    // "America/Los_Angeles"
    console.log(result.population);  // number or null
  },

  onClear: function () {
    console.log("Search cleared");
  },

  onLocate: function ({ lat, lng }) {
    console.log("User is at", lat, lng);
  }
}).addTo(map);
```

---

## Custom Marker

```js
// Simple color change
L.cityAutocompleteUSA({ markerColor: "#e53935" }).addTo(map);

// Full custom icon
L.cityAutocompleteUSA({
  markerOptions: {
    icon: L.icon({
      iconUrl: "my-icon.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })
  }
}).addTo(map);

// Disable marker entirely
L.cityAutocompleteUSA({ showMarker: false }).addTo(map);
```

---

## Dark Mode

Dark mode activates automatically when the OS is set to dark (`prefers-color-scheme: dark`).

Override manually with a CSS class on the control container:

```js
const control = L.cityAutocompleteUSA({ dataUrl: "..." }).addTo(map);

// Force dark
control.getContainer().classList.add("lca-dark");

// Force light (ignore OS preference)
control.getContainer().classList.add("lca-light");
```

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↓` / `↑` | Move through suggestions |
| `Enter` | Select highlighted suggestion |
| `Escape` | Close suggestions dropdown |

---

## Data

The plugin ships with **50,000+ U.S. locations** combining:

| Source | Records | Fields |
|--------|---------|--------|
| U.S. Census Gazetteer 2024 | ~32,000 | city, state, ZIP, lat, lon, timezone |
| GeoNames US ZIP database | +18,000 new | ZIP, city, state, county, lat, lon |

Three data files are included:

| File | Description |
|------|-------------|
| `data/us_states_with_cities.json` | Primary dataset — grouped by state, used by the plugin |
| `data/us_cities.json` | Flat array, formatted — useful for custom integrations |
| `data/us_cities.min.json` | Flat array, minified — lightweight alternative |

### Enriching the dataset

To add **county** and **population** fields to your own dataset, use the included enrichment script:

1. Download [`https://download.geonames.org/export/zip/US.zip`](https://download.geonames.org/export/zip/US.zip)
2. Unzip and place `US.txt` in the project root
3. Run:

```bash
node scripts/enrich-data.js
```

The script merges new ZIP codes, adds county names to existing entries, and saves the updated `us_states_with_cities.json`.

---

## Demo

Live demo: [slbarriosdev.github.io/leaflet-city-autocomplete-usa/demo](https://slbarriosdev.github.io/leaflet-city-autocomplete-usa/demo/)

Run locally:

```bash
npm start
# open http://localhost:3000/demo/index.html
```

---

## Changelog

### v1.3.0
- Dataset expanded to 50,000+ locations (added 18,000+ ZIP codes from GeoNames)
- County data added to suggestions and popups
- Smart search ranking (exact → starts-with → contains; state abbreviation search)
- Clean city name display with place-type badge (CITY, CDP, TOWN…)
- Customizable marker: `markerColor`, `markerOptions`, `showMarker`
- Geolocation button moved inside the control (no more floating absolute element)
- Event callbacks: `onSelect`, `onClear`, `onLocate`
- Dark mode: auto via `prefers-color-scheme` + `.lca-dark` / `.lca-light` classes
- ES Module support (`leaflet.cityAutocompleteUSA.esm.js`)
- UMD wrapper for CommonJS / AMD / global compatibility
- `Escape` key closes dropdown; arrow key selection scrolls into view

### v1.2.2
- Smaller blue location marker and geolocation button alignment fix

### v1.2.1
- ZIP and state search improvements

---

## Author

**Sergio Barrios** — [GitHub](https://github.com/slbarriosdev)  
License: MIT
