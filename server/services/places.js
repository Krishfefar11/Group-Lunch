/**
 * places.js — Real restaurant discovery
 *
 * Priority order:
 *  1. TomTom Places API  (2,500 free calls/day — no billing, just register)
 *  2. OpenStreetMap Overpass (completely free, no key, real data)
 *  3. Groq AI generator  (always works — generates realistic restaurants)
 */

const Groq = require('groq-sdk');
const log  = require('../utils/logger');

const TOMTOM_KEY  = process.env.TOMTOM_API_KEY;
const TOMTOM_BASE = 'https://api.tomtom.com/search/2';

// ── Cuisine helpers (shared across all sources) ───────────────────────────────

// Map our cuisine types → TomTom / OSM search terms
const CUISINE_SEARCH_TERMS = {
  NorthIndian:  'north indian restaurant',
  SouthIndian:  'south indian restaurant',
  Biryani:      'biryani restaurant',
  Chinese:      'chinese restaurant',
  Pizza:        'pizza',
  Burgers:      'burger fast food',
  Wraps:        'wrap shawarma',
  Continental:  'continental restaurant',
  Breakfast:    'cafe breakfast',
  Any:          'restaurant',
};

// Detect cuisine from restaurant name keywords
function detectCuisines(name, extra = '') {
  const text = (name + ' ' + extra).toLowerCase();
  const rules = [
    [/biryani/,                                          'Biryani'],
    [/udupi|dosa|idli|saravana|sagar|south.?indian/,    'SouthIndian'],
    [/north.?indian|punjabi|dhaba|mughali|butter.?chick/, 'NorthIndian'],
    [/chinese|wok|dragon|manchurian|szechuan/,           'Chinese'],
    [/pizza|italian|domino|hut/,                         'Pizza'],
    [/burger|mcdonald|kfc|wendy|subway/,                 'Burgers'],
    [/wrap|shawarma|sandwich|roll/,                      'Wraps'],
    [/continental|french|european|steak/,                'Continental'],
    [/cafe|coffee|breakfast|bakery/,                     'Breakfast'],
    [/indian|curry|tandoor|masala|paneer/,               'NorthIndian'],
  ];
  const found = new Set();
  for (const [re, cuisine] of rules) {
    if (re.test(text)) found.add(cuisine);
  }
  return found.size ? [...found].slice(0, 3) : ['Any'];
}

// Guess veg-friendliness from name + cuisines
function isVegFriendly(name, cuisines) {
  const text = name.toLowerCase();
  if (/pure.?veg|vegetarian|veg.?only|sattvic|jain/i.test(text)) return true;
  if (/chicken|mutton|fish|seafood|meat|kfc|mcdonald/i.test(text)) return false;
  return cuisines.some((c) => ['SouthIndian', 'Breakfast'].includes(c));
}

// Estimate realistic INR price from cuisine type
function estimatePrice(cuisines) {
  const priceMap = {
    NorthIndian: 280, SouthIndian: 150, Biryani: 220,
    Chinese: 260, Pizza: 350, Burgers: 200,
    Wraps: 180, Continental: 420, Breakfast: 120, Any: 200,
  };
  const base = priceMap[cuisines[0]] || 200;
  return Math.round((base + (Math.random() * base * 0.3 - base * 0.1)) / 10) * 10;
}

// Deterministic "rating" from place name so the same restaurant always shows the same rating
function pseudoRating(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return parseFloat((3.4 + (h % 14) * 0.1).toFixed(1));   // 3.4 – 4.7
}

function cuisineEmoji(c) {
  const e = {
    NorthIndian: '🍛', SouthIndian: '🥘', Biryani: '🍚', Chinese: '🥡',
    Pizza: '🍕', Burgers: '🍔', Wraps: '🌯', Continental: '🍽️',
    Breakfast: '☕', Any: '🍽️',
  };
  return e[c] || '🍽️';
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── 1. TomTom Places API ──────────────────────────────────────────────────────

// Step 1a: Geocode city → lat/lon
async function geocodeCity(city) {
  const url = `${TOMTOM_BASE}/geocode/${encodeURIComponent(city + ' India')}.json` +
    `?key=${TOMTOM_KEY}&limit=1`;

  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const data = await res.json();

  const result = data.results?.[0];
  if (!result) throw new Error(`TomTom: could not geocode "${city}"`);

  return { lat: result.position.lat, lon: result.position.lon };
}

// Step 1b: Search restaurants near lat/lon for each cuisine hint
async function searchTomTom(city, cuisineHints = []) {
  if (!TOMTOM_KEY) throw new Error('TOMTOM_API_KEY not set');

  const { lat, lon } = await geocodeCity(city);

  // Build unique search terms from cuisine hints (max 3 queries to stay inside free tier)
  const terms = cuisineHints.length > 0
    ? [...new Set(cuisineHints.slice(0, 3).map((c) => CUISINE_SEARCH_TERMS[c] || 'restaurant'))]
    : ['restaurant'];

  const allResults = [];

  for (const term of terms) {
    const url =
      `${TOMTOM_BASE}/poiSearch/${encodeURIComponent(term)}.json` +
      `?key=${TOMTOM_KEY}` +
      `&lat=${lat}&lon=${lon}` +
      `&radius=5000` +        // 5 km delivery radius
      `&limit=15` +
      `&countrySet=IN` +
      `&categorySet=7315`;    // 7315 = Restaurant category

    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.results?.length) allResults.push(...data.results);
    } catch { /* continue with next term */ }
  }

  if (!allResults.length) throw new Error('TomTom: no results');

  // Deduplicate by place id
  const seen = new Set();
  return allResults.filter((r) => {
    const id = r.id || r.poi?.name;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeTomTom(place, searchedCity) {
  const poi  = place.poi     || {};
  const addr = place.address || {};

  const classifications = (poi.classifications || []).map((c) => c.code).join(' ');
  const cuisines        = detectCuisines(poi.name || '', classifications);
  const name            = poi.name || 'Unknown Restaurant';

  const area    = addr.municipalitySubdivision || addr.municipality || searchedCity;
  const address = addr.freeformAddress         || `${area}, ${searchedCity}`;

  return {
    placeId:         `tt_${place.id}`,
    name,
    cuisines,
    rating:          pseudoRating(name),
    deliveryTimeMin: randInt(20, 45),
    vegFriendly:     isVegFriendly(name, cuisines),
    jainFriendly:    /jain|sattvic/i.test(name),
    pricePerPerson:  estimatePrice(cuisines),
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area,
    address,
    photoUrl:        null,   // TomTom basic tier — no photos; Unsplash used in UI instead
    source:          'tomtom',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 2. OpenStreetMap Overpass (completely free, no key) ───────────────────────

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function searchOSM(city) {
  const nomRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ' India')}&format=json&limit=1`,
    { headers: { 'User-Agent': 'GroupLunchApp/1.0' }, signal: AbortSignal.timeout(6000) }
  );
  const nomData = await nomRes.json();
  if (!nomData.length) throw new Error(`OSM: city not found "${city}"`);

  const { lat, lon } = nomData[0];
  const query = `[out:json][timeout:12];node["amenity"="restaurant"](around:4000,${lat},${lon});out body 25;`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res  = await fetch(mirror, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(12000),
      });
      const data     = await res.json();
      const elements = (data.elements || []).filter((el) => el.tags?.name);
      if (elements.length > 0) {
        log.info({ source: 'osm', city, count: elements.length }, 'Restaurants fetched');
        return elements.map((el) => normalizeOSM(el, city));
      }
    } catch { /* try next mirror */ }
  }
  throw new Error('All Overpass mirrors unavailable');
}

function normalizeOSM(el, searchedCity) {
  const tags     = el.tags || {};
  const rawCuisine = (tags.cuisine || '').split(';').join(' ');
  const cuisines = detectCuisines(tags.name || '', rawCuisine);
  const name     = tags.name || 'Unknown';

  return {
    placeId:         `osm_${el.id}`,
    name,
    cuisines,
    rating:          pseudoRating(name),
    deliveryTimeMin: randInt(20, 40),
    vegFriendly:     isVegFriendly(name, cuisines),
    jainFriendly:    /jain|sattvic/i.test(name),
    pricePerPerson:  estimatePrice(cuisines),
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area:            tags['addr:suburb'] || tags['addr:city'] || searchedCity,
    address:         [tags['addr:street'], tags['addr:city'] || searchedCity].filter(Boolean).join(', '),
    photoUrl:        null,
    source:          'osm',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 3. Groq AI generator (last resort — always works) ────────────────────────

async function generateWithGroq(city, cuisineHints = []) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const cuisineFilter = cuisineHints.length
    ? `Include restaurants that serve: ${cuisineHints.join(', ')}.`
    : 'Include a mix of cuisines.';

  const prompt = `Generate a JSON array of 12 real or realistic restaurants in ${city}, India.
${cuisineFilter}
Use actual well-known restaurant names from ${city} if known, otherwise use realistic local names.

cuisine must be one or more of: NorthIndian, SouthIndian, Biryani, Chinese, Pizza, Burgers, Wraps, Continental, Breakfast
rating: 3.4–4.8 | pricePerPerson: realistic INR (80–600) | deliveryTimeMin: 15–50
area: real neighbourhood in ${city} | vegFriendly: true/false | jainFriendly: true/false

Reply ONLY with valid JSON array, no markdown:
[{"name":"...","cuisines":["..."],"rating":4.2,"pricePerPerson":280,"deliveryTimeMin":25,"vegFriendly":true,"jainFriendly":false,"area":"..."}]`;

  const client     = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }],
    temperature: 0.4, max_tokens: 1400,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Balanced bracket extraction
  const start = clean.indexOf('[');
  if (start === -1) throw new Error('Groq: no JSON array');
  let depth = 0, end = -1;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '[') depth++;
    else if (clean[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const list = JSON.parse(
    clean.slice(start, end + 1)
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
  );
  if (!Array.isArray(list) || !list.length) throw new Error('Groq: empty result');

  return list.map((r, i) => {
    const cuisines = Array.isArray(r.cuisines) ? r.cuisines : ['Any'];
    const name     = r.name || `Restaurant ${i + 1}`;
    return {
      placeId:         `groq_${city.replace(/\s+/g, '_')}_${i}`,
      name,
      cuisines,
      rating:          parseFloat(r.rating) || pseudoRating(name),
      deliveryTimeMin: parseInt(r.deliveryTimeMin) || 30,
      vegFriendly:     Boolean(r.vegFriendly),
      jainFriendly:    Boolean(r.jainFriendly),
      pricePerPerson:  parseInt(r.pricePerPerson) || 250,
      imageEmoji:      cuisineEmoji(cuisines[0]),
      area:            r.area || city,
      address:         r.area ? `${r.area}, ${city}` : city,
      photoUrl:        null,
      source:          'ai-generated',
      city,
      cachedAt:        new Date(),
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

async function getRestaurantsForCity(city, cuisineHints = []) {
  // 1. TomTom (best quality, 2500 free/day)
  if (TOMTOM_KEY) {
    try {
      const places  = await searchTomTom(city, cuisineHints);
      const results = places.map((p) => normalizeTomTom(p, city)).filter((r) => r.name && r.name !== 'Unknown Restaurant');
      if (results.length >= 3) {
        log.info({ source: 'tomtom', city, count: results.length }, 'Restaurants fetched');
        return results;
      }
    } catch (err) {
      log.warn({ err }, 'TomTom fetch failed');
    }
  }

  // 2. OpenStreetMap (free, no key)
  try {
    const results = await searchOSM(city);
    if (results.length >= 3) return results;
  } catch (err) {
    log.warn({ err }, 'OpenStreetMap fetch failed');
  }

  // 3. Groq AI (always works)
  try {
    const results = await generateWithGroq(city, cuisineHints);
    log.info({ source: 'groq-ai', city, count: results.length }, 'Restaurants generated');
    return results;
  } catch (err) {
    log.warn({ err }, 'Groq restaurant generator failed');
    return [];
  }
}

module.exports = { getRestaurantsForCity };
