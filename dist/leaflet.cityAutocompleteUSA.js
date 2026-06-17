/*!
 * Leaflet.CityAutocompleteUSA v1.3.0
 * Author: Sergio Barrios
 * License: MIT
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory(require('leaflet'));
  } else {
    factory(window.L);
  }
}(function (L) {

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

  var SEARCH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var LOCATE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>';

  L.CityAutocompleteUSA = L.Control.extend({
    options: {
      position: 'topright',
      placeholder: 'Search city, state, or ZIP...',
      dataUrl: './data/us_states_with_cities.json',
      maxResults: 25,
      // marker
      showMarker: true,
      markerOptions: {},
      markerColor: '#1a73e8',
      // data display
      cleanCityNames: true,
      showPlaceType: true,
      // callbacks
      onSelect: null,
      onClear: null,
      onLocate: null,
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
      this._states = new Set();
      this._marker = null;
      this._userLocationMarker = null;

      this._loadData();
      this._setupEvents(clearBtn, locateBtn);

      return container;
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

        this._data = all;
        this._states = new Set(all.map(function (r) { return r.state.toLowerCase(); }));
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
        if (r.population) meta.push('Pop. ' + Number(r.population).toLocaleString());

        li.innerHTML =
          '<div class="lca-suggestion-main"><strong>' + displayName + '</strong>, ' + r.state + typeLabel + '</div>' +
          '<div class="lca-suggestion-meta">' + meta.join('·') + '</div>';

        li.addEventListener('click', function () { self._selectResult(r); });
        if (i === 0) li.classList.add('selected');
        self._list.appendChild(li);
      });

      this._list.style.display = 'block';
    },

    _filterAndRank: function (query) {
      var q = query.toLowerCase();
      var isNumeric = /^\d+$/.test(q);
      var isExactState = !isNumeric && q.length === 2 && this._states.has(q);
      var scored = [];

      for (var i = 0; i < this._data.length; i++) {
        var r = this._data[i];
        var city = r.cleanCity.toLowerCase();
        var stateAbbr = r.state.toLowerCase();
        var stateName = r.stateName.toLowerCase();
        var score = 0;

        if (isNumeric) {
          if (r.zip === q) score = 100;
          else if (r.zip.startsWith(q)) score = 60;
        } else if (isExactState) {
          if (stateAbbr === q) score = 100;
        } else {
          if (city === q) score += 100;
          else if (city.startsWith(q)) score += 70;
          else if (city.includes(q)) score += 40;

          if (stateAbbr === q) score += 50;
          else if (stateName === q) score += 50;
          else if (stateName.startsWith(q)) score += 20;
          else if (stateName.includes(q)) score += 5;
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

  return L.CityAutocompleteUSA;

}));
