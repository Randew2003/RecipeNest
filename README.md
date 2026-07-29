# RecipeNest

RecipeNest is a full-stack recipe and meal-planning app built with **Expo / React Native** and an **Express + PostgreSQL** backend. It goes beyond a simple recipe browser — users can track pantry ingredients, get ingredient-matched recipe suggestions, plan a full week of meals, auto-generate a shopping list, and cook with a guided step-by-step mode.


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

Create a file named `.env` inside the `backend` folder:

```env
DATABASE_URL=your_postgresql_connection_string
PORT=5001
NODE_ENV=development
CORS_ORIGINS=*
```
Add your PostgreSQL connection string to `backend/.env`, then run:

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```
The API runs at `http://localhost:5001/api` by default.



### 2. Mobile app 

Create a file named `.env` inside the `mobile` folder:
Set the following in `mobile/.env`:

```env

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# Choose ONE API URL that matches how you run the app:
# Android emulator: http://10.0.2.2:5001/api
# Physical phone:   http://YOUR_COMPUTER_LAN_IP:5001/api
# Deployed backend: https://YOUR_BACKEND_DOMAIN/api
# Do not use 127.0.0.1 or localhost on a physical phone.

EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api 

```

Then run:

```bash
cd mobile
npm install
npx expo start -c
```



## Testing 

Unit tests cover the pure, logic-heavy modules (`utils/ingredients.js` and
`services/recipeStore.js`) using Node's built-in test runner:

```bash
cd mobile
npm test
```



## Design and Implementation Notes

- User-specific favorites, pantry ingredients, meal plans, preferences, and cooking statistics are stored locally.
- Supported information synchronizes with the backend when the API is available.
- Local-first storage allows important parts of the application to remain usable when the network is unavailable.
- Search requests are debounced to reduce unnecessary API calls.
- Stale search responses are prevented from replacing newer results.
- Weekly meal plans are stored as smaller daily records to improve local-storage reliability.
- User data is separated using the authenticated Clerk user ID.
