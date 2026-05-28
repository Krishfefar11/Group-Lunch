# 🍱 Group Lunch

> An AI-powered group food ordering platform — decide where to eat together, order individually, pay together.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203-orange)](https://console.groq.com)
[![MySQL](https://img.shields.io/badge/Database-MySQL-blue?logo=mysql)](https://mysql.com)

---

## ✨ What It Does

Organising a group lunch is painful — everyone has different preferences, budgets and dietary needs. Group Lunch solves this in a few taps:

1. **Organizer creates a session** → shares a link with the team
2. **Everyone submits preferences** (cuisine, diet, budget) — or tells the AI chatbot in plain English
3. **AI recommends real restaurants** near your city, ranked by group compatibility
4. **Everyone picks their own items** from the menu
5. **One shared cart** → coupon applied → Razorpay payment

---

## 🤖 AI Features

| Feature | How It Works |
|---|---|
| **Restaurant Recommendations** | Groq LLaMA 3 ranks real restaurants for your city against every member's preferences |
| **Real Restaurants by City** | Foursquare Places API → OpenStreetMap fallback → Groq AI generation (always works) |
| **Authentic Menus** | Groq generates real Indian dish names per restaurant (Butter Chicken, Dal Makhani, etc.) |
| **AI Chat Bot** | Natural language preference input — *"I'm vegan, no spicy, under ₹200"* auto-fills the form |
| **Menu Suggestions** | Personalised dish picks per member using past order history |
| **Past Order Memory** | Cross-session learning — remembers what you've ordered before |

---

## 🛠️ Tech Stack

### Backend
| Package | Purpose |
|---|---|
| **Express.js** | REST API server |
| **Sequelize + MySQL** | ORM + relational database |
| **Socket.io** | Real-time session updates |
| **Groq SDK** | LLaMA 3.3 70B for all AI features |
| **Razorpay** | Payment gateway |
| **Cloudinary** | Restaurant image storage |
| **UUID** | Unique session & member IDs |

### Frontend
| Package | Purpose |
|---|---|
| **React 19** | UI framework |
| **React Router v7** | Client-side routing |
| **Axios** | API calls |
| **Socket.io-client** | Real-time updates |
| **Webpack 5** | Bundler |

### External APIs
| API | Purpose | Free Tier |
|---|---|---|
| **Groq** | All AI features | Free at console.groq.com |
| **Foursquare Places** | Real restaurant discovery | 1000 calls/day |
| **OpenStreetMap** | Restaurant fallback | Unlimited, no key |
| **TheMealDB** | Real dish data | Free, no key |
| **Razorpay** | Payments | Test mode free |
| **Cloudinary** | Image CDN | 25GB free |

---

## 📁 Project Structure

```
group-lunch/
├── client/                    # React frontend
│   ├── src/
│   │   ├── api/api.js         # All API calls
│   │   ├── components/
│   │   │   └── ChatBot.jsx    # AI chat widget (global)
│   │   ├── design-system/
│   │   │   └── tokens.js      # Design tokens (colours, fonts)
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── CreateSession.jsx
│   │       ├── JoinSession.jsx
│   │       ├── PreferenceForm.jsx
│   │       ├── RestaurantPicker.jsx
│   │       ├── MenuView.jsx
│   │       ├── CartView.jsx
│   │       ├── FinalReview.jsx
│   │       ├── TrackingPage.jsx
│   │       └── AdminPanel.jsx
│   └── webpack.config.js
│
└── server/                    # Express backend
    ├── ai/
    │   └── recommend.js       # Groq restaurant ranking
    ├── models/                # Sequelize models
    ├── routes/
    │   ├── sessions.js        # Session CRUD
    │   ├── preferences.js     # Member preferences
    │   ├── recommend.js       # AI recommendations + restaurant selection
    │   ├── orders.js          # Menu ordering
    │   ├── coupons.js         # Discount codes
    │   ├── payment.js         # Razorpay integration
    │   ├── chat.js            # AI chat bot
    │   ├── suggestions.js     # Personalised menu suggestions
    │   └── admin.js           # Admin dashboard API
    ├── services/
    │   ├── places.js          # Foursquare + OSM + Groq restaurant fetch
    │   └── mealdb.js          # TheMealDB + Groq menu generation
    ├── migrations/            # Sequelize migrations
    └── server.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+
- A [Groq API key](https://console.groq.com) (free)

### 1. Clone the repo
```bash
git clone git@github.com:Krishfefar11/Group-Lunch.git
cd Group-Lunch
```

### 2. Set up the server
```bash
cd server
npm install
cp .env.example .env
```

Fill in your `.env`:
```env
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

GROQ_API_KEY=your_groq_key          # Required — get free at console.groq.com
FOURSQUARE_API_KEY=your_fsq_key     # Optional — improves restaurant photos

DB_HOST=localhost
DB_PORT=3306
DB_NAME=group_lunch
DB_USER=root
DB_PASS=your_mysql_password

RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_UPLOAD_PRESET=xxx
```

### 3. Create the database
```bash
mysql -u root -p -e "CREATE DATABASE group_lunch;"
```

### 4. Start the server
```bash
npm run dev       # nodemon (auto-restart on changes)
# or
npm start         # plain node
```

Tables are auto-created on first run.

### 5. Set up the client
```bash
cd ../client
npm install
npm start         # webpack-dev-server at http://localhost:3000
```

---

## 🔑 API Keys Guide

| Key | Where to get it | Required? |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → Create API Key | **Yes** |
| `FOURSQUARE_API_KEY` | [developer.foursquare.com](https://developer.foursquare.com) → Places API | No (Groq fallback works) |
| `RAZORPAY_KEY_ID/SECRET` | [razorpay.com](https://razorpay.com) → Test mode | For payments |
| `CLOUDINARY_*` | [cloudinary.com](https://cloudinary.com) → Dashboard | For image uploads |

> **Note:** If Foursquare is not configured, restaurant discovery falls back to Groq AI which generates realistic restaurant names with real areas for any Indian city.

---

## 📡 API Reference

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session (pass `organizerName`, `deliveryCity`) |
| `GET` | `/api/sessions/:id` | Get session + members |
| `POST` | `/api/sessions/:id/join` | Join a session |

### Preferences
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/preferences` | Submit member preferences |
| `GET` | `/api/sessions/:id/preferences` | Get all preferences |

### Recommendations
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/recommend` | AI restaurant recommendations |
| `PATCH` | `/api/sessions/:id/restaurant` | Organizer selects restaurant |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/restaurants/:id/menu` | Get restaurant menu |
| `POST` | `/api/sessions/:id/members/:memberId/order` | Submit order |
| `GET` | `/api/sessions/:id/cart` | Get shared cart |

### AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/chat` | AI chat bot |
| `GET` | `/api/sessions/:id/menu/suggestions` | Personalised dish suggestions |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | All sessions, stats, revenue |

---

## 🗄️ Database Schema

```
sessions          → core session state + city + coupon + status
session_members   → who joined, order confirmed?
preferences       → cuisine, diet, budget per member
restaurants       → cached from Foursquare/OSM/Groq + placeId + photoUrl
menu_items        → real dishes from TheMealDB or Groq per restaurant
orders            → per-member order with subtotal
order_items       → individual line items
coupons           → discount codes
```

---

## 🧭 App Flow

```
Home → Create Session (enter name + city)
     → Share link with team
     → Each member joins → fills Preferences (or uses AI chatbot)
     → AI recommends top 3 real restaurants for your city
     → Organizer picks one
     → Everyone picks menu items (AI suggests personalised dishes)
     → Shared cart → Apply coupon → Razorpay payment
     → Order tracking
```

---

## 🛠️ Admin Dashboard

Visit `/admin` to see:
- Total sessions, active sessions, orders placed, revenue
- Every group with their restaurant, preferences, ordered items
- Search and filter by status
- Auto-refreshes every 20 seconds

---

## 🚢 Deployment

| Service | Purpose | Recommendation |
|---|---|---|
| **Vercel** | Frontend | Free, instant deploys |
| **Railway** | Backend + MySQL | Free tier, easy setup |
| **PlanetScale** | MySQL (production) | 5GB free, scales well |

Key changes for deployment:
1. Set `NODE_ENV=production` on Railway
2. Set `REACT_APP_API_URL=https://your-backend.railway.app` on Vercel
3. Run `npm run db:migrate` on first deploy
4. Switch Razorpay to live keys

---

## 📜 License

MIT — free to use, modify and distribute.

---

<p align="center">Built with ☕ and a lot of group lunch debates</p>
