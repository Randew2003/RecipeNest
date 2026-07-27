import { requestJson } from "./http.js";

const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

let ingredientCatalogCache = null;
let ingredientCatalogRequest = null;

const getMeals = async (endpoint) => {
  const data = await requestJson(`${BASE_URL}/${endpoint}`);
  return data?.meals || [];
};

const buildInstructions = (value) => {
  if (!value?.trim()) return [];

  const paragraphs = value
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((step) => step.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  return value
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((step) => step.trim())
    .filter((step) => step.length > 3);
};

export const MealAPI = {
  async searchMealsByName(query) {
    return getMeals(`search.php?s=${encodeURIComponent(query.trim())}`);
  },

  async getMealsByFirstLetter(letter = "a") {
    return getMeals(`search.php?f=${encodeURIComponent(letter.toLowerCase().slice(0, 1))}`);
  },

  async getMealById(id) {
    const meals = await getMeals(`lookup.php?i=${encodeURIComponent(id)}`);
    return meals[0] || null;
  },

  async getRandomMeal() {
    const meals = await getMeals("random.php");
    return meals[0] || null;
  },

  async getRandomMeals(count = 6) {
    const results = await Promise.allSettled(
      Array.from({ length: count }, () => MealAPI.getRandomMeal()),
    );

    const uniqueMeals = new Map();
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        uniqueMeals.set(result.value.idMeal, result.value);
      }
    });

    return Array.from(uniqueMeals.values());
  },

  async getCategories() {
    const data = await requestJson(`${BASE_URL}/categories.php`);
    return data?.categories || [];
  },

  async getIngredients({ forceRefresh = false } = {}) {
    if (!forceRefresh && ingredientCatalogCache) return ingredientCatalogCache;
    if (!forceRefresh && ingredientCatalogRequest) return ingredientCatalogRequest;

    ingredientCatalogRequest = requestJson(`${BASE_URL}/list.php?i=list`)
      .then((data) => {
        const ingredients = (data?.meals || [])
          .map((item) => ({
            id: String(item?.idIngredient || "").trim(),
            name: String(item?.strIngredient || "").trim(),
          }))
          .filter((item) => item.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        ingredientCatalogCache = ingredients;
        return ingredients;
      })
      .finally(() => {
        ingredientCatalogRequest = null;
      });

    return ingredientCatalogRequest;
  },

  async filterByIngredient(ingredient) {
    return getMeals(`filter.php?i=${encodeURIComponent(ingredient.trim())}`);
  },

  async filterByCategory(category) {
    return getMeals(`filter.php?c=${encodeURIComponent(category)}`);
  },

  transformMealData(meal) {
    if (!meal?.idMeal || !meal?.strMeal) return null;

    const ingredients = [];
    const ingredientDetails = [];
    for (let index = 1; index <= 20; index += 1) {
      const ingredient = meal[`strIngredient${index}`]?.trim();
      const measure = meal[`strMeasure${index}`]?.trim();

      if (ingredient) {
        const display = measure ? `${measure} ${ingredient}` : ingredient;
        ingredients.push(display);
        ingredientDetails.push({ name: ingredient, measure: measure || "", display });
      }
    }

    const instructions = buildInstructions(meal.strInstructions);
    const instructionText = meal.strInstructions?.trim();
    const description = instructionText
      ? `${instructionText.slice(0, 115)}${instructionText.length > 115 ? "…" : ""}`
      : `Explore this ${meal.strCategory?.toLowerCase() || "delicious"} recipe.`;

    return {
      id: String(meal.idMeal),
      title: meal.strMeal,
      description,
      image: meal.strMealThumb || null,
      ingredientCount: ingredientDetails.length,
      stepCount: instructions.length,
      category: meal.strCategory || "Recipe",
      area: meal.strArea || null,
      ingredients,
      ingredientDetails,
      ingredientNames: ingredientDetails.map((item) => item.name),
      instructions,
      youtubeUrl: meal.strYoutube || null,
      sourceUrl: meal.strSource || null,
    };
  },
};

// Shared by any screen that renders a list of raw TheMealDB results as
// RecipeCards (Home, Search). Transforms first, then trims to `limit` so a
// null result (a malformed meal) never shrinks the visible list below what
// was requested.
export const formatMeals = (meals, limit = 14) =>
  (meals || [])
    .map(MealAPI.transformMealData)
    .filter((meal) => meal !== null)
    .slice(0, limit);
