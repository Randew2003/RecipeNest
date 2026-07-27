import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

// Shared by any screen that needs to default a day-of-week picker to today
// (Planner, Recipe detail's "add to plan" picker).
export const getInitialDay = () => {
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return DAYS.includes(day) ? day : DAYS[0];
};

const DEFAULT_PREFERENCES = {
  diet: "No preference",
  cookingLevel: "Beginner",
  maxCookingTime: "30 minutes",
};

const safeUserId = (userId) => String(userId || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
const keyFor = (userId, name) => `recipenest_${safeUserId(userId)}_${name}`;

const getStoredItem = async (key) => {
  if (Platform.OS === "web" && globalThis?.localStorage) {
    return globalThis.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const setStoredItem = async (key, value) => {
  if (Platform.OS === "web" && globalThis?.localStorage) {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const readJson = async (key, fallback) => {
  try {
    const value = await getStoredItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = async (key, value) => {
  await setStoredItem(key, JSON.stringify(value));
  return value;
};

const normalizeText = (value) => String(value || "").trim();

const normalizeCount = (value) => {
  const count = Number.parseInt(value, 10);
  return Number.isInteger(count) && count >= 0 ? Math.min(count, 200) : 0;
};

const normalizeFavorite = (favorite) => {
  const recipeId = normalizeText(favorite?.recipeId ?? favorite?.id);
  const title = normalizeText(favorite?.title).slice(0, 200);
  if (!recipeId || !title) return null;

  return {
    recipeId,
    id: recipeId,
    title,
    image: normalizeText(favorite?.image).slice(0, 1000) || null,
    ingredientCount: normalizeCount(favorite?.ingredientCount),
    stepCount: normalizeCount(favorite?.stepCount),
    category: normalizeText(favorite?.category).slice(0, 80) || "Saved recipe",
    savedAt: normalizeText(favorite?.savedAt) || new Date().toISOString(),
  };
};

export const createEmptyMealPlan = () =>
  DAYS.reduce((plan, day) => {
    plan[day] = MEAL_TYPES.reduce((slots, mealType) => {
      slots[mealType] = null;
      return slots;
    }, {});
    return plan;
  }, {});

const normalizePlan = (value) => {
  const emptyPlan = createEmptyMealPlan();
  if (!value || typeof value !== "object") return emptyPlan;

  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((mealType) => {
      const recipe = value?.[day]?.[mealType];
      if (recipe?.id && recipe?.title) {
        emptyPlan[day][mealType] = {
          id: String(recipe.id),
          title: normalizeText(recipe.title).slice(0, 120),
          image: normalizeText(recipe.image).slice(0, 1000) || null,
          category: normalizeText(recipe.category).slice(0, 80) || "Recipe",
        };
      }
    });
  });

  return emptyPlan;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const dayDifference = (fromDate, toDate) => {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

export const RecipeStore = {
  async getPantry(userId) {
    const items = await readJson(keyFor(userId, "pantry"), []);
    if (!Array.isArray(items)) return [];
    return items.map(normalizeText).filter(Boolean).slice(0, 30);
  },

  async setPantry(userId, items) {
    const unique = [];
    const seen = new Set();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const cleaned = normalizeText(item).slice(0, 40);
      const normalized = cleaned.toLowerCase();
      if (cleaned && !seen.has(normalized) && unique.length < 30) {
        seen.add(normalized);
        unique.push(cleaned);
      }
    });

    return writeJson(keyFor(userId, "pantry"), unique);
  },

  async getMealPlan(userId) {
    const dayValues = await Promise.all(
      DAYS.map((day) => readJson(keyFor(userId, `meal_plan_${day.toLowerCase()}`), {})),
    );
    const plan = DAYS.reduce((result, day, index) => {
      result[day] = dayValues[index];
      return result;
    }, {});
    return normalizePlan(plan);
  },

  async saveMealPlan(userId, plan) {
    const normalized = normalizePlan(plan);
    await Promise.all(
      DAYS.map((day) =>
        writeJson(keyFor(userId, `meal_plan_${day.toLowerCase()}`), normalized[day]),
      ),
    );
    return normalized;
  },

  async addMeal(userId, day, mealType, recipe) {
    if (!DAYS.includes(day) || !MEAL_TYPES.includes(mealType) || !recipe?.id || !recipe?.title) {
      throw new Error("Invalid meal plan selection.");
    }

    const plan = await RecipeStore.getMealPlan(userId);
    plan[day][mealType] = {
      id: String(recipe.id),
      title: normalizeText(recipe.title).slice(0, 120),
      image: normalizeText(recipe.image).slice(0, 1000) || null,
      category: normalizeText(recipe.category).slice(0, 80) || "Recipe",
    };
    return RecipeStore.saveMealPlan(userId, plan);
  },

  async removeMeal(userId, day, mealType) {
    const plan = await RecipeStore.getMealPlan(userId);
    if (plan?.[day] && Object.prototype.hasOwnProperty.call(plan[day], mealType)) {
      plan[day][mealType] = null;
    }
    return RecipeStore.saveMealPlan(userId, plan);
  },

  async clearMealPlan(userId) {
    return RecipeStore.saveMealPlan(userId, createEmptyMealPlan());
  },

  async getShoppingChecks(userId) {
    const value = await readJson(keyFor(userId, "shopping_checks"), {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  },

  async setShoppingChecks(userId, checks) {
    const cleaned = Object.entries(checks || {}).reduce((result, [key, checked]) => {
      const normalizedKey = normalizeText(key).toLowerCase().slice(0, 80);
      if (normalizedKey && checked) result[normalizedKey] = true;
      return result;
    }, {});
    return writeJson(keyFor(userId, "shopping_checks"), cleaned);
  },

  async getCustomShoppingItems(userId) {
    const items = await readJson(keyFor(userId, "shopping_custom"), []);
    return Array.isArray(items) ? items.map(normalizeText).filter(Boolean).slice(0, 30) : [];
  },

  async setCustomShoppingItems(userId, items) {
    const unique = Array.from(
      new Map(
        (Array.isArray(items) ? items : [])
          .map((item) => normalizeText(item).slice(0, 60))
          .filter(Boolean)
          .map((item) => [item.toLowerCase(), item]),
      ).values(),
    ).slice(0, 30);
    return writeJson(keyFor(userId, "shopping_custom"), unique);
  },

  async getGeneratedShoppingItems(userId) {
    const items = await readJson(keyFor(userId, "shopping_generated"), []);
    return Array.isArray(items) ? items.map(normalizeText).filter(Boolean).slice(0, 100) : [];
  },

  async setGeneratedShoppingItems(userId, items) {
    const unique = Array.from(
      new Map(
        (Array.isArray(items) ? items : [])
          .map((item) => normalizeText(item).slice(0, 80))
          .filter(Boolean)
          .map((item) => [item.toLowerCase(), item]),
      ).values(),
    ).slice(0, 100);
    return writeJson(keyFor(userId, "shopping_generated"), unique);
  },

  async isFavoriteSyncPending(userId) {
    return Boolean(await readJson(keyFor(userId, "favorites_sync_pending"), false));
  },

  async setFavoriteSyncPending(userId, pending) {
    return writeJson(keyFor(userId, "favorites_sync_pending"), Boolean(pending));
  },

  async isFavoritesInitialized(userId) {
    return Boolean(await readJson(keyFor(userId, "favorites_initialized"), false));
  },

  async setFavoritesInitialized(userId, initialized = true) {
    return writeJson(keyFor(userId, "favorites_initialized"), Boolean(initialized));
  },

  async getFavorites(userId) {
    const favorites = await readJson(keyFor(userId, "favorites"), []);
    if (!Array.isArray(favorites)) return [];
    return favorites.map(normalizeFavorite).filter(Boolean).slice(0, 100);
  },

  async setFavorites(userId, favorites) {
    const unique = new Map();
    (Array.isArray(favorites) ? favorites : []).forEach((favorite) => {
      const normalized = normalizeFavorite(favorite);
      if (normalized && !unique.has(normalized.recipeId)) {
        unique.set(normalized.recipeId, normalized);
      }
    });
    return writeJson(keyFor(userId, "favorites"), Array.from(unique.values()).slice(0, 100));
  },

  async upsertFavorite(userId, favorite) {
    const normalized = normalizeFavorite(favorite);
    if (!normalized) throw new Error("Invalid favorite recipe.");
    const favorites = await RecipeStore.getFavorites(userId);
    const next = [normalized, ...favorites.filter((item) => item.recipeId !== normalized.recipeId)];
    return RecipeStore.setFavorites(userId, next);
  },

  async removeFavorite(userId, recipeId) {
    const id = normalizeText(recipeId);
    const favorites = await RecipeStore.getFavorites(userId);
    return RecipeStore.setFavorites(
      userId,
      favorites.filter((favorite) => favorite.recipeId !== id),
    );
  },

  async getPreferences(userId) {
    const value = await readJson(keyFor(userId, "preferences"), DEFAULT_PREFERENCES);
    return { ...DEFAULT_PREFERENCES, ...(value || {}) };
  },

  async setPreferences(userId, preferences) {
    const value = {
      ...DEFAULT_PREFERENCES,
      ...(preferences || {}),
    };
    return writeJson(keyFor(userId, "preferences"), value);
  },

  async getCookingStats(userId) {
    const stats = await readJson(keyFor(userId, "cooking_stats"), null);
    return {
      cookedCount: Number.isInteger(stats?.cookedCount) ? stats.cookedCount : 0,
      streak: Number.isInteger(stats?.streak) ? stats.streak : 0,
      lastCookedDate: normalizeText(stats?.lastCookedDate) || null,
      cookedRecipeIds: Array.isArray(stats?.cookedRecipeIds)
        ? stats.cookedRecipeIds.map(String).slice(-100)
        : [],
    };
  },

  async markRecipeCooked(userId, recipeId) {
    const stats = await RecipeStore.getCookingStats(userId);
    const today = getTodayKey();
    const difference = stats.lastCookedDate ? dayDifference(stats.lastCookedDate, today) : null;

    if (difference === 1) stats.streak += 1;
    else if (difference === null || difference > 1) stats.streak = 1;

    if (stats.lastCookedDate !== today) {
      stats.cookedCount += 1;
      stats.lastCookedDate = today;
    }

    const recipeIdText = String(recipeId || "");
    if (recipeIdText && !stats.cookedRecipeIds.includes(recipeIdText)) {
      stats.cookedRecipeIds = [...stats.cookedRecipeIds, recipeIdText].slice(-100);
    }

    return writeJson(keyFor(userId, "cooking_stats"), stats);
  },
};
