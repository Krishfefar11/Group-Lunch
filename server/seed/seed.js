require('dotenv').config({ path: '../.env' });
const { sequelize, Restaurant, MenuItem, Coupon } = require('../models/index');

// ── Restaurant + menu data ─────────────────────────────────────────────────
const restaurantData = [
  {
    name: 'Meghana Foods',
    cuisines: ['Biryani', 'South Indian', 'Andhra'],
    rating: 4.4, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 280, imageEmoji: '🍛', area: 'Koramangala, Bangalore',
    menu: [
      { itemCode: 'MF01', name: 'Chicken Biryani',    description: 'Aromatic basmati with tender chicken',      price: 320, veg: false, tags: ['bestseller','spicy'],  category: 'Biryani'     },
      { itemCode: 'MF02', name: 'Veg Biryani',        description: 'Fragrant rice with fresh vegetables',        price: 220, veg: true,  tags: ['bestseller'],           category: 'Biryani'     },
      { itemCode: 'MF03', name: 'Mutton Biryani',     description: 'Slow-cooked mutton dum biryani',             price: 390, veg: false, tags: ['spicy'],                category: 'Biryani'     },
      { itemCode: 'MF04', name: 'Paneer Biryani',     description: 'Biryani with marinated paneer cubes',        price: 260, veg: true,  tags: [],                       category: 'Biryani'     },
      { itemCode: 'MF05', name: 'Chicken 65',         description: 'Crispy deep-fried spiced chicken',           price: 260, veg: false, tags: ['spicy','starter'],      category: 'Starters'    },
      { itemCode: 'MF06', name: 'Veg Manchurian',     description: 'Crispy veggie balls in tangy sauce',         price: 180, veg: true,  tags: ['starter'],              category: 'Starters'    },
      { itemCode: 'MF07', name: 'Raita',              description: 'Chilled yogurt with cucumber',               price: 60,  veg: true,  jainFriendly: true, tags: [],   category: 'Sides'       },
      { itemCode: 'MF08', name: 'Gulab Jamun',        description: 'Soft milk dumplings in sugar syrup',         price: 80,  veg: true,  tags: ['dessert'],              category: 'Desserts'    },
      { itemCode: 'MF09', name: 'Egg Biryani',        description: 'Fluffy biryani with boiled eggs',            price: 230, veg: false, tags: [],                       category: 'Biryani'     },
      { itemCode: 'MF10', name: 'Mirchi Ka Salan',    description: 'Hyderabadi green chilli curry',              price: 100, veg: true,  tags: ['spicy'],                category: 'Sides'       },
      { itemCode: 'MF11', name: 'Butter Naan',        description: 'Soft butter-brushed naan',                   price: 45,  veg: true,  jainFriendly: true, tags: [],   category: 'Breads'      },
      { itemCode: 'MF12', name: 'Chicken Curry',      description: 'Classic Andhra chicken curry',               price: 280, veg: false, tags: ['spicy'],                category: 'Main Course' },
    ],
  },
  {
    name: 'Truffles',
    cuisines: ['American', 'Burgers', 'Continental'],
    rating: 4.3, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 320, imageEmoji: '🍔', area: 'Indiranagar, Bangalore',
    menu: [
      { itemCode: 'TR01', name: 'That Burger',           description: 'Classic beef smash burger with cheese',       price: 340, veg: false, tags: ['bestseller'],       category: 'Burgers'    },
      { itemCode: 'TR02', name: 'Mushroom Swiss Burger',  description: 'Sauteed mushrooms, swiss cheese',             price: 310, veg: true,  tags: ['bestseller'],       category: 'Burgers'    },
      { itemCode: 'TR03', name: 'BBQ Chicken Burger',     description: 'Grilled chicken with smoky BBQ sauce',        price: 320, veg: false, tags: [],                   category: 'Burgers'    },
      { itemCode: 'TR04', name: 'Veg Burger',             description: 'Crispy veggie patty with lettuce',            price: 270, veg: true,  tags: [],                   category: 'Burgers'    },
      { itemCode: 'TR05', name: 'Loaded Fries',           description: 'Fries with cheese sauce and jalapenos',       price: 190, veg: true,  tags: ['spicy','starter'],  category: 'Sides'      },
      { itemCode: 'TR06', name: 'Chicken Wings',          description: '6 wings with your choice of sauce',          price: 280, veg: false, tags: ['starter'],          category: 'Starters'   },
      { itemCode: 'TR07', name: 'Pasta Arrabiata',        description: 'Penne in spicy tomato sauce',                 price: 260, veg: true,  tags: ['spicy'],            category: 'Pasta'      },
      { itemCode: 'TR08', name: 'Chocolate Lava Cake',    description: 'Warm cake with molten chocolate center',      price: 180, veg: true,  tags: ['dessert'],          category: 'Desserts'   },
      { itemCode: 'TR09', name: 'Oreo Milkshake',         description: 'Thick Oreo blended milkshake',                price: 160, veg: true,  tags: [],                   category: 'Beverages'  },
      { itemCode: 'TR10', name: 'Chicken Caesar Salad',   description: 'Romaine, chicken, parmesan, croutons',        price: 280, veg: false, tags: [],                   category: 'Salads'     },
      { itemCode: 'TR11', name: 'Margherita Pizza',       description: 'Classic tomato, mozzarella, basil',           price: 290, veg: true,  tags: [],                   category: 'Pizza'      },
      { itemCode: 'TR12', name: 'BBQ Chicken Pizza',      description: 'Smoky chicken on BBQ sauce base',             price: 340, veg: false, tags: ['bestseller'],       category: 'Pizza'      },
    ],
  },
  {
    name: 'Vidyarthi Bhavan',
    cuisines: ['South Indian', 'Breakfast', 'Vegetarian'],
    rating: 4.5, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 150, imageEmoji: '🥞', area: 'Gandhi Bazaar, Bangalore',
    menu: [
      { itemCode: 'VB01', name: 'Masala Dosa',    description: 'Crispy dosa with spiced potato filling',  price: 80,  veg: true, tags: ['bestseller'], category: 'Dosa'      },
      { itemCode: 'VB02', name: 'Plain Dosa',     description: 'Thin crispy rice crepe',                  price: 60,  veg: true, jainFriendly: true, tags: [],  category: 'Dosa' },
      { itemCode: 'VB03', name: 'Rava Dosa',      description: 'Crispy semolina dosa',                    price: 90,  veg: true, tags: ['bestseller'], category: 'Dosa'      },
      { itemCode: 'VB04', name: 'Idli Sambar',    description: 'Soft idlis with sambar and chutneys',     price: 70,  veg: true, tags: [],             category: 'Idli'      },
      { itemCode: 'VB05', name: 'Vada Sambar',    description: 'Crispy medu vada with sambar',            price: 75,  veg: true, tags: [],             category: 'Vada'      },
      { itemCode: 'VB06', name: 'Pongal',         description: 'Soft rice-lentil dish with ghee',         price: 80,  veg: true, jainFriendly: true, tags: [],  category: 'Special' },
      { itemCode: 'VB07', name: 'Uttapam',        description: 'Thick rice pancake with toppings',        price: 90,  veg: true, tags: [],             category: 'Dosa'      },
      { itemCode: 'VB08', name: 'Filter Coffee',  description: 'Authentic South Indian filter kaapi',     price: 30,  veg: true, jainFriendly: true, tags: [],  category: 'Beverages' },
      { itemCode: 'VB09', name: 'Kesari Bath',    description: 'Sweet saffron semolina halwa',            price: 60,  veg: true, tags: ['dessert'],    category: 'Desserts'  },
      { itemCode: 'VB10', name: 'Set Dosa',       description: 'Soft fluffy small dosas (3 pcs)',         price: 80,  veg: true, jainFriendly: true, tags: [],  category: 'Dosa' },
      { itemCode: 'VB11', name: 'Coconut Chutney',description: 'Fresh ground coconut chutney',            price: 20,  veg: true, jainFriendly: true, tags: [],  category: 'Sides' },
      { itemCode: 'VB12', name: 'Rava Idli',      description: 'Steamed semolina idlis',                  price: 80,  veg: true, tags: [],             category: 'Idli'      },
    ],
  },
  {
    name: 'Punjab Grill',
    cuisines: ['North Indian', 'Punjabi', 'Mughlai'],
    rating: 4.2, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 380, imageEmoji: '🫕', area: 'MG Road, Bangalore',
    menu: [
      { itemCode: 'PG01', name: 'Butter Chicken',       description: 'Tender chicken in rich tomato cream sauce', price: 360, veg: false, tags: ['bestseller'],     category: 'Main Course' },
      { itemCode: 'PG02', name: 'Paneer Butter Masala', description: 'Paneer in buttery tomato gravy',            price: 300, veg: true,  tags: ['bestseller'],     category: 'Main Course' },
      { itemCode: 'PG03', name: 'Dal Makhani',          description: 'Creamy black lentils slow-cooked',          price: 260, veg: true,  tags: [],                 category: 'Main Course' },
      { itemCode: 'PG04', name: 'Chicken Tikka',        description: 'Tandoor-marinated chicken tikka',           price: 380, veg: false, tags: ['starter','bestseller'], category: 'Starters' },
      { itemCode: 'PG05', name: 'Palak Paneer',         description: 'Paneer in smooth spinach gravy',            price: 280, veg: true,  tags: [],                 category: 'Main Course' },
      { itemCode: 'PG06', name: 'Garlic Naan',          description: 'Tandoor-baked garlic naan',                 price: 60,  veg: true,  tags: [],                 category: 'Breads'      },
      { itemCode: 'PG07', name: 'Laccha Paratha',       description: 'Layered whole wheat paratha',               price: 55,  veg: true,  tags: [],                 category: 'Breads'      },
      { itemCode: 'PG08', name: 'Tandoori Roti',        description: 'Whole wheat tandoor roti',                  price: 40,  veg: true,  tags: [],                 category: 'Breads'      },
      { itemCode: 'PG09', name: 'Mutton Rogan Josh',    description: 'Slow-cooked Kashmiri mutton',               price: 420, veg: false, tags: ['spicy'],          category: 'Main Course' },
      { itemCode: 'PG10', name: 'Veg Biryani',          description: 'Fragrant basmati with vegetables',          price: 260, veg: true,  tags: [],                 category: 'Biryani'     },
      { itemCode: 'PG11', name: 'Mango Lassi',          description: 'Sweet chilled mango yogurt drink',          price: 120, veg: true,  tags: [],                 category: 'Beverages'   },
      { itemCode: 'PG12', name: 'Gulab Jamun',          description: 'Soft dumplings in rose-sugar syrup',        price: 120, veg: true,  tags: ['dessert'],        category: 'Desserts'    },
      { itemCode: 'PG13', name: 'Shahi Paneer',         description: 'Paneer in royal cashew-cream gravy',        price: 320, veg: true,  tags: [],                 category: 'Main Course' },
      { itemCode: 'PG14', name: 'Seekh Kebab',          description: 'Minced lamb kebabs from tandoor',           price: 360, veg: false, tags: ['starter'],        category: 'Starters'    },
    ],
  },
  {
    name: "Domino's Pizza",
    cuisines: ['Pizza', 'Italian', 'Fast Food'],
    rating: 4.0, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 250, imageEmoji: '🍕', area: 'Multiple Locations, Bangalore',
    menu: [
      { itemCode: 'DP01', name: 'Margherita (Medium)',        description: 'Classic tomato sauce and mozzarella',     price: 199, veg: true,  tags: [],                  category: 'Pizza'    },
      { itemCode: 'DP02', name: 'Farmhouse (Medium)',         description: 'Capsicum, mushroom, tomato, onion',       price: 299, veg: true,  tags: ['bestseller'],      category: 'Pizza'    },
      { itemCode: 'DP03', name: 'Chicken Dominator (Medium)', description: 'Triple chicken topping pizza',            price: 399, veg: false, tags: ['bestseller'],      category: 'Pizza'    },
      { itemCode: 'DP04', name: 'Peppy Paneer (Medium)',      description: 'Paneer, capsicum, red paprika',           price: 319, veg: true,  tags: [],                  category: 'Pizza'    },
      { itemCode: 'DP05', name: 'Chicken Golden Delight',     description: 'Chicken with golden corn',                price: 349, veg: false, tags: [],                  category: 'Pizza'    },
      { itemCode: 'DP06', name: 'Cheesy Bread Sticks',        description: '8 garlic bread sticks with cheese dip',  price: 149, veg: true,  tags: ['starter'],         category: 'Sides'    },
      { itemCode: 'DP07', name: 'Pasta Italiana',             description: 'Penne in white sauce with veggies',      price: 179, veg: true,  tags: [],                  category: 'Pasta'    },
      { itemCode: 'DP08', name: 'Choco Lava Cake',            description: 'Warm chocolate lava cake (2 pcs)',       price: 99,  veg: true,  tags: ['dessert','bestseller'], category: 'Desserts' },
      { itemCode: 'DP09', name: 'Chicken Wings (6 pcs)',      description: 'Crispy wings with dip',                  price: 199, veg: false, tags: ['starter'],         category: 'Starters' },
      { itemCode: 'DP10', name: 'Stuffed Garlic Bread',       description: 'Garlic bread stuffed with cheese',       price: 149, veg: true,  tags: ['starter'],         category: 'Starters' },
      { itemCode: 'DP11', name: 'Pepsi (500ml)',              description: 'Chilled Pepsi',                          price: 60,  veg: true,  jainFriendly: true, tags: [], category: 'Beverages' },
    ],
  },
  {
    name: 'Biryani Blues',
    cuisines: ['Biryani', 'Mughlai', 'Hyderabadi'],
    rating: 4.1, deliveryTimeMin: 35,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 300, imageEmoji: '🍚', area: 'HSR Layout, Bangalore',
    menu: [
      { itemCode: 'BB01', name: 'Hyderabadi Chicken Biryani', description: 'Authentic dum-cooked biryani',           price: 340, veg: false, tags: ['bestseller','spicy'], category: 'Biryani' },
      { itemCode: 'BB02', name: 'Lucknowi Veg Biryani',       description: 'Awadhi-style fragrant veg biryani',      price: 240, veg: true,  tags: ['bestseller'],         category: 'Biryani' },
      { itemCode: 'BB03', name: 'Mutton Dum Biryani',         description: 'Slow-cooked succulent mutton biryani',   price: 420, veg: false, tags: ['spicy'],              category: 'Biryani' },
      { itemCode: 'BB04', name: 'Prawn Biryani',              description: 'Spiced prawn dum biryani',               price: 380, veg: false, tags: [],                     category: 'Biryani' },
      { itemCode: 'BB05', name: 'Paneer Biryani',             description: 'Biryani with marinated paneer',          price: 280, veg: true,  tags: [],                     category: 'Biryani' },
      { itemCode: 'BB06', name: 'Chicken Korma',              description: 'Mild creamy chicken curry',              price: 300, veg: false, tags: [],                     category: 'Curries' },
      { itemCode: 'BB07', name: 'Shami Kebab',                description: 'Minced lamb patties with mint chutney', price: 260, veg: false, tags: ['starter'],            category: 'Starters'},
      { itemCode: 'BB08', name: 'Raita',                      description: 'Chilled boondi raita',                   price: 70,  veg: true,  tags: [],                     category: 'Sides'   },
      { itemCode: 'BB09', name: 'Sheer Khurma',               description: 'Festive vermicelli milk pudding',        price: 120, veg: true,  tags: ['dessert'],            category: 'Desserts'},
      { itemCode: 'BB10', name: 'Roomali Roti',               description: 'Thin handkerchief bread',                price: 40,  veg: true,  tags: [],                     category: 'Breads'  },
      { itemCode: 'BB11', name: 'Mirchi Ka Salan',            description: 'Tangy green chilli curry',               price: 90,  veg: true,  tags: ['spicy'],              category: 'Sides'   },
      { itemCode: 'BB12', name: 'Egg Biryani',                description: 'Biryani with boiled eggs and spices',   price: 250, veg: false, tags: [],                     category: 'Biryani' },
    ],
  },
  {
    name: 'Chinese Dragon',
    cuisines: ['Chinese', 'Asian', 'Indo-Chinese'],
    rating: 3.9, deliveryTimeMin: 25,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 220, imageEmoji: '🥡', area: 'Whitefield, Bangalore',
    menu: [
      { itemCode: 'CD01', name: 'Veg Fried Rice',       description: 'Classic Chinese veg fried rice',            price: 180, veg: true,  tags: ['bestseller'],        category: 'Rice'     },
      { itemCode: 'CD02', name: 'Chicken Fried Rice',   description: 'Wok-tossed chicken fried rice',             price: 220, veg: false, tags: ['bestseller'],        category: 'Rice'     },
      { itemCode: 'CD03', name: 'Veg Noodles',          description: 'Stir-fried Hakka noodles with veggies',     price: 180, veg: true,  tags: [],                    category: 'Noodles'  },
      { itemCode: 'CD04', name: 'Chicken Noodles',      description: 'Hakka noodles with chicken',                price: 220, veg: false, tags: [],                    category: 'Noodles'  },
      { itemCode: 'CD05', name: 'Veg Manchurian Gravy', description: 'Veggie balls in spicy Manchurian sauce',    price: 200, veg: true,  tags: ['spicy','bestseller'],category: 'Starters' },
      { itemCode: 'CD06', name: 'Chilli Chicken Dry',   description: 'Crispy chicken in chilli sauce',            price: 260, veg: false, tags: ['spicy','bestseller'],category: 'Starters' },
      { itemCode: 'CD07', name: 'Spring Rolls (4 pcs)', description: 'Crispy vegetable spring rolls',             price: 160, veg: true,  tags: ['starter'],           category: 'Starters' },
      { itemCode: 'CD08', name: 'Hot and Sour Soup',    description: 'Thick tangy soup with veggies',             price: 140, veg: true,  tags: ['spicy'],             category: 'Soups'    },
      { itemCode: 'CD09', name: 'Sweet Corn Soup',      description: 'Mild creamy sweet corn soup',               price: 130, veg: true,  tags: [],                    category: 'Soups'    },
      { itemCode: 'CD10', name: 'Chicken Lollipop',     description: 'Marinated chicken drumettes, fried',        price: 300, veg: false, tags: ['starter','spicy'],   category: 'Starters' },
      { itemCode: 'CD11', name: 'Paneer Chilli Dry',    description: 'Crispy paneer in chilli garlic sauce',      price: 240, veg: true,  tags: ['spicy'],             category: 'Starters' },
      { itemCode: 'CD12', name: 'Mixed Fried Rice',     description: 'Fried rice with chicken, prawn, egg',       price: 260, veg: false, tags: [],                    category: 'Rice'     },
    ],
  },
  {
    name: 'Wrap-It-Up',
    cuisines: ['Wraps', 'Mexican', 'Healthy'],
    rating: 4.0, deliveryTimeMin: 20,
    vegFriendly: true, jainFriendly: false,
    pricePerPerson: 200, imageEmoji: '🌯', area: 'Bellandur, Bangalore',
    menu: [
      { itemCode: 'WI01', name: 'Chicken Tikka Wrap',   description: 'Grilled chicken tikka in a flour tortilla', price: 220, veg: false, tags: ['bestseller'], category: 'Wraps'     },
      { itemCode: 'WI02', name: 'Paneer Tikka Wrap',    description: 'Smoky paneer in mint chutney wrap',         price: 190, veg: true,  tags: ['bestseller'], category: 'Wraps'     },
      { itemCode: 'WI03', name: 'Mexican Bean Wrap',    description: 'Spiced beans, salsa, cheese wrap',          price: 180, veg: true,  tags: ['spicy'],      category: 'Wraps'     },
      { itemCode: 'WI04', name: 'Chicken Caesar Wrap',  description: 'Chicken, romaine, parmesan, Caesar',        price: 230, veg: false, tags: [],             category: 'Wraps'     },
      { itemCode: 'WI05', name: 'Falafel Wrap',         description: 'Crispy falafel with hummus and greens',     price: 200, veg: true,  tags: [],             category: 'Wraps'     },
      { itemCode: 'WI06', name: 'Sweet Potato Bowl',    description: 'Roasted sweet potato, quinoa, greens',      price: 210, veg: true,  tags: ['healthy'],    category: 'Bowls'     },
      { itemCode: 'WI07', name: 'Chicken Burrito Bowl', description: 'Rice, chicken, guac, salsa bowl',           price: 250, veg: false, tags: [],             category: 'Bowls'     },
      { itemCode: 'WI08', name: 'Nachos with Salsa',    description: 'Crispy nachos with tomato salsa + cheese',  price: 180, veg: true,  tags: ['starter'],    category: 'Sides'     },
      { itemCode: 'WI09', name: 'Fresh Lime Soda',      description: 'Chilled lime soda',                         price: 60,  veg: true,  jainFriendly: true, tags: [], category: 'Beverages' },
      { itemCode: 'WI10', name: 'Protein Shake',        description: 'Chocolate or vanilla protein shake',        price: 150, veg: true,  tags: ['healthy'],    category: 'Beverages' },
    ],
  },
  {
    name: 'Saravanaa Bhavan',
    cuisines: ['South Indian', 'Tamil', 'Vegetarian'],
    rating: 4.3, deliveryTimeMin: 30,
    vegFriendly: true, jainFriendly: true,
    pricePerPerson: 180, imageEmoji: '🍱', area: 'Jayanagar, Bangalore',
    menu: [
      { itemCode: 'SB01', name: 'Ghee Masala Dosa',  description: 'Dosa with potato filling and extra ghee',      price: 110, veg: true, tags: ['bestseller'],  category: 'Dosa'     },
      { itemCode: 'SB02', name: 'Mini Tiffin',        description: 'Idli, vada, pongal, sambar, 2 chutneys',       price: 150, veg: true, tags: ['bestseller'],  category: 'Combo'    },
      { itemCode: 'SB03', name: 'Poori Masala',       description: 'Fluffy pooris with spiced potato',             price: 100, veg: true, tags: [],              category: 'Poori'    },
      { itemCode: 'SB04', name: 'Onion Rava Dosa',    description: 'Crispy rava dosa with onion',                  price: 110, veg: true, tags: [],              category: 'Dosa'     },
      { itemCode: 'SB05', name: 'Meals (Unlimited)',  description: 'Rice, sambar, rasam, veggies, papad, pickle',  price: 180, veg: true, tags: ['bestseller'],  category: 'Meals'    },
      { itemCode: 'SB06', name: 'Curd Rice',          description: 'Soothing curd rice with tempering',            price: 90,  veg: true, jainFriendly: true, tags: [], category: 'Rice' },
      { itemCode: 'SB07', name: 'Bisibele Bath',      description: 'Spiced lentil rice casserole',                 price: 120, veg: true, tags: ['spicy'],       category: 'Special'  },
      { itemCode: 'SB08', name: 'Kesari',             description: 'Saffron semolina sweet',                       price: 70,  veg: true, tags: ['dessert'],     category: 'Desserts' },
      { itemCode: 'SB09', name: 'Payasam',            description: 'Vermicelli milk payasam',                      price: 80,  veg: true, tags: ['dessert'],     category: 'Desserts' },
      { itemCode: 'SB10', name: 'Filter Coffee',      description: 'Traditional South Indian filter kaapi',        price: 35,  veg: true, jainFriendly: true, tags: [], category: 'Beverages' },
      { itemCode: 'SB11', name: 'Vada (2 pcs)',       description: 'Crispy medu vada',                             price: 70,  veg: true, tags: [],              category: 'Starters' },
      { itemCode: 'SB12', name: 'Sambar Rice',        description: 'Plain rice with piping hot sambar',            price: 100, veg: true, tags: [],              category: 'Rice'     },
    ],
  },
  {
    name: 'The Egg Factory',
    cuisines: ['Breakfast', 'Eggs', 'Continental', 'Cafe'],
    rating: 4.2, deliveryTimeMin: 25,
    vegFriendly: false, jainFriendly: false,
    pricePerPerson: 240, imageEmoji: '🍳', area: 'Lavelle Road, Bangalore',
    menu: [
      { itemCode: 'EF01', name: 'Eggs Benedict',        description: 'Poached eggs on English muffin with hollandaise', price: 280, veg: false, tags: ['bestseller'], category: 'Eggs'      },
      { itemCode: 'EF02', name: 'Masala Omelette',      description: 'Fluffy omelette with onion, tomato, chilli',      price: 180, veg: false, tags: ['bestseller','spicy'], category: 'Eggs' },
      { itemCode: 'EF03', name: 'Shakshuka',            description: 'Eggs poached in spiced tomato sauce',             price: 240, veg: false, tags: ['spicy'],      category: 'Eggs'      },
      { itemCode: 'EF04', name: 'Avocado Toast',        description: 'Sourdough with smashed avocado and egg',          price: 260, veg: false, tags: [],             category: 'Toast'     },
      { itemCode: 'EF05', name: 'Scrambled Eggs',       description: 'Soft scrambled eggs with toast and butter',       price: 180, veg: false, tags: [],             category: 'Eggs'      },
      { itemCode: 'EF06', name: 'Full English Breakfast',description: 'Eggs, bacon, sausage, beans, toast',             price: 380, veg: false, tags: ['bestseller'], category: 'Combo'     },
      { itemCode: 'EF07', name: 'Pancakes (3 pcs)',     description: 'Fluffy pancakes with maple syrup',                price: 220, veg: false, tags: ['dessert'],    category: 'Pancakes'  },
      { itemCode: 'EF08', name: 'Cold Coffee',          description: 'Creamy iced cold coffee',                         price: 140, veg: false, tags: [],             category: 'Beverages' },
      { itemCode: 'EF09', name: 'Fresh Orange Juice',   description: 'Freshly squeezed OJ',                            price: 120, veg: false, tags: [],             category: 'Beverages' },
      { itemCode: 'EF10', name: 'Egg Fried Rice',       description: 'Indo-Chinese egg fried rice',                     price: 200, veg: false, tags: [],             category: 'Rice'      },
    ],
  },
];

// ── Coupon data ────────────────────────────────────────────────────────────
const couponData = [
  { code: 'FLAT100',   description: 'Flat Rs.100 off on orders above Rs.500',         discountType: 'flat',    value: 100, minOrderValue: 500,  maxDiscount: null },
  { code: 'FLAT150',   description: 'Flat Rs.150 off on orders above Rs.800',         discountType: 'flat',    value: 150, minOrderValue: 800,  maxDiscount: null },
  { code: 'FLAT200',   description: 'Flat Rs.200 off on orders above Rs.1200',        discountType: 'flat',    value: 200, minOrderValue: 1200, maxDiscount: null },
  { code: 'SAVE10',    description: '10% off on your order (up to Rs.100)',            discountType: 'percent', value: 10,  minOrderValue: 300,  maxDiscount: 100  },
  { code: 'SAVE20',    description: '20% off on orders above Rs.600 (up to Rs.200)',  discountType: 'percent', value: 20,  minOrderValue: 600,  maxDiscount: 200  },
  { code: 'SAVE15',    description: '15% off on orders above Rs.400 (up to Rs.150)',  discountType: 'percent', value: 15,  minOrderValue: 400,  maxDiscount: 150  },
  { code: 'LUNCH50',   description: 'Flat Rs.50 off on any lunch order',              discountType: 'flat',    value: 50,  minOrderValue: 0,    maxDiscount: null },
  { code: 'GROUPSAVE', description: 'Flat Rs.250 off on group orders above Rs.1500', discountType: 'flat',    value: 250, minOrderValue: 1500, maxDiscount: null },
];

// ── Seed runner ────────────────────────────────────────────────────────────
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected');

    // Sync tables (create if not exists, alter if changed)
    await sequelize.sync({ force: true }); // force: true drops & recreates for clean seed
    console.log('✅ Tables created');

    // Clear and re-insert restaurants + menu items
    for (const r of restaurantData) {
      const { menu, ...restaurantFields } = r;

      const restaurant = await Restaurant.create(restaurantFields);

      const menuItems = menu.map((item) => ({
        ...item,
        restaurantId: restaurant.id,
        jainFriendly: item.jainFriendly || false,
        tags: item.tags || [],
      }));

      await MenuItem.bulkCreate(menuItems);
      console.log(`   🍽️  ${restaurant.name} — ${menu.length} menu items`);
    }

    // Insert coupons
    await Coupon.bulkCreate(couponData);
    console.log(`\n✅ Inserted ${restaurantData.length} restaurants`);
    console.log(`✅ Inserted ${couponData.length} coupons`);
    console.log('   🎟️  Codes:', couponData.map((c) => c.code).join(', '));
    console.log('\n🎉 Seed complete!');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
