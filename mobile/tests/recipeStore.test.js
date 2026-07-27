const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

// recipeStore.js imports "expo-secure-store" and "react-native", neither of
// which exist outside an Expo app. We intercept those two specifiers with
// small in-memory fakes so the *real* recipeStore.js logic (validation,
// dedup, limits, streak math) runs unmodified against them.
const memoryStore = new Map();

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "expo-secure-store") {
    return {
      getItemAsync: async (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
      setItemAsync: async (key, value) => {
        memoryStore.set(key, value);
      },
    };
  }
  if (request === "react-native") {
    return { Platform: { OS: "ios" } };
  }
  return originalLoad.apply(this, arguments);
};

const { RecipeStore, DAYS, MEAL_TYPES, createEmptyMealPlan } = require("../services/recipeStore.js");

test("getPantry/setPantry: dedupes case-insensitively and caps at 30 items", async () => {
  const userId = "user-pantry-1";
  const items = Array.from({ length: 35 }, (_, index) => `Ingredient ${index}`);
  items.push("Ingredient 0"); // duplicate, different case handled below
  items.push("ingredient 1"); // duplicate, different case

  await RecipeStore.setPantry(userId, items);
  const saved = await RecipeStore.getPantry(userId);

  assert.ok(saved.length <= 30, "pantry should be capped at 30 items");
  const lowerCased = saved.map((item) => item.toLowerCase());
  assert.equal(new Set(lowerCased).size, lowerCased.length, "no duplicate ingredients");
});

test("upsertFavorite/getFavorites: adding the same recipe twice keeps one entry, moved to front", async () => {
  const userId = "user-fav-1";
  await RecipeStore.upsertFavorite(userId, { id: "10", title: "Pasta" });
  await RecipeStore.upsertFavorite(userId, { id: "20", title: "Soup" });
  await RecipeStore.upsertFavorite(userId, { id: "10", title: "Pasta (updated)" });

  const favorites = await RecipeStore.getFavorites(userId);
  assert.equal(favorites.length, 2);
  assert.equal(favorites[0].recipeId, "10");
  assert.equal(favorites[0].title, "Pasta (updated)");
});

test("upsertFavorite: rejects a favorite with no id/title", async () => {
  await assert.rejects(() => RecipeStore.upsertFavorite("user-fav-2", { id: "", title: "" }));
});

test("addMeal/getMealPlan: stores a recipe in the correct day/meal slot only", async () => {
  const userId = "user-plan-1";
  await RecipeStore.addMeal(userId, "Monday", "Dinner", { id: "5", title: "Curry" });

  const plan = await RecipeStore.getMealPlan(userId);
  assert.equal(plan.Monday.Dinner.title, "Curry");
  assert.equal(plan.Monday.Breakfast, null);
  assert.equal(plan.Tuesday.Dinner, null);

  // Every day/meal-type slot should exist even though only one was set.
  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((mealType) => {
      assert.ok(Object.prototype.hasOwnProperty.call(plan[day], mealType));
    });
  });
});

test("addMeal: rejects an invalid day or meal type", async () => {
  await assert.rejects(() =>
    RecipeStore.addMeal("user-plan-2", "Someday", "Dinner", { id: "1", title: "X" }),
  );
  await assert.rejects(() =>
    RecipeStore.addMeal("user-plan-2", "Monday", "Brunch", { id: "1", title: "X" }),
  );
});

test("removeMeal: clears only the targeted slot", async () => {
  const userId = "user-plan-3";
  await RecipeStore.addMeal(userId, "Friday", "Lunch", { id: "7", title: "Tacos" });
  await RecipeStore.removeMeal(userId, "Friday", "Lunch");

  const plan = await RecipeStore.getMealPlan(userId);
  assert.equal(plan.Friday.Lunch, null);
});

test("createEmptyMealPlan: has every day and meal type set to null", () => {
  const plan = createEmptyMealPlan();
  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((mealType) => {
      assert.equal(plan[day][mealType], null);
    });
  });
});

test("markRecipeCooked: first cook sets count to 1 and streak to 1", async () => {
  const userId = "user-stats-1";
  await RecipeStore.markRecipeCooked(userId, "recipe-1");
  const stats = await RecipeStore.getCookingStats(userId);

  assert.equal(stats.cookedCount, 1);
  assert.equal(stats.streak, 1);
  assert.deepEqual(stats.cookedRecipeIds, ["recipe-1"]);
});

test("markRecipeCooked: cooking again the same day does not double-count", async () => {
  const userId = "user-stats-2";
  await RecipeStore.markRecipeCooked(userId, "recipe-1");
  await RecipeStore.markRecipeCooked(userId, "recipe-2");
  const stats = await RecipeStore.getCookingStats(userId);

  // Same calendar day both times, so cookedCount should still be 1, but both
  // recipe ids should be recorded.
  assert.equal(stats.cookedCount, 1);
  assert.equal(stats.streak, 1);
  assert.deepEqual(stats.cookedRecipeIds, ["recipe-1", "recipe-2"]);
});

test("getPreferences: falls back to defaults for a brand-new user", async () => {
  const preferences = await RecipeStore.getPreferences("user-never-seen-before");
  assert.equal(preferences.diet, "No preference");
  assert.equal(preferences.cookingLevel, "Beginner");
});
