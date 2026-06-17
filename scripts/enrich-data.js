/**
 * Merge GeoNames US ZIP data into the plugin dataset.
 *
 * Steps:
 *   1. Download https://download.geonames.org/export/zip/US.zip
 *   2. Unzip to get US.txt, copy it next to this script or to the project root
 *   3. Run: node scripts/enrich-data.js
 *
 * What it does:
 *   - Reads existing us_states_with_cities.json
 *   - Reads GeoNames US.txt (tab-separated)
 *   - Adds any ZIP codes NOT already in the dataset (no duplicates)
 *   - Adds county name to existing entries when GeoNames has it
 *   - Saves the updated us_states_with_cities.json
 */

const fs = require('fs');
const path = require('path');

// ── Timezone defaults per state ──────────────────────────────────────────────
const STATE_TZ = {
  AL:'America/Chicago',    AK:'America/Anchorage',  AZ:'America/Phoenix',
  AR:'America/Chicago',    CA:'America/Los_Angeles', CO:'America/Denver',
  CT:'America/New_York',   DE:'America/New_York',   FL:'America/New_York',
  GA:'America/New_York',   HI:'Pacific/Honolulu',   ID:'America/Boise',
  IL:'America/Chicago',    IN:'America/Indiana/Indianapolis',
  IA:'America/Chicago',    KS:'America/Chicago',    KY:'America/New_York',
  LA:'America/Chicago',    ME:'America/New_York',   MD:'America/New_York',
  MA:'America/New_York',   MI:'America/Detroit',    MN:'America/Chicago',
  MS:'America/Chicago',    MO:'America/Chicago',    MT:'America/Denver',
  NE:'America/Chicago',    NV:'America/Los_Angeles', NH:'America/New_York',
  NJ:'America/New_York',   NM:'America/Denver',     NY:'America/New_York',
  NC:'America/New_York',   ND:'America/Chicago',    OH:'America/New_York',
  OK:'America/Chicago',    OR:'America/Los_Angeles', PA:'America/New_York',
  RI:'America/New_York',   SC:'America/New_York',   SD:'America/Chicago',
  TN:'America/Chicago',    TX:'America/Chicago',    UT:'America/Denver',
  VT:'America/New_York',   VA:'America/New_York',   WA:'America/Los_Angeles',
  WV:'America/New_York',   WI:'America/Chicago',    WY:'America/Denver',
  DC:'America/New_York',   PR:'America/Puerto_Rico', GU:'Pacific/Guam',
  VI:'America/St_Thomas',  AS:'Pacific/Pago_Pago',  MP:'Pacific/Saipan',
};

const STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa',
  KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland',
  MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi',
  MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire',
  NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina',
  ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania',
  RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee',
  TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington',
  WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', DC:'District of Columbia',
  PR:'Puerto Rico', GU:'Guam', VI:'Virgin Islands', AS:'American Samoa',
  MP:'Northern Mariana Islands',
};

// ── Locate US.txt ────────────────────────────────────────────────────────────
const rootDir = path.join(__dirname, '..');
const candidates = [
  process.argv[2],
  path.join(rootDir, 'US.txt'),
  path.join(__dirname, 'US.txt'),
].filter(Boolean);

const geoFile = candidates.find(p => fs.existsSync(p));
if (!geoFile) {
  console.error('\n❌  US.txt not found.');
  console.error('    Download https://download.geonames.org/export/zip/US.zip');
  console.error('    Unzip and copy US.txt to the project root, then run again.\n');
  process.exit(1);
}
console.log(`\n📂  GeoNames file: ${geoFile}`);

// ── Load existing dataset ────────────────────────────────────────────────────
const dataPath = path.join(rootDir, 'data', 'us_states_with_cities.json');
const existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Build lookup maps
const zipToCity  = new Map(); // zip -> city object (mutable ref)
const stateMap   = new Map(); // stateAbbr -> state object

existing.forEach(state => {
  stateMap.set(state.state, state);
  state.cities.forEach(city => zipToCity.set(city.zip, city));
});

console.log(`📊  Existing: ${stateMap.size} states, ${zipToCity.size} ZIP codes`);

// ── Parse GeoNames TSV ───────────────────────────────────────────────────────
// Columns: country  zip  place  state_name  state_abbr  county  county_code  ...  lat  lon  accuracy
const lines = fs.readFileSync(geoFile, 'utf8').split('\n');

let added   = 0;
let enriched = 0;
const newByState = {}; // stateAbbr -> [city entries]

for (const line of lines) {
  const p = line.split('\t');
  if (p.length < 11 || p[0] !== 'US') continue;

  const zip      = p[1].trim();
  const cityName = p[2].trim();
  const stateAbbr = p[4].trim();
  const county   = p[5].trim();
  const lat      = parseFloat(p[9]);
  const lon      = parseFloat(p[10]);

  if (!zip || !stateAbbr || !cityName || isNaN(lat) || isNaN(lon)) continue;

  if (zipToCity.has(zip)) {
    // ZIP exists — enrich with county if missing
    const entry = zipToCity.get(zip);
    if (!entry.county && county) {
      entry.county = county;
      enriched++;
    }
    continue;
  }

  // New ZIP — queue it
  if (!newByState[stateAbbr]) newByState[stateAbbr] = [];
  newByState[stateAbbr].push({
    city: cityName,
    lat, lon, zip,
    timezone: STATE_TZ[stateAbbr] || 'America/New_York',
    county: county || undefined,
  });
  added++;
}

// ── Merge new entries ────────────────────────────────────────────────────────
for (const [abbr, cities] of Object.entries(newByState)) {
  if (stateMap.has(abbr)) {
    stateMap.get(abbr).cities.push(...cities);
  } else {
    const newState = {
      state: abbr,
      name: STATE_NAMES[abbr] || abbr,
      lat: cities[0].lat,
      lon: cities[0].lon,
      timezone: STATE_TZ[abbr] || 'America/New_York',
      cities,
    };
    existing.push(newState);
    stateMap.set(abbr, newState);
  }
}

// Sort cities within each state
existing.forEach(state => {
  state.cities.sort((a, b) => a.city.localeCompare(b.city));
});
existing.sort((a, b) => a.state.localeCompare(b.state));

// ── Save ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));

const totalCities = existing.reduce((n, s) => n + s.cities.length, 0);
console.log(`\n✅  Done!`);
console.log(`   + ${added} new ZIP codes added`);
console.log(`   ~ ${enriched} existing entries enriched with county`);
console.log(`   📍 Total: ${totalCities} locations across ${existing.length} states/territories`);
console.log(`   💾 Saved: ${dataPath}\n`);
