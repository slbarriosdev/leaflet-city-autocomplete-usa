# 🗺️ Leaflet City Autocomplete USA

A lightweight **Leaflet plugin** that adds an **autocomplete search control for all U.S. cities** using official **U.S. Census Gazetteer** data.

This plugin allows you to search any U.S. city by name, automatically fly the map to its coordinates, and optionally show a marker and popup with the city information.

---

## 🚀 Features

- 🔍 Autocomplete for **32,000+ U.S. cities**
- 📍 Displays **marker + popup** on selection
- 🧭 Smooth **fly-to** animation
- 🌎 Built-in **timezone** info for each city
- 🧹 Clear button (❌) to reset search and map view
- 🪶 Lightweight and dependency-free (only Leaflet)

---

## 📦 Installation

### Option 1 — via npm

```bash
npm install leaflet-city-autocomplete-usa
```

Then import it in your project:

```js
import "leaflet/dist/leaflet.css";
import "leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.css";
import "leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.js";
```

---

### Option 2 — via direct download (manual include)

```html
<link rel="stylesheet" href="dist/leaflet.cityAutocompleteUSA.css" />
<script src="dist/leaflet.cityAutocompleteUSA.js"></script>
```

---

## 🗺️ Usage Example

Here’s a complete example you can use directly in your project:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Leaflet City Autocomplete USA Example</title>

  <!-- Leaflet core -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <!-- Plugin -->
  <link
    rel="stylesheet"
    href="node_modules/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.css"
  />
  <script src="node_modules/leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.js"></script>

  <style>
    #map { width: 100%; height: 600px; }
  </style>
</head>

<body>
  <div id="map"></div>

  <script>
    const map = L.map("map").setView([39.8283, -98.5795], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // Load city data and initialize the autocomplete control
    fetch("node_modules/leaflet-city-autocomplete-usa/data/us_cities.min.json")
      .then(res => res.json())
      .then(data => {
        const control = L.control.cityAutocompleteUSA({
          citiesData: data,
          flyTo: true,
          showMarker: true,
          showPopup: true
        });
        control.addTo(map);
      })
      .catch(err => console.error("❌ Error loading data:", err));
  </script>
</body>
</html>
```

---

## ⚙️ Options

| Option | Type | Default | Description |
|--------|------|----------|-------------|
| `position` | `string` | `"topright"` | Control position on the map |
| `placeholder` | `string` | `"Search a U.S. city..."` | Input placeholder text |
| `minLength` | `number` | `2` | Minimum characters before search starts |
| `maxSuggestions` | `number` | `10` | Max number of suggestions displayed |
| `flyTo` | `boolean` | `true` | Animate map to city position |
| `showMarker` | `boolean` | `true` | Show a marker on city selection |
| `showPopup` | `boolean` | `true` | Show popup with city + state + timezone |
| `zoomLevel` | `number` | `10` | Zoom level after selecting a city |

---

## ❌ Clear Button

When typing, a red “✖” button appears inside the input field.
Clicking it:
- Clears the search input  
- Removes all markers/popups  
- Returns the map to its initial U.S. view

---

## 🧪 Demo

You can view a live example at:

🔗 [GitHub Pages Demo](https://slbarriosdev.github.io/leaflet-city-autocomplete-usa/demo)

Or run it locally:

```bash
npm start
```

Then open → [http://localhost:3000/demo](http://localhost:3000/demo)

---

## 📄 Data Source

Official dataset:  
**U.S. Census Gazetteer (2024)**  
https://www2.census.gov/geo/docs/maps-data/data/gazetteer/

---

## 🧑‍💻 Author

Developed by **Sergio Barrios**  
License: **MIT**

---

## ⭐ Contribute

Contributions and pull requests are welcome!  
If you find bugs or want to improve the search, open an issue on GitHub.

# leaflet-city-autocomplete-usa
Leaflet plugin adding an autocomplete control for 32k+ U.S. cities (Census Gazetteer). FlyTo, marker, popup, timezone.

