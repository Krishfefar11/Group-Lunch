/**
 * mealdb.js — Real dish data for dynamically-fetched restaurants
 *
 * Priority:
 *  1. TheMealDB by category  (free, no key — good for Western/Continental cuisines)
 *  2. Groq AI menu generator (better for Indian cuisines — produces authentic names)
 */

const Groq = require('groq-sdk');
const log  = require('../utils/logger');

const BASE = 'https://www.themealdb.com/api/json/v1/1';

// Map our cuisine types → TheMealDB categories that have meaningful data
const CUISINE_TO_CATEGORIES = {
  NorthIndian:  ['Chicken', 'Lamb'],
  SouthIndian:  ['Vegetarian'],
  Biryani:      ['Chicken', 'Lamb'],
  Chinese:      ['Chicken', 'Miscellaneous'],
  Pizza:        ['Miscellaneous', 'Pasta'],
  Burgers:      ['Chicken', 'Beef'],
  Continental:  ['Beef', 'Lamb', 'Pasta', 'Seafood'],
  Breakfast:    ['Breakfast'],
  Wraps:        ['Chicken', 'Miscellaneous'],
  Cafe:         ['Dessert', 'Miscellaneous'],
  Healthy:      ['Vegetarian', 'Vegan'],
  Mexican:      ['Chicken', 'Beef', 'Miscellaneous'],
  Thai:         ['Chicken', 'Seafood'],
  Any:          ['Chicken', 'Vegetarian'],
};

const NON_VEG_WORDS = [
  'chicken', 'beef', 'lamb', 'pork', 'fish', 'prawn', 'shrimp', 'mutton',
  'egg', 'meat', 'turkey', 'duck', 'crab', 'lobster', 'tuna', 'salmon', 'goat',
  'mince', 'sausage', 'bacon', 'ham',
];

// ── TheMealDB helpers ─────────────────────────────────────────────────────────

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

  const text    = (meal.strMeal + ' ' + ingredients.join(' ')).toLowerCase();
  const isVeg   = !NON_VEG_WORDS.some((w) => text.includes(w));
  const isJain  = isVeg && !['egg', 'onion', 'garlic', 'potato'].some((w) => text.includes(w));

  const catMap = {
    Chicken: 'Main Course', Beef: 'Main Course', Lamb: 'Main Course',
    Pork: 'Main Course', Seafood: 'Main Course', Pasta: 'Main Course',
    Vegetarian: 'Main Course', Vegan: 'Main Course', Goat: 'Main Course',
    Dessert: 'Desserts', Starter: 'Starters',
    Breakfast: 'Breakfast', Side: 'Sides', Miscellaneous: 'Specials',
  };

  // Use first 120 chars of instructions as description if available
  const instructions = (meal.strInstructions || '').replace(/\r?\n/g, ' ').trim();
  const description  = instructions.length > 10 ? instructions.slice(0, 160) + '…' : `${meal.strMeal} — a classic dish.`;

  return {
    restaurantId,
    itemCode:     `MDB_${meal.idMeal}`,
    name:         meal.strMeal,
    description,
    price:        mealDbEstimatePrice(meal.strCategory, isVeg),
    veg:          isVeg,
    jainFriendly: isJain,
    tags:         (meal.strTags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 4),
    category:     catMap[meal.strCategory] || 'Main Course',
    imageUrl:     meal.strMealThumb || null,
    mealDbId:     meal.idMeal,
  };
}

function mealDbEstimatePrice(category, isVeg) {
  const base = {
    Chicken: 290, Beef: 340, Lamb: 380, Pork: 310, Seafood: 400, Goat: 360,
    Vegetarian: 200, Vegan: 180, Pasta: 250, Dessert: 120,
    Starter: 160, Breakfast: 130, Side: 90, Miscellaneous: 220,
  };
  const b = (base[category] || 220) + (isVeg ? -30 : 0);
  return Math.round((b + (Math.random() * 80 - 40)) / 10) * 10;
}

async function fetchFromMealDb(restaurantId, cuisines) {
  const targets    = [...new Set(cuisines)].slice(0, 2);
  const categories = [...new Set(targets.flatMap((c) => CUISINE_TO_CATEGORIES[c] || ['Chicken']))].slice(0, 3);

  const allMeals = [];
  for (const cat of categories) {
    const list    = await fetchByCategory(cat);
    const sample  = list.sort(() => 0.5 - Math.random()).slice(0, 6);
    const details = await Promise.all(sample.map((m) => fetchDetail(m.idMeal).catch(() => null)));
    for (const meal of details) {
      if (meal) allMeals.push(normalizeMealDbItem(meal, restaurantId));
    }
  }

  const seen = new Set();
  return allMeals.filter((m) => { if (seen.has(m.name)) return false; seen.add(m.name); return true; });
}

// ── Groq AI menu generator ────────────────────────────────────────────────────
// Cuisine-specific guidance ensures authentic dish names (not generic "veg curry")

const CUISINE_GUIDANCE = {
  NorthIndian: `
Starters (2): Seekh Kebab, Hara Bhara Kebab, Chicken Tikka, Paneer Tikka, Reshmi Kebab, Galouti Kebab, Dahi Ke Kebab
Main Course (4): Butter Chicken, Dal Makhani, Palak Paneer, Shahi Paneer, Rogan Josh, Mutton Korma, Chicken Kadhai, Paneer Lababdar, Nihari, Rajma Masala
Breads (2): Garlic Naan, Laccha Paratha, Kulcha, Stuffed Paratha, Roomali Roti, Tandoori Roti
Rice (1): Jeera Rice, Veg Pulao, Chicken Biryani
Beverages (1): Sweet Lassi, Mango Lassi, Chaas
Desserts (2): Gulab Jamun, Rasmalai, Kheer, Gajar Halwa, Kulfi, Phirni`,

  SouthIndian: `
Dosa varieties (3): Masala Dosa, Paper Roast Dosa, Ghee Masala Dosa, Rava Dosa, Pesarattu, Neer Dosa
Idli varieties (2): Idli Sambar, Kanchipuram Idli, Rava Idli, Mini Idli
Vada (1): Medu Vada, Punugulu
Rice dishes (2): Bisibele Bath, Curd Rice, Lemon Rice, Tamarind Rice, Sambar Rice
Special (1): Pongal, Uttapam, Poori Masala, Sabudana Khichdi
Beverages (1): Filter Coffee, Buttermilk, Ragi Java
Desserts (1): Kesari Bath, Paal Payasam, Mysore Pak`,

  Biryani: `
Biryani varieties (5): Hyderabadi Chicken Dum Biryani, Mutton Biryani, Prawn Biryani, Veg Dum Biryani, Paneer Biryani, Kolkata Biryani, Lucknowi Biryani, Keema Biryani
Starters (2): Haleem, Shami Kebab, Chicken 65, Chicken Tikka
Curries (2): Chicken Korma, Mutton Dalcha, Chicken Masala
Sides (2): Boondi Raita, Mirchi Ka Salan, Salan
Breads (1): Roomali Roti, Sheermal
Beverages (1): Rose Sharbat, Nimbu Paani
Desserts (1): Phirni, Sheer Khurma, Double Ka Meetha`,

  Chinese: `
Soups (1): Hot and Sour Soup, Sweet Corn Soup, Manchow Soup
Starters (3): Veg Manchurian Dry, Chilli Chicken Dry, Spring Rolls, Chicken Lollipop, Crispy Corn, Paneer Chilli, Fish in Chilli Garlic Sauce
Fried Rice (2): Veg Fried Rice, Chicken Fried Rice, Mixed Fried Rice, Egg Fried Rice
Noodles (2): Hakka Noodles, Szechuan Noodles, Chow Mein, Kung Pao Noodles
Gravy (1): Veg Manchurian Gravy, Chicken in Black Bean Sauce
Desserts (1): Toffee Apple, Caramel Custard, Red Bean Pancake`,

  Pizza: `
Pizzas (4): Margherita, Farmhouse, Peppy Paneer, BBQ Chicken, Chicken Tikka Pizza, Four Cheese, Veggie Supreme, Spicy Pepperoni
Sides (2): Garlic Bread, Mozzarella Sticks, Garlic Twists, Cheesy Dip
Pasta (2): Pasta Arrabiata, Pasta Boscaiola, Mac and Cheese, Penne in White Sauce
Beverages (1): Coke, Pepsi, Fresh Lime Soda
Desserts (1): Choco Lava Cake, Tiramisu, Panna Cotta`,

  Burgers: `
Burgers (4): Classic Cheese Burger, BBQ Chicken Burger, Mushroom Swiss Burger, Spicy Chipotle Burger, Double Smash Patty, Crispy Chicken Burger
Sides (2): Truffle Parmesan Fries, Onion Rings, Coleslaw, Sweet Potato Fries
Wraps (1): Chicken Caesar Wrap, Crispy Chicken Wrap
Beverages (1): Milkshake (choose: Oreo, Nutella, Classic Vanilla), Cold Coffee
Desserts (1): Chocolate Brownie, Biscoff Cheesecake`,

  Continental: `
Starters (2): Bruschetta, Caesar Salad, Mushroom Soup, Minestrone, Caprese Salad
Mains (4): Pasta Carbonara, Grilled Chicken, Beef Steak, Fish and Chips, Chicken Cordon Bleu, Shepherd's Pie, Mushroom Risotto
Sides (2): Garlic Bread, Roasted Vegetables, Mashed Potato, Dinner Roll
Desserts (2): Tiramisu, Crème Brûlée, Chocolate Mousse, Apple Crumble`,

  Breakfast: `
Egg dishes (3): Eggs Benedict, Masala Omelette, Shakshuka, Scrambled Eggs, Eggs Florentine, Devilled Eggs
Toast (2): Avocado Toast, French Toast, Cinnamon Toast, Smoked Salmon Toast
Pancakes (1): American Pancakes, Banana Pancakes, Waffles
Combos (1): Full English Breakfast, Indian Breakfast Platter
Beverages (2): Cold Brew Coffee, Freshly Squeezed Orange Juice, Green Smoothie, Masala Chai
Desserts (1): Granola Bowl, Banana Bread, Muffin`,

  Healthy: `
Bowls (3): Buddha Bowl, Quinoa Power Bowl, Acai Bowl, Poke Bowl, Grain Bowl
Salads (2): Kale Caesar Salad, Greek Salad, Watermelon Feta Salad, Roasted Veggie Salad
Wraps (2): Falafel Wrap, Grilled Chicken Wrap, Hummus Veggie Wrap
Smoothies/Juices (2): Green Detox Smoothie, Mango Turmeric Smoothie, Cold Pressed Juices
Mains (1): Dal and Rice (healthy), Stir-Fried Tofu`,

  Cafe: `
Light Bites (2): Club Sandwich, Croque Monsieur, Bruschetta, Avocado Toast, Grilled Panini
Mains (2): Pasta of the Day, Quiche, Salad Platter
Desserts (3): Baked Cheesecake, Chocolate Fondant, Macaron Box, Carrot Cake, Biscoff Cookie Skillet
Beverages (3): Flat White, Cold Brew, Iced Matcha Latte, Masala Chai, Belgian Hot Chocolate`,

  Mexican: `
Tacos (2): Chicken Tacos, Fish Tacos, Veg Tacos
Burritos (2): Chicken Burrito, Bean Burrito, Pulled Pork Burrito
Sides (2): Loaded Nachos, Guacamole with Chips, Salsa and Dips
Bowls (1): Chicken Burrito Bowl, Veg Burrito Bowl
Desserts (1): Churros with Chocolate Sauce, Tres Leches Cake`,

  Thai: `
Soups (1): Tom Yum Soup, Tom Kha Soup
Mains (3): Pad Thai, Green Curry, Red Curry, Massaman Curry, Panang Curry, Khao Pad (Fried Rice)
Starters (2): Spring Rolls, Satay Chicken, Som Tam (Papaya Salad), Thai Fish Cakes
Desserts (1): Mango Sticky Rice, Coconut Ice Cream`,
};

function getCuisineGuidance(cuisines) {
  for (const c of cuisines) {
    if (CUISINE_GUIDANCE[c]) return `\nAuthentic items for ${c} cuisine:\n${CUISINE_GUIDANCE[c]}`;
  }
  return '';
}

async function generateMenuWithGroq(restaurantId, restaurantName, cuisines) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const cuisineStr = cuisines.filter((c) => c !== 'Any').join(', ') || 'Indian';
  const guidance   = getCuisineGuidance(cuisines);
  const isVegOnly  = cuisines.includes('SouthIndian') && !cuisines.includes('NorthIndian') && !cuisines.includes('Chinese');

  const prompt = `You are a menu database for an Indian food delivery platform.
Generate an authentic, detailed menu for "${restaurantName}", a ${cuisineStr} restaurant in India.
${guidance}

Create exactly 15 menu items covering all meal categories (starters, main course, rice/breads, beverages, desserts).
${isVegOnly ? 'This is a PURE VEG restaurant — all items must have veg: true.' : ''}

RULES:
- Use SPECIFIC, AUTHENTIC dish names — never write "Veg Curry" or "Chicken Dish"
- description: appetizing, 1–2 sentences with key ingredients and cooking method (40–90 words)
- price: realistic 2024 INR prices (starters 120–350, mains 180–520, breads 40–100, beverages 50–200, desserts 80–200)
- veg: true if the dish has NO meat, fish or egg
- jainFriendly: true ONLY if veg AND no onion, garlic, or root vegetables
- category: one of Starters, Main Course, Biryani, Breads, Rice, Sides, Beverages, Desserts, Dosa, Soups, Pancakes, Bowls, Wraps, Pizza, Pasta, Burgers, Combo
- tags: array — choose from: bestseller, must-try, spicy, mild, healthy, popular, chef-special, new, sharing, light, vegan

Reply with ONLY a valid JSON array — no markdown, no commentary, no explanation:
[
  {
    "name": "Exact Dish Name",
    "description": "Appetizing description mentioning key ingredients and cooking style.",
    "price": 280,
    "veg": false,
    "jainFriendly": false,
    "category": "Main Course",
    "tags": ["bestseller", "spicy"]
  }
]`;

  const client     = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.35,
    max_tokens:  2500,
  });

  const raw   = completion.choices[0]?.message?.content?.trim() || '[]';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const startIdx = clean.indexOf('[');
  if (startIdx === -1) throw new Error('No JSON array in Groq menu response');

  let depth = 0, endIdx = -1;
  for (let i = startIdx; i < clean.length; i++) {
    if (clean[i] === '[') depth++;
    else if (clean[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  const jsonStr = endIdx !== -1 ? clean.slice(startIdx, endIdx + 1) : clean.slice(startIdx);
  const fixed   = jsonStr
    .replace(/:\s*True\b/g,  ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*None\b/g,  ': null');

  const items = JSON.parse(fixed);

  return items.slice(0, 18).map((item, i) => ({
    restaurantId,
    itemCode:     `AI_${restaurantId}_${String(i + 1).padStart(2, '0')}`,
    name:         (item.name || `Dish ${i + 1}`).trim(),
    description:  (item.description || '').trim(),
    price:        Math.min(800, Math.max(40, parseInt(item.price) || 220)),
    veg:          Boolean(item.veg),
    jainFriendly: Boolean(item.jainFriendly) && Boolean(item.veg),
    tags:         Array.isArray(item.tags) ? item.tags.slice(0, 5) : [],
    category:     item.category || 'Main Course',
    imageUrl:     null,
    mealDbId:     null,
  }));
}

// ── Main export ───────────────────────────────────────────────────────────────

// Cuisines where TheMealDB has good, relevant content
const MEALDB_GOOD_CUISINES = new Set(['Breakfast', 'Pizza', 'Continental', 'Burgers', 'Healthy', 'Cafe']);

/**
 * Get dishes for a restaurant.
 *
 * Strategy:
 *  - Western cuisines (Breakfast, Pizza, Continental, Burgers, Cafe, Healthy)
 *      → TheMealDB first (good Western content), fallback to Groq
 *  - Indian / Chinese / Biryani / Thai / Mexican / etc.
 *      → Groq AI first (better authentic names), fallback to TheMealDB
 */
async function getDishesForRestaurant(restaurantId, cuisines = [], restaurantName = '') {
  const useMealDbFirst = cuisines.some((c) => MEALDB_GOOD_CUISINES.has(c));

  if (useMealDbFirst) {
    try {
      const dishes = await fetchFromMealDb(restaurantId, cuisines);
      if (dishes.length >= 6) {
        log.info({ source: 'mealdb', restaurantId, count: dishes.length }, 'Menu fetched from TheMealDB');
        return dishes;
      }
    } catch (err) {
      log.warn({ err: err.message }, 'TheMealDB fetch failed');
    }
  }

  // Groq AI menu generator (best for Indian cuisines)
  try {
    const dishes = await generateMenuWithGroq(restaurantId, restaurantName || `Restaurant #${restaurantId}`, cuisines);
    log.info({ source: 'groq-menu', restaurantId, count: dishes.length }, 'Menu generated by Groq AI');
    return dishes;
  } catch (err) {
    log.warn({ err: err.message }, 'Groq menu generation failed');
  }

  // Last resort: TheMealDB (even if cuisine mismatch)
  try {
    const dishes = await fetchFromMealDb(restaurantId, cuisines);
    return dishes;
  } catch {
    return [];
  }
}

module.exports = { getDishesForRestaurant };
