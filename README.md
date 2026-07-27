# RecipeNest

RecipeNest is a full-stack recipe and meal-planning app built with **Expo / React Native** and an **Express + PostgreSQL** backend. It goes beyond a simple recipe browser — users can track pantry ingredients, get ingredient-matched recipe suggestions, plan a full week of meals, auto-generate a shopping list, and cook with a guided step-by-step mode.

<!-- Add a few screenshots or a short screen recording here before sharing -->

## Features

### Discover & Search
- Browse recipes by category with live data from TheMealDB
- Search recipes by name or ingredient with debounced queries
- Personalized greeting and a rotating featured recipe

### Smart Pantry
- Save ingredients you have on hand (quick-select chips or custom entries)
- Get recipe recommendations ranked by how many pantry ingredients match
- Recommendations respect a saved vegetarian/vegan preference

### Weekly Meal Planner
- Plan breakfast, lunch, and dinner across all seven days
- Add any recipe to a day directly from its detail page
- Swap or remove planned meals at any time

### Smart Shopping List
- Auto-generate a shopping list from the current week's plan
- Ingredients already in the pantry are excluded automatically
- Add custom items and check them off as you shop

### Guided Cooking Mode
- Step-by-step instructions with progress tracking
- Built-in 5/10/15-minute timers you can pause, resume, or clear
- Completing a recipe updates your cooking stats and streak

### Profile & Journey
- Clerk-authenticated profile with diet and skill-level preferences
- Cooking streak tracking, with progress bars toward recipes-cooked, streak, and saved-collection goals

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Mobile         | Expo, React Native, Expo Router |
| Auth           | Clerk |
| Backend        | Node.js, Express |
| Database       | PostgreSQL (Neon), Drizzle ORM |
| Recipe data    | TheMealDB API |
| Local storage  | Expo SecureStore (native) / localStorage (web) |

## Project Structure

```text
RecipeNest/
├── backend/    Express API, Drizzle ORM, PostgreSQL migrations
└── mobile/     Expo Router React Native application
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # Windows: Copy-Item .env.example .env
```

Add your PostgreSQL connection string to `backend/.env`, then run:

```bash
npm run db:migrate
npm run dev
```

The API runs at `http://localhost:5001/api` by default.

### 2. Mobile app

```bash
cd mobile
npm install
cp .env.example .env   # Windows: Copy-Item .env.example .env
```

Set the following in `mobile/.env`:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api   # Android emulator
```

> On a physical device, replace the API URL with your computer's LAN IP (e.g. `http://192.168.1.10:5001/api`) — `localhost` refers to the phone itself, not your dev machine.

```bash
npx expo start -c
```

## Testing

Unit tests cover the pure, logic-heavy modules (`utils/ingredients.js` and
`services/recipeStore.js`) using Node's built-in test runner:

```bash
cd mobile
npm test
```

**Known limitation surfaced by these tests:** `ingredientMatches` treats a
plain pantry item (e.g. "milk") as satisfying a recipe's need for a
distinctly different processed form of it (e.g. "coconut milk"), because the
product-form guard only blocks a match when the product-form word is
*missing* from the pantry - it doesn't fire when the pantry item and the
product-form word happen to be the same term. The same pattern likely
affects other `PRODUCT_FORM_WORDS` entries that are also plausible standalone
pantry items (e.g. "cheese", "cream").

## Design Notes

- Favorites, pantry, meal plan, and cooking stats are stored locally per signed-in user first, and sync to the backend when it's reachable — the app stays usable offline.
- Requests are debounced and guarded against stale responses while typing in search.
- Weekly plans are split into smaller per-day records to keep local storage reliable.

## License

ISC
