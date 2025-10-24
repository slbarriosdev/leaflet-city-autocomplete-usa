/*!
 * Leaflet.CityAutocompleteUSA v1.2.2
 * Author: Sergio Barrios
 * License: MIT
 */
(function () {
  if (typeof window === "undefined" || typeof window.L === "undefined") {
    console.error("❌ Leaflet must be loaded before leaflet.cityAutocompleteUSA.js");
    return;
  }

  const L = window.L;


  L.Control.CityAutocompleteUSA = L.Control.extend({
    options: {
      position: "topright",
      placeholder: "Search a U.S. city...",
      minLength: 2,
      maxSuggestions: 10,
      zoomLevel: 10,
      flyTo: true,
      showMarker: true,
      showPopup: true,
      citiesData: []
    },

    initialize: function (options) {
      L.Util.setOptions(this, options);
      this._cities = this.options.citiesData || [];
      this._selectedIndex = -1;
    },

    onAdd: function (map) {
      this._map = map;
      const container = L.DomUtil.create("div", "leaflet-city-autocomplete-usa");
      const input = L.DomUtil.create("input", "", container);
      input.type = "text";
      input.placeholder = this.options.placeholder;
      const list = L.DomUtil.create("ul", "autocomplete-suggestions", container);

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(input, "input", this._debounce(this._onInput.bind(this), 150));
      L.DomEvent.on(input, "keydown", this._onKeyDown.bind(this));

      document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) list.innerHTML = "";
      });

      this._input = input;
      this._list = list;
      container.appendChild(list);
 
      return container;
    },

    _debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    _onInput() {
      const val = this._input.value.trim().toLowerCase();
      this._list.innerHTML = "";
      this._selectedIndex = -1;
      if (val.length < this.options.minLength) return;

      const matches = this._cities
        .filter((c) => c.city && c.city.toLowerCase().includes(val))
        .slice(0, this.options.maxSuggestions);

      matches.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = `${c.city}, ${c.state}`;
        li.onclick = () => this._selectCity(c);
        this._list.appendChild(li);
      });
    },

    _onKeyDown(e) {
      const items = this._list.querySelectorAll("li");
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        this._selectedIndex = (this._selectedIndex + 1) % items.length;
      } else if (e.key === "ArrowUp") {
        this._selectedIndex = (this._selectedIndex - 1 + items.length) % items.length;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (this._selectedIndex >= 0) items[this._selectedIndex].click();
      } else return;

      items.forEach((it, i) =>
        it.classList.toggle("selected", i === this._selectedIndex)
      );
    },

    _selectCity(c) {
      const coords = [c.lat, c.lon];
      if (this.options.flyTo) this._map.flyTo(coords, this.options.zoomLevel);
      else this._map.setView(coords, this.options.zoomLevel);

      if (this.options.showMarker) {
        if (this._marker) this._map.removeLayer(this._marker);
        this._marker = L.marker(coords).addTo(this._map);
      }

      if (this.options.showPopup) {
        L.popup()
          .setLatLng(coords)
          .setContent(`<strong>${c.city}</strong>, ${c.state}<br>${c.timezone}`)
          .openOn(this._map);
      }

      this._input.value = `${c.city}, ${c.state}`;
      this._list.innerHTML = "";
    }
  });

  L.control.cityAutocompleteUSA = function (opts) {
    return new L.Control.CityAutocompleteUSA(opts);
  };

})();
