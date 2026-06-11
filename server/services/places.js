/**
 * places.js — Real restaurant discovery
 *
 * Priority order:
 *  1. TomTom Places API  (2,500 free calls/day — register for key)
 *  2. OpenStreetMap Overpass (completely free, no key, real data)
 *  3. Groq AI generator  (generates realistic named restaurants for the city)
 */

const Groq = require('groq-sdk');
const log  = require('../utils/logger');

const TOMTOM_KEY  = process.env.TOMTOM_API_KEY;
const TOMTOM_BASE = 'https://api.tomtom.com/search/2';

// ── Cuisine helpers ───────────────────────────────────────────────────────────

// Map our cuisine types → TomTom / OSM search terms
const CUISINE_SEARCH_TERMS = {
  NorthIndian:  'north indian restaurant',
  SouthIndian:  'south indian restaurant udupi',
  Biryani:      'biryani restaurant',
  Chinese:      'chinese restaurant indo-chinese',
  Pizza:        'pizza restaurant',
  Burgers:      'burger fast food',
  Wraps:        'wrap shawarma roll',
  Continental:  'continental cafe restaurant',
  Breakfast:    'cafe breakfast',
  Mexican:      'mexican restaurant',
  Thai:         'thai restaurant',
  Healthy:      'salad healthy food',
  Any:          'restaurant',
};

// Detect cuisine types from a restaurant name + extra text (OSM tags, categories)
function detectCuisines(name, extra = '') {
  const text = (name + ' ' + extra).toLowerCase();
  const rules = [
    // Biryani first — most specific
    [/biryani|dum\s?biryani|behrouz|paradise|bawarchi/,             'Biryani'],
    // South Indian
    [/udupi|dosa|idli|saravana|sagar|south.?indian|bhavan|adyar|ananda|darshini|vasudev|woodlands|chutneys|shanti.?sagar/,  'SouthIndian'],
    // North Indian / Punjabi / Mughlai
    [/north.?indian|punjabi|dhaba|mughal|mughali|butter.?chick|tandoor|barbeque.?nation|punjab|patiala|amritsar|haveli/, 'NorthIndian'],
    // Chinese / Indo-Chinese
    [/chinese|wok|dragon|manchurian|szechuan|sichuan|noodle|panda|bamboo|jade|imperial.?china|mainland.?china/,          'Chinese'],
    // Pizza / Italian
    [/pizza|domino|hut|italian|pasta|laziz|la.?pino|ovenstory/,     'Pizza'],
    // Burgers / Fast Food
    [/burger|mcdonald|kfc|wendy|subway|carl|hardee|burger.?king|smashburger|truffles|social/,  'Burgers'],
    // Wraps / Shawarma
    [/wrap|shawarma|roll|kathi|frankie|falafel|lebanese|arabic/,    'Wraps'],
    // Continental / Cafe
    [/continental|french|european|steak|bistro|brasserie|cafe|coffee|bakery|barista|starbucks|third.?wave|blue.?tokai/, 'Cafe'],
    // Breakfast
    [/breakfast|brunch|waffle|pancake|egg.?factory|toast|crepe/,    'Breakfast'],
    // Healthy / Salads
    [/healthy|salad|bowl|vegan|organic|green|detox|fit|buddha|harvest/,  'Healthy'],
    // Mexican
    [/mexican|taco|burrito|chipotle|guacamole|quesadilla/,          'Mexican'],
    // Thai
    [/thai|pad.?thai|green.?curry|lemon.?grass|mango.?tree/,        'Thai'],
    // Seafood / Coastal
    [/seafood|coastal|fish|prawn|coastal|mangalore|goa|kerala/,     'SouthIndian'],
    // Generic Indian fallback
    [/indian|curry|masala|paneer|dal|sabzi|bhoji|bhojan|dhabha/,    'NorthIndian'],
  ];

  const found = new Set();
  for (const [re, cuisine] of rules) {
    if (re.test(text)) found.add(cuisine);
  }
  return found.size ? [...found].slice(0, 3) : ['Any'];
}

// Veg friendliness — expanded heuristic
function isVegFriendly(name, cuisines) {
  const t = name.toLowerCase();
  // Explicit pure-veg signals
  if (/pure.?veg|vegetarian|veg.?only|sattvic|sattvik|jain|no.?onion|no.?garlic/i.test(t)) return true;
  // Well-known veg chains/names
  if (/saravana|udupi|darshini|ananda.?bhavan|adyar.?ananda|vidyarthi|vasudev|shanti.?sagar|brahmin/i.test(t)) return true;
  // Non-veg explicit
  if (/chicken|mutton|fish|seafood|meat|kfc|mcdonald|nonveg|non-veg|barbeque.?nation/i.test(t)) return false;
  // Cuisine-based guess
  if (cuisines.includes('SouthIndian') && !/chicken|mutton|fish|egg/i.test(t)) return true;
  if (cuisines.includes('Healthy') || cuisines.includes('Cafe')) return true;
  return false;
}

// Jain-friendly check
function isJainFriendly(name) {
  return /jain|sattvic|sattvik|no.?onion|no.?garlic/i.test(name);
}

// ── Price estimation — by cuisine and area tier ───────────────────────────────
// Area tier: 'premium' (Indiranagar, Koramangala, MG Road, Whitefield)
//            'mid'     (HSR, Jayanagar, JP Nagar)
//            'budget'  (BTM, Rajajinagar, Hebbal)
const CUISINE_BASE_PRICE = {
  NorthIndian: 340, SouthIndian: 160, Biryani: 300,
  Chinese: 250, Pizza: 320, Burgers: 340,
  Wraps: 220, Continental: 480, Breakfast: 200,
  Cafe: 280, Healthy: 260, Mexican: 320, Thai: 380, Any: 240,
};

function estimatePrice(cuisines, areaText = '') {
  const base   = CUISINE_BASE_PRICE[cuisines[0]] || 240;
  const isPremium = /indiranagar|koramangala|mg.road|whitefield|ulsoor|richmond|lavelle|brigade/i.test(areaText);
  const isBudget  = /btm|hebbal|rajajinagar|basavanagudi|kengeri|yelahanka/i.test(areaText);
  const multiplier = isPremium ? 1.2 : isBudget ? 0.8 : 1.0;
  const jitter  = 0.9 + Math.random() * 0.2;
  return Math.round((base * multiplier * jitter) / 10) * 10;
}

// Delivery time estimation — central areas faster
function estimateDeliveryTime(areaText = '') {
  const isOutskirts = /whitefield|electronic.city|sarjapur|tumkur|hosur|bannerghatta/i.test(areaText);
  const isCentral   = /mg.road|koramangala|indiranagar|ulsoor|brigade|richmond/i.test(areaText);
  if (isCentral)   return 20 + Math.floor(Math.random() * 10);  // 20-30 min
  if (isOutskirts) return 35 + Math.floor(Math.random() * 15);  // 35-50 min
  return 25 + Math.floor(Math.random() * 15);                   // 25-40 min (default)
}

// Realistic-looking rating — based on name hash + small variance
// Avoids extreme values — most Bangalore restaurants cluster 3.6–4.6
function pseudoRating(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const base = 3.6 + (h % 10) * 0.1;    // 3.6 – 4.5
  const jitter = (((h >> 8) % 3) - 1) * 0.1; // ±0.1
  return parseFloat(Math.min(4.8, Math.max(3.3, base + jitter)).toFixed(1));
}

function cuisineEmoji(c) {
  return {
    NorthIndian: '🍛', SouthIndian: '🥘', Biryani: '🍚', Chinese: '🥡',
    Pizza: '🍕', Burgers: '🍔', Wraps: '🌯', Continental: '🍽️',
    Breakfast: '🍳', Cafe: '☕', Healthy: '🥗', Mexican: '🌮', Thai: '🍜', Any: '🍽️',
  }[c] || '🍽️';
}

// ── 1. TomTom Places API ──────────────────────────────────────────────────────

async function geocodeCity(city) {
  const url = `${TOMTOM_BASE}/geocode/${encodeURIComponent(city + ' India')}.json` +
    `?key=${TOMTOM_KEY}&limit=1`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`TomTom: could not geocode "${city}"`);
  return { lat: result.position.lat, lon: result.position.lon };
}

async function searchTomTom(city, cuisineHints = []) {
  if (!TOMTOM_KEY) throw new Error('TOMTOM_API_KEY not set');
  const { lat, lon } = await geocodeCity(city);

  const terms = cuisineHints.length > 0
    ? [...new Set(cuisineHints.slice(0, 3).map((c) => CUISINE_SEARCH_TERMS[c] || 'restaurant'))]
    : ['restaurant'];

  const allResults = [];
  for (const term of terms) {
    const url = `${TOMTOM_BASE}/poiSearch/${encodeURIComponent(term)}.json` +
      `?key=${TOMTOM_KEY}&lat=${lat}&lon=${lon}&radius=5000&limit=15&countrySet=IN&categorySet=7315`;
    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.results?.length) allResults.push(...data.results);
    } catch { /* continue */ }
  }
  if (!allResults.length) throw new Error('TomTom: no results');

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
  const cuisines = detectCuisines(poi.name || '', classifications);
  const name     = poi.name || 'Unknown Restaurant';
  const area     = addr.municipalitySubdivision || addr.municipality || searchedCity;
  const address  = addr.freeformAddress || `${area}, ${searchedCity}`;

  return {
    placeId:         `tt_${place.id}`,
    name,
    cuisines,
    rating:          pseudoRating(name),
    deliveryTimeMin: estimateDeliveryTime(area),
    vegFriendly:     isVegFriendly(name, cuisines),
    jainFriendly:    isJainFriendly(name),
    pricePerPerson:  estimatePrice(cuisines, area),
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area,
    address,
    photoUrl:        null,
    source:          'tomtom',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 2. OpenStreetMap Overpass (free, no key) ──────────────────────────────────

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
  const query = `[out:json][timeout:12];
node["amenity"="restaurant"](around:5000,${lat},${lon});
out body 30;`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:   `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12000),
      });
      const data     = await res.json();
      const elements = (data.elements || []).filter((el) => el.tags?.name);
      if (elements.length > 0) {
        log.info({ source: 'osm', city, count: elements.length }, 'OSM restaurants fetched');
        return elements.map((el) => normalizeOSM(el, city));
      }
    } catch { /* try next mirror */ }
  }
  throw new Error('All Overpass mirrors unavailable');
}

function normalizeOSM(el, searchedCity) {
  const tags       = el.tags || {};
  const rawCuisine = (tags.cuisine || '').split(';').join(' ');
  const cuisines   = detectCuisines(tags.name || '', rawCuisine);
  const name       = tags.name || 'Unknown';
  const area       = tags['addr:suburb'] || tags['addr:city'] || searchedCity;

  // OSM nodes sometimes carry a stars or rating tag — use if available
  let rating = pseudoRating(name);
  if (tags.stars)  rating = Math.min(5, Math.max(1, parseFloat(tags.stars)));
  if (tags.rating) rating = Math.min(5, Math.max(1, parseFloat(tags.rating)));

  return {
    placeId:         `osm_${el.id}`,
    name,
    cuisines,
    rating:          parseFloat(rating.toFixed(1)),
    deliveryTimeMin: estimateDeliveryTime(area),
    vegFriendly:     isVegFriendly(name, cuisines),
    jainFriendly:    isJainFriendly(name),
    pricePerPerson:  estimatePrice(cuisines, area),
    imageEmoji:      cuisineEmoji(cuisines[0]),
    area,
    address:         [tags['addr:street'], tags['addr:city'] || searchedCity].filter(Boolean).join(', '),
    photoUrl:        null,
    source:          'osm',
    city:            searchedCity,
    cachedAt:        new Date(),
  };
}

// ── 3. Groq AI generator (last resort — always works) ────────────────────────
// Improved prompt: asks for real-sounding local names, area diversity,
// price range variety and accurate veg/non-veg mix.

const CITY_CONTEXT = {
  Bangalore: {
    areas:    ['Koramangala', 'Indiranagar', 'HSR Layout', 'Jayanagar', 'Whitefield', 'MG Road', 'BTM Layout', 'JP Nagar'],
    chains:   ['Meghana Foods', 'Biryani Blues', 'Truffles', 'Punjab Grill', 'Saravanaa Bhavan', 'Vidyarthi Bhavan', 'Chinese Dragon', 'Behrouz Biryani'],
  },
  Mumbai: {
    areas:    ['Bandra', 'Andheri', 'Lower Parel', 'Juhu', 'Powai', 'Worli', 'Dadar', 'Colaba'],
    chains:   ['Mahesh Lunch Home', 'Sardar Pav Bhaji', 'Bademiya', 'Britannia & Co', 'Ram Ashraya', 'KFC', 'Dominos'],
  },
  Delhi: {
    areas:    ['Connaught Place', 'Hauz Khas', 'Lajpat Nagar', 'Chandni Chowk', 'Saket', 'Vasant Vihar', 'Karol Bagh'],
    chains:   ['Bukhara', 'Indian Accent', 'Sagar Ratna', 'Haldirams', 'Al Jawahar', 'Moti Mahal'],
  },
  Hyderabad: {
    areas:    ['Banjara Hills', 'Jubilee Hills', 'Madhapur', 'Gachibowli', 'Kukatpally', 'Secunderabad'],
    chains:   ['Paradise Biryani', 'Bawarchi', 'Chutneys', 'Ohri\'s', 'Meridian', 'Ram Ki Bandi'],
  },
};

function getCityContext(city) {
  const key = Object.keys(CITY_CONTEXT).find((k) => city.toLowerCase().includes(k.toLowerCase()));
  return CITY_CONTEXT[key] || {
    areas:  [`Central ${city}`, `East ${city}`, `West ${city}`, `South ${city}`],
    chains: [],
  };
}

async function generateWithGroq(city, cuisineHints = []) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const ctx          = getCityContext(city);
  const cuisineStr   = cuisineHints.length ? cuisineHints.join(', ') : 'NorthIndian, SouthIndian, Biryani, Chinese, Continental';
  const areasStr     = ctx.areas.slice(0, 5).join(', ');
  const chainExamples = ctx.chains.length ? `\nWell-known local restaurants include: ${ctx.chains.join(', ')}. Use these as inspiration for naming styles.` : '';

  const prompt = `You are a restaurant database for ${city}, India.
Generate a JSON array of exactly 15 realistic restaurants in ${city}.${chainExamples}

REQUIREMENTS:
- Include restaurants serving these cuisines: ${cuisineStr}
- Spread restaurants across these real ${city} areas: ${areasStr}
- Include a mix of budget (pricePerPerson 120–250), mid-range (250–450) and premium (450–650) options
- Use real, recognisable Indian restaurant naming conventions (e.g., "Spice Junction", "Udupi Palace", "House of Biryani")
- Include both veg-only and non-veg restaurants
- Ratings should be realistic for Indian restaurants: 3.5–4.7 range
- deliveryTimeMin: 18–50 (central areas faster)

cuisine must be one or more from: NorthIndian, SouthIndian, Biryani, Chinese, Pizza, Burgers, Wraps, Continental, Breakfast, Cafe, Healthy, Mexican, Thai

Reply ONLY with a valid JSON array, no markdown, no commentary:
[
  {
    "name": "Restaurant Name",
    "cuisines": ["NorthIndian"],
    "rating": 4.2,
    "pricePerPerson": 320,
    "deliveryTimeMin": 28,
    "vegFriendly": false,
    "jainFriendly": false,
    "area": "Koramangala"
  }
]`;

  const client     = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens:  2000,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const start = clean.indexOf('[');
  if (start === -1) throw new Error('Groq: no JSON array');
  let depth = 0, end = -1;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '[') depth++;
    else if (clean[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const list = JSON.parse(
    clean.slice(start, end + 1)
      .replace(/:\s*True\b/g,  ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g,  ': null')
  );
  if (!Array.isArray(list) || !list.length) throw new Error('Groq: empty result');

  return list.map((r, i) => {
    const cuisines = Array.isArray(r.cuisines) && r.cuisines.length ? r.cuisines : ['Any'];
    const name     = (r.name || `Restaurant ${i + 1}`).trim();
    const area     = (r.area || city).trim();
    return {
      placeId:         `groq_${city.replace(/\s+/g, '_').toLowerCase()}_${i}`,
      name,
      cuisines,
      rating:          parseFloat((Math.min(4.8, Math.max(3.3, parseFloat(r.rating) || 4.0))).toFixed(1)),
      deliveryTimeMin: Math.min(60, Math.max(15, parseInt(r.deliveryTimeMin) || 30)),
      vegFriendly:     r.vegFriendly === true || isVegFriendly(name, cuisines),
      jainFriendly:    r.jainFriendly === true || isJainFriendly(name),
      pricePerPerson:  Math.min(800, Math.max(80, parseInt(r.pricePerPerson) || 280)),
      imageEmoji:      cuisineEmoji(cuisines[0]),
      area,
      address:         `${area}, ${city}`,
      photoUrl:        null,
      source:          'ai-generated',
      city,
      cachedAt:        new Date(),
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

async function getRestaurantsForCity(city, cuisineHints = []) {
  // 1. TomTom (best quality — real names + addresses)
  if (TOMTOM_KEY) {
    try {
      const places  = await searchTomTom(city, cuisineHints);
      const results = places
        .map((p) => normalizeTomTom(p, city))
        .filter((r) => r.name && r.name !== 'Unknown Restaurant');
      if (results.length >= 3) {
        log.info({ source: 'tomtom', city, count: results.length }, 'Restaurants fetched');
        return results;
      }
    } catch (err) {
      log.warn({ err: err.message }, 'TomTom fetch failed — trying OSM');
    }
  }

  // 2. OpenStreetMap (free, no key, real names + addresses)
  try {
    const results = await searchOSM(city);
    if (results.length >= 3) return results;
  } catch (err) {
    log.warn({ err: err.message }, 'OpenStreetMap fetch failed — falling back to Groq AI');
  }

  // 3. Groq AI (always works)
  try {
    const results = await generateWithGroq(city, cuisineHints);
    log.info({ source: 'groq-ai', city, count: results.length }, 'Restaurants generated by Groq AI');
    return results;
  } catch (err) {
    log.warn({ err: err.message }, 'Groq restaurant generator also failed');
    return [];
  }
}

module.exports = { getRestaurantsForCity };
