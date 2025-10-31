/*!
 * Leaflet.CityAutocompleteUSA v1.3.0
 * Author: Sergio Barrios
 * License: MIT
 */

L.CityAutocompleteUSA = L.Control.extend({
  options: {
    position: "topright",
    placeholder: "Search city, state, or ZIP...",
    dataUrl: "./data/us_states_with_cities.json" 
  },

  onAdd: function (map) {
    const container = L.DomUtil.create("div", "leaflet-city-autocomplete-usa");
    L.DomEvent.disableClickPropagation(container);

    const input = L.DomUtil.create("input", "", container);
    input.type = "text";
    input.placeholder = this.options.placeholder;

    const clearBtn = L.DomUtil.create("span", "clear-btn", container);
    clearBtn.innerHTML = "×";

    const list = L.DomUtil.create("ul", "autocomplete-suggestions", container);
    list.style.display = "none";

    this._map = map;
    this._input = input;
    this._list = list;
    this._clearBtn = clearBtn;
    this._data = [];

    this._loadData();
    this._setupEvents();

    return container;
  },

  async _loadData() {
    try {
      const res = await fetch(this.options.dataUrl);
      const states = await res.json();
      const all = [];

      states.forEach((state) => {
        state.cities.forEach((city) => {
          all.push({
            state: state.state,
            stateName: state.name,
            city: city.city,
            zip: city.zip,
            lat: city.lat,
            lon: city.lon,
            timezone: city.timezone
          });
        });
      });

      this._data = all;
      console.log(`✅ Loaded ${all.length} locations`);
    } catch (err) {
      console.error("❌ Error loading data:", err);
    }
  },

  _setupEvents() {
    this._input.addEventListener("input", (e) => this._onInput(e));
    this._input.addEventListener("keydown", (e) => this._onKeyDown(e));
    this._clearBtn.addEventListener("click", () => this._clearInput());
  },

  _onInput(e) {
    const value = e.target.value.trim().toLowerCase();
    this._list.innerHTML = "";

    if (value.length === 0) {
      this._list.style.display = "none";
      this._clearBtn.style.display = "none";
      return;
    }

    this._clearBtn.style.display = "block";

    const results = this._data
      .filter(
        (r) =>
          r.city.toLowerCase().includes(value) ||
          r.state.toLowerCase().includes(value) ||
          r.stateName.toLowerCase().includes(value) ||
          r.zip.includes(value)
      )
      .slice(0, 25);

    if (results.length === 0) {
      this._list.style.display = "none";
      return;
    }

    results.forEach((r, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${r.city}</strong>, ${r.stateName} <small>${r.zip}</small>`;
      li.addEventListener("click", () => this._selectResult(r));
      if (i === 0) li.classList.add("selected");
      this._list.appendChild(li);
    });

    this._list.style.display = "block";
  },

  _onKeyDown(e) {
    const items = this._list.querySelectorAll("li");
    if (!items.length) return;

    const current = this._list.querySelector(".selected");
    let index = Array.from(items).indexOf(current);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        index = (index + 1) % items.length;
        items.forEach((li) => li.classList.remove("selected"));
        items[index].classList.add("selected");
        break;
      case "ArrowUp":
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        items.forEach((li) => li.classList.remove("selected"));
        items[index].classList.add("selected");
        break;
      case "Enter":
        e.preventDefault();
        if (current) {
          const result = this._data.find(
            (r) =>
              `${r.city}, ${r.stateName} ${r.zip}` === current.textContent.trim()
          );
          if (result) this._selectResult(result);
          else current.click();
        }
        break;
    }
  },

  _selectResult(result) {
    this._input.value = `${result.city}, ${result.stateName} ${result.zip}`;
    this._list.style.display = "none";
    this._clearBtn.style.display = "block";

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      this._map.setView([lat, lon], 10);
      L.marker([lat, lon])
        .addTo(this._map)
        .bindPopup(
          `<b>${result.city}, ${result.stateName}</b><br>ZIP: ${result.zip}<br>Timezone: ${result.timezone}`
        )
        .openPopup();
    }
  },

  _clearInput() {
    this._input.value = "";
    this._list.style.display = "none";
    this._clearBtn.style.display = "none";
  }
});

L.cityAutocompleteUSA = function (options) {
  return new L.CityAutocompleteUSA(options);
};
