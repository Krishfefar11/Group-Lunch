require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Restaurant, MenuItem, Coupon } = require('../models/index');

// ────────────────────────────────────────────────────────────────────────────────
// RESTAURANT + MENU SEED DATA — 2024 Bangalore market prices
// Every restaurant has 15-18 items covering: Starters, Main Course, Breads/Rice,
// Sides, Beverages, Desserts.  Descriptions are ingredient-forward (Zomato style).
// ────────────────────────────────────────────────────────────────────────────────

const restaurantData = [

  // ── 1. MEGHANA FOODS ─────────────────────────────────────────────────────────
  {
    name: 'Meghana Foods',
    cuisines: ['Biryani', 'SouthIndian', 'Andhra'],
    rating: 4.4, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 320, imageEmoji: '🍛', area: 'Koramangala, Bangalore',
    menu: [
      // Starters
      { itemCode: 'MF01', name: 'Chicken 65',
        description: 'Deep-fried boneless chicken marinated in ginger-garlic paste, red chillies, curry leaves and yogurt — crispy outside, juicy inside.',
        price: 290, veg: false, tags: ['spicy', 'bestseller', 'must-try'], category: 'Starters' },
      { itemCode: 'MF02', name: 'Veg Manchurian (Dry)',
        description: 'Crispy vegetable balls tossed in a tangy soy-chilli-garlic sauce with spring onions and capsicum.',
        price: 200, veg: true, tags: ['starter', 'spicy'], category: 'Starters' },
      { itemCode: 'MF03', name: 'Fish Fry (Andhra Style)',
        description: 'Fresh Rohu fillets coated in a fiery Andhra masala paste and pan-fried until golden — a coastal classic.',
        price: 340, veg: false, tags: ['spicy', 'starter'], category: 'Starters' },

      // Biryani
      { itemCode: 'MF04', name: 'Chicken Dum Biryani (Half)',
        description: 'Aromatic basmati rice slow-cooked over charcoal with tender chicken, whole spices, caramelised onions and saffron water.',
        price: 360, veg: false, tags: ['bestseller', 'must-try', 'spicy'], category: 'Biryani' },
      { itemCode: 'MF05', name: 'Mutton Dum Biryani (Half)',
        description: 'Slow-cooked goat meat with long-grain basmati, fried onions, rose water and house biryani masala — 2-hour dum process.',
        price: 440, veg: false, tags: ['spicy', 'must-try'], category: 'Biryani' },
      { itemCode: 'MF06', name: 'Veg Dum Biryani (Half)',
        description: 'Fresh seasonal vegetables and paneer layered with saffron-infused basmati, whole spices and crispy fried onions.',
        price: 250, veg: true, tags: ['bestseller'], category: 'Biryani' },
      { itemCode: 'MF07', name: 'Egg Biryani (Half)',
        description: 'Boiled eggs simmered in a spiced masala, layered with basmati rice and finished with biryani masala and mint.',
        price: 270, veg: false, tags: [], category: 'Biryani' },
      { itemCode: 'MF08', name: 'Paneer Biryani (Half)',
        description: 'Marinated paneer cubes cooked with saffron basmati, cashews and whole spices — rich and mildly spiced.',
        price: 290, veg: true, tags: [], category: 'Biryani' },

      // Main Course
      { itemCode: 'MF09', name: 'Andhra Chicken Curry',
        description: 'Traditional Andhra gravy with ground coconut, roasted spices, onion-tomato base — pairs perfectly with rice.',
        price: 320, veg: false, tags: ['spicy', 'bestseller'], category: 'Main Course' },
      { itemCode: 'MF10', name: 'Gongura Mutton',
        description: 'Slow-cooked mutton in a tangy gongura (sorrel leaf) gravy — the signature Andhra preparation.',
        price: 420, veg: false, tags: ['spicy', 'must-try'], category: 'Main Course' },
      { itemCode: 'MF11', name: 'Paneer Butter Masala',
        description: 'Soft paneer cubes in a velvety tomato-cream-cashew gravy, mildly spiced with garam masala and kashmiri chilli.',
        price: 300, veg: true, tags: [], category: 'Main Course' },

      // Breads & Sides
      { itemCode: 'MF12', name: 'Butter Naan',
        description: 'Soft leavened bread baked in a tandoor, brushed generously with fresh butter.',
        price: 55, veg: true, jainFriendly: true, tags: [], category: 'Breads' },
      { itemCode: 'MF13', name: 'Boondi Raita',
        description: 'Chilled yogurt with crispy boondi, cumin powder, fresh coriander — the essential biryani companion.',
        price: 70, veg: true, tags: [], category: 'Sides' },
      { itemCode: 'MF14', name: 'Mirchi Ka Salan',
        description: 'Hyderabadi-style green chilli gravy with peanuts, sesame, tamarind and aromatic spices.',
        price: 110, veg: true, tags: ['spicy'], category: 'Sides' },

      // Beverages & Desserts
      { itemCode: 'MF15', name: 'Mango Lassi',
        description: 'Thick chilled yogurt blended with Alphonso mango pulp, a pinch of cardamom and sugar.',
        price: 120, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'MF16', name: 'Double Ka Meetha',
        description: 'Hyderabadi bread pudding — fried bread soaked in saffron-milk syrup, garnished with pistachios and dry fruits.',
        price: 130, veg: true, tags: ['dessert'], category: 'Desserts' },
    ],
  },

  // ── 2. TRUFFLES ───────────────────────────────────────────────────────────────
  {
    name: 'Truffles',
    cuisines: ['American', 'Burgers', 'Continental'],
    rating: 4.3, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 380, imageEmoji: '🍔', area: 'Indiranagar, Bangalore',
    menu: [
      // Starters
      { itemCode: 'TR01', name: 'Chicken Wings (8 pcs)',
        description: 'Crispy wings tossed in your choice of classic buffalo, honey-garlic or BBQ sauce, served with ranch dip.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters' },
      { itemCode: 'TR02', name: 'Loaded Nachos',
        description: 'Crispy tortilla chips layered with cheddar cheese sauce, jalapeños, pico de gallo, sour cream and guacamole.',
        price: 280, veg: true, tags: ['starter', 'spicy', 'sharing'], category: 'Starters' },
      { itemCode: 'TR03', name: 'Mozzarella Sticks',
        description: 'Breaded and deep-fried mozzarella sticks with a gooey pull, served with marinara dipping sauce.',
        price: 260, veg: true, tags: ['starter'], category: 'Starters' },

      // Burgers
      { itemCode: 'TR04', name: 'That Burger',
        description: 'Truffles signature smash-style beef patty, American cheese, secret sauce, pickles and caramelised onions on a brioche bun.',
        price: 420, veg: false, tags: ['bestseller', 'must-try'], category: 'Burgers' },
      { itemCode: 'TR05', name: 'Mushroom Swiss Burger',
        description: 'Grilled portobello mushroom, sautéed Swiss cheese, garlic aioli and rocket leaves in a sesame brioche bun.',
        price: 360, veg: true, tags: ['bestseller'], category: 'Burgers' },
      { itemCode: 'TR06', name: 'BBQ Chicken Burger',
        description: 'Grilled chicken thigh glazed with house-made smoky BBQ sauce, coleslaw, cheddar and crispy onion rings.',
        price: 390, veg: false, tags: [], category: 'Burgers' },
      { itemCode: 'TR07', name: 'Spicy Chipotle Burger',
        description: 'Crispy fried chicken coated in chipotle sauce, pepper jack cheese, jalapeños and shredded lettuce.',
        price: 380, veg: false, tags: ['spicy'], category: 'Burgers' },

      // Mains
      { itemCode: 'TR08', name: 'Pasta Arrabiata',
        description: 'Penne in a fiery San Marzano tomato and garlic sauce with basil, finished with parmesan shavings.',
        price: 310, veg: true, tags: ['spicy'], category: 'Mains' },
      { itemCode: 'TR09', name: 'Chicken Caesar Salad',
        description: 'Grilled chicken breast, romaine hearts, shaved parmesan, house-made Caesar dressing and garlic croutons.',
        price: 330, veg: false, tags: ['healthy'], category: 'Salads' },

      // Sides
      { itemCode: 'TR10', name: 'Truffle Parmesan Fries',
        description: 'Crispy shoestring fries tossed in white truffle oil, parmesan shavings and fresh rosemary.',
        price: 240, veg: true, tags: ['must-try', 'bestseller'], category: 'Sides' },
      { itemCode: 'TR11', name: 'Onion Rings',
        description: 'Beer-battered thick-cut onion rings, crispy golden, with chipotle mayo dip.',
        price: 180, veg: true, tags: [], category: 'Sides' },

      // Pizza
      { itemCode: 'TR12', name: 'Margherita Pizza',
        description: 'San Marzano tomato base, fresh mozzarella, basil leaves and extra-virgin olive oil on a thin Neapolitan crust.',
        price: 340, veg: true, tags: [], category: 'Pizza' },
      { itemCode: 'TR13', name: 'BBQ Chicken Pizza',
        description: 'Smoky BBQ sauce base, grilled chicken, red onion, caramelised peppers and mozzarella on a thin crust.',
        price: 400, veg: false, tags: ['bestseller'], category: 'Pizza' },

      // Beverages & Desserts
      { itemCode: 'TR14', name: 'Oreo Milkshake',
        description: 'Thick, creamy vanilla milkshake blended with Oreo cookies, topped with whipped cream and cookie crumble.',
        price: 190, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'TR15', name: 'Chocolate Lava Cake',
        description: 'Warm dark chocolate fondant with a molten centre, served with a scoop of vanilla ice cream.',
        price: 220, veg: true, tags: ['dessert', 'must-try', 'bestseller'], category: 'Desserts' },
    ],
  },

  // ── 3. VIDYARTHI BHAVAN ───────────────────────────────────────────────────────
  {
    name: 'Vidyarthi Bhavan',
    cuisines: ['SouthIndian', 'Breakfast', 'Vegetarian'],
    rating: 4.5, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 150, imageEmoji: '🥞', area: 'Gandhi Bazaar, Bangalore',
    menu: [
      // Dosas
      { itemCode: 'VB01', name: 'Masala Dosa',
        description: 'Crisp golden-brown rice-lentil crepe filled with spiced potato-onion masala, served with sambar and three chutneys.',
        price: 85, veg: true, jainFriendly: false, tags: ['bestseller', 'must-try'], category: 'Dosa' },
      { itemCode: 'VB02', name: 'Rava Masala Dosa',
        description: 'Extra-crispy semolina-batter dosa with a generous potato masala filling — a Vidyarthi Bhavan institution.',
        price: 100, veg: true, tags: ['bestseller'], category: 'Dosa' },
      { itemCode: 'VB03', name: 'Set Dosa (3 pcs)',
        description: 'Three soft, thick, airy dosas made from a fermented rice batter — light on the stomach, rich on flavour.',
        price: 80, veg: true, jainFriendly: true, tags: [], category: 'Dosa' },
      { itemCode: 'VB04', name: 'Plain Dosa',
        description: 'Classic thin, crispy rice-lentil crepe — pure and simple, served with sambar and coconut chutney.',
        price: 65, veg: true, jainFriendly: true, tags: [], category: 'Dosa' },
      { itemCode: 'VB05', name: 'Rava Dosa',
        description: 'Lacy semolina crepe, instantly poured and cooked to a glass-like crispiness with mustard seeds and curry leaves.',
        price: 95, veg: true, tags: ['popular'], category: 'Dosa' },

      // Idli & Vada
      { itemCode: 'VB06', name: 'Idli Sambar (3 pcs)',
        description: 'Steamed round rice-lentil cakes, feather-light and fluffy, dunked in Vidyarthi Bhavan\'s famous tangy sambar.',
        price: 75, veg: true, jainFriendly: false, tags: [], category: 'Idli' },
      { itemCode: 'VB07', name: 'Medu Vada (2 pcs)',
        description: 'Crispy golden urad dal doughnuts, airy and crunchy outside with a soft interior — served with sambar and chutney.',
        price: 75, veg: true, jainFriendly: false, tags: ['bestseller'], category: 'Vada' },
      { itemCode: 'VB08', name: 'Idli-Vada Combo',
        description: 'Two idlis + two medu vadas with sambar and coconut chutney — the complete South Indian breakfast.',
        price: 120, veg: true, tags: ['popular', 'combo'], category: 'Combo' },

      // Special
      { itemCode: 'VB09', name: 'Pongal',
        description: 'Warm, comforting soft-cooked rice and moong dal with black pepper, cumin, ginger and ghee — served with chutney.',
        price: 85, veg: true, jainFriendly: true, tags: [], category: 'Special' },
      { itemCode: 'VB10', name: 'Uttapam',
        description: 'Thick rice pancake topped generously with fresh tomatoes, onions, green chillies and coriander.',
        price: 90, veg: true, jainFriendly: false, tags: [], category: 'Dosa' },

      // Sides & Chutneys
      { itemCode: 'VB11', name: 'Coconut Chutney',
        description: 'Fresh-ground coconut with green chillies, ginger and a tempering of mustard seeds and curry leaves.',
        price: 25, veg: true, jainFriendly: true, tags: [], category: 'Sides' },
      { itemCode: 'VB12', name: 'Extra Sambar',
        description: 'A bowl of Vidyarthi Bhavan\'s signature vegetable sambar — tamarind-tangy, mildly spiced.',
        price: 35, veg: true, jainFriendly: false, tags: [], category: 'Sides' },

      // Beverages & Desserts
      { itemCode: 'VB13', name: 'Filter Coffee (Kaapi)',
        description: 'Traditional South Indian filter coffee — decoction brewed through a metal filter, mixed with hot milk and sugar.',
        price: 35, veg: true, jainFriendly: true, tags: ['must-try', 'bestseller'], category: 'Beverages' },
      { itemCode: 'VB14', name: 'Kesari Bath',
        description: 'Saffron-laced semolina sweet with cashews, raisins and ghee — the classic Bangalore sweet on every Udupi menu.',
        price: 65, veg: true, tags: ['dessert'], category: 'Desserts' },
      { itemCode: 'VB15', name: 'Rava Idli (3 pcs)',
        description: 'Fluffy steamed semolina idlis with cashews and curry leaves, served with sambar and chutney.',
        price: 85, veg: true, jainFriendly: false, tags: [], category: 'Idli' },
    ],
  },

  // ── 4. PUNJAB GRILL ──────────────────────────────────────────────────────────
  {
    name: 'Punjab Grill',
    cuisines: ['NorthIndian', 'Punjabi', 'Mughlai'],
    rating: 4.2, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 420, imageEmoji: '🫕', area: 'MG Road, Bangalore',
    menu: [
      // Starters
      { itemCode: 'PG01', name: 'Chicken Tikka',
        description: 'Boneless chicken chunks marinated overnight in yogurt, ginger-garlic paste and tandoori spices — cooked in a 400°C tandoor.',
        price: 420, veg: false, tags: ['bestseller', 'must-try', 'starter'], category: 'Starters' },
      { itemCode: 'PG02', name: 'Seekh Kebab',
        description: 'Minced lamb and spiced onion-herb mixture shaped on iron skewers and grilled in a clay tandoor, served with mint chutney.',
        price: 400, veg: false, tags: ['starter', 'must-try'], category: 'Starters' },
      { itemCode: 'PG03', name: 'Hara Bhara Kebab',
        description: 'Pan-seared patties of spinach, green peas, paneer and mild spices — crispy crust, soft interior, entirely veg.',
        price: 300, veg: true, tags: ['starter', 'healthy'], category: 'Starters' },
      { itemCode: 'PG04', name: 'Paneer Tikka',
        description: 'Chunky cottage cheese cubes marinated in hung curd, mustard, ajwain and smoky spices, char-grilled in tandoor.',
        price: 360, veg: true, tags: ['bestseller', 'starter'], category: 'Starters' },

      // Main Course
      { itemCode: 'PG05', name: 'Butter Chicken (Murgh Makhani)',
        description: 'Slow-cooked tandoor-smoked chicken in a silky tomato-cream-cashew gravy, tempered with kasuri methi and butter.',
        price: 440, veg: false, tags: ['bestseller', 'must-try'], category: 'Main Course' },
      { itemCode: 'PG06', name: 'Dal Makhani',
        description: 'Black urad lentils and kidney beans simmered on a slow flame for 12 hours with cream, butter and aromatic spices.',
        price: 320, veg: true, tags: ['bestseller', 'must-try'], category: 'Main Course' },
      { itemCode: 'PG07', name: 'Palak Paneer',
        description: 'Fresh spinach puréed with ginger, garlic and spices, with soft paneer cubes — rich, nutritious and beautifully green.',
        price: 340, veg: true, tags: [], category: 'Main Course' },
      { itemCode: 'PG08', name: 'Mutton Rogan Josh',
        description: 'Kashmiri-style slow-cooked goat curry with Kashmiri red chillies, whole spices and aromatic oil — deep crimson gravy.',
        price: 480, veg: false, tags: ['spicy', 'must-try'], category: 'Main Course' },
      { itemCode: 'PG09', name: 'Shahi Paneer',
        description: 'Paneer in a regal cashew-cream-tomato gravy with cardamom, dried fruits and a hint of rose water — mildly spiced.',
        price: 360, veg: true, tags: [], category: 'Main Course' },

      // Breads
      { itemCode: 'PG10', name: 'Garlic Naan',
        description: 'Leavened bread baked in tandoor, stuffed and topped with minced garlic, fresh coriander and butter.',
        price: 75, veg: true, tags: ['bestseller'], category: 'Breads' },
      { itemCode: 'PG11', name: 'Laccha Paratha',
        description: 'Multi-layered whole wheat paratha, each layer separated by ghee, cooked on tawa for a flaky, crispy texture.',
        price: 65, veg: true, tags: [], category: 'Breads' },
      { itemCode: 'PG12', name: 'Stuffed Paratha',
        description: 'Thick whole wheat bread stuffed with spiced potato-onion filling, cooked in butter on a hot iron tawa.',
        price: 120, veg: true, tags: [], category: 'Breads' },

      // Sides
      { itemCode: 'PG13', name: 'Jeera Rice',
        description: 'Fragrant basmati rice tempered with cumin seeds, ghee and whole spices — the perfect dal or curry companion.',
        price: 160, veg: true, jainFriendly: true, tags: [], category: 'Rice' },

      // Beverages & Desserts
      { itemCode: 'PG14', name: 'Sweet Lassi',
        description: 'Thick chilled yogurt whisked with sugar, a pinch of cardamom and rose water — refreshing and filling.',
        price: 120, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'PG15', name: 'Gulab Jamun (2 pcs)',
        description: 'Soft khoya-milk solid dumplings, deep-fried golden and soaked in rose-cardamom sugar syrup.',
        price: 130, veg: true, tags: ['dessert', 'bestseller'], category: 'Desserts' },
      { itemCode: 'PG16', name: 'Kulfi Falooda',
        description: 'Dense pistachio-saffron kulfi on a bed of chilled rose falooda noodles, basil seeds and milk.',
        price: 160, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts' },
    ],
  },

  // ── 5. DOMINO'S PIZZA ────────────────────────────────────────────────────────
  {
    name: "Domino's Pizza",
    cuisines: ['Pizza', 'Italian', 'FastFood'],
    rating: 4.0, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 280, imageEmoji: '🍕', area: 'Multiple Locations, Bangalore',
    menu: [
      // Pizzas — Medium (25cm)
      { itemCode: 'DP01', name: 'Margherita (Medium)',
        description: 'Classic pizza with tangy tomato sauce, mozzarella cheese and fresh basil on a hand-tossed crust.',
        price: 199, veg: true, jainFriendly: false, tags: [], category: 'Pizza' },
      { itemCode: 'DP02', name: 'Farmhouse (Medium)',
        description: 'Garden-fresh capsicum, mushrooms, tomatoes and onions on a seasoned tomato base with mozzarella.',
        price: 299, veg: true, tags: ['bestseller'], category: 'Pizza' },
      { itemCode: 'DP03', name: 'Peppy Paneer (Medium)',
        description: 'Chunky paneer, capsicum, yellow and red paprika on a rich pizza sauce — topped with extra mozzarella.',
        price: 319, veg: true, tags: ['bestseller'], category: 'Pizza' },
      { itemCode: 'DP04', name: 'Chicken Dominator (Medium)',
        description: 'Double chicken topping — pepper chicken, grilled chicken strips and peri-peri chicken on a tangy sauce.',
        price: 399, veg: false, tags: ['bestseller', 'spicy'], category: 'Pizza' },
      { itemCode: 'DP05', name: 'Chicken Golden Delight (Medium)',
        description: 'Herbed chicken strips with golden corn, fresh tomatoes and green capsicum on a golden Parmesan sauce.',
        price: 369, veg: false, tags: [], category: 'Pizza' },
      { itemCode: 'DP06', name: 'Double Cheese Margarita (Medium)',
        description: 'A generous double layer of mozzarella with tangy tomato sauce — simple, gooey, satisfying.',
        price: 249, veg: true, tags: ['popular'], category: 'Pizza' },

      // Sides
      { itemCode: 'DP07', name: 'Garlic Bread with Cheese',
        description: 'Oven-baked garlic bread slathered with butter, minced garlic and a melted cheese topping.',
        price: 149, veg: true, tags: ['starter', 'bestseller'], category: 'Sides' },
      { itemCode: 'DP08', name: 'Stuffed Garlic Bread',
        description: 'Garlic bread buns stuffed with a creamy cheese and herb filling, baked until golden.',
        price: 179, veg: true, tags: ['starter'], category: 'Sides' },
      { itemCode: 'DP09', name: 'Chicken Wings (6 pcs)',
        description: 'Crispy chicken winglets coated in a tangy peri-peri or BBQ sauce with dipping sauce.',
        price: 219, veg: false, tags: ['starter', 'spicy'], category: 'Sides' },

      // Pasta
      { itemCode: 'DP10', name: 'Pasta Italiana (Veg)',
        description: 'Penne in a rich Béchamel white sauce with sweet corn, capsicum, and Italian seasoning.',
        price: 199, veg: true, tags: [], category: 'Pasta' },

      // Beverages & Desserts
      { itemCode: 'DP11', name: 'Pepsi (500ml)',
        description: 'Chilled Pepsi to wash down your pizza.',
        price: 65, veg: true, jainFriendly: true, tags: [], category: 'Beverages' },
      { itemCode: 'DP12', name: 'Choco Lava Cake (2 pcs)',
        description: 'Warm molten chocolate mini-cakes with a gooey dark chocolate centre — the iconic Domino\'s dessert.',
        price: 109, veg: true, tags: ['dessert', 'bestseller', 'must-try'], category: 'Desserts' },
    ],
  },

  // ── 6. BIRYANI BLUES ────────────────────────────────────────────────────────
  {
    name: 'Biryani Blues',
    cuisines: ['Biryani', 'Mughlai', 'Hyderabadi'],
    rating: 4.1, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 320, imageEmoji: '🍚', area: 'HSR Layout, Bangalore',
    menu: [
      // Starters
      { itemCode: 'BB01', name: 'Shami Kebab (4 pcs)',
        description: 'Finely minced lamb patties spiced with chana dal, cloves, cinnamon and cardamom — pan-fried to a golden crust.',
        price: 280, veg: false, tags: ['starter', 'must-try'], category: 'Starters' },
      { itemCode: 'BB02', name: 'Haleem',
        description: 'Slow-cooked wheat porridge with shredded lamb, caramelised onions, ginger and a squeeze of lime — 7-hour cook.',
        price: 260, veg: false, tags: ['must-try', 'spicy'], category: 'Starters' },
      { itemCode: 'BB03', name: 'Chicken Tikka Boti (6 pcs)',
        description: 'Small chunks of boneless chicken marinated in yogurt and tandoori masala, char-grilled on skewers.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters' },

      // Biryani — the heart of the menu
      { itemCode: 'BB04', name: 'Hyderabadi Chicken Dum Biryani',
        description: 'The original dum-cooked biryani — chicken marinated in 22 spices, layered with saffron basmati under a sealed dough crust for 2 hours.',
        price: 360, veg: false, tags: ['bestseller', 'must-try', 'spicy'], category: 'Biryani' },
      { itemCode: 'BB05', name: 'Lucknowi Veg Biryani',
        description: 'Awadhi-style layered biryani with seasonal vegetables, whole spices, kewra water and crispy fried onions — aromatic and mild.',
        price: 260, veg: true, tags: ['bestseller'], category: 'Biryani' },
      { itemCode: 'BB06', name: 'Mutton Dum Biryani',
        description: 'Slow-cooked goat mutton pieces with basmati rice, Malabar spices and a generous amount of crispy onions.',
        price: 440, veg: false, tags: ['spicy', 'must-try'], category: 'Biryani' },
      { itemCode: 'BB07', name: 'Prawn Biryani',
        description: 'Coastal-style biryani with large tiger prawns marinated in coconut-chilli paste, layered with fragrant basmati.',
        price: 420, veg: false, tags: ['spicy'], category: 'Biryani' },
      { itemCode: 'BB08', name: 'Kolkata Style Chicken Biryani',
        description: 'Distinctly mild, fragrant rice with bone-in chicken, a whole potato and a boiled egg — the Nawabi legacy.',
        price: 340, veg: false, tags: ['popular'], category: 'Biryani' },
      { itemCode: 'BB09', name: 'Paneer Dum Biryani',
        description: 'Marinated cottage cheese with saffron basmati, rose water and whole spices — dum-sealed for 45 minutes.',
        price: 290, veg: true, tags: [], category: 'Biryani' },

      // Curries & Sides
      { itemCode: 'BB10', name: 'Chicken Korma',
        description: 'Mild, creamy Mughlai chicken curry with cashew-yogurt gravy, whole spices and aromatic saffron.',
        price: 320, veg: false, tags: [], category: 'Main Course' },
      { itemCode: 'BB11', name: 'Raita',
        description: 'Chilled boondi raita with cucumber, cumin powder and fresh coriander — essential with any biryani.',
        price: 75, veg: true, tags: [], category: 'Sides' },
      { itemCode: 'BB12', name: 'Roomali Roti',
        description: 'Thin handkerchief-soft bread cooked on an inverted tawa at high heat — pairs beautifully with korma.',
        price: 45, veg: true, tags: [], category: 'Breads' },

      // Beverages & Desserts
      { itemCode: 'BB13', name: 'Thanda Sharbat',
        description: 'Chilled rose-basil seed sherbet with a hint of kewra water — a traditional Mughlai cooler.',
        price: 90, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'BB14', name: 'Sheer Khurma',
        description: 'Festive vermicelli milk pudding with dates, pistachios, almonds and cardamom — rich and aromatic.',
        price: 130, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts' },
      { itemCode: 'BB15', name: 'Phirni',
        description: 'Chilled coarsely ground rice pudding set in an earthen bowl, topped with saffron and crushed dry fruits.',
        price: 120, veg: true, tags: ['dessert'], category: 'Desserts' },
    ],
  },

  // ── 7. CHINESE DRAGON ────────────────────────────────────────────────────────
  {
    name: 'Chinese Dragon',
    cuisines: ['Chinese', 'Asian', 'IndoChinese'],
    rating: 3.9, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 250, imageEmoji: '🥡', area: 'Whitefield, Bangalore',
    menu: [
      // Soups
      { itemCode: 'CD01', name: 'Hot and Sour Soup',
        description: 'Classic thick Chinese soup with tofu, wood ear mushrooms, bamboo shoots, vinegar and white pepper — full of umami.',
        price: 150, veg: true, tags: ['spicy', 'starter'], category: 'Soups' },
      { itemCode: 'CD02', name: 'Sweet Corn Chicken Soup',
        description: 'Silky chicken and sweet corn soup with egg ribbons, white pepper and a dash of soy — warming and mild.',
        price: 160, veg: false, tags: ['starter'], category: 'Soups' },

      // Starters
      { itemCode: 'CD03', name: 'Veg Manchurian (Dry)',
        description: 'Crispy cauliflower and cabbage balls tossed in a tangy soy-chilli-garlic sauce with spring onions.',
        price: 210, veg: true, tags: ['bestseller', 'spicy'], category: 'Starters' },
      { itemCode: 'CD04', name: 'Chilli Chicken (Dry)',
        description: 'Crispy fried chicken pieces tossed in a fiery chilli-garlic-soy sauce with capsicum and onion rings.',
        price: 290, veg: false, tags: ['bestseller', 'spicy', 'must-try'], category: 'Starters' },
      { itemCode: 'CD05', name: 'Spring Rolls (4 pcs)',
        description: 'Crispy golden rolls stuffed with shredded cabbage, carrots, glass noodles and Chinese seasonings.',
        price: 180, veg: true, tags: ['starter'], category: 'Starters' },
      { itemCode: 'CD06', name: 'Chicken Lollipop (6 pcs)',
        description: 'Marinated chicken wingettes shaped into lollipops, deep-fried until crispy and served with schezwan dip.',
        price: 330, veg: false, tags: ['starter', 'bestseller'], category: 'Starters' },
      { itemCode: 'CD07', name: 'Paneer Chilli (Dry)',
        description: 'Crispy battered paneer cubes tossed in a bold chilli-garlic-spring onion sauce.',
        price: 260, veg: true, tags: ['spicy', 'starter'], category: 'Starters' },

      // Rice & Noodles
      { itemCode: 'CD08', name: 'Veg Fried Rice',
        description: 'Wok-tossed day-old steamed rice with carrots, beans, spring onions and eggs in soy and sesame oil.',
        price: 200, veg: true, tags: ['bestseller'], category: 'Rice' },
      { itemCode: 'CD09', name: 'Chicken Fried Rice',
        description: 'Wok-fried rice with tender chicken strips, soy sauce, sesame oil, spring onions and egg.',
        price: 250, veg: false, tags: ['bestseller'], category: 'Rice' },
      { itemCode: 'CD10', name: 'Hakka Noodles (Veg)',
        description: 'Stir-fried thin noodles with julienned cabbage, carrots, capsicum and bean sprouts in soy-sesame sauce.',
        price: 200, veg: true, tags: [], category: 'Noodles' },
      { itemCode: 'CD11', name: 'Chicken Szechuan Noodles',
        description: 'Flat noodles tossed in a fiery Szechuan sauce with chicken, dried chillies and Sichuan peppercorns.',
        price: 270, veg: false, tags: ['spicy', 'must-try'], category: 'Noodles' },

      // Gravy
      { itemCode: 'CD12', name: 'Veg Manchurian Gravy',
        description: 'Vegetable balls in a saucy, tangy Manchurian gravy — perfect poured over steamed rice.',
        price: 230, veg: true, tags: ['popular'], category: 'Main Course' },

      // Beverages & Desserts
      { itemCode: 'CD13', name: 'Iced Green Tea',
        description: 'Freshly brewed green tea, chilled and served over ice with a wedge of lemon.',
        price: 80, veg: true, jainFriendly: true, tags: ['healthy'], category: 'Beverages' },
      { itemCode: 'CD14', name: 'Toffee Banana',
        description: 'Deep-fried banana fritters coated in crispy toffee, finished with a drizzle of honey and sesame.',
        price: 160, veg: true, tags: ['dessert'], category: 'Desserts' },
    ],
  },

  // ── 8. WRAP-IT-UP ────────────────────────────────────────────────────────────
  {
    name: 'Wrap-It-Up',
    cuisines: ['Wraps', 'Mexican', 'Healthy'],
    rating: 4.0, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 230, imageEmoji: '🌯', area: 'Bellandur, Bangalore',
    menu: [
      // Starters & Sides
      { itemCode: 'WI01', name: 'Nachos with Dips',
        description: 'Crispy tortilla chips served with house-made salsa, guacamole and sour cream — the group favourite starter.',
        price: 200, veg: true, tags: ['starter', 'sharing'], category: 'Starters' },
      { itemCode: 'WI02', name: 'Falafel Platter',
        description: 'Crispy chickpea falafel balls with house-made hummus, pickled turnips, fresh salad and pita bread.',
        price: 240, veg: true, tags: ['healthy', 'must-try'], category: 'Starters' },

      // Wraps
      { itemCode: 'WI03', name: 'Chicken Tikka Wrap',
        description: 'Smoky grilled chicken tikka with mint-coriander chutney, crunchy lettuce, pickled onions in a warm flour tortilla.',
        price: 260, veg: false, tags: ['bestseller', 'must-try'], category: 'Wraps' },
      { itemCode: 'WI04', name: 'Paneer Tikka Wrap',
        description: 'Charred paneer with roasted peppers, pickled red onion, hung curd dressing in a toasted flour tortilla.',
        price: 230, veg: true, tags: ['bestseller'], category: 'Wraps' },
      { itemCode: 'WI05', name: 'Mexican Bean Wrap',
        description: 'Spiced black beans, roasted corn, pico de gallo, guacamole and pepper jack cheese in a warm tortilla.',
        price: 210, veg: true, tags: ['spicy', 'healthy'], category: 'Wraps' },
      { itemCode: 'WI06', name: 'Chipotle Chicken Wrap',
        description: 'Grilled chicken with smoky chipotle sauce, cheddar, jalapeños, roasted peppers and crunchy romaine.',
        price: 280, veg: false, tags: ['spicy', 'popular'], category: 'Wraps' },
      { itemCode: 'WI07', name: 'Falafel Wrap',
        description: 'Crispy falafel with roasted red pepper hummus, mixed greens, tomatoes and tahini dressing in a whole wheat tortilla.',
        price: 230, veg: true, tags: ['healthy', 'popular'], category: 'Wraps' },

      // Bowls
      { itemCode: 'WI08', name: 'Chicken Burrito Bowl',
        description: 'Seasoned chicken thigh, cilantro rice, black beans, salsa, guacamole, sour cream and pickled jalapeños.',
        price: 320, veg: false, tags: ['bestseller', 'must-try'], category: 'Bowls' },
      { itemCode: 'WI09', name: 'Sweet Potato Grain Bowl',
        description: 'Roasted sweet potato, quinoa, kale, chickpeas, avocado and lemon-tahini dressing — wholesome and filling.',
        price: 290, veg: true, tags: ['healthy', 'must-try'], category: 'Bowls' },
      { itemCode: 'WI10', name: 'Paneer Power Bowl',
        description: 'Grilled paneer, brown rice, roasted broccoli, cherry tomatoes with a spicy harissa dressing.',
        price: 270, veg: true, tags: ['healthy'], category: 'Bowls' },

      // Beverages
      { itemCode: 'WI11', name: 'Fresh Lime Soda',
        description: 'Freshly squeezed lime with sparkling water, served sweet or salted.',
        price: 70, veg: true, jainFriendly: true, tags: [], category: 'Beverages' },
      { itemCode: 'WI12', name: 'Mango Basil Smoothie',
        description: 'Fresh Alphonso mango blended with coconut milk, basil seeds and a pinch of black salt.',
        price: 160, veg: true, tags: ['healthy'], category: 'Beverages' },
      { itemCode: 'WI13', name: 'Chocolate Peanut Butter Cup',
        description: 'A rich brownie-bottom cup with dark chocolate ganache and salted peanut butter filling.',
        price: 160, veg: true, tags: ['dessert'], category: 'Desserts' },
    ],
  },

  // ── 9. SARAVANAA BHAVAN ──────────────────────────────────────────────────────
  {
    name: 'Saravanaa Bhavan',
    cuisines: ['SouthIndian', 'Tamil', 'Vegetarian'],
    rating: 4.3, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 190, imageEmoji: '🍱', area: 'Jayanagar, Bangalore',
    menu: [
      // Dosas
      { itemCode: 'SB01', name: 'Ghee Masala Dosa',
        description: 'Crispy fermented rice crepe smeared with ghee, filled with a generous spiced potato masala — a Tamil classic.',
        price: 120, veg: true, tags: ['bestseller', 'must-try'], category: 'Dosa' },
      { itemCode: 'SB02', name: 'Paper Roast Dosa',
        description: 'Incredibly thin, paper-crisp dosa with a buttery finish — served with chutneys and thick sambar.',
        price: 110, veg: true, jainFriendly: true, tags: ['must-try'], category: 'Dosa' },
      { itemCode: 'SB03', name: 'Onion Rava Dosa',
        description: 'Instant semolina dosa with a lacey texture, topped with minced onion, green chilli and coriander.',
        price: 115, veg: true, tags: ['popular'], category: 'Dosa' },

      // Idli, Vada, Pongal
      { itemCode: 'SB04', name: 'Mini Tiffin',
        description: 'Saravanaa\'s signature combo — 2 idlis, 1 medu vada, pongal, with sambar and three house chutneys.',
        price: 160, veg: true, tags: ['bestseller', 'combo', 'must-try'], category: 'Combo' },
      { itemCode: 'SB05', name: 'Kanchipuram Idli (3 pcs)',
        description: 'Flavoursome temple-style idlis with black pepper, cumin, ginger and asafoetida — steamed in turmeric leaves.',
        price: 110, veg: true, tags: ['popular'], category: 'Idli' },

      // Meals
      { itemCode: 'SB06', name: 'Saravanaa Meals (Unlimited)',
        description: 'Full South Indian thali: rice, rasam, sambar, 2 vegetable curries, kootu, papad, pickle and payasam.',
        price: 200, veg: true, jainFriendly: false, tags: ['bestseller', 'must-try', 'value'], category: 'Meals' },
      { itemCode: 'SB07', name: 'Bisibele Bath',
        description: 'Karnataka one-pot rice-lentil preparation with 14 spices, cashews and tamarind — hearty and warming.',
        price: 130, veg: true, tags: ['spicy', 'popular'], category: 'Special' },
      { itemCode: 'SB08', name: 'Curd Rice',
        description: 'Soft rice mixed with cool curd and a tempering of mustard seeds, curry leaves, green chilli and pomegranate.',
        price: 100, veg: true, jainFriendly: false, tags: [], category: 'Rice' },

      // Poori
      { itemCode: 'SB09', name: 'Poori Masala (3 pcs)',
        description: 'Fluffy deep-fried whole wheat pooris served with a tangy potato masala — breakfast royalty.',
        price: 110, veg: true, tags: [], category: 'Poori' },

      // Sides & Extras
      { itemCode: 'SB10', name: 'Vada Sambar (2 pcs)',
        description: 'Crispy medu vadas dunked in a steaming bowl of vegetables sambar — soaked or served alongside.',
        price: 85, veg: true, jainFriendly: false, tags: [], category: 'Vada' },
      { itemCode: 'SB11', name: 'Lemon Rice',
        description: 'Tempered rice with fresh lemon juice, turmeric, mustard seeds, peanuts and curry leaves.',
        price: 100, veg: true, jainFriendly: true, tags: [], category: 'Rice' },

      // Beverages & Desserts
      { itemCode: 'SB12', name: 'Filter Coffee (Kaapi)',
        description: 'Freshly brewed South Indian filter coffee decoction mixed with full-cream milk, served in a traditional davara-tumbler.',
        price: 40, veg: true, jainFriendly: true, tags: ['bestseller', 'must-try'], category: 'Beverages' },
      { itemCode: 'SB13', name: 'Butter Milk (Moru)',
        description: 'Chilled salted buttermilk with ginger, green chilli, curry leaves and coriander — the best summer digestive.',
        price: 45, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'SB14', name: 'Pal Payasam',
        description: 'Slow-cooked creamy rice kheer with sugar, cardamom and a generous amount of cashews and raisins.',
        price: 90, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts' },
    ],
  },

  // ── 10. THE EGG FACTORY ──────────────────────────────────────────────────────
  {
    name: 'The Egg Factory',
    cuisines: ['Breakfast', 'Eggs', 'Continental', 'Cafe'],
    rating: 4.2, deliveryTimeMin: 25,
    vegFriendly: false, jainFriendly: false,
    pricePerPerson: 280, imageEmoji: '🍳', area: 'Lavelle Road, Bangalore',
    menu: [
      // Egg Classics
      { itemCode: 'EF01', name: 'Eggs Benedict',
        description: 'Two poached eggs on toasted English muffin halves with Canadian bacon and house-made hollandaise sauce.',
        price: 320, veg: false, tags: ['bestseller', 'must-try'], category: 'Eggs' },
      { itemCode: 'EF02', name: 'Masala Omelette',
        description: 'Three-egg fluffy omelette loaded with onions, tomatoes, green chillies, coriander and Indian spices.',
        price: 200, veg: false, tags: ['bestseller', 'spicy'], category: 'Eggs' },
      { itemCode: 'EF03', name: 'Shakshuka',
        description: 'Eggs poached in a rich, spiced tomato-pepper stew with cumin, paprika and preserved lemon — served with pita.',
        price: 280, veg: false, tags: ['must-try', 'spicy'], category: 'Eggs' },
      { itemCode: 'EF04', name: 'Eggs Florentine',
        description: 'Two poached eggs on toasted sourdough with wilted spinach, capers and creamy Gruyère hollandaise.',
        price: 310, veg: false, tags: ['popular'], category: 'Eggs' },
      { itemCode: 'EF05', name: 'Scrambled Eggs (French Style)',
        description: 'Slow-cooked silky soft curds of egg with crème fraîche, chives on toasted sourdough — deceptively simple.',
        price: 220, veg: false, tags: [], category: 'Eggs' },

      // Breakfast Mains
      { itemCode: 'EF06', name: 'Avocado Toast',
        description: 'Thick-cut sourdough topped with smashed avocado, poached egg, cherry tomatoes, chilli flakes and extra virgin olive oil.',
        price: 290, veg: false, tags: ['healthy', 'popular'], category: 'Toast' },
      { itemCode: 'EF07', name: 'Full English Breakfast',
        description: 'Two fried eggs, grilled pork sausages, bacon, sautéed mushrooms, baked beans, grilled tomato and buttered toast.',
        price: 420, veg: false, tags: ['bestseller', 'must-try'], category: 'Combo' },
      { itemCode: 'EF08', name: 'French Toast',
        description: 'Thick brioche slices dipped in egg-cream custard, pan-fried golden, served with maple syrup and seasonal berries.',
        price: 240, veg: false, tags: ['popular'], category: 'Toast' },

      // Pancakes
      { itemCode: 'EF09', name: 'Buttermilk Pancakes (3 pcs)',
        description: 'Fluffy American-style pancakes made with buttermilk batter, served with maple syrup and whipped butter.',
        price: 260, veg: false, tags: ['bestseller'], category: 'Pancakes' },

      // Light Bites
      { itemCode: 'EF10', name: 'Egg Fried Rice',
        description: 'Indo-Chinese style egg fried rice with spring onions, soy, sesame oil and a perfectly beaten egg.',
        price: 220, veg: false, tags: [], category: 'Rice' },
      { itemCode: 'EF11', name: 'Devilled Eggs (6 pcs)',
        description: 'Hard-boiled egg halves filled with creamy yolk, sriracha mayo, pickled jalapeños and a paprika dusting.',
        price: 180, veg: false, tags: ['starter', 'spicy'], category: 'Starters' },

      // Beverages & Desserts
      { itemCode: 'EF12', name: 'Cold Brew Coffee',
        description: 'Smooth 18-hour cold-brewed single origin coffee, served over ice with a splash of oat milk.',
        price: 180, veg: false, tags: ['must-try', 'popular'], category: 'Beverages' },
      { itemCode: 'EF13', name: 'Fresh Orange Juice',
        description: 'Six freshly squeezed oranges — no sugar, no water, no compromise.',
        price: 150, veg: false, tags: ['healthy'], category: 'Beverages' },
      { itemCode: 'EF14', name: 'Classic Cheesecake',
        description: 'New York style baked cheesecake — dense, rich, with a graham cracker crust and a fresh berry compote.',
        price: 220, veg: false, tags: ['dessert', 'bestseller'], category: 'Desserts' },
    ],
  },

  // ── 11. SOCIAL (Cafe / All-Day Dining) ───────────────────────────────────────
  {
    name: 'Social',
    cuisines: ['Cafe', 'Continental', 'Indian', 'Burgers'],
    rating: 4.1, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 400, imageEmoji: '☕', area: 'Koramangala, Bangalore',
    menu: [
      // Starters & Small Plates
      { itemCode: 'SO01', name: 'Social House Nachos',
        description: 'Signature pile of corn nachos with nacho cheese, guacamole, pico de gallo, jalapeños and sour cream.',
        price: 330, veg: true, tags: ['sharing', 'bestseller'], category: 'Starters' },
      { itemCode: 'SO02', name: 'Pulled Chicken Sliders (3)',
        description: 'Slow-cooked pulled chicken in smoky BBQ sauce, pickled slaw in potato-bun sliders — crowd favourite.',
        price: 380, veg: false, tags: ['bestseller', 'must-try'], category: 'Starters' },
      { itemCode: 'SO03', name: 'Truffle Mushroom Bruschetta',
        description: 'Toasted sourdough topped with wild mushrooms in truffle oil, roasted garlic and parsley.',
        price: 280, veg: true, tags: ['must-try'], category: 'Starters' },

      // Mains
      { itemCode: 'SO04', name: 'Social Signature Burger',
        description: 'Double smash patty, secret Social sauce, aged cheddar, pickles and iceberg lettuce on a sesame brioche.',
        price: 480, veg: false, tags: ['bestseller', 'must-try'], category: 'Burgers' },
      { itemCode: 'SO05', name: 'Peri-Peri Chicken with Rice',
        description: 'Half Portuguese-style flame-grilled chicken, marinated in house peri-peri, served with lemon rice and coleslaw.',
        price: 520, veg: false, tags: ['spicy', 'must-try'], category: 'Mains' },
      { itemCode: 'SO06', name: 'Mushroom Risotto',
        description: 'Creamy Arborio rice slow-cooked with wild mushrooms, white wine, parmesan and truffle oil.',
        price: 440, veg: true, tags: ['popular'], category: 'Mains' },
      { itemCode: 'SO07', name: 'Desi Masala Pasta',
        description: 'Penne tossed in a spiced tomato-onion-masala sauce with paneer, capsicum and coriander — East meets West.',
        price: 340, veg: true, tags: ['spicy', 'popular'], category: 'Mains' },
      { itemCode: 'SO08', name: 'Grilled Fish Tacos (3)',
        description: 'Soft corn tortillas with spiced grilled fish, mango salsa, cabbage slaw, avocado and chipotle crema.',
        price: 420, veg: false, tags: ['popular', 'spicy'], category: 'Mains' },

      // Salads
      { itemCode: 'SO09', name: 'Watermelon Feta Salad',
        description: 'Fresh watermelon, crumbled feta, kalamata olives, mint, red onion and a balsamic reduction.',
        price: 280, veg: true, tags: ['healthy', 'light'], category: 'Salads' },

      // Sides
      { itemCode: 'SO10', name: 'Parmesan Truffle Fries',
        description: 'Crispy shoestring fries tossed in truffle oil and parmesan, with a rosemary dipping sauce.',
        price: 240, veg: true, tags: ['bestseller', 'sharing'], category: 'Sides' },

      // Beverages & Desserts
      { itemCode: 'SO11', name: 'Social Lemonade',
        description: 'House-pressed lemon, mint, cucumber and sparkling water — refreshing and slightly sweet.',
        price: 130, veg: true, jainFriendly: true, tags: [], category: 'Beverages' },
      { itemCode: 'SO12', name: 'Baked Nutella Brownie',
        description: 'Fudgy warm chocolate brownie with a Nutella swirl, served with vanilla bean ice cream.',
        price: 240, veg: true, tags: ['dessert', 'bestseller', 'must-try'], category: 'Desserts' },
    ],
  },

  // ── 12. BEHROUZ BIRYANI ──────────────────────────────────────────────────────
  {
    name: 'Behrouz Biryani',
    cuisines: ['Biryani', 'Mughlai', 'Persian'],
    rating: 4.2, deliveryTimeMin: 40,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 380, imageEmoji: '🏺', area: 'Indiranagar, Bangalore',
    menu: [
      // Royal Biryanis
      { itemCode: 'BZ01', name: 'Royal Chicken Biryani',
        description: 'Inspired by Persian court kitchens — chicken marinated in 24 secret spices, layered with aged basmati, Irani saffron and dried fruits.',
        price: 399, veg: false, tags: ['bestseller', 'must-try'], category: 'Biryani' },
      { itemCode: 'BZ02', name: 'Grand Mutton Biryani',
        description: 'Slow-cooked lamb shank with saffron-infused long-grain basmati, rose water, crispy onions and Behrouz\'s secret dum masala.',
        price: 479, veg: false, tags: ['must-try', 'spicy', 'premium'], category: 'Biryani' },
      { itemCode: 'BZ03', name: 'Behrouz Veg Biryani',
        description: 'A treasure of seasonal vegetables, paneer and cashews in saffron basmati — the vegetarian royal feast.',
        price: 299, veg: true, tags: ['bestseller'], category: 'Biryani' },
      { itemCode: 'BZ04', name: 'Prawn Nawabi Biryani',
        description: 'Jumbo prawns marinated in coastal spices and slow-cooked with aromatic rice and Malabar seasonings.',
        price: 449, veg: false, tags: ['spicy', 'premium'], category: 'Biryani' },
      { itemCode: 'BZ05', name: 'Persian Keema Biryani',
        description: 'Minced lamb and egg layered between fragrant basmati — Behrouz\'s interpretation of Irani mince biryani.',
        price: 359, veg: false, tags: ['popular'], category: 'Biryani' },

      // Kebabs & Starters
      { itemCode: 'BZ06', name: 'Galouti Kebab (4 pcs)',
        description: 'Melt-in-your-mouth minced lamb patties with over 60 spices — the signature Lucknowi Nawabi kebab.',
        price: 360, veg: false, tags: ['must-try', 'starter'], category: 'Starters' },
      { itemCode: 'BZ07', name: 'Chicken Seekh Kebab (4 pcs)',
        description: 'Spiced minced chicken on iron skewers, flame-grilled and served with charred onions and green chutney.',
        price: 320, veg: false, tags: ['starter', 'bestseller'], category: 'Starters' },

      // Curries
      { itemCode: 'BZ08', name: 'Nihari Gosht',
        description: 'Slow-cooked overnight lamb shank curry with bone marrow, ginger, cardamom and aromatic nihari masala.',
        price: 420, veg: false, tags: ['must-try', 'spicy'], category: 'Main Course' },
      { itemCode: 'BZ09', name: 'Paneer Lasooni',
        description: 'Pan-seared paneer cubes in a rich garlic-infused tomato-cream gravy with kasuri methi.',
        price: 320, veg: true, tags: [], category: 'Main Course' },

      // Sides & Breads
      { itemCode: 'BZ10', name: 'Saffron Raita',
        description: 'Chilled yogurt infused with Irani saffron, boondi and fresh coriander — the royal biryani accompaniment.',
        price: 90, veg: true, tags: [], category: 'Sides' },
      { itemCode: 'BZ11', name: 'Sheermal',
        description: 'Saffron-infused flatbread baked in a clay oven — a Mughal royal bread with a subtly sweet flavour.',
        price: 70, veg: true, tags: ['must-try'], category: 'Breads' },

      // Beverages & Desserts
      { itemCode: 'BZ12', name: 'Rose Sharbat',
        description: 'Chilled rose syrup with basil seeds (sabja) and a squeeze of lemon — a fragrant Persian cooler.',
        price: 100, veg: true, tags: [], category: 'Beverages' },
      { itemCode: 'BZ13', name: 'Zafrani Kheer',
        description: 'Slow-simmered royal rice pudding with Irani saffron, cardamom, silver vark and crushed pistachios.',
        price: 150, veg: true, tags: ['dessert', 'must-try'], category: 'Desserts' },
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
        imageUrl:      null,
        mealDbId:      null,
      }));

      await MenuItem.bulkCreate(menuItems);
      totalItems += menu.length;
      console.log(`   🍽️  ${restaurant.name.padEnd(26)} — ${menu.length} items`);
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
