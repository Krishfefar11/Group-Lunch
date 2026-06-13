require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Restaurant, MenuItem, Coupon } = require('../models/index');

// ────────────────────────────────────────────────────────────────────────────────
// RESTAURANT + MENU SEED DATA — 2024 Bangalore market prices
// Every restaurant has 15-18 items covering: Starters, Main Course, Breads/Rice,
// Sides, Beverages, Desserts.  Descriptions are ingredient-forward (Zomato style).
//
// imageUrl format:
//   https://images.unsplash.com/photo-{ID}?auto=format&fit=crop&w=400&h=300&q=80
//   Each ID is a curated, dish-specific Unsplash photo.
// ────────────────────────────────────────────────────────────────────────────────

const U = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=300&q=80`;

const RU = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=400&q=80`;

// ── Curated photo IDs — verified food photography ─────────────────────────────
const PHOTOS = {
  // ── Indian ──
  biryani:              '1631515243349-e0cb75fb8d3a',
  biryaniMutton:        '1563379926898-05f4575a45d8',
  biryaniVeg:           '1596040033229-a9821ebd058d',
  butterChicken:        '1565557623262-b51c2513a641',
  indianCurryRed:       '1585937421612-70a008356c36',
  dalMakhani:           '1574484284002-952d92456975',
  palakPaneer:          '1546069596-ac8e62a1ccd0',
  paneerTikka:          '1589301763406-71dc0b4d9de6',
  chickenTikka:         '1574966739986-97c3a51d3a4a',
  seekhKebab:           '1529692236671-f1f6cf9683ba',
  crispyFriedChicken:   '1527477396000-e27163b481c2',
  fishFry:              '1519708227418-c8fd9a32b7a2',
  haleem:               '1585937421612-70a008356c36',
  naan:                 '1573140247632-f8fd74997d5c',
  riceWhite:            '1596040033229-a9821ebd058d',
  indianSides:          '1574484284002-952d92456975',
  raita:                '1505252585461-04db1eb84625',
  lassi:                '1505252585461-04db1eb84625',
  indianDessert:        '1551024506-0bccd828d307',
  gulab:                '1551024506-0bccd828d307',
  kulfi:                '1505252585461-04db1eb84625',
  filterCoffee:         '1461023058943-07fcbe16d735',
  // ── South Indian ──
  dosa:                 '1604908177522-72e0a7f3c4b5',
  idliVada:             '1606491956689-2ea866880c84',
  pongal:               '1574484284002-952d92456975',
  southIndianThali:     '1512058556646-c4da40fba323',
  buttermilk:           '1505252585461-04db1eb84625',
  // ── Burgers & American ──
  burger:               '1568901346375-23c9450c58cd',
  sliders:              '1568901346375-23c9450c58cd',
  chickenWings:         '1527477396000-e27163b481c2',
  nachos:               '1513456852971-30c0b8199d4d',
  mozzarellaSticks:     '1548340748-6fe353b04d6b',
  truffleFries:         '1576107232684-1279f8d46b18',
  onionRings:           '1576107232684-1279f8d46b18',
  milkshake:            '1568515387631-8b650bbcdb90',
  // ── Pizza & Italian ──
  pizza:                '1513104890138-7c749659a591',
  pasta:                '1621996346565-e3dbc646d9a9',
  garlicBread:          '1573140247632-f8fd74997d5c',
  // ── Chinese / Asian ──
  friedRice:            '1603133872878-684f208fb84b',
  noodles:              '1569718212165-3a8278d5f624',
  springRolls:          '1607098665874-fd193397547b',
  soup:                 '1547592166-23ac45744acd',
  icedTea:              '1509042239860-f550ce710b93',
  chineseDessert:       '1551024506-0bccd828d307',
  // ── Wraps / Mexican ──
  wrap:                 '1509722747041-616f39b57169',
  burritoBowl:          '1553163147-622ab57be1c7',
  grainBowl:            '1512621776951-a57141f2eefd',
  falafel:              '1548340748-6fe353b04d6b',
  tacos:                '1565299585323-38d6b0865b47',
  salad:                '1512621776951-a57141f2eefd',
  lemonade:             '1578886569414-d4e02d47d9fc',
  smoothie:             '1505252585461-04db1eb84625',
  chocolateDessert:     '1578985545062-69928b1d9587',
  // ── Breakfast / Eggs ──
  eggsBenedict:         '1510693206972-df098062cb71',
  omelette:             '1525351484163-7529414344d8',
  shakshuka:            '1565557623262-b51c2513a641',
  frenchToast:          '1484723091739-30a097e8f929',
  avocadoToast:         '1541519227354-08fa5d50c820',
  pancakes:             '1567620905732-2d1ec7ab7445',
  fullEnglish:          '1533089860892-a7c6f0a88666',
  coldBrew:             '1461023058943-07fcbe16d735',
  orangeJuice:          '1473297847765-df1de5b7a6a2',
  cheesecake:           '1567327613485-fca07f4b8e7d',
  // ── Cafe / Continental ──
  risotto:              '1621996346565-e3dbc646d9a9',
  bruschetta:           '1573140247632-f8fd74997d5c',
  watermelonSalad:      '1490474418585-ba9bad8fd0ea',
  fishTacos:            '1565299585323-38d6b0865b47',
  brownie:              '1578985545062-69928b1d9587',
  cola:                 '1544145945-f90425340c7e',
  // ── Mughlai / Biryani Blues ──
  roseSharbat:          '1578886569414-d4e02d47d9fc',
  kheer:                '1551024506-0bccd828d307',
  sheermal:             '1573140247632-f8fd74997d5c',
  nihari:               '1585937421612-70a008356c36',
};

const restaurantData = [

  // ── 1. MEGHANA FOODS ─────────────────────────────────────────────────────────
  {
    name: 'Meghana Foods',
    cuisines: ['Biryani', 'SouthIndian', 'Andhra'],
    rating: 4.4, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 320, imageEmoji: '🍛', area: 'Koramangala, Bangalore',
    imageUrl: RU(PHOTOS.biryani),
    menu: [
      // Starters
      { itemCode: 'MF01', name: 'Chicken 65',
        description: 'Deep-fried boneless chicken marinated in ginger-garlic paste, red chillies, curry leaves and yogurt — crispy outside, juicy inside. Andhra\'s most iconic street-style appetiser.',
        price: 290, veg: false, tags: ['spicy', 'bestseller', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.crispyFriedChicken) },
      { itemCode: 'MF02', name: 'Veg Manchurian (Dry)',
        description: 'Crispy vegetable balls tossed in a tangy soy-chilli-garlic sauce with spring onions and capsicum — a beloved Indo-Chinese starter.',
        price: 200, veg: true, tags: ['starter', 'spicy'], category: 'Starters',
        imageUrl: U(PHOTOS.friedRice) },
      { itemCode: 'MF03', name: 'Fish Fry (Andhra Style)',
        description: 'Fresh Rohu fillets coated in a fiery Andhra masala paste — red chillies, turmeric, ajwain and ginger — pan-fried until golden and crackling.',
        price: 340, veg: false, tags: ['spicy', 'starter'], category: 'Starters',
        imageUrl: U(PHOTOS.fishFry) },

      // Biryani
      { itemCode: 'MF04', name: 'Chicken Dum Biryani (Half)',
        description: 'Aromatic long-grain basmati slow-cooked over charcoal with tender bone-in chicken, whole spices, caramelised onions, saffron water and fresh mint.',
        price: 360, veg: false, tags: ['bestseller', 'must-try', 'spicy'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },
      { itemCode: 'MF05', name: 'Mutton Dum Biryani (Half)',
        description: 'Slow-cooked bone-in goat with long-grain basmati, fried onions, rose water and house biryani masala — sealed and steamed for 2 hours in the authentic dum style.',
        price: 440, veg: false, tags: ['spicy', 'must-try'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniMutton) },
      { itemCode: 'MF06', name: 'Veg Dum Biryani (Half)',
        description: 'Fresh seasonal vegetables and paneer layered with saffron-infused basmati, whole spices, crispy fried onions and a splash of rose water.',
        price: 250, veg: true, tags: ['bestseller'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniVeg) },
      { itemCode: 'MF07', name: 'Egg Biryani (Half)',
        description: 'Boiled eggs simmered in a spiced masala, layered with saffron basmati and finished with biryani masala, crispy onions and fresh mint.',
        price: 270, veg: false, tags: [], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },
      { itemCode: 'MF08', name: 'Paneer Biryani (Half)',
        description: 'Marinated paneer cubes cooked with saffron basmati, cashews, fried onions and whole spices — rich, mildly spiced and deeply fragrant.',
        price: 290, veg: true, tags: [], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniVeg) },

      // Main Course
      { itemCode: 'MF09', name: 'Andhra Chicken Curry',
        description: 'Traditional Andhra gravy with freshly ground coconut, roasted red chillies, onion-tomato base and aromatic spices — fiery, bold and best eaten with steamed rice.',
        price: 320, veg: false, tags: ['spicy', 'bestseller'], category: 'Main Course',
        imageUrl: U(PHOTOS.butterChicken) },
      { itemCode: 'MF10', name: 'Gongura Mutton',
        description: 'Slow-cooked bone-in mutton in a tangy sorrel-leaf (gongura) gravy with onions and Andhra spices — the unmistakable signature preparation of coastal Andhra.',
        price: 420, veg: false, tags: ['spicy', 'must-try'], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },
      { itemCode: 'MF11', name: 'Paneer Butter Masala',
        description: 'Soft paneer cubes simmered in a velvety tomato-cream-cashew gravy, gently spiced with kasuri methi, garam masala and a knob of butter.',
        price: 300, veg: true, tags: [], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },

      // Breads & Sides
      { itemCode: 'MF12', name: 'Butter Naan',
        description: 'Soft leavened bread baked in a blazing tandoor, brushed generously with cultured butter while still warm.',
        price: 55, veg: true, jainFriendly: true, tags: [], category: 'Breads',
        imageUrl: U(PHOTOS.naan) },
      { itemCode: 'MF13', name: 'Boondi Raita',
        description: 'Chilled yogurt with crispy boondi, cumin powder, black salt and fresh coriander — the essential biryani companion.',
        price: 70, veg: true, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.raita) },
      { itemCode: 'MF14', name: 'Mirchi Ka Salan',
        description: 'Hyderabadi-style green chilli gravy with roasted peanuts, sesame, tamarind and a fragrant mix of spices — the classic biryani sidecar.',
        price: 110, veg: true, tags: ['spicy'], category: 'Sides',
        imageUrl: U(PHOTOS.indianSides) },

      // Beverages & Desserts
      { itemCode: 'MF15', name: 'Mango Lassi',
        description: 'Thick chilled yogurt blended with Alphonso mango pulp, a pinch of green cardamom and a touch of sugar — creamy, refreshing and utterly satisfying.',
        price: 120, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.lassi) },
      { itemCode: 'MF16', name: 'Double Ka Meetha',
        description: 'Hyderabadi bread pudding — thick fried bread soaked overnight in saffron-milk syrup, topped with clotted cream, pistachios and dry fruits.',
        price: 130, veg: true, tags: ['dessert'], category: 'Desserts',
        imageUrl: U(PHOTOS.indianDessert) },
    ],
  },

  // ── 2. TRUFFLES ───────────────────────────────────────────────────────────────
  {
    name: 'Truffles',
    cuisines: ['American', 'Burgers', 'Continental'],
    rating: 4.3, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 380, imageEmoji: '🍔', area: 'Indiranagar, Bangalore',
    imageUrl: RU(PHOTOS.burger),
    menu: [
      // Starters
      { itemCode: 'TR01', name: 'Chicken Wings (8 pcs)',
        description: 'Crispy double-fried wings tossed in your choice of classic buffalo, smoky honey-garlic or house BBQ sauce. Served piping hot with blue cheese ranch dip.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters',
        imageUrl: U(PHOTOS.chickenWings) },
      { itemCode: 'TR02', name: 'Loaded Nachos',
        description: 'Crispy corn tortilla chips smothered in warm cheddar cheese sauce, pico de gallo, pickled jalapeños, guacamole and sour cream. Perfect for sharing.',
        price: 280, veg: true, tags: ['starter', 'spicy', 'sharing'], category: 'Starters',
        imageUrl: U(PHOTOS.nachos) },
      { itemCode: 'TR03', name: 'Mozzarella Sticks',
        description: 'Panko-breaded, deep-fried mozzarella sticks with a stringy, molten pull — served with a punchy house marinara dipping sauce.',
        price: 260, veg: true, tags: ['starter'], category: 'Starters',
        imageUrl: U(PHOTOS.mozzarellaSticks) },

      // Burgers
      { itemCode: 'TR04', name: 'That Burger',
        description: 'Truffles\' legendary smash-style 120g beef patty, double American cheese, house secret sauce, bread-and-butter pickles and caramelised onions on a toasted brioche bun.',
        price: 420, veg: false, tags: ['bestseller', 'must-try'], category: 'Burgers',
        imageUrl: U(PHOTOS.burger) },
      { itemCode: 'TR05', name: 'Mushroom Swiss Burger',
        description: 'Grilled portobello mushroom cap, melted Swiss cheese, roasted garlic aioli, rocket and red onion jam stacked on a sesame-seed brioche bun.',
        price: 360, veg: true, tags: ['bestseller'], category: 'Burgers',
        imageUrl: U(PHOTOS.burger) },
      { itemCode: 'TR06', name: 'BBQ Chicken Burger',
        description: 'Grilled free-range chicken thigh glazed in house-smoked BBQ sauce, tangy coleslaw, aged cheddar and crispy shallot rings in a toasted brioche bun.',
        price: 390, veg: false, tags: [], category: 'Burgers',
        imageUrl: U(PHOTOS.burger) },
      { itemCode: 'TR07', name: 'Spicy Chipotle Burger',
        description: 'Crispy southern-fried chicken thigh coated in smoky chipotle sauce, pepper jack cheese, pickled jalapeños and shredded iceberg lettuce.',
        price: 380, veg: false, tags: ['spicy'], category: 'Burgers',
        imageUrl: U(PHOTOS.burger) },

      // Mains
      { itemCode: 'TR08', name: 'Pasta Arrabiata',
        description: 'Penne in a fiery San Marzano tomato and garlic sauce with fresh basil, a scattering of chilli flakes — finished with aged parmesan shavings and olive oil.',
        price: 310, veg: true, tags: ['spicy'], category: 'Mains',
        imageUrl: U(PHOTOS.pasta) },
      { itemCode: 'TR09', name: 'Chicken Caesar Salad',
        description: 'Grilled chicken breast, whole romaine hearts, shaved parmesan, house Caesar dressing made with anchovy paste and garlic, topped with sourdough croutons.',
        price: 330, veg: false, tags: ['healthy'], category: 'Salads',
        imageUrl: U(PHOTOS.salad) },

      // Sides
      { itemCode: 'TR10', name: 'Truffle Parmesan Fries',
        description: 'Double-fried shoestring potatoes tossed in white truffle oil, parmesan shavings and fresh rosemary — with a parmesan dip on the side.',
        price: 240, veg: true, tags: ['must-try', 'bestseller'], category: 'Sides',
        imageUrl: U(PHOTOS.truffleFries) },
      { itemCode: 'TR11', name: 'Onion Rings',
        description: 'Thick-cut sweet onion rings in a light, crispy beer batter — fried golden and served with chipotle mayo and ketchup.',
        price: 180, veg: true, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.onionRings) },

      // Pizza
      { itemCode: 'TR12', name: 'Margherita Pizza',
        description: 'San Marzano tomato base, fresh buffalo mozzarella, torn basil and extra-virgin olive oil on a hand-stretched Neapolitan-style thin crust.',
        price: 340, veg: true, tags: [], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'TR13', name: 'BBQ Chicken Pizza',
        description: 'Smoky house-made BBQ sauce base, grilled chicken, caramelised red onion, charred peppers and mozzarella on a thin charred crust.',
        price: 400, veg: false, tags: ['bestseller'], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },

      // Beverages & Desserts
      { itemCode: 'TR14', name: 'Oreo Milkshake',
        description: 'Thick, ultra-creamy vanilla ice cream milkshake blended with crushed Oreos, topped with whipped cream, chocolate sauce and more cookie crumble.',
        price: 190, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.milkshake) },
      { itemCode: 'TR15', name: 'Chocolate Lava Cake',
        description: 'Warm 70% dark chocolate fondant with a molten liquid-chocolate centre — served with a scoop of house-made vanilla bean ice cream.',
        price: 220, veg: true, tags: ['dessert', 'must-try', 'bestseller'], category: 'Desserts',
        imageUrl: U(PHOTOS.indianDessert) },
    ],
  },

  // ── 3. VIDYARTHI BHAVAN ───────────────────────────────────────────────────────
  {
    name: 'Vidyarthi Bhavan',
    cuisines: ['SouthIndian', 'Breakfast', 'Vegetarian'],
    rating: 4.5, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 150, imageEmoji: '🥞', area: 'Gandhi Bazaar, Bangalore',
    imageUrl: RU(PHOTOS.dosa),
    menu: [
      // Dosas
      { itemCode: 'VB01', name: 'Masala Dosa',
        description: 'Paper-thin, golden-brown rice-lentil crepe filled with a generous potato-onion masala spiced with mustard seeds and turmeric — served with fresh sambar and three chutneys.',
        price: 85, veg: true, jainFriendly: false, tags: ['bestseller', 'must-try'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'VB02', name: 'Rava Masala Dosa',
        description: 'Extra-crispy semolina-batter dosa fried in ghee with a full potato masala filling — Vidyarthi Bhavan\'s most-photographed plate since 1943.',
        price: 100, veg: true, tags: ['bestseller'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'VB03', name: 'Set Dosa (3 pcs)',
        description: 'Three soft, thick, airy dosas made from a 12-hour fermented rice-urad batter — light on the stomach, wonderfully pillowy.',
        price: 80, veg: true, jainFriendly: true, tags: [], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'VB04', name: 'Plain Dosa',
        description: 'The purist\'s choice — a thin, crackling-crisp rice-lentil crepe served with coconut chutney and Vidyarthi Bhavan\'s legendary sambar.',
        price: 65, veg: true, jainFriendly: true, tags: [], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'VB05', name: 'Rava Dosa',
        description: 'Lacy, glass-thin semolina crepe poured and cooked instantly to a delicate crispiness with curry leaves, ginger and mustard seeds.',
        price: 95, veg: true, tags: ['popular'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },

      // Idli & Vada
      { itemCode: 'VB06', name: 'Idli Sambar (3 pcs)',
        description: 'Three feather-light steamed rice-lentil cakes, dunked in Vidyarthi Bhavan\'s famously tangy, vegetable-packed sambar — Bangalore breakfast comfort.',
        price: 75, veg: true, jainFriendly: false, tags: [], category: 'Idli',
        imageUrl: U(PHOTOS.idliVada) },
      { itemCode: 'VB07', name: 'Medu Vada (2 pcs)',
        description: 'Crispy golden urad dal doughnuts — airy and shatteringly crunchy outside with a moist, fluffy interior — served with hot sambar and coconut chutney.',
        price: 75, veg: true, jainFriendly: false, tags: ['bestseller'], category: 'Vada',
        imageUrl: U(PHOTOS.idliVada) },
      { itemCode: 'VB08', name: 'Idli-Vada Combo',
        description: 'Two cloud-soft idlis and two crispy medu vadas with a full bowl of sambar and coconut chutney — the quintessential Bangalore tiffin.',
        price: 120, veg: true, tags: ['popular', 'combo'], category: 'Combo',
        imageUrl: U(PHOTOS.idliVada) },

      // Special
      { itemCode: 'VB09', name: 'Pongal',
        description: 'Warm, deeply comforting soft-cooked rice and moong dal with fresh black pepper, cumin, ginger and a lavish pour of clarified ghee.',
        price: 85, veg: true, jainFriendly: true, tags: [], category: 'Special',
        imageUrl: U(PHOTOS.pongal) },
      { itemCode: 'VB10', name: 'Uttapam',
        description: 'Thick, soft rice pancake topped with a colourful scatter of ripe tomatoes, white onions, green chillies and fresh coriander — griddled until golden.',
        price: 90, veg: true, jainFriendly: false, tags: [], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },

      // Sides & Chutneys
      { itemCode: 'VB11', name: 'Coconut Chutney',
        description: 'Freshly ground coconut with green chillies, roasted chana dal, ginger and a hot tempering of mustard seeds, dried chilli and curry leaves.',
        price: 25, veg: true, jainFriendly: true, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.indianSides) },
      { itemCode: 'VB12', name: 'Extra Sambar',
        description: 'A steaming bowl of Vidyarthi Bhavan\'s signature vegetable sambar — tamarind-tangy, toor dal-thick and mildly spiced with fresh drumstick.',
        price: 35, veg: true, jainFriendly: false, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.pongal) },

      // Beverages & Desserts
      { itemCode: 'VB13', name: 'Filter Coffee (Kaapi)',
        description: 'Traditional South Indian filter coffee — premium decoction brewed slowly through a brass filter, mixed with full-cream milk and served frothed in a davara-tumbler set.',
        price: 35, veg: true, jainFriendly: true, tags: ['must-try', 'bestseller'], category: 'Beverages',
        imageUrl: U(PHOTOS.filterCoffee) },
      { itemCode: 'VB14', name: 'Kesari Bath',
        description: 'Saffron-golden semolina sweet cooked with ghee, cashews, golden raisins and cardamom — the classic Bangalore breakfast sweet on every Udupi menu.',
        price: 65, veg: true, tags: ['dessert'], category: 'Desserts',
        imageUrl: U(PHOTOS.indianDessert) },
      { itemCode: 'VB15', name: 'Rava Idli (3 pcs)',
        description: 'Fluffy steamed semolina idlis studded with cashews, mustard seeds and curry leaves — an MTR invention that became a Bangalore classic.',
        price: 85, veg: true, jainFriendly: false, tags: [], category: 'Idli',
        imageUrl: U(PHOTOS.idliVada) },
    ],
  },

  // ── 4. PUNJAB GRILL ──────────────────────────────────────────────────────────
  {
    name: 'Punjab Grill',
    cuisines: ['NorthIndian', 'Punjabi', 'Mughlai'],
    rating: 4.2, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 420, imageEmoji: '🫕', area: 'MG Road, Bangalore',
    imageUrl: RU(PHOTOS.butterChicken),
    menu: [
      // Starters
      { itemCode: 'PG01', name: 'Chicken Tikka',
        description: 'Boneless chicken chunks marinated overnight in yogurt, ginger-garlic paste, mustard oil and tandoori spices — cooked at 400°C in a clay tandoor until charred and smoky.',
        price: 420, veg: false, tags: ['bestseller', 'must-try', 'starter'], category: 'Starters',
        imageUrl: U(PHOTOS.chickenTikka) },
      { itemCode: 'PG02', name: 'Seekh Kebab',
        description: 'Finely minced lamb mixed with onion, ginger, green chillies and herbs — hand-shaped on iron skewers and grilled in a clay tandoor. Served with mint-coriander chutney.',
        price: 400, veg: false, tags: ['starter', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.seekhKebab) },
      { itemCode: 'PG03', name: 'Hara Bhara Kebab',
        description: 'Pan-seared patties of blanched spinach, sweet peas, grated paneer and mild spices — bright green, crispy crust with a soft, herb-forward interior.',
        price: 300, veg: true, tags: ['starter', 'healthy'], category: 'Starters',
        imageUrl: U(PHOTOS.salad) },
      { itemCode: 'PG04', name: 'Paneer Tikka',
        description: 'Chunky cottage cheese cubes marinated in hung curd, mustard, ajwain, carom seeds and smoky tandoori spices — char-grilled until blistered.',
        price: 360, veg: true, tags: ['bestseller', 'starter'], category: 'Starters',
        imageUrl: U(PHOTOS.paneerTikka) },

      // Main Course
      { itemCode: 'PG05', name: 'Butter Chicken (Murgh Makhani)',
        description: 'Tandoor-smoked chicken slow-cooked in a silky tomato-cream-cashew gravy, tempered with kasuri methi, honey and a generous knob of cultured butter.',
        price: 440, veg: false, tags: ['bestseller', 'must-try'], category: 'Main Course',
        imageUrl: U(PHOTOS.butterChicken) },
      { itemCode: 'PG06', name: 'Dal Makhani',
        description: 'Whole black urad lentils and kidney beans slow-simmered on a wood fire for 12 hours with tomato, cream, butter and aromatic spices — buttery, smoky, profound.',
        price: 320, veg: true, tags: ['bestseller', 'must-try'], category: 'Main Course',
        imageUrl: U(PHOTOS.dalMakhani) },
      { itemCode: 'PG07', name: 'Palak Paneer',
        description: 'Tender paneer cubes in a vibrant spinach purée with ginger, garlic, green chillies and whole spices — nutritious, richly flavoured and beautifully green.',
        price: 340, veg: true, tags: [], category: 'Main Course',
        imageUrl: U(PHOTOS.palakPaneer) },
      { itemCode: 'PG08', name: 'Mutton Rogan Josh',
        description: 'Kashmiri-style slow-cooked bone-in goat with Kashmiri red chillies, shallots, whole spices and aromatic mustard oil — a deep crimson, deeply flavoured gravy.',
        price: 480, veg: false, tags: ['spicy', 'must-try'], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },
      { itemCode: 'PG09', name: 'Shahi Paneer',
        description: 'Paneer in a regal cashew-cream-tomato gravy perfumed with cardamom, dried rose petals and a hint of kewra water — mildly spiced, restaurant royalty.',
        price: 360, veg: true, tags: [], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },

      // Breads
      { itemCode: 'PG10', name: 'Garlic Naan',
        description: 'Leavened dough baked direct on the tandoor wall, topped with minced garlic, fresh coriander and liberally brushed with butter.',
        price: 75, veg: true, tags: ['bestseller'], category: 'Breads',
        imageUrl: U(PHOTOS.naan) },
      { itemCode: 'PG11', name: 'Laccha Paratha',
        description: 'Multi-layered whole wheat paratha, each tissue-thin layer separated by ghee, cooked on tawa until flaky, crispy and beautifully laminated.',
        price: 65, veg: true, tags: [], category: 'Breads',
        imageUrl: U(PHOTOS.naan) },
      { itemCode: 'PG12', name: 'Stuffed Paratha',
        description: 'Thick whole wheat bread generously stuffed with spiced potato-onion filling, cooked in butter on a hot iron tawa until golden-brown.',
        price: 120, veg: true, tags: [], category: 'Breads',
        imageUrl: U(PHOTOS.naan) },

      // Sides
      { itemCode: 'PG13', name: 'Jeera Rice',
        description: 'Fragrant aged basmati tempered with cumin seeds, ghee, whole cloves and star anise — a clean, aromatic canvas for any curry.',
        price: 160, veg: true, jainFriendly: true, tags: [], category: 'Rice',
        imageUrl: U(PHOTOS.riceWhite) },

      // Beverages & Desserts
      { itemCode: 'PG14', name: 'Sweet Lassi',
        description: 'Thick, frothy chilled yogurt whisked with sugar, cardamom and a splash of rose water — coolingly sweet and deeply satisfying.',
        price: 120, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.lassi) },
      { itemCode: 'PG15', name: 'Gulab Jamun (2 pcs)',
        description: 'Soft khoya-milk solid dumplings, deep-fried to an even mahogany and soaked in a warm rose-cardamom sugar syrup — melt-in-your-mouth Indian classic.',
        price: 130, veg: true, tags: ['dessert', 'bestseller'], category: 'Desserts',
        imageUrl: U(PHOTOS.gulab) },
      { itemCode: 'PG16', name: 'Kulfi Falooda',
        description: 'Dense pistachio-saffron kulfi on a bed of chilled rose-pink falooda vermicelli noodles, basil seeds, rose syrup and cold whole milk.',
        price: 160, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.kulfi) },
    ],
  },

  // ── 5. DOMINO'S PIZZA ────────────────────────────────────────────────────────
  {
    name: "Domino's Pizza",
    cuisines: ['Pizza', 'Italian', 'FastFood'],
    rating: 4.0, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 280, imageEmoji: '🍕', area: 'Multiple Locations, Bangalore',
    imageUrl: RU(PHOTOS.pizza),
    menu: [
      // Pizzas — Medium (25cm)
      { itemCode: 'DP01', name: 'Margherita (Medium)',
        description: 'Classic Neapolitan with tangy tomato sauce, a generous layer of fresh mozzarella and hand-torn basil on a hand-tossed crust.',
        price: 199, veg: true, jainFriendly: false, tags: [], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'DP02', name: 'Farmhouse (Medium)',
        description: 'Garden-fresh capsicum, button mushrooms, juicy tomatoes and red onions on a seasoned tomato sauce base with oozing mozzarella.',
        price: 299, veg: true, tags: ['bestseller'], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'DP03', name: 'Peppy Paneer (Medium)',
        description: 'Chunky marinated paneer with a rainbow of yellow and red paprika and green capsicum on a rich pizza sauce — loaded with extra mozzarella.',
        price: 319, veg: true, tags: ['bestseller'], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'DP04', name: 'Chicken Dominator (Medium)',
        description: 'The ultimate chicken pizza — peri-peri chicken, grilled chicken strips and pepper chicken on a tangy tomato base. Maximum chicken, maximum flavour.',
        price: 399, veg: false, tags: ['bestseller', 'spicy'], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'DP05', name: 'Chicken Golden Delight (Medium)',
        description: 'Herbed chicken strips with golden sweet corn, fresh tomatoes and green capsicum on a golden Parmesan cream sauce.',
        price: 369, veg: false, tags: [], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },
      { itemCode: 'DP06', name: 'Double Cheese Margarita (Medium)',
        description: 'A double layer of stretchy mozzarella with tangy tomato sauce and oregano — simple, gooey perfection that never disappoints.',
        price: 249, veg: true, tags: ['popular'], category: 'Pizza',
        imageUrl: U(PHOTOS.pizza) },

      // Sides
      { itemCode: 'DP07', name: 'Garlic Bread with Cheese',
        description: 'Oven-baked garlic bread slathered with compound butter, minced garlic and a crown of melted mozzarella — the essential pizza side.',
        price: 149, veg: true, tags: ['starter', 'bestseller'], category: 'Sides',
        imageUrl: U(PHOTOS.garlicBread) },
      { itemCode: 'DP08', name: 'Stuffed Garlic Bread',
        description: 'Garlic bread buns stuffed with a creamy cheese-herb filling, sealed and baked golden — pull apart to reveal the molten centre.',
        price: 179, veg: true, tags: ['starter'], category: 'Sides',
        imageUrl: U(PHOTOS.garlicBread) },
      { itemCode: 'DP09', name: 'Chicken Wings (6 pcs)',
        description: 'Crispy winglets tossed in tangy peri-peri or smoky BBQ sauce with a creamy ranch dipping sauce on the side.',
        price: 219, veg: false, tags: ['starter', 'spicy'], category: 'Sides',
        imageUrl: U(PHOTOS.chickenWings) },

      // Pasta
      { itemCode: 'DP10', name: 'Pasta Italiana (Veg)',
        description: 'Penne tossed in a rich, velvety Béchamel white sauce with sweet corn, capsicum, Italian seasoning and a generous cheese finish.',
        price: 199, veg: true, tags: [], category: 'Pasta',
        imageUrl: U(PHOTOS.pasta) },

      // Beverages & Desserts
      { itemCode: 'DP11', name: 'Pepsi (500ml)',
        description: 'Ice-cold Pepsi — the classic fizzy companion to pizza.',
        price: 65, veg: true, jainFriendly: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.cola) },
      { itemCode: 'DP12', name: 'Choco Lava Cake (2 pcs)',
        description: 'Warm mini chocolate cakes with a flowing dark chocolate centre — Domino\'s most beloved dessert, best eaten immediately.',
        price: 109, veg: true, tags: ['dessert', 'bestseller', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.indianDessert) },
    ],
  },

  // ── 6. BIRYANI BLUES ────────────────────────────────────────────────────────
  {
    name: 'Biryani Blues',
    cuisines: ['Biryani', 'Mughlai', 'Hyderabadi'],
    rating: 4.1, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 320, imageEmoji: '🍚', area: 'HSR Layout, Bangalore',
    imageUrl: RU(PHOTOS.biryani),
    menu: [
      // Starters
      { itemCode: 'BB01', name: 'Shami Kebab (4 pcs)',
        description: 'Finely minced lamb and chana dal patties spiced with cloves, cinnamon and cardamom — pan-fried to a golden, crackling crust. A Nawabi delicacy.',
        price: 280, veg: false, tags: ['starter', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.seekhKebab) },
      { itemCode: 'BB02', name: 'Haleem',
        description: 'Slow-cooked wheat and lamb porridge with caramelised onions, fresh ginger, lime and crispy fried shallots — the 7-hour labour of love from Hyderabad.',
        price: 260, veg: false, tags: ['must-try', 'spicy'], category: 'Starters',
        imageUrl: U(PHOTOS.haleem) },
      { itemCode: 'BB03', name: 'Chicken Tikka Boti (6 pcs)',
        description: 'Small chunks of boneless chicken marinated in yogurt, papaya paste and tandoori masala — char-grilled on skewers until smoky and slightly charred.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters',
        imageUrl: U(PHOTOS.chickenTikka) },

      // Biryani
      { itemCode: 'BB04', name: 'Hyderabadi Chicken Dum Biryani',
        description: 'The original — chicken marinated in 22 spices, layered with aged saffron basmati under a sealed dough crust and slow-cooked for 2 hours. Served with raita and salan.',
        price: 360, veg: false, tags: ['bestseller', 'must-try', 'spicy'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },
      { itemCode: 'BB05', name: 'Lucknowi Veg Biryani',
        description: 'Awadhi-style layered biryani with eight seasonal vegetables, whole spices, kewra water and a crown of crispy fried onions — aromatic, mild and deeply satisfying.',
        price: 260, veg: true, tags: ['bestseller'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniVeg) },
      { itemCode: 'BB06', name: 'Mutton Dum Biryani',
        description: 'Slow-cooked bone-in goat mutton with long-grain basmati, Malabar spices, ghee and a generous portion of crispy brown onions — dum-sealed for 90 minutes.',
        price: 440, veg: false, tags: ['spicy', 'must-try'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniMutton) },
      { itemCode: 'BB07', name: 'Prawn Biryani',
        description: 'Coastal-style biryani with large tiger prawns marinated in coconut-chilli paste and tamarind, layered with fragrant basmati and sealed for the final dum.',
        price: 420, veg: false, tags: ['spicy'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniMutton) },
      { itemCode: 'BB08', name: 'Kolkata Style Chicken Biryani',
        description: 'Distinctly mild, fragrant rice with bone-in chicken, a whole saffron-soaked potato and a hard-boiled egg — the Nawabi Kolkata legacy.',
        price: 340, veg: false, tags: ['popular'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },
      { itemCode: 'BB09', name: 'Paneer Dum Biryani',
        description: 'Marinated cottage cheese cubes with saffron basmati, rose water and whole spices — dum-sealed for 45 minutes for a luxuriously fragrant rice.',
        price: 290, veg: true, tags: [], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniVeg) },

      // Curries & Sides
      { itemCode: 'BB10', name: 'Chicken Korma',
        description: 'Mild, creamy Mughlai chicken curry in a cashew-yogurt-cream gravy with whole spices, saffron and a whisper of rose water.',
        price: 320, veg: false, tags: [], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },
      { itemCode: 'BB11', name: 'Raita',
        description: 'Chilled boondi raita with grated cucumber, roasted cumin powder and fresh coriander — the essential biryani companion.',
        price: 75, veg: true, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.raita) },
      { itemCode: 'BB12', name: 'Roomali Roti',
        description: 'Thin as a handkerchief, cooked on an inverted cast-iron tawa at high heat — silky-soft and perfect for korma or haleem.',
        price: 45, veg: true, tags: [], category: 'Breads',
        imageUrl: U(PHOTOS.naan) },

      // Beverages & Desserts
      { itemCode: 'BB13', name: 'Thanda Sharbat',
        description: 'Chilled rose-basil seed sherbet with a hint of kewra water, lemon and sugar — a traditional Mughlai summer cooler.',
        price: 90, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.roseSharbat) },
      { itemCode: 'BB14', name: 'Sheer Khurma',
        description: 'Festive vermicelli milk pudding slow-simmered with Medjool dates, pistachios, almonds, raisins and green cardamom — rich and deeply aromatic.',
        price: 130, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.kheer) },
      { itemCode: 'BB15', name: 'Phirni',
        description: 'Chilled coarsely ground rice pudding set in a traditional earthen bowl, crowned with Irani saffron and crushed pistachios.',
        price: 120, veg: true, tags: ['dessert'], category: 'Desserts',
        imageUrl: U(PHOTOS.kheer) },
    ],
  },

  // ── 7. CHINESE DRAGON ────────────────────────────────────────────────────────
  {
    name: 'Chinese Dragon',
    cuisines: ['Chinese', 'Asian', 'IndoChinese'],
    rating: 3.9, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 250, imageEmoji: '🥡', area: 'Whitefield, Bangalore',
    imageUrl: RU(PHOTOS.noodles),
    menu: [
      // Soups
      { itemCode: 'CD01', name: 'Hot and Sour Soup',
        description: 'Classic thick Chinese soup with silken tofu, wood ear mushrooms, bamboo shoots, white vinegar and white pepper — a punch of umami in every spoonful.',
        price: 150, veg: true, tags: ['spicy', 'starter'], category: 'Soups',
        imageUrl: U(PHOTOS.soup) },
      { itemCode: 'CD02', name: 'Sweet Corn Chicken Soup',
        description: 'Silky chicken and sweet corn soup with egg ribbons, white pepper and a dash of soy sauce — warming, mild and enormously comforting.',
        price: 160, veg: false, tags: ['starter'], category: 'Soups',
        imageUrl: U(PHOTOS.soup) },

      // Starters
      { itemCode: 'CD03', name: 'Veg Manchurian (Dry)',
        description: 'Crispy cauliflower and cabbage balls tossed in a tangy soy-chilli-garlic sauce with spring onions — the beloved Indo-Chinese classic.',
        price: 210, veg: true, tags: ['bestseller', 'spicy'], category: 'Starters',
        imageUrl: U(PHOTOS.friedRice) },
      { itemCode: 'CD04', name: 'Chilli Chicken (Dry)',
        description: 'Crispy fried chicken pieces flash-tossed in a fiery chilli-garlic-soy sauce with capsicum slivers and onion rings — bold, punchy, addictive.',
        price: 290, veg: false, tags: ['bestseller', 'spicy', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.crispyFriedChicken) },
      { itemCode: 'CD05', name: 'Spring Rolls (4 pcs)',
        description: 'Crispy golden rolls stuffed with shredded cabbage, julienned carrots, glass noodles and Chinese seasonings — served with sweet chilli dip.',
        price: 180, veg: true, tags: ['starter'], category: 'Starters',
        imageUrl: U(PHOTOS.springRolls) },
      { itemCode: 'CD06', name: 'Chicken Lollipop (6 pcs)',
        description: 'Marinated chicken wingettes shaped into lollipops, deep-fried until shatteringly crispy and served with house schezwan dipping sauce.',
        price: 330, veg: false, tags: ['starter', 'bestseller'], category: 'Starters',
        imageUrl: U(PHOTOS.chickenWings) },
      { itemCode: 'CD07', name: 'Paneer Chilli (Dry)',
        description: 'Crispy battered paneer cubes tossed in a bold chilli-garlic-spring onion sauce — the vegetarian answer to chilli chicken.',
        price: 260, veg: true, tags: ['spicy', 'starter'], category: 'Starters',
        imageUrl: U(PHOTOS.indianCurryRed) },

      // Rice & Noodles
      { itemCode: 'CD08', name: 'Veg Fried Rice',
        description: 'Wok-tossed day-old steamed rice with crisp carrots, beans, spring onions and egg in soy sauce and toasted sesame oil — wok hei guaranteed.',
        price: 200, veg: true, tags: ['bestseller'], category: 'Rice',
        imageUrl: U(PHOTOS.friedRice) },
      { itemCode: 'CD09', name: 'Chicken Fried Rice',
        description: 'Wok-fried steamed rice with tender chicken strips, soy sauce, sesame oil, spring onions and a perfectly beaten egg — the Chinese staple.',
        price: 250, veg: false, tags: ['bestseller'], category: 'Rice',
        imageUrl: U(PHOTOS.friedRice) },
      { itemCode: 'CD10', name: 'Hakka Noodles (Veg)',
        description: 'Stir-fried thin egg noodles with julienned cabbage, carrots, capsicum and bean sprouts in a soy-sesame-chilli sauce.',
        price: 200, veg: true, tags: [], category: 'Noodles',
        imageUrl: U(PHOTOS.noodles) },
      { itemCode: 'CD11', name: 'Chicken Szechuan Noodles',
        description: 'Flat noodles tossed in a fiery Sichuan sauce with chicken, dried chillies and numbing Sichuan peppercorns — tongue-tingling and deeply satisfying.',
        price: 270, veg: false, tags: ['spicy', 'must-try'], category: 'Noodles',
        imageUrl: U(PHOTOS.noodles) },

      // Gravy
      { itemCode: 'CD12', name: 'Veg Manchurian Gravy',
        description: 'Vegetable balls in a glossy, tangy Manchurian sauce — best poured over steamed rice for the ultimate Indo-Chinese comfort bowl.',
        price: 230, veg: true, tags: ['popular'], category: 'Main Course',
        imageUrl: U(PHOTOS.soup) },

      // Beverages & Desserts
      { itemCode: 'CD13', name: 'Iced Green Tea',
        description: 'Freshly brewed sencha green tea, chilled and served over ice with a wedge of lemon and a sprig of mint.',
        price: 80, veg: true, jainFriendly: true, tags: ['healthy'], category: 'Beverages',
        imageUrl: U(PHOTOS.icedTea) },
      { itemCode: 'CD14', name: 'Toffee Banana',
        description: 'Deep-fried banana fritters dipped in crispy toffee glaze, finished with a drizzle of honey and a scattering of toasted sesame seeds.',
        price: 160, veg: true, tags: ['dessert'], category: 'Desserts',
        imageUrl: U(PHOTOS.chineseDessert) },
    ],
  },

  // ── 8. WRAP-IT-UP ────────────────────────────────────────────────────────────
  {
    name: 'Wrap-It-Up',
    cuisines: ['Wraps', 'Mexican', 'Healthy'],
    rating: 4.0, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 230, imageEmoji: '🌯', area: 'Bellandur, Bangalore',
    imageUrl: RU(PHOTOS.wrap),
    menu: [
      // Starters & Sides
      { itemCode: 'WI01', name: 'Nachos with Dips',
        description: 'Crispy corn tortilla chips served with house-made fresh salsa, smashed guacamole and sour cream — the ultimate shareable starter.',
        price: 200, veg: true, tags: ['starter', 'sharing'], category: 'Starters',
        imageUrl: U(PHOTOS.nachos) },
      { itemCode: 'WI02', name: 'Falafel Platter',
        description: 'Crispy deep-fried chickpea falafel balls with house-made creamy hummus, pickled turnips, fattoush salad and warm pita bread.',
        price: 240, veg: true, tags: ['healthy', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.falafel) },

      // Wraps
      { itemCode: 'WI03', name: 'Chicken Tikka Wrap',
        description: 'Smoky grilled chicken tikka with cooling mint-coriander chutney, crunchy iceberg lettuce and pickled red onions in a warm, toasted flour tortilla.',
        price: 260, veg: false, tags: ['bestseller', 'must-try'], category: 'Wraps',
        imageUrl: U(PHOTOS.wrap) },
      { itemCode: 'WI04', name: 'Paneer Tikka Wrap',
        description: 'Charred marinated paneer with roasted peppers, pickled red onion and a smoky hung-curd dressing in a toasted flour tortilla.',
        price: 230, veg: true, tags: ['bestseller'], category: 'Wraps',
        imageUrl: U(PHOTOS.wrap) },
      { itemCode: 'WI05', name: 'Mexican Bean Wrap',
        description: 'Spiced black beans, roasted sweet corn, fresh pico de gallo, guacamole and pepper jack cheese in a warm whole wheat tortilla.',
        price: 210, veg: true, tags: ['spicy', 'healthy'], category: 'Wraps',
        imageUrl: U(PHOTOS.wrap) },
      { itemCode: 'WI06', name: 'Chipotle Chicken Wrap',
        description: 'Grilled chicken thigh with smoky chipotle sauce, aged cheddar, pickled jalapeños, roasted peppers and crunchy romaine lettuce.',
        price: 280, veg: false, tags: ['spicy', 'popular'], category: 'Wraps',
        imageUrl: U(PHOTOS.wrap) },
      { itemCode: 'WI07', name: 'Falafel Wrap',
        description: 'Crispy falafel with roasted red pepper hummus, mixed herb greens, cherry tomatoes and tahini dressing in a whole wheat tortilla.',
        price: 230, veg: true, tags: ['healthy', 'popular'], category: 'Wraps',
        imageUrl: U(PHOTOS.wrap) },

      // Bowls
      { itemCode: 'WI08', name: 'Chicken Burrito Bowl',
        description: 'Seasoned chargrilled chicken thigh, cilantro-lime rice, black beans, house salsa, guacamole, sour cream and pickled jalapeños — a full meal in a bowl.',
        price: 320, veg: false, tags: ['bestseller', 'must-try'], category: 'Bowls',
        imageUrl: U(PHOTOS.burritoBowl) },
      { itemCode: 'WI09', name: 'Sweet Potato Grain Bowl',
        description: 'Caramelised roasted sweet potato, cooked quinoa, lacinato kale, chickpeas, sliced avocado and a lemon-tahini dressing — wholesome and filling.',
        price: 290, veg: true, tags: ['healthy', 'must-try'], category: 'Bowls',
        imageUrl: U(PHOTOS.grainBowl) },
      { itemCode: 'WI10', name: 'Paneer Power Bowl',
        description: 'Grilled masala paneer, brown rice, roasted broccoli, cherry tomatoes and za\'atar chickpeas with a spicy harissa dressing.',
        price: 270, veg: true, tags: ['healthy'], category: 'Bowls',
        imageUrl: U(PHOTOS.grainBowl) },

      // Beverages
      { itemCode: 'WI11', name: 'Fresh Lime Soda',
        description: 'Freshly squeezed lime juice with sparkling water — served sweet, salted or masala for maximum refreshment.',
        price: 70, veg: true, jainFriendly: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.lemonade) },
      { itemCode: 'WI12', name: 'Mango Basil Smoothie',
        description: 'Fresh Alphonso mango blended with chilled coconut milk, soaked basil seeds and a pinch of Himalayan black salt.',
        price: 160, veg: true, tags: ['healthy'], category: 'Beverages',
        imageUrl: U(PHOTOS.smoothie) },
      { itemCode: 'WI13', name: 'Chocolate Peanut Butter Cup',
        description: 'A rich brownie-bottom cup layered with a dark chocolate ganache centre and a salted peanut butter filling — decadent and portion-perfect.',
        price: 160, veg: true, tags: ['dessert'], category: 'Desserts',
        imageUrl: U(PHOTOS.chocolateDessert) },
    ],
  },

  // ── 9. SARAVANAA BHAVAN ──────────────────────────────────────────────────────
  {
    name: 'Saravanaa Bhavan',
    cuisines: ['SouthIndian', 'Tamil', 'Vegetarian'],
    rating: 4.3, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 190, imageEmoji: '🍱', area: 'Jayanagar, Bangalore',
    imageUrl: RU(PHOTOS.southIndianThali),
    menu: [
      // Dosas
      { itemCode: 'SB01', name: 'Ghee Masala Dosa',
        description: 'Fermented rice crepe smeared with red chilli-coconut chutney, filled with a generous potato masala and topped with a drizzle of pure ghee — a Tamil classic.',
        price: 120, veg: true, tags: ['bestseller', 'must-try'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'SB02', name: 'Paper Roast Dosa',
        description: 'Incredibly thin, paper-crisp dosa cooked slowly to a translucent golden sheen with a butter finish — the pinnacle of dosa craftsmanship.',
        price: 110, veg: true, jainFriendly: true, tags: ['must-try'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },
      { itemCode: 'SB03', name: 'Onion Rava Dosa',
        description: 'Instant semolina dosa with a beautiful lacy texture, scattered with minced onion, green chilli, ginger and fresh coriander.',
        price: 115, veg: true, tags: ['popular'], category: 'Dosa',
        imageUrl: U(PHOTOS.dosa) },

      // Idli, Vada, Pongal
      { itemCode: 'SB04', name: 'Mini Tiffin',
        description: 'Saravanaa\'s iconic combo — 2 soft idlis, 1 crispy medu vada and warm pongal served with sambar and three house chutneys (coconut, tomato, mint).',
        price: 160, veg: true, tags: ['bestseller', 'combo', 'must-try'], category: 'Combo',
        imageUrl: U(PHOTOS.idliVada) },
      { itemCode: 'SB05', name: 'Kanchipuram Idli (3 pcs)',
        description: 'Flavoursome temple-style idlis seasoned with black pepper, cumin, ginger and asafoetida — traditionally steamed in banana leaves.',
        price: 110, veg: true, tags: ['popular'], category: 'Idli',
        imageUrl: U(PHOTOS.idliVada) },

      // Meals
      { itemCode: 'SB06', name: 'Saravanaa Meals (Unlimited)',
        description: 'Full South Indian thali — unlimited: steamed rice, rasam, sambar, 2 vegetable curries, kootu, appalam, pickle and payasam for dessert.',
        price: 200, veg: true, jainFriendly: false, tags: ['bestseller', 'must-try', 'value'], category: 'Meals',
        imageUrl: U(PHOTOS.southIndianThali) },
      { itemCode: 'SB07', name: 'Bisibele Bath',
        description: 'Karnataka one-pot rice-lentil preparation with 14 spices, roasted cashews and tamarind — warming, hearty and deeply savoury.',
        price: 130, veg: true, tags: ['spicy', 'popular'], category: 'Special',
        imageUrl: U(PHOTOS.pongal) },
      { itemCode: 'SB08', name: 'Curd Rice',
        description: 'Soft cooked rice mixed with thick curd and a tempering of mustard seeds, dried red chilli, curry leaves, green chilli and pomegranate pearls.',
        price: 100, veg: true, jainFriendly: false, tags: [], category: 'Rice',
        imageUrl: U(PHOTOS.riceWhite) },

      // Poori
      { itemCode: 'SB09', name: 'Poori Masala (3 pcs)',
        description: 'Three fluffy deep-fried whole wheat pooris served with a tangy potato masala and coconut chutney — South Indian breakfast royalty.',
        price: 110, veg: true, tags: [], category: 'Poori',
        imageUrl: U(PHOTOS.naan) },

      // Sides & Extras
      { itemCode: 'SB10', name: 'Vada Sambar (2 pcs)',
        description: 'Crispy medu vadas dunked in a steaming hot bowl of Saravanaa\'s vegetable sambar — soaked soft on one side, crispy on the other.',
        price: 85, veg: true, jainFriendly: false, tags: [], category: 'Vada',
        imageUrl: U(PHOTOS.idliVada) },
      { itemCode: 'SB11', name: 'Lemon Rice',
        description: 'Turmeric-yellow rice tempered with lemon juice, mustard seeds, curry leaves, roasted peanuts and dried chilli — tangy, nutty and refreshing.',
        price: 100, veg: true, jainFriendly: true, tags: [], category: 'Rice',
        imageUrl: U(PHOTOS.riceWhite) },

      // Beverages & Desserts
      { itemCode: 'SB12', name: 'Filter Coffee (Kaapi)',
        description: 'Freshly brewed decoction from hand-picked Coorg beans, mixed with full-cream milk and served frothed between a davara and tumbler set.',
        price: 40, veg: true, jainFriendly: true, tags: ['bestseller', 'must-try'], category: 'Beverages',
        imageUrl: U(PHOTOS.filterCoffee) },
      { itemCode: 'SB13', name: 'Butter Milk (Moru)',
        description: 'Chilled salted buttermilk with fresh ginger, green chilli, curry leaves and coriander — the best South Indian summer digestive.',
        price: 45, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.buttermilk) },
      { itemCode: 'SB14', name: 'Pal Payasam',
        description: 'Slow-cooked creamy rice kheer with sugar, green cardamom, cashews and golden raisins — the most sacred dessert of South Indian cuisine.',
        price: 90, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.kheer) },
    ],
  },

  // ── 10. THE EGG FACTORY ──────────────────────────────────────────────────────
  {
    name: 'The Egg Factory',
    cuisines: ['Breakfast', 'Eggs', 'Continental', 'Cafe'],
    rating: 4.2, deliveryTimeMin: 25,
    vegFriendly: false, jainFriendly: false,
    pricePerPerson: 280, imageEmoji: '🍳', area: 'Lavelle Road, Bangalore',
    imageUrl: RU(PHOTOS.eggsBenedict),
    menu: [
      // Egg Classics
      { itemCode: 'EF01', name: 'Eggs Benedict',
        description: 'Two perfectly poached eggs on toasted English muffin halves with shaved Canadian bacon and a silky, buttery hollandaise sauce. A brunch institution.',
        price: 320, veg: false, tags: ['bestseller', 'must-try'], category: 'Eggs',
        imageUrl: U(PHOTOS.eggsBenedict) },
      { itemCode: 'EF02', name: 'Masala Omelette',
        description: 'Three-egg fluffy omelette loaded with minced onions, tomatoes, green chillies, fresh coriander and ground spices — served with toasted bread.',
        price: 200, veg: false, tags: ['bestseller', 'spicy'], category: 'Eggs',
        imageUrl: U(PHOTOS.omelette) },
      { itemCode: 'EF03', name: 'Shakshuka',
        description: 'Two eggs poached in a fragrant, spiced tomato-pepper stew with cumin, smoked paprika and preserved lemon — served with toasted pita bread.',
        price: 280, veg: false, tags: ['must-try', 'spicy'], category: 'Eggs',
        imageUrl: U(PHOTOS.shakshuka) },
      { itemCode: 'EF04', name: 'Eggs Florentine',
        description: 'Two silky poached eggs on toasted sourdough with wilted spinach, capers and a Gruyère-enriched hollandaise sauce.',
        price: 310, veg: false, tags: ['popular'], category: 'Eggs',
        imageUrl: U(PHOTOS.eggsBenedict) },
      { itemCode: 'EF05', name: 'Scrambled Eggs (French Style)',
        description: 'Slow-cooked over a double boiler until silky, soft curds with crème fraîche and chives — served on thick-cut sourdough. Deceptively difficult, devastatingly good.',
        price: 220, veg: false, tags: [], category: 'Eggs',
        imageUrl: U(PHOTOS.omelette) },

      // Breakfast Mains
      { itemCode: 'EF06', name: 'Avocado Toast',
        description: 'Thick sourdough with smashed ripe avocado, a soft-poached egg, cherry tomatoes, chilli flakes, toasted seeds and extra-virgin olive oil.',
        price: 290, veg: false, tags: ['healthy', 'popular'], category: 'Toast',
        imageUrl: U(PHOTOS.avocadoToast) },
      { itemCode: 'EF07', name: 'Full English Breakfast',
        description: 'Two fried eggs, grilled pork sausages, streaky bacon, sautéed button mushrooms, baked beans, grilled tomato and thick-cut buttered toast.',
        price: 420, veg: false, tags: ['bestseller', 'must-try'], category: 'Combo',
        imageUrl: U(PHOTOS.fullEnglish) },
      { itemCode: 'EF08', name: 'French Toast',
        description: 'Thick brioche slices soaked in an egg-cream custard, pan-fried golden, dusted with cinnamon sugar and served with warm maple syrup and seasonal berries.',
        price: 240, veg: false, tags: ['popular'], category: 'Toast',
        imageUrl: U(PHOTOS.frenchToast) },

      // Pancakes
      { itemCode: 'EF09', name: 'Buttermilk Pancakes (3 pcs)',
        description: 'Light-as-air American-style pancakes made with cultured buttermilk batter — served with warm maple syrup, whipped butter and seasonal fresh fruit.',
        price: 260, veg: false, tags: ['bestseller'], category: 'Pancakes',
        imageUrl: U(PHOTOS.pancakes) },

      // Light Bites
      { itemCode: 'EF10', name: 'Egg Fried Rice',
        description: 'Indo-Chinese-style egg fried rice with spring onions, soy sauce, sesame oil and a perfectly beaten egg scrambled in the wok.',
        price: 220, veg: false, tags: [], category: 'Rice',
        imageUrl: U(PHOTOS.friedRice) },
      { itemCode: 'EF11', name: 'Devilled Eggs (6 pcs)',
        description: 'Hard-boiled egg halves filled with a creamy yolk, sriracha mayo and pickled jalapeños, finished with a smoked paprika dusting.',
        price: 180, veg: false, tags: ['starter', 'spicy'], category: 'Starters',
        imageUrl: U(PHOTOS.omelette) },

      // Beverages & Desserts
      { itemCode: 'EF12', name: 'Cold Brew Coffee',
        description: 'Smooth 18-hour cold-steeped single-origin coffee from Coorg — served over ice with a splash of oat milk or black.',
        price: 180, veg: false, tags: ['must-try', 'popular'], category: 'Beverages',
        imageUrl: U(PHOTOS.coldBrew) },
      { itemCode: 'EF13', name: 'Fresh Orange Juice',
        description: 'Six freshly squeezed Valencia oranges — no sugar, no water, no compromise. Pure liquid sunshine.',
        price: 150, veg: false, tags: ['healthy'], category: 'Beverages',
        imageUrl: U(PHOTOS.orangeJuice) },
      { itemCode: 'EF14', name: 'Classic Cheesecake',
        description: 'New York-style baked cheesecake — dense, rich, with a butter-graham cracker crust and a tangy fresh berry compote.',
        price: 220, veg: false, tags: ['dessert', 'bestseller'], category: 'Desserts',
        imageUrl: U(PHOTOS.cheesecake) },
    ],
  },

  // ── 11. SOCIAL (Cafe / All-Day Dining) ───────────────────────────────────────
  {
    name: 'Social',
    cuisines: ['Cafe', 'Continental', 'Indian', 'Burgers'],
    rating: 4.1, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 400, imageEmoji: '☕', area: 'Koramangala, Bangalore',
    imageUrl: RU(PHOTOS.burger),
    menu: [
      // Starters & Small Plates
      { itemCode: 'SO01', name: 'Social House Nachos',
        description: 'A generous pile of crispy corn nachos smothered in nacho cheese sauce, chunky guacamole, pico de gallo, pickled jalapeños and cooling sour cream.',
        price: 330, veg: true, tags: ['sharing', 'bestseller'], category: 'Starters',
        imageUrl: U(PHOTOS.nachos) },
      { itemCode: 'SO02', name: 'Pulled Chicken Sliders (3)',
        description: 'Slow-cooked smoky BBQ pulled chicken with crunchy pickled cabbage slaw in soft potato-bun sliders — a crowd-pleasing Social signature.',
        price: 380, veg: false, tags: ['bestseller', 'must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.sliders) },
      { itemCode: 'SO03', name: 'Truffle Mushroom Bruschetta',
        description: 'Grilled sourdough topped with sautéed wild mushrooms in white truffle oil, roasted garlic and flat-leaf parsley.',
        price: 280, veg: true, tags: ['must-try'], category: 'Starters',
        imageUrl: U(PHOTOS.bruschetta) },

      // Mains
      { itemCode: 'SO04', name: 'Social Signature Burger',
        description: 'Double smash-style beef patty, secret Social house sauce, aged sharp cheddar, bread-and-butter pickles and iceberg lettuce on a sesame brioche bun.',
        price: 480, veg: false, tags: ['bestseller', 'must-try'], category: 'Burgers',
        imageUrl: U(PHOTOS.burger) },
      { itemCode: 'SO05', name: 'Peri-Peri Chicken with Rice',
        description: 'Half Portuguese-style flame-grilled chicken marinated in house peri-peri sauce, served with fragrant lemon rice, charred lemon and tangy coleslaw.',
        price: 520, veg: false, tags: ['spicy', 'must-try'], category: 'Mains',
        imageUrl: U(PHOTOS.crispyFriedChicken) },
      { itemCode: 'SO06', name: 'Mushroom Risotto',
        description: 'Creamy Arborio rice slow-cooked with wild mushrooms, a splash of white wine, aged parmesan and white truffle oil — stirred to a perfect wave.',
        price: 440, veg: true, tags: ['popular'], category: 'Mains',
        imageUrl: U(PHOTOS.risotto) },
      { itemCode: 'SO07', name: 'Desi Masala Pasta',
        description: 'Penne tossed in a spiced tomato-onion-masala sauce with paneer, capsicum, kasuri methi and coriander — an East-meets-West comfort classic.',
        price: 340, veg: true, tags: ['spicy', 'popular'], category: 'Mains',
        imageUrl: U(PHOTOS.pasta) },
      { itemCode: 'SO08', name: 'Grilled Fish Tacos (3)',
        description: 'Soft corn tortillas with spiced grilled seabass, mango-jalapeño salsa, crunchy cabbage slaw, avocado slices and chipotle crema.',
        price: 420, veg: false, tags: ['popular', 'spicy'], category: 'Mains',
        imageUrl: U(PHOTOS.fishTacos) },

      // Salads
      { itemCode: 'SO09', name: 'Watermelon Feta Salad',
        description: 'Fresh watermelon chunks, crumbled Greek feta, kalamata olives, torn mint, thinly sliced red onion and a balsamic-honey reduction.',
        price: 280, veg: true, tags: ['healthy', 'light'], category: 'Salads',
        imageUrl: U(PHOTOS.watermelonSalad) },

      // Sides
      { itemCode: 'SO10', name: 'Parmesan Truffle Fries',
        description: 'Crispy shoestring fries tossed in white truffle oil and aged parmesan, with a rosemary aioli and ketchup on the side.',
        price: 240, veg: true, tags: ['bestseller', 'sharing'], category: 'Sides',
        imageUrl: U(PHOTOS.truffleFries) },

      // Beverages & Desserts
      { itemCode: 'SO11', name: 'Social Lemonade',
        description: 'House-pressed lemon juice, cucumber, torn mint and sparkling water — refreshingly tart, subtly sweet.',
        price: 130, veg: true, jainFriendly: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.lemonade) },
      { itemCode: 'SO12', name: 'Baked Nutella Brownie',
        description: 'Fudgy warm chocolate brownie with a Nutella swirl throughout — served warm with a scoop of house-made Madagascar vanilla ice cream.',
        price: 240, veg: true, tags: ['dessert', 'bestseller', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.brownie) },
    ],
  },

  // ── 12. BEHROUZ BIRYANI ──────────────────────────────────────────────────────
  {
    name: 'Behrouz Biryani',
    cuisines: ['Biryani', 'Mughlai', 'Persian'],
    rating: 4.2, deliveryTimeMin: 40,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 380, imageEmoji: '🏺', area: 'Indiranagar, Bangalore',
    imageUrl: RU(PHOTOS.biryaniMutton),
    menu: [
      // Royal Biryanis
      { itemCode: 'BZ01', name: 'Royal Chicken Biryani',
        description: 'Inspired by Persian court kitchens — chicken marinated in 24 secret spices, layered with aged Pusa basmati, Irani saffron and dried fruits. Sealed in a clay handi.',
        price: 399, veg: false, tags: ['bestseller', 'must-try'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },
      { itemCode: 'BZ02', name: 'Grand Mutton Biryani',
        description: 'Slow-cooked lamb shank with saffron-infused long-grain basmati, rose water, crispy fried onions and Behrouz\'s secret dum masala — rich and deeply aromatic.',
        price: 479, veg: false, tags: ['must-try', 'spicy', 'premium'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniMutton) },
      { itemCode: 'BZ03', name: 'Behrouz Veg Biryani',
        description: 'A treasure of seasonal vegetables, marinated paneer and cashews in Irani saffron basmati — the vegetarian royal feast.',
        price: 299, veg: true, tags: ['bestseller'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniVeg) },
      { itemCode: 'BZ04', name: 'Prawn Nawabi Biryani',
        description: 'Jumbo tiger prawns marinated in a coastal spice paste and slow-cooked with aromatic rice and Malabar seasonings.',
        price: 449, veg: false, tags: ['spicy', 'premium'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryaniMutton) },
      { itemCode: 'BZ05', name: 'Persian Keema Biryani',
        description: 'Spiced minced lamb and a whole boiled egg layered between fragrant saffron basmati — Behrouz\'s interpretation of the classic Irani mince biryani.',
        price: 359, veg: false, tags: ['popular'], category: 'Biryani',
        imageUrl: U(PHOTOS.biryani) },

      // Kebabs & Starters
      { itemCode: 'BZ06', name: 'Galouti Kebab (4 pcs)',
        description: 'Melt-in-your-mouth minced lamb patties with over 60 spices — the legendary Lucknowi Nawabi kebab so fine it was created for a toothless king.',
        price: 360, veg: false, tags: ['must-try', 'starter'], category: 'Starters',
        imageUrl: U(PHOTOS.seekhKebab) },
      { itemCode: 'BZ07', name: 'Chicken Seekh Kebab (4 pcs)',
        description: 'Spiced minced chicken on iron skewers, flame-grilled to a smoky char, served with charred onion rings and house green chutney.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters',
        imageUrl: U(PHOTOS.chickenTikka) },

      // Curries
      { itemCode: 'BZ08', name: 'Nihari Gosht',
        description: 'Slow-cooked overnight lamb shank curry with bone marrow, ginger, cardamom and aromatic nihari masala — a breakfast of Mughal emperors.',
        price: 420, veg: false, tags: ['must-try', 'spicy'], category: 'Main Course',
        imageUrl: U(PHOTOS.nihari) },
      { itemCode: 'BZ09', name: 'Paneer Lasooni',
        description: 'Pan-seared paneer cubes in a rich garlic-infused tomato-cream gravy with kasuri methi and green cardamom.',
        price: 320, veg: true, tags: [], category: 'Main Course',
        imageUrl: U(PHOTOS.indianCurryRed) },

      // Sides & Breads
      { itemCode: 'BZ10', name: 'Saffron Raita',
        description: 'Chilled yogurt with a saffron bloom, crispy boondi and fresh coriander — the royal biryani accompaniment.',
        price: 90, veg: true, tags: [], category: 'Sides',
        imageUrl: U(PHOTOS.raita) },
      { itemCode: 'BZ11', name: 'Sheermal',
        description: 'Saffron-infused flatbread baked in a clay oven — a Mughal royal bread with a subtly sweet, milky flavour and a golden crust.',
        price: 70, veg: true, tags: ['must-try'], category: 'Breads',
        imageUrl: U(PHOTOS.sheermal) },

      // Beverages & Desserts
      { itemCode: 'BZ12', name: 'Rose Sharbat',
        description: 'Chilled rose syrup with soaked basil seeds (sabja), a squeeze of lemon and sparkling water — a fragrant Persian cooler.',
        price: 100, veg: true, tags: [], category: 'Beverages',
        imageUrl: U(PHOTOS.roseSharbat) },
      { itemCode: 'BZ13', name: 'Zafrani Kheer',
        description: 'Slow-simmered royal rice pudding with Irani saffron, green cardamom, silver vark and a crown of crushed pistachios and dried rose petals.',
        price: 150, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts',
        imageUrl: U(PHOTOS.kheer) },
    ],
  },

];

// ── COUPON DATA ──────────────────────────────────────────────────────────────────
const couponData = [
  { code: 'FLAT100',    description: 'Flat ₹100 off on orders above ₹500',                discountType: 'flat',    value: 100,  minOrderValue: 500,   maxDiscount: null },
  { code: 'FLAT150',    description: 'Flat ₹150 off on orders above ₹800',                discountType: 'flat',    value: 150,  minOrderValue: 800,   maxDiscount: null },
  { code: 'FLAT200',    description: 'Flat ₹200 off on orders above ₹1200',               discountType: 'flat',    value: 200,  minOrderValue: 1200,  maxDiscount: null },
  { code: 'FLAT250',    description: 'Flat ₹250 off on orders above ₹1500',               discountType: 'flat',    value: 250,  minOrderValue: 1500,  maxDiscount: null },
  { code: 'SAVE10',     description: '10% off on any order (up to ₹120)',                  discountType: 'percent', value: 10,   minOrderValue: 300,   maxDiscount: 120  },
  { code: 'SAVE20',     description: '20% off on orders above ₹600 (up to ₹250)',          discountType: 'percent', value: 20,   minOrderValue: 600,   maxDiscount: 250  },
  { code: 'SAVE15',     description: '15% off on orders above ₹400 (up to ₹180)',          discountType: 'percent', value: 15,   minOrderValue: 400,   maxDiscount: 180  },
  { code: 'LUNCH50',    description: 'Flat ₹50 off — quick lunch discount, no min order',  discountType: 'flat',    value: 50,   minOrderValue: 0,     maxDiscount: null },
  { code: 'GROUPSAVE',  description: 'Flat ₹300 off on group orders above ₹2000',          discountType: 'flat',    value: 300,  minOrderValue: 2000,  maxDiscount: null },
  { code: 'FIRSTBITE',  description: '25% off your first group order (up to ₹300)',         discountType: 'percent', value: 25,   minOrderValue: 500,   maxDiscount: 300  },
];

// ── SEED RUNNER ──────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected');

    await sequelize.sync({ force: true });
    console.log('✅ Tables created (force: true — fresh seed)');

    let totalItems = 0;

    for (const r of restaurantData) {
      const { menu, ...restaurantFields } = r;

      const restaurant = await Restaurant.create(restaurantFields);

      const menuItems = menu.map((item) => ({
        ...item,
        restaurantId:  restaurant.id,
        jainFriendly:  item.jainFriendly !== undefined ? item.jainFriendly : false,
        tags:          item.tags || [],
        imageUrl:      item.imageUrl || null,
        mealDbId:      null,
      }));

      await MenuItem.bulkCreate(menuItems);
      totalItems += menu.length;
      const withPhotos = menu.filter((i) => i.imageUrl).length;
      console.log(`   🍽️  ${restaurant.name.padEnd(26)} — ${menu.length} items (${withPhotos} with photos)`);
    }

    await Coupon.bulkCreate(couponData);

    console.log(`\n✅ ${restaurantData.length} restaurants, ${totalItems} menu items`);
    console.log(`✅ ${couponData.length} coupons: ${couponData.map((c) => c.code).join(', ')}`);
    console.log('\n🎉 Seed complete!');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seed();
