/**
 * mealdb.js — Real dish data
 *
 * Priority:
 *  1. TheMealDB by category  (free, no key — category filters work; area filters don't in v1 free)
 *  2. Groq menu generator    (generates realistic Indian restaurant dishes with proper names)
 */

const Groq = require('groq-sdk');

const BASE = 'https://www.themealdb.com/api/json/v1/1';

// Map our cuisine types → TheMealDB categories that actually have data
const CUISINE_TO_CATEGORIES = {
  NorthIndian:  ['Chicken', 'Lamb'],
  SouthIndian:  ['Vegetarian', 'Chicken'],
  Biryani:      ['Chicken', 'Lamb'],
  Chinese:      ['Chicken', 'Miscellaneous'],
  Pizza:        ['Miscellaneous', 'Pasta'],
  Burgers:      ['Chicken', 'Beef'],
  Continental:  ['Beef', 'Lamb', 'Pasta'],
  Breakfast:    ['Breakfast'],
  Wraps:        ['Chicken', 'Miscellaneous'],
  Any:          ['Chicken', 'Vegetarian'],
};

const NON_VEG_WORDS = [
  'chicken','beef','lamb','pork','fish','prawn','shrimp',
  'mutton','egg','meat','turkey','duck','crab','lobster','tuna','salmon','goat',
];

// ── TheMealDB ─────────────────────────────────────────────────────────────────

async function fetchByCategory(category) {
  const res  = await fetch(`${BASE}/filter.php?c=${category}`, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  return data.meals || [];
}

async function fetchDetail(mealId) {
  const res  = await fetch(`${BASE}/lookup.php?i=${mealId}`, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  return data.meals?.[0] || null;
}

function normalizeMealDbItem(meal, restaurantId) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    if (ing?.trim()) ingredients.push(ing.trim());
  }

  const text   = (meal.strMeal + ' ' + ingredients.join(' ')).toLowerCase();
  const isVeg  = !NON_VEG_WORDS.some((w) => text.includes(w));
  const isJain = isVeg && !['egg','onion','garlic','potato'].some((w) => text.includes(w));

  const catMap = {
    Chicken:'Main Course', Beef:'Main Course', Lamb:'Main Course',
    Pork:'Main Course', Seafood:'Main Course', Pasta:'Main Course',
    Vegetarian:'Main Course', Vegan:'Main Course', Goat:'Main Course',
    Dessert:'Desserts', Starter:'Starters',
    Breakfast:'Breakfast', Side:'Sides', Miscellaneous:'Specials',
  };

  return {
    restaurantId,
    itemCode:     `MDB_${meal.idMeal}`,
    name:         meal.strMeal,
    description:  (meal.strInstructions || '').replace(/\r?\n/g,' ').slice(0,200),
    price:        estimatePrice(meal.strCategory, isVeg),
    veg:          isVeg,
    jainFriendly: isJain,
    tags:         (meal.strTags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    category:     catMap[meal.strCategory] || 'Main Course',
    imageUrl:     meal.strMealThumb || null,
    mealDbId:     meal.idMeal,
  };
}

function estimatePrice(category, isVeg) {
  const base = {
    Chicken:280, Beef:320, Lamb:360, Pork:300, Seafood:380, Goat:340,
    Vegetarian:180, Vegan:160, Pasta:220, Dessert:100,
    Starter:150, Breakfast:110, Side:80, Miscellaneous:200,
  };
  const b = (base[category] || 200) + (isVeg ? -30 : 0);
  return Math.round((b + (Math.random() * b * 0.3 - b * 0.15)) / 10) * 10;
}

async function fetchFromMealDb(restaurantId, cuisines) {
  const targets  = [...new Set(cuisines)].slice(0, 2);
  const categories = [...new Set(targets.flatMap((c) => CUISINE_TO_CATEGORIES[c] || ['Chicken']))].slice(0, 3);

  const allMeals = [];
  for (const cat of categories) {
    const list   = await fetchByCategory(cat);
    const sample = list.sort(() => 0.5 - Math.random()).slice(0, 6);
    const details = await Promise.all(sample.map((m) => fetchDetail(m.idMeal).catch(() => null)));
    for (const meal of details) {
      if (meal) allMeals.push(normalizeMealDbItem(meal, restaurantId));
    }
  }

  // Deduplicate
  const seen  = new Set();
  return allMeals.filter((m) => { if (seen.has(m.name)) return false; seen.add(m.name); return true; });
}

// ── Groq menu generator ───────────────────────────────────────────────────────

async function generateMenuWithGroq(restaurantId, restaurantName, cuisines) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const cuisineStr = cuisines.join(', ');

  const prompt = `You are a menu database for Indian restaurants. Generate a realistic menu for "${restaurantName}", a ${cuisineStr} restaurant.

Create 12 menu items. Include starters, main course, breads/rice, beverages, desserts.
Use authentic Indian dish names appropriate for this cuisine type.

Rules:
- name: real dish name (e.g. "Butter Chicken", "Dal Makhani", "Masala Dosa")
- price: in INR, realistic (60–480)
- veg: true/false
- category: one of Starters, Main Course, Breads, Rice, Beverages, Desserts
- tags: array, can include "bestseller", "spicy", "recommended", "new"

Reply with ONLY valid JSON array, no markdown:
[{"name":"...","price":220,"veg":false,"category":"Main Course","tags":["bestseller"],"description":"..."},...]`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens:  1500,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  // Strip markdown code fences
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Extract the JSON array — find the first '[' and match balanced brackets
  const startIdx = clean.indexOf('[');
  if (startIdx === -1) throw new Error('No JSON array in Groq response');

  let depth = 0, endIdx = -1;
  for (let i = startIdx; i < clean.length; i++) {
    if (clean[i] === '[') depth++;
    else if (clean[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  const jsonStr = endIdx !== -1 ? clean.slice(startIdx, endIdx + 1) : clean.slice(startIdx);

  // Fix common LLM JSON mistakes: Python-style booleans and None
  const fixed = jsonStr
    .replace(/:\s*True\b/g,  ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*None\b/g,  ': null');

  const items = JSON.parse(fixed);
  return items.map((item, i) => ({
    restaurantId,
    itemCode:     `AI_${restaurantId}_${i + 1}`,
    name:         item.name || `Dish ${i + 1}`,
    description:  item.description || '',
    price:        parseInt(item.price) || 200,
    veg:          Boolean(item.veg),
    jainFriendly: Boolean(item.veg) && !String(item.name).toLowerCase().includes('egg'),
    tags:         Array.isArray(item.tags) ? item.tags : [],
    category:     item.category || 'Main Course',
    imageUrl:     null,
    mealDbId:     null,
  }));
}

// ── Main export ───────────────────────────────────────────────────────────────

// Cuisines where TheMealDB has relevant content (Western/Breakfast)
const MEALDB_GOOD_CUISINES = new Set(['Breakfast', 'Pizza', 'Continental', 'Burgers']);

/**
 * Get dishes for a restaurant.
 *
 * Strategy:
 *  - Breakfast / Pizza / Continental / Burgers → TheMealDB first (good Western content)
 *  - Indian / Chinese / Biryani / etc. → Groq first (better Indian content)
 *  - Always fall back to the other if primary fails
 */
async function getDishesForRestaurant(restaurantId, cuisines = [], restaurantName = '') {
  const usesMealDbFirst = cuisines.some((c) => MEALDB_GOOD_CUISINES.has(c));

  if (usesMealDbFirst) {
    // Try TheMealDB → fallback Groq
    try {
      const dishes = await fetchFromMealDb(restaurantId, cuisines);
      if (dishes.length >= 5) {
        console.log(`🍽️  TheMealDB: ${dishes.length} dishes for restaurant #${restaurantId}`);
        return dishes;
      }
    } catch (err) {
      console.warn(`⚠️  TheMealDB: ${err.message}`);
    }
  }

  // Groq AI menu generator (Indian cuisines or fallback)
  try {
    const dishes = await generateMenuWithGroq(restaurantId, restaurantName || `Restaurant #${restaurantId}`, cuisines);
    console.log(`🤖 Groq menu: ${dishes.length} dishes for restaurant #${restaurantId}`);
    return dishes;
  } catch (err) {
    console.warn(`⚠️  Groq menu: ${err.message}`);
  }

  // Last resort: TheMealDB (even if wrong cuisine)
  try {
    const dishes = await fetchFromMealDb(restaurantId, cuisines);
    return dishes;
  } catch {
    return [];
  }
}

module.exports = { getDishesForRestaurant };
