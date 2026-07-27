const INGREDIENT_ALIASES = {
  eggs: "egg",
  tomatoes: "tomato",
  potatoes: "potato",
  onions: "onion",
  carrots: "carrot",
  mushrooms: "mushroom",
  peppers: "pepper",
  chilies: "chili",
  chillies: "chili",
  prawns: "prawn",
  shrimps: "shrimp",
  noodles: "noodle",
  beans: "bean",
  peas: "pea",
};

const PRODUCT_FORM_WORDS = new Set([
  "broth",
  "cheese",
  "cream",
  "flour",
  "milk",
  "noodle",
  "oil",
  "paste",
  "powder",
  "sauce",
  "stock",
]);

const DESCRIPTOR_WORDS = new Set([
  "fresh",
  "frozen",
  "dried",
  "ground",
  "chopped",
  "sliced",
  "minced",
  "grated",
  "large",
  "small",
  "medium",
  "boneless",
  "skinless",
  "optional",
  "to",
  "taste",
]);

const cleanIngredient = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const singularizeWord = (word) => {
  if (INGREDIENT_ALIASES[word]) return INGREDIENT_ALIASES[word];
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ses")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
};

export const normalizeIngredient = (value) => {
  const cleaned = cleanIngredient(value);
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map(singularizeWord)
    .join(" ");
};

const ingredientTokens = (value) =>
  normalizeIngredient(value)
    .split(" ")
    .filter((word) => word.length > 1 && !DESCRIPTOR_WORDS.has(word));

export const ingredientMatches = (pantryIngredient, recipeIngredient) => {
  const pantry = normalizeIngredient(pantryIngredient);
  const recipe = normalizeIngredient(recipeIngredient);

  if (!pantry || !recipe) return false;
  if (pantry === recipe) return true;

  const pantryTokens = ingredientTokens(pantry);
  const recipeTokenList = ingredientTokens(recipe);
  const recipeTokens = new Set(recipeTokenList);
  if (!pantryTokens.length || !recipeTokens.size) return false;

  const pantryTokenSet = new Set(pantryTokens);
  const hasDifferentProductForm = recipeTokenList.some(
    (token) => PRODUCT_FORM_WORDS.has(token) && !pantryTokenSet.has(token),
  );
  if (hasDifferentProductForm) return false;

  return pantryTokens.every((token) => recipeTokens.has(token));
};

/**
 * Builds a lightweight search index once when the catalogue changes.
 * Normalization is intentionally kept out of the keystroke path so suggestions
 * can update immediately even on lower-end Android devices.
 */
export const createIngredientSearchIndex = (ingredientCatalog) => {
  const entries = [];
  const exactNames = new Map();

  (Array.isArray(ingredientCatalog) ? ingredientCatalog : []).forEach((ingredient) => {
    const name = String(ingredient?.name || "").trim();
    const normalizedName = normalizeIngredient(name);
    if (!name || !normalizedName || exactNames.has(normalizedName)) return;

    exactNames.set(normalizedName, name);
    entries.push({
      ingredient: { id: String(ingredient?.id || normalizedName), name },
      normalizedName,
      tokens: normalizedName.split(" ").filter(Boolean),
    });
  });

  return { entries, exactNames };
};

export const findCanonicalIngredient = (value, ingredientIndex) => {
  const normalizedValue = normalizeIngredient(value);
  if (!normalizedValue || !(ingredientIndex?.exactNames instanceof Map)) return null;
  return ingredientIndex.exactNames.get(normalizedValue) || null;
};

const getSuggestionScore = (normalizedQuery, queryTokens, entry) => {
  if (entry.normalizedName === normalizedQuery) return 0;
  if (entry.normalizedName.startsWith(normalizedQuery)) return 1;

  if (
    queryTokens.length > 1 &&
    queryTokens.every((queryToken) =>
      entry.tokens.some((ingredientToken) => ingredientToken.startsWith(queryToken)),
    )
  ) {
    return 2;
  }

  if (entry.tokens.some((token) => token.startsWith(normalizedQuery))) return 3;
  if (entry.normalizedName.includes(normalizedQuery)) return 4;
  return -1;
};

/**
 * Returns ranked suggestions in a single O(n) pass without sorting the complete
 * catalogue on every keystroke. Entries are already alphabetical inside each
 * relevance bucket because the API catalogue is normalized once when loaded.
 */
export const getIngredientSuggestions = (
  query,
  ingredientIndex,
  limit = 6,
  excludedIngredients = null,
) => {
  const normalizedQuery = normalizeIngredient(query);
  if (!normalizedQuery || !ingredientIndex?.entries?.length) return [];

  const safeLimit = Math.max(1, limit);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const buckets = [[], [], [], [], []];

  for (const entry of ingredientIndex.entries) {
    if (excludedIngredients?.has(entry.normalizedName)) continue;

    const score = getSuggestionScore(normalizedQuery, queryTokens, entry);
    if (score >= 0) buckets[score].push(entry.ingredient);
  }

  const suggestions = [];
  for (const bucket of buckets) {
    for (const ingredient of bucket) {
      suggestions.push(ingredient);
      if (suggestions.length >= safeLimit) return suggestions;
    }
  }

  return suggestions;
};

export const toMealDbIngredientQuery = (value) =>
  cleanIngredient(value).replace(/\s+/g, "_");

export const findMatchedPantryItems = (pantryItems, recipeIngredients) =>
  pantryItems.filter((pantryItem) =>
    recipeIngredients.some((recipeIngredient) => ingredientMatches(pantryItem, recipeIngredient)),
  );

export const findMissingRecipeIngredients = (pantryItems, recipeIngredients) =>
  recipeIngredients.filter(
    (recipeIngredient) =>
      !pantryItems.some((pantryIngredient) => ingredientMatches(pantryIngredient, recipeIngredient)),
  );
