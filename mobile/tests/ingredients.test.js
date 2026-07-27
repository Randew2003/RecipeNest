const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeIngredient,
  ingredientMatches,
  findMatchedPantryItems,
  findMissingRecipeIngredients,
  createIngredientSearchIndex,
  findCanonicalIngredient,
  getIngredientSuggestions,
  toMealDbIngredientQuery,
} = require("../utils/ingredients.js");

test("normalizeIngredient: lowercases, strips punctuation and parentheses", () => {
  assert.equal(normalizeIngredient("  Tomatoes  "), "tomato");
  assert.equal(normalizeIngredient("Egg(s)"), "egg");
  assert.equal(normalizeIngredient("Chili Powder!!"), "chili powder");
});

test("normalizeIngredient: singularizes plurals via known suffix rules", () => {
  assert.equal(normalizeIngredient("carrots"), "carrot");
  assert.equal(normalizeIngredient("potatoes"), "potato");
  assert.equal(normalizeIngredient("berries"), "berry");
  // Short words and words ending in "ss" should NOT be singularized.
  assert.equal(normalizeIngredient("gas"), "gas");
  assert.equal(normalizeIngredient("glass"), "glass");
});

test("ingredientMatches: exact match after normalization", () => {
  assert.equal(ingredientMatches("Onion", "onions"), true);
  assert.equal(ingredientMatches("Egg", "2 large eggs"), true);
});

test("ingredientMatches: descriptor words are ignored", () => {
  assert.equal(ingredientMatches("chicken", "boneless skinless chicken breast"), true);
});

test("ingredientMatches: a plain ingredient does not match a distinctly-processed form of it", () => {
  // Plain "chicken" in the pantry should not satisfy a recipe that needs "chicken stock" -
  // the PRODUCT_FORM_WORDS guard in ingredients.js handles this correctly.
  assert.equal(ingredientMatches("chicken", "chicken stock"), false);
});

test("KNOWN ISSUE: ingredientMatches treats plain 'milk' as satisfying 'coconut milk'", () => {
  // This currently returns true, which is arguably wrong (plain milk is not a
  // substitute for coconut milk in a recipe). It happens because "milk" is
  // simultaneously the pantry item AND the product-form word the guard checks
  // for, so the guard sees "milk" already in the pantry and never fires.
  // The same pattern likely affects other PRODUCT_FORM_WORDS entries that are
  // also plausible pantry items on their own (e.g. "cheese", "cream").
  // Asserting the actual (buggy) behavior here so it doesn't silently regress
  // further - see the code review notes for the suggested fix.
  assert.equal(ingredientMatches("milk", "coconut milk"), true);
});

test("ingredientMatches: unrelated ingredients do not match", () => {
  assert.equal(ingredientMatches("chicken", "beef"), false);
  assert.equal(ingredientMatches("", "egg"), false);
});

test("findMatchedPantryItems / findMissingRecipeIngredients: partition correctly", () => {
  const pantry = ["chicken", "onion", "garlic"];
  const recipeIngredients = ["chicken breast", "onion", "coconut milk", "rice"];

  const matched = findMatchedPantryItems(pantry, recipeIngredients);
  const missing = findMissingRecipeIngredients(pantry, recipeIngredients);

  assert.deepEqual(matched.sort(), ["chicken", "onion"].sort());
  assert.deepEqual(missing.sort(), ["coconut milk", "rice"].sort());
});

test("createIngredientSearchIndex + findCanonicalIngredient: resolves exact names", () => {
  const catalog = [
    { id: "1", name: "Chicken Breast" },
    { id: "2", name: "Egg" },
  ];
  const index = createIngredientSearchIndex(catalog);

  assert.equal(findCanonicalIngredient("chicken breast", index), "Chicken Breast");
  assert.equal(findCanonicalIngredient("eggs", index), "Egg");
  assert.equal(findCanonicalIngredient("nonexistent thing", index), null);
});

test("createIngredientSearchIndex: de-duplicates entries with the same normalized name", () => {
  const catalog = [
    { id: "1", name: "Tomato" },
    { id: "2", name: "Tomatoes" },
  ];
  const index = createIngredientSearchIndex(catalog);
  assert.equal(index.entries.length, 1);
});

test("getIngredientSuggestions: ranks exact match first, then prefix, then substring", () => {
  const catalog = [
    { id: "1", name: "Chicken" },
    { id: "2", name: "Chicken Breast" },
    { id: "3", name: "Free Range Chicken" },
  ];
  const index = createIngredientSearchIndex(catalog);
  const results = getIngredientSuggestions("chicken", index, 10);

  assert.equal(results[0].name, "Chicken");
});

test("getIngredientSuggestions: respects the limit and excluded set", () => {
  const catalog = [
    { id: "1", name: "Chicken" },
    { id: "2", name: "Chicken Breast" },
    { id: "3", name: "Chicken Thigh" },
  ];
  const index = createIngredientSearchIndex(catalog);

  const limited = getIngredientSuggestions("chicken", index, 2);
  assert.equal(limited.length, 2);

  const excluded = new Set(["chicken"]);
  const filtered = getIngredientSuggestions("chicken", index, 10, excluded);
  assert.ok(!filtered.some((item) => item.name === "Chicken"));
});

test("getIngredientSuggestions: returns nothing for an empty query or empty catalog", () => {
  const index = createIngredientSearchIndex([{ id: "1", name: "Chicken" }]);
  assert.deepEqual(getIngredientSuggestions("", index), []);
  assert.deepEqual(getIngredientSuggestions("chicken", createIngredientSearchIndex([])), []);
});

test("toMealDbIngredientQuery: converts to TheMealDB's underscore format", () => {
  assert.equal(toMealDbIngredientQuery("Coconut Milk"), "coconut_milk");
  assert.equal(toMealDbIngredientQuery("  Chili  Powder!! "), "chili_powder");
});
