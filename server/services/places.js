/**
 * places.js — Real restaurant discovery
 *
 * Priority order:
 *  1. Foursquare Places API v3  (1000 free calls/day — needs valid key)
 *  2. OpenStreetMap Overpass    (completely free, no key — tries 2 mirrors)
 *  3. Groq AI generator        (always works — generates realistic restaurants
 *                               for any city using LLaMA's training knowledge)
 */

const Groq = require('groq-sdk');

const FSQ_KEY  = process.env.FOURSQUARE_API_KEY;
const FSQ_BASE = 'https://api.foursquare.com/v3';

// ── 1. Foursquare ─────────────────────────────────────────────────────────────

async function searchFoursquare(city, cuisineHints = []) {
  const query  = cuisineHints.length ? `${cuisineHints[0]} restaurant` : 'restaurant';
  const fields = 'fsq_id,name,categories,location,rating,price,photos';

  const url = new URL(`${FSQ_BASE}/places/search`);
  url.searchParams.set('query',      query);
  url.searchParams.set('near',       city);
  url.searchParams.set('categories', '13065');
  url.searchParams.set('limit',      '15');
  url.searchParams.set('fields',     fields);

  const res = await fetch(url.toString(), {
    headers: { Authorization: FSQ_KEY, Accept: 'application/json' },
    signal:  AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foursquare ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.results || [];
}

function normalizeFoursquare(place, searchedCity) {
  const categories  = (place.categories || []).map((c) => c.name);
  const cuisines    = categoriesToCuisines(categories);
  const loc         = place.location || {};

  let photoUrl = null;
  if (place.photos?.length) {
    const p = place.photos[0];
    photoUrl = `${p.prefix}400x200${p.suffix}`;
  }

  const rating       = place.rating ? parseFloat((place.rating / 2).toFixed(1)) : 3.8;
  const priceMap     = { 1: 120, 2: 250, 3: 450, 4: 700 };
  const pricePerPerson = priceMap[place.price] || 220;
  const address      = [loc.address, loc.neighborhood?.[0], loc.locality].filter(Boolean).join(', ');

  return {
    placeId:         place.fsq_id,
    name:            place.name,
    cuisines,
    rating,
    deliveryTimeMin: randInt(20, 45),
    vegFriendly:     cuisines.some((c) => ['SouthIndian', 'NorthIndian', 'Breakfast', 'Pizza'].includes(c)),
    jainFriendly:    false,
    pricePerPerson,
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area:            loc.locality || loc.neighborhood?.[0] || searchedCity,
    address,
    photoUrl,
    source:          'foursquare',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 2. OpenStreetMap Overpass (tries 2 mirrors) ───────────────────────────────

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function searchOSM(city) {
  // Geocode city centre
  const nomRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'GroupLunchApp/1.0' }, signal: AbortSignal.timeout(6000) }
  );
  const nomData = await nomRes.json();
  if (!nomData.length) throw new Error('City not found in Nominatim');

  const { lat, lon } = nomData[0];
  const query = `[out:json][timeout:10];node["amenity"="restaurant"](around:4000,${lat},${lon});out body 20;`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(12000),
      });
      const data = await res.json();
      const elements = (data.elements || []).filter((el) => el.tags?.name);
      if (elements.length > 0) {
        return elements.map((el) => normalizeOSM(el, city));
      }
    } catch { /* try next mirror */ }
  }
  throw new Error('All Overpass mirrors unavailable');
}

function normalizeOSM(el, searchedCity) {
  const tags     = el.tags || {};
  const cuisines = (tags.cuisine || '')
    .split(';').map((c) => osmCuisineMap(c.trim())).filter(Boolean);
  if (!cuisines.length) cuisines.push('Any');

  return {
    placeId:         `osm_${el.id}`,
    name:            tags.name,
    cuisines,
    rating:          parseFloat((3.4 + Math.random() * 1.2).toFixed(1)),
    deliveryTimeMin: randInt(20, 40),
    vegFriendly:     cuisines.some((c) => ['SouthIndian', 'NorthIndian', 'Breakfast'].includes(c)),
    jainFriendly:    false,
    pricePerPerson:  randInt(150, 380),
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area:            tags['addr:suburb'] || tags['addr:city'] || searchedCity,
    address:         [tags['addr:street'], tags['addr:city'] || searchedCity].filter(Boolean).join(', '),
    photoUrl:        null,
    source:          'osm',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 3. Groq AI restaurant generator ──────────────────────────────────────────
// Uses LLaMA 3's training knowledge of real restaurants in Indian cities.
// Always works — no external API keys needed beyond GROQ_API_KEY.

async function generateWithGroq(city, cuisineHints = []) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const cuisineFilter = cuisineHints.length
    ? `Prioritise these cuisines: ${cuisineHints.join(', ')}.`
    : 'Include a mix of cuisines.';

  const prompt = `You are a restaurant database. Generate a JSON array of 10 real or highly realistic restaurants in ${city}, India.

${cuisineFilter}

Rules:
- Use actual well-known restaurant names from ${city} if you know them, or realistic local names
- Cuisine must be one or more of: NorthIndian, SouthIndian, Biryani, Chinese, Pizza, Burgers, Wraps, Continental, Breakfast
- rating: 3.5–4.8 (decimal)
- pricePerPerson: realistic INR amount (80–600)
- deliveryTimeMin: 15–50
- area: real neighbourhood in ${city}
- vegFriendly: true if primarily vegetarian-friendly

Reply with ONLY a valid JSON array, no markdown:
[
  {"name":"...","cuisines":["..."],"rating":4.2,"pricePerPerson":280,"deliveryTimeMin":25,"vegFriendly":true,"jainFriendly":false,"area":"..."},
  ...
]`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens:  1200,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Extract JSON array even if model adds text before/after
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Groq returned no JSON array');

  const list = JSON.parse(match[0]);
  if (!Array.isArray(list) || !list.length) throw new Error('Empty array from Groq');

  return list.map((r, i) => ({
    placeId:         `groq_${city.replace(/\s+/g, '_')}_${i}`,
    name:            r.name || `Restaurant ${i + 1}`,
    cuisines:        Array.isArray(r.cuisines) ? r.cuisines : ['Any'],
    rating:          parseFloat(r.rating) || 4.0,
    deliveryTimeMin: parseInt(r.deliveryTimeMin) || 30,
    vegFriendly:     Boolean(r.vegFriendly),
    jainFriendly:    Boolean(r.jainFriendly),
    pricePerPerson:  parseInt(r.pricePerPerson) || 250,
    imageEmoji:      cuisineEmoji((Array.isArray(r.cuisines) ? r.cuisines[0] : null) || 'Any'),
    area:            r.area || city,
    address:         r.area ? `${r.area}, ${city}` : city,
    photoUrl:        null,
    source:          'ai-generated',
    city,
    cachedAt:        new Date(),
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoriesToCuisines(categories) {
  const rules = [
    [/north.?indian|mughlai|punjabi/i,  'NorthIndian'],
    [/south.?indian|dosa|idli|udupi/i,  'SouthIndian'],
    [/biryani/i,                         'Biryani'],
    [/chinese|asian/i,                   'Chinese'],
    [/pizza|italian/i,                   'Pizza'],
    [/burger|fast.?food|american/i,      'Burgers'],
    [/wrap|sandwich|shawarma/i,          'Wraps'],
    [/continental|european|french/i,     'Continental'],
    [/breakfast|cafe|coffee/i,           'Breakfast'],
    [/indian/i,                          'NorthIndian'],
  ];
  const result = new Set();
  for (const cat of categories) {
    for (const [re, val] of rules) {
      if (re.test(cat)) { result.add(val); break; }
    }
  }
  return result.size ? [...result] : ['Any'];
}

function osmCuisineMap(raw) {
  const m = {
    indian:'NorthIndian', north_indian:'NorthIndian', mughlai:'NorthIndian',
    south_indian:'SouthIndian', dosa:'SouthIndian',
    biryani:'Biryani', chinese:'Chinese', asian:'Chinese',
    pizza:'Pizza', italian:'Pizza', burger:'Burgers',
    fast_food:'Burgers', american:'Burgers', sandwich:'Wraps',
    shawarma:'Wraps', continental:'Continental', french:'Continental',
    breakfast:'Breakfast', cafe:'Breakfast', coffee:'Breakfast',
  };
  return m[raw.toLowerCase()] || null;
}

function cuisineEmoji(c) {
  const e = {
    NorthIndian:'🍛', SouthIndian:'🥘', Biryani:'🍚', Chinese:'🥡',
    Pizza:'🍕', Burgers:'🍔', Wraps:'🌯', Continental:'🍽️', Breakfast:'☕', Any:'🍽️',
  };
  return e[c] || '🍽️';
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch real (or AI-generated) restaurants for a city.
 * Returns array of normalized objects ready to upsert into the DB.
 */
async function getRestaurantsForCity(city, cuisineHints = []) {
  // 1. Foursquare
  if (FSQ_KEY) {
    try {
      const places = await searchFoursquare(city, cuisineHints);
      if (places.length > 0) {
        const results = places.map((p) => normalizeFoursquare(p, city)).filter((r) => r.name);
        console.log(`📍 Foursquare: ${results.length} restaurants in ${city}`);
        return results;
      }
    } catch (err) {
      console.warn(`⚠️  Foursquare: ${err.message}`);
    }
  }

  // 2. OpenStreetMap
  try {
    const results = await searchOSM(city);
    if (results.length > 0) {
      console.log(`🗺️  OpenStreetMap: ${results.length} restaurants in ${city}`);
      return results;
    }
  } catch (err) {
    console.warn(`⚠️  OpenStreetMap: ${err.message}`);
  }

  // 3. Groq AI generator (always works)
  try {
    const results = await generateWithGroq(city, cuisineHints);
    console.log(`🤖 Groq AI generated ${results.length} restaurants for ${city}`);
    return results;
  } catch (err) {
    console.warn(`⚠️  Groq generator: ${err.message}`);
    return [];
  }
}

module.exports = { getRestaurantsForCity };
