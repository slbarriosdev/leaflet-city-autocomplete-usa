/*!
 * Leaflet.CityAutocompleteUSA v1.4.0 (ESM)
 * Author: Sergio Barrios
 * License: MIT
 *
 * Usage with a bundler (webpack, vite, rollup):
 *   import L from 'leaflet';
 *   import 'leaflet-city-autocomplete-usa';
 *   // L.cityAutocompleteUSA(...) is now available
 *
 * Usage with native ES modules in the browser:
 *   import L from 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';
 *   import 'leaflet-city-autocomplete-usa/dist/leaflet.cityAutocompleteUSA.esm.js';
 */

import L from 'leaflet';

var PLACE_SUFFIX_RE = /\s+(city|town|village|borough|township|municipality|CDP|plantation|gore|grant|location|purchase|reservation|settlement|unorganized territory)$/i;

function _cleanName(raw) {
  return raw.replace(PLACE_SUFFIX_RE, '').trim();
}

function _extractType(raw) {
  var m = raw.match(PLACE_SUFFIX_RE);
  if (!m) return '';
  var t = m[1].trim();
  return t.toUpperCase() === 'CDP' ? 'CDP' : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

var ABBREVIATIONS = { st: 'saint', ste: 'sainte', ft: 'fort', mt: 'mount', pt: 'point' };

// Lowercase, strip accents and punctuation, expand St./Ft./Mt.… so "St. Louis",
// "Saint Louis" and "st louis" all compare equal. keepLast leaves the last word
// unexpanded while the user is still typing it ("st" may become "sterling").
function _normalize(s, keepLast) {
  var words = s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ');
  var last = keepLast ? words.length - 1 : words.length;
  for (var i = 0; i < last; i++) {
    if (ABBREVIATIONS[words[i]]) words[i] = ABBREVIATIONS[words[i]];
  }
  return words.join(' ');
}

// Edit distance (with transpositions) between `a` and the closest prefix of `b`.
// Returns max + 1 as soon as it is clear the distance exceeds `max`.
function _prefixDistance(a, b, max) {
  var m = a.length;
  var n = Math.min(b.length, m + max);
  if (n < m - max) return max + 1;

  var prev2 = null;
  var prev = [];
  for (var j = 0; j <= n; j++) prev[j] = j;

  for (var i = 1; i <= m; i++) {
    var cur = [i];
    var rowMin = i;
    for (j = 1; j <= n; j++) {
      var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }

  var best = max + 1;
  for (var k = Math.max(0, m - max); k <= n; k++) {
    if (prev[k] < best) best = prev[k];
  }
  return best;
}

function _haversineMiles(lat1, lon1, lat2, lon2) {
  var toRad = Math.PI / 180;
  var dLat = (lat2 - lat1) * toRad;
  var dLon = (lon2 - lon1) * toRad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

var SEARCH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
var LOCATE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>';

L.CityAutocompleteUSA = L.Control.extend({
  options: {
    position: 'topright',
    placeholder: 'Search city, state, or ZIP...',
    dataUrl: './data/us_states_with_cities.json',
    maxResults: 25,
    showMarker: true,
    markerOptions: {},
    markerColor: '#1a73e8',
    cleanCityNames: true,
    showPlaceType: true,
    onSelect: null,
    onClear: null,
    onLocate: null,
    reverseOnClick: false,
    reverseMaxMiles: 25,
    onReverse: null,
  },

  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-city-autocomplete-usa');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    var topRow = L.DomUtil.create('div', 'lca-top-row', container);
    var inputWrapper = L.DomUtil.create('div', 'lca-input-wrapper', topRow);

    var searchIcon = L.DomUtil.create('span', 'lca-search-icon', inputWrapper);
    searchIcon.innerHTML = SEARCH_ICON;

    var input = L.DomUtil.create('input', 'lca-input', inputWrapper);
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = this.options.placeholder;

    var clearBtn = L.DomUtil.create('button', 'lca-clear-btn', inputWrapper);
    clearBtn.innerHTML = '&times;';
    clearBtn.title = 'Clear';
    clearBtn.type = 'button';
    clearBtn.style.display = 'none';

    var locateBtn = L.DomUtil.create('button', 'lca-locate-btn', topRow);
    locateBtn.innerHTML = LOCATE_ICON;
    locateBtn.title = 'Go to my location';
    locateBtn.type = 'button';

    var list = L.DomUtil.create('ul', 'lca-suggestions', container);
    list.style.display = 'none';

    this._map = map;
    this._input = input;
    this._list = list;
    this._clearBtn = clearBtn;
    this._data = [];
    this._norm = [];
    this._states = new Set();
    this._stateNames = {};
    this._stateByName = {};
    this._marker = null;
    this._userLocationMarker = null;

    this._loadData();
    this._setupEvents(clearBtn, locateBtn);

    if (this.options.reverseOnClick) {
      map.on('click', this._onMapClick, this);
    }

    return container;
  },

  onRemove: function (map) {
    map.off('click', this._onMapClick, this);
  },

  _loadData: async function () {
    try {
      var res = await fetch(this.options.dataUrl);
      var states = await res.json();
      var all = [];

      states.forEach(function (state) {
        state.cities.forEach(function (city) {
          var raw = city.city;
          all.push({
            state: state.state,
            stateName: state.name,
            city: raw,
            cleanCity: _cleanName(raw),
            placeType: _extractType(raw),
            zip: city.zip,
            lat: city.lat,
            lon: city.lon,
            timezone: city.timezone,
            county: city.county || '',
            population: city.population || null,
          });
        });
      });

      var stateNames = {};
      var stateByName = {};
      states.forEach(function (state) {
        var abbr = state.state.toLowerCase();
        var name = _normalize(state.name);
        stateNames[abbr] = name;
        stateByName[name] = abbr;
      });

      this._data = all;
      this._norm = all.map(function (r) { return _normalize(r.cleanCity); });
      this._states = new Set(all.map(function (r) { return r.state.toLowerCase(); }));
      this._stateNames = stateNames;
      this._stateByName = stateByName;
    } catch (err) {
      console.error('Leaflet CityAutocompleteUSA: failed to load data', err);
    }
  },

  _setupEvents: function (clearBtn, locateBtn) {
    var self = this;
    this._input.addEventListener('input', function (e) { self._onInput(e); });
    this._input.addEventListener('keydown', function (e) { self._onKeyDown(e); });
    clearBtn.addEventListener('click', function () { self._clearInput(); });
    locateBtn.addEventListener('click', function () { self._locate(); });
  },

  _onInput: function (e) {
    var value = e.target.value.trim();
    this._list.innerHTML = '';

    if (value.length === 0) {
      this._list.style.display = 'none';
      this._clearBtn.style.display = 'none';
      return;
    }

    this._clearBtn.style.display = '';
    var results = this._filterAndRank(value);

    if (results.length === 0) {
      var noItem = document.createElement('li');
      noItem.className = 'lca-no-results';
      noItem.textContent = 'No results found';
      this._list.appendChild(noItem);
      this._list.style.display = 'block';
      return;
    }

    var self = this;
    results.forEach(function (r, i) {
      var li = document.createElement('li');
      var displayName = self.options.cleanCityNames ? r.cleanCity : r.city;

      var typeLabel = '';
      if (self.options.showPlaceType && r.placeType) {
        typeLabel = '<span class="lca-place-type">' + r.placeType + '</span>';
      }

      var meta = [r.zip];
      if (r.county) meta.unshift(r.county + ' County');
      if (r.population) meta.push('Pop. ' + Number(r.population).toLocaleString());

      li.innerHTML =
        '<div class="lca-suggestion-main"><strong>' + displayName + '</strong>, ' + r.state + typeLabel + '</div>' +
        '<div class="lca-suggestion-meta">' + meta.join(' · ') + '</div>';

      li.addEventListener('click', function () { self._selectResult(r); });
      if (i === 0) li.classList.add('selected');
      self._list.appendChild(li);
    });

    this._list.style.display = 'block';
  },

  _filterAndRank: function (query) {
    var q = _normalize(query, true);
    if (!q) return [];

    var isNumeric = /^\d+$/.test(q);
    var isExactState = !isNumeric && q.length === 2 && this._states.has(q);

    // "austin tx", "austin, texas", "saint paul mn" → city + state filter
    if (!isNumeric && !isExactState) {
      var split = this._splitState(query, q);
      if (split) {
        var withState = this._rank(q, split.city, split.filter, false, false);
        if (withState.length) return withState;
      }
    }

    return this._rank(q, q, null, isNumeric, isExactState);
  },

  _splitState: function (raw, q) {
    var comma = raw.indexOf(',');
    if (comma !== -1) {
      var cityPart = _normalize(raw.slice(0, comma));
      if (!cityPart) return null;
      return { city: cityPart, filter: { prefix: _normalize(raw.slice(comma + 1), true) } };
    }

    // Longest state name first, so "west virginia" is never read as "west" + VA
    var words = q.split(' ');
    for (var n = Math.min(3, words.length); n >= 1; n--) {
      var tail = words.slice(-n).join(' ');
      var abbr = this._stateByName[tail] || (n === 1 && this._states.has(tail) ? tail : null);
      if (abbr) {
        var rest = words.slice(0, -n).join(' ');
        return rest ? { city: rest, filter: { abbr: abbr } } : null;
      }
    }
    return null;
  },

  _stateMatches: function (stateAbbr, filter) {
    if (filter.abbr) return stateAbbr === filter.abbr;
    return !filter.prefix || stateAbbr === filter.prefix || this._stateNames[stateAbbr].startsWith(filter.prefix);
  },

  _rank: function (q, cityQ, stateFilter, isNumeric, isExactState) {
    var maxEdits = cityQ.length >= 8 ? 2 : cityQ.length >= 5 ? 1 : 0;
    var first = cityQ.charAt(0);
    var second = cityQ.charAt(1);
    var scored = [];

    for (var i = 0; i < this._data.length; i++) {
      var r = this._data[i];
      var stateAbbr = r.state.toLowerCase();
      var score = 0;

      if (isNumeric) {
        if (r.zip === q) score = 100;
        else if (r.zip.startsWith(q)) score = 60;
      } else if (isExactState) {
        if (stateAbbr === q) score = 100;
      } else {
        if (stateFilter && !this._stateMatches(stateAbbr, stateFilter)) continue;

        var city = this._norm[i];
        if (city === cityQ) score += 100;
        else if (city.startsWith(cityQ)) score += 70;
        else if (city.includes(cityQ)) score += 40;
        else if (maxEdits && (city.charAt(0) === first || city.charAt(0) === second)) {
          // Typo tolerance, always ranked below real matches. The first letter
          // (or a swap of the first two) must be right, which keeps this fast.
          var d = _prefixDistance(cityQ, city, maxEdits);
          if (d <= maxEdits) score += 30 - 10 * (d - 1);
        }

        if (!stateFilter) {
          var stateName = this._stateNames[stateAbbr];
          if (stateAbbr === q) score += 50;
          else if (stateName === q) score += 50;
          else if (stateName.startsWith(q)) score += 20;
          else if (stateName.includes(q)) score += 5;
        }
      }

      if (score > 0) scored.push({ r: r, score: score });
    }

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, this.options.maxResults).map(function (s) { return s.r; });
  },

  _onKeyDown: function (e) {
    var items = this._list.querySelectorAll('li:not(.lca-no-results)');
    if (!items.length) return;

    var current = this._list.querySelector('.selected');
    var arr = Array.from(items);
    var index = arr.indexOf(current);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        index = index < items.length - 1 ? index + 1 : 0;
        arr.forEach(function (li) { li.classList.remove('selected'); });
        arr[index].classList.add('selected');
        arr[index].scrollIntoView({ block: 'nearest' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        index = index > 0 ? index - 1 : items.length - 1;
        arr.forEach(function (li) { li.classList.remove('selected'); });
        arr[index].classList.add('selected');
        arr[index].scrollIntoView({ block: 'nearest' });
        break;
      case 'Enter':
        e.preventDefault();
        if (current) current.click();
        break;
      case 'Escape':
        this._list.style.display = 'none';
        break;
    }
  },

  _selectResult: function (result) {
    var displayName = this.options.cleanCityNames ? result.cleanCity : result.city;
    this._input.value = displayName + ', ' + result.state + ' ' + result.zip;
    this._list.style.display = 'none';
    this._clearBtn.style.display = '';

    var lat = parseFloat(result.lat);
    var lon = parseFloat(result.lon);

    if (this._userLocationMarker) {
      this._map.removeLayer(this._userLocationMarker);
      this._userLocationMarker = null;
    }
    if (this._marker) {
      this._map.removeLayer(this._marker);
      this._marker = null;
    }

    if (!isNaN(lat) && !isNaN(lon) && this.options.showMarker) {
      var markerOpts = Object.assign({}, this.options.markerOptions);
      if (this.options.markerColor && !markerOpts.icon) {
        markerOpts.icon = this._createMarkerIcon(this.options.markerColor);
      }

      var popupLines = ['<b>' + displayName + ', ' + result.state + '</b>'];
      if (result.county) popupLines.push('County: ' + result.county);
      popupLines.push('ZIP: ' + result.zip);
      if (result.population) popupLines.push('Pop.: ' + Number(result.population).toLocaleString());
      popupLines.push('Timezone: ' + result.timezone);

      this._marker = L.marker([lat, lon], markerOpts)
        .addTo(this._map)
        .bindPopup(popupLines.join('<br>'))
        .openPopup();

      this._map.setView([lat, lon], 10);
    }

    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(result);
    }
  },

  _clearInput: function () {
    this._input.value = '';
    this._list.style.display = 'none';
    this._clearBtn.style.display = 'none';

    if (typeof this.options.onClear === 'function') {
      this.options.onClear();
    }
  },

  _locate: function () {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }

    var self = this;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;

        if (self._marker) self._map.removeLayer(self._marker);
        if (self._userLocationMarker) self._map.removeLayer(self._userLocationMarker);

        self._userLocationMarker = L.circleMarker([lat, lon], {
          radius: 6,
          color: '#1a73e8',
          fillColor: '#1a73e8',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(self._map);

        self._map.setView([lat, lon], 12);

        if (typeof self.options.onLocate === 'function') {
          self.options.onLocate({ lat: lat, lng: lon });
        }
      },
      function () {
        alert('Unable to retrieve your location.');
      }
    );
  },

  findNearest: function (latlng) {
    latlng = L.latLng(latlng);
    var lat = latlng.lat;
    var lon = latlng.lng;
    var cosLat = Math.cos(lat * Math.PI / 180);
    var best = null;
    var bestD = Infinity;

    // Equirectangular distance is enough to rank candidates
    for (var i = 0; i < this._data.length; i++) {
      var r = this._data[i];
      var dLat = parseFloat(r.lat) - lat;
      var dLon = (parseFloat(r.lon) - lon) * cosLat;
      var d = dLat * dLat + dLon * dLon;
      if (d < bestD) { bestD = d; best = r; }
    }

    if (!best) return null;
    return { result: best, miles: _haversineMiles(lat, lon, parseFloat(best.lat), parseFloat(best.lon)) };
  },

  _onMapClick: function (e) {
    if (!this._data.length) return;

    var self = this;
    var found = this.findNearest(e.latlng);
    if (found && found.miles > this.options.reverseMaxMiles) found = null;

    var content = L.DomUtil.create('div', 'lca-reverse');

    if (found) {
      var r = found.result;
      var displayName = this.options.cleanCityNames ? r.cleanCity : r.city;
      var lines = ['<div class="lca-reverse-label">Nearest place</div>',
        '<b>' + displayName + ', ' + r.state + '</b> ' + r.zip];
      if (r.county) lines.push('<br>' + r.county + ' County');
      lines.push('<div class="lca-reverse-dist">' + found.miles.toFixed(1) + ' mi away</div>');
      content.innerHTML = lines.join('');

      var goBtn = L.DomUtil.create('button', 'lca-reverse-btn', content);
      goBtn.type = 'button';
      goBtn.textContent = 'Go here';
      goBtn.addEventListener('click', function () {
        self._map.closePopup();
        self._selectResult(r);
      });
    } else {
      content.innerHTML = '<div class="lca-reverse-label">No U.S. location within ' +
        this.options.reverseMaxMiles + ' mi</div>';
    }

    L.popup({ className: 'lca-reverse-popup' })
      .setLatLng(e.latlng)
      .setContent(content)
      .openOn(this._map);

    if (typeof this.options.onReverse === 'function') {
      this.options.onReverse({
        latlng: e.latlng,
        result: found ? found.result : null,
        miles: found ? found.miles : null,
      });
    }
  },

  _createMarkerIcon: function (color) {
    return L.divIcon({
      className: 'lca-marker-icon',
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="' + color + '" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/><circle cx="12" cy="11" r="4.5" fill="rgba(255,255,255,0.9)"/></svg>',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36],
    });
  },
});

L.cityAutocompleteUSA = function (options) {
  return new L.CityAutocompleteUSA(options);
};

// ── Map style switcher ───────────────────────────────────────────────────────

var LAYERS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';

var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
var ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
var ESRI_CANVAS_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

var MAP_STYLES = [
  { id: 'streets', name: 'Streets', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: OSM_ATTR } },
  { id: 'light', name: 'Light', url: ESRI_URL + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, maxNativeZoom: 16, attribution: ESRI_CANVAS_ATTR } },
  { id: 'dark', name: 'Dark', dark: true, url: ESRI_URL + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, maxNativeZoom: 16, attribution: ESRI_CANVAS_ATTR } },
  { id: 'detailed', name: 'Detailed', url: ESRI_URL + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, NGA, EPA, USDA, NPS' } },
  { id: 'satellite', name: 'Satellite', dark: true, url: ESRI_URL + 'World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, and the GIS User Community' } },
  { id: 'terrain', name: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 17, attribution: OSM_ATTR + ', SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' } },
];

// Tile z4/x3/y6 covers the southern-central U.S. and the Gulf — used as the thumbnail.
function _previewUrl(style) {
  if (style.preview) return style.preview;
  var data = L.extend({ s: 'a', r: '' }, style.options, { z: 4, x: 3, y: 6 });
  return L.Util.template(style.url, data);
}

L.MapStyleSwitcher = L.Control.extend({
  options: {
    position: 'bottomright',
    styles: null,            // custom list; defaults to the built-in styles
    defaultStyle: 'streets',
    collapsed: true,
    searchControl: null,     // a CityAutocompleteUSA control to switch to dark mode on dark styles
    onChange: null,
  },

  onAdd: function (map) {
    var self = this;
    var container = L.DomUtil.create('div', 'leaflet-map-style-switcher');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    var toggle = L.DomUtil.create('button', 'lms-toggle', container);
    toggle.type = 'button';
    toggle.title = 'Map style';
    toggle.innerHTML = LAYERS_ICON;

    var panel = L.DomUtil.create('div', 'lms-panel', container);

    this._map = map;
    this._container = container;
    this._styles = this.options.styles || MAP_STYLES;
    this._buttons = {};
    this._layer = null;
    this._current = null;

    this._styles.forEach(function (style) {
      var btn = L.DomUtil.create('button', 'lms-option', panel);
      btn.type = 'button';
      btn.title = style.name;
      btn.innerHTML = '<img src="' + _previewUrl(style) + '" alt="" loading="lazy"><span>' + style.name + '</span>';
      btn.addEventListener('click', function () {
        self.setStyle(style.id);
        if (self.options.collapsed) self._collapse();
      });
      self._buttons[style.id] = btn;
    });

    if (this.options.collapsed) {
      toggle.addEventListener('click', function () { self._expand(); });
      map.on('click', this._collapse, this);
    } else {
      L.DomUtil.addClass(container, 'lms-expanded');
    }

    this.setStyle(this.options.defaultStyle || this._styles[0].id);

    return container;
  },

  onRemove: function (map) {
    map.off('click', this._collapse, this);
    if (this._layer) map.removeLayer(this._layer);
    this._layer = null;
    this._current = null;
  },

  setStyle: function (id) {
    var style = this._styles.filter(function (s) { return s.id === id; })[0];
    if (!style || !this._map || style.id === this._current) return this;

    if (this._layer) this._map.removeLayer(this._layer);
    this._layer = L.tileLayer(style.url, style.options || {}).addTo(this._map);
    this._layer.bringToBack();

    if (this._current) L.DomUtil.removeClass(this._buttons[this._current], 'lms-active');
    L.DomUtil.addClass(this._buttons[style.id], 'lms-active');
    this._current = style.id;

    var search = this.options.searchControl;
    var searchEl = search && search.getContainer();
    if (searchEl) {
      searchEl.classList.toggle('lca-dark', !!style.dark);
      searchEl.classList.toggle('lca-light', !style.dark);
    }

    if (typeof this.options.onChange === 'function') {
      this.options.onChange(style);
    }
    return this;
  },

  getStyle: function () {
    return this._current;
  },

  _expand: function () {
    L.DomUtil.addClass(this._container, 'lms-expanded');
  },

  _collapse: function () {
    L.DomUtil.removeClass(this._container, 'lms-expanded');
  },
});

L.MapStyleSwitcher.STYLES = MAP_STYLES;

L.mapStyleSwitcher = function (options) {
  return new L.MapStyleSwitcher(options);
};

export const CityAutocompleteUSA = L.CityAutocompleteUSA;
export const cityAutocompleteUSA = L.cityAutocompleteUSA;
export const MapStyleSwitcher = L.MapStyleSwitcher;
export const mapStyleSwitcher = L.mapStyleSwitcher;
export default L.CityAutocompleteUSA;
