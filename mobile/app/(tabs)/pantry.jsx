import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { featureStyles } from "../../assets/styles/features.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import ScreenHeader from "../../components/ScreenHeader";
import { FadeInView, ScalePressable } from "../../components/Motion";
import { COLORS } from "../../constants/colors";
import { MealAPI } from "../../services/mealAPI";
import { RecipeStore } from "../../services/recipeStore";
import {
  createIngredientSearchIndex,
  findCanonicalIngredient,
  findMatchedPantryItems,
  findMissingRecipeIngredients,
  getIngredientSuggestions,
  normalizeIngredient,
  toMealDbIngredientQuery,
} from "../../utils/ingredients";

const COMMON_INGREDIENTS = [
  "Chicken",
  "Rice",
  "Egg",
  "Tomato",
  "Onion",
  "Potato",
  "Garlic",
  "Pasta",
  "Fish",
  "Coconut Milk",
  "Carrot",
  "Cheese",
];

const MEAT_WORDS = [
  "chicken",
  "beef",
  "pork",
  "lamb",
  "mutton",
  "fish",
  "salmon",
  "tuna",
  "prawn",
  "shrimp",
  "bacon",
  "ham",
  "turkey",
  "duck",
  "anchovy",
];
const ANIMAL_PRODUCT_WORDS = ["egg", "milk", "cheese", "butter", "cream", "yogurt", "honey"];

const matchesDiet = (recipe, diet) => {
  if (!diet || diet === "No preference") return true;

  const ingredients = (recipe.ingredientNames || []).map(normalizeIngredient);
  const hasMeat = ingredients.some((ingredient) =>
    MEAT_WORDS.some((word) => ingredient.includes(word)),
  );
  if (diet === "Vegetarian") return !hasMeat;

  const hasAnimalProduct = ingredients.some((ingredient) =>
    ANIMAL_PRODUCT_WORDS.some((word) => ingredient.includes(word)),
  );
  return !hasMeat && !hasAnimalProduct;
};

const getRecipeMatch = (recipe, pantry) => {
  const recipeIngredients = Array.from(new Set(recipe.ingredientNames || []));
  const matchedPantryItems = findMatchedPantryItems(pantry, recipeIngredients);
  const missingIngredients = findMissingRecipeIngredients(pantry, recipeIngredients);
  const matchedRecipeCount = Math.max(recipeIngredients.length - missingIngredients.length, 0);

  return {
    ...recipe,
    matchedPantryItems,
    missingIngredients,
    matchedCount: matchedPantryItems.length,
    recipeCoverage: recipeIngredients.length
      ? Math.round((matchedRecipeCount / recipeIngredients.length) * 100)
      : 0,
    missingCount: missingIngredients.length,
  };
};

const formatIngredientPreview = (ingredients, limit = 2) => {
  if (!ingredients?.length) return "None";
  const visible = ingredients.slice(0, limit).join(", ");
  const remaining = ingredients.length - limit;
  return remaining > 0 ? `${visible} +${remaining}` : visible;
};

export default function PantryScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [pantry, setPantry] = useState([]);
  const [pantryReady, setPantryReady] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [preferences, setPreferences] = useState({ diet: "No preference" });
  const [ingredientCatalog, setIngredientCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return undefined;
      let active = true;

      Promise.all([RecipeStore.getPantry(userId), RecipeStore.getPreferences(userId)]).then(
        ([items, savedPreferences]) => {
          if (!active) return;
          setPantry(items);
          setPreferences(savedPreferences);
          setPantryReady(true);
        },
      );

      return () => {
        active = false;
      };
    }, [isLoaded, userId]),
  );

  useEffect(() => {
    let active = true;

    const loadIngredientCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const ingredients = await MealAPI.getIngredients();
        if (active) setIngredientCatalog(ingredients);
      } catch {
        if (active) {
          setCatalogError("Ingredient suggestions are temporarily unavailable.");
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    loadIngredientCatalog();
    return () => {
      active = false;
    };
  }, []);

  const retryIngredientCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const ingredients = await MealAPI.getIngredients({ forceRefresh: true });
      setIngredientCatalog(ingredients);
    } catch {
      setCatalogError("Ingredient suggestions are temporarily unavailable.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const pantrySet = useMemo(() => new Set(pantry.map(normalizeIngredient)), [pantry]);
  const ingredientSearchIndex = useMemo(
    () => createIngredientSearchIndex(ingredientCatalog),
    [ingredientCatalog],
  );

  const ingredientSuggestions = useMemo(
    () =>
      suggestionsVisible
        ? getIngredientSuggestions(newIngredient, ingredientSearchIndex, 7, pantrySet)
        : [],
    [ingredientSearchIndex, newIngredient, pantrySet, suggestionsVisible],
  );

  const handleIngredientInputChange = useCallback((value) => {
    setNewIngredient(value);
    setSuggestionsVisible(Boolean(value.trim()));
  }, []);

  const savePantry = async (items) => {
    setPantry(items);
    setRecommendations([]);
    setError("");

    try {
      await RecipeStore.setPantry(userId, items);
    } catch {
      Alert.alert("Couldn’t save pantry", "Please try again.");
    }
  };

  const addIngredient = (requestedIngredient) => {
    const typedValue =
      typeof requestedIngredient === "string" ? requestedIngredient.trim() : newIngredient.trim();
    if (!typedValue) return;

    if (catalogLoading) {
      Alert.alert("Loading ingredients", "Please wait a moment for the ingredient list to load.");
      return;
    }

    if (!ingredientCatalog.length) {
      Alert.alert(
        "Ingredient list unavailable",
        "Reconnect to the internet and retry the ingredient list before adding an item.",
      );
      return;
    }

    const canonicalName = findCanonicalIngredient(typedValue, ingredientSearchIndex);
    if (!canonicalName) {
      Alert.alert(
        "Choose an exact ingredient",
        "Select an ingredient from the suggestions so RecipeNest can match it correctly.",
      );
      return;
    }

    if (pantrySet.has(normalizeIngredient(canonicalName))) {
      setNewIngredient("");
      setSuggestionsVisible(false);
      return;
    }

    if (pantry.length >= 30) {
      Alert.alert("Pantry is full", "Remove an ingredient before adding another one.");
      return;
    }

    savePantry([...pantry, canonicalName]);
    setNewIngredient("");
    setSuggestionsVisible(false);
  };

  const toggleCommonIngredient = (ingredient) => {
    if (catalogLoading) {
      Alert.alert("Loading ingredients", "Please wait a moment for the ingredient list to load.");
      return;
    }

    const canonicalName = findCanonicalIngredient(ingredient, ingredientSearchIndex);
    if (!canonicalName) {
      Alert.alert("Ingredient unavailable", "Please search for this ingredient using the input field.");
      return;
    }

    const normalized = normalizeIngredient(canonicalName);
    const exists = pantrySet.has(normalized);
    const nextItems = exists
      ? pantry.filter((item) => normalizeIngredient(item) !== normalized)
      : [...pantry, canonicalName];
    savePantry(nextItems);
  };

  const removeIngredient = (ingredient) => {
    savePantry(pantry.filter((item) => item !== ingredient));
  };

  const findRecipes = async () => {
    if (!pantry.length || loading) return;

    if (!ingredientCatalog.length) {
      setError("Load the official ingredient list before searching for recipes.");
      return;
    }

    const canonicalPantry = pantry
      .map((item) => findCanonicalIngredient(item, ingredientSearchIndex))
      .filter(Boolean);
    const unrecognizedItems = pantry.filter(
      (item) => !findCanonicalIngredient(item, ingredientSearchIndex),
    );

    if (unrecognizedItems.length) {
      Alert.alert(
        "Update pantry ingredients",
        `Remove and re-add these items using the suggestions: ${unrecognizedItems.join(", ")}.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    setRecommendations([]);

    try {
      // The free API filters one main ingredient at a time. We combine those results,
      // fetch each full recipe, and then calculate the real pantry coverage locally.
      const searchIngredients = canonicalPantry.slice(0, 8);
      const filterResults = await Promise.allSettled(
        searchIngredients.map((ingredient) =>
          MealAPI.filterByIngredient(toMealDbIngredientQuery(ingredient)),
        ),
      );

      const candidateScores = new Map();
      filterResults.forEach((result, ingredientIndex) => {
        if (result.status !== "fulfilled") return;

        result.value.slice(0, 30).forEach((meal) => {
          const id = String(meal.idMeal);
          const current = candidateScores.get(id) || {
            meal,
            filterScore: 0,
            matchedSearches: new Set(),
          };
          current.filterScore += 1;
          current.matchedSearches.add(searchIngredients[ingredientIndex]);
          candidateScores.set(id, current);
        });
      });

      const candidates = Array.from(candidateScores.values())
        .sort((a, b) => b.filterScore - a.filterScore)
        .slice(0, 20);

      if (!candidates.length) {
        throw new Error(
          "No recipes were found. Try adding a main ingredient such as chicken, rice, fish, or potato.",
        );
      }

      const detailResults = await Promise.allSettled(
        candidates.map((candidate) => MealAPI.getMealById(candidate.meal.idMeal)),
      );

      const recipes = detailResults
        .map((result) =>
          result.status === "fulfilled" ? MealAPI.transformMealData(result.value) : null,
        )
        .filter(Boolean)
        .filter((recipe) => matchesDiet(recipe, preferences.diet))
        .map((recipe) => getRecipeMatch(recipe, canonicalPantry))
        .filter((recipe) => recipe.matchedCount > 0)
        .sort(
          (a, b) =>
            b.recipeCoverage - a.recipeCoverage ||
            b.matchedCount - a.matchedCount ||
            a.missingCount - b.missingCount,
        )
        .slice(0, 10);

      if (!recipes.length) {
        throw new Error(
          `No ${preferences.diet.toLowerCase()} recipes matched your current ingredients.`,
        );
      }

      setRecommendations(recipes);
    } catch (findError) {
      setError(findError.message || "Unable to find matching recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!pantryReady) {
    return <LoadingSpinner message="Loading your pantry…" />;
  }

  return (
    <ScrollView
      style={featureStyles.container}
      contentContainerStyle={featureStyles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        eyebrow="SMART KITCHEN"
        icon="basket"
        title="My pantry"
        subtitle="Choose exact ingredient names, then see recipes ranked by what you already have."
        style={featureStyles.headerFlush}
      />

      <View style={featureStyles.infoCard}>
        <View style={featureStyles.infoIcon}>
          <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
        </View>
        <Text style={featureStyles.infoText}>
          Start with main ingredients. RecipeNest checks the complete recipe afterward and shows what
          is still missing.
        </Text>
      </View>

      <View style={featureStyles.sectionHeader}>
        <Text style={featureStyles.sectionTitle}>Add ingredients</Text>
        <Text style={featureStyles.sectionHint}>
          {pantry.length}/30 · {preferences.diet}
        </Text>
      </View>

      <View style={featureStyles.ingredientInputArea}>
        <View style={featureStyles.inputRow}>
          <View style={featureStyles.inputWrap}>
            <Ionicons name="search-outline" size={19} color={COLORS.textLight} />
            <TextInput
              style={featureStyles.input}
              value={newIngredient}
              onChangeText={handleIngredientInputChange}
              onFocus={() => setSuggestionsVisible(Boolean(newIngredient.trim()))}
              onBlur={() => setSuggestionsVisible(false)}
              placeholder="Type an ingredient name"
              placeholderTextColor={COLORS.gray}
              returnKeyType="done"
              onSubmitEditing={() => addIngredient()}
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={40}
            />
            {catalogLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
          </View>
          <ScalePressable
            style={featureStyles.addButton}
            onPress={() => addIngredient()}
            accessibilityLabel="Add ingredient"
          >
            <Ionicons name="add" size={25} color={COLORS.white} />
          </ScalePressable>
        </View>

        {suggestionsVisible && newIngredient.trim() && ingredientSuggestions.length ? (
          <View style={featureStyles.suggestionsCard}>
            {ingredientSuggestions.map((ingredient, index) => (
              <TouchableOpacity
                key={ingredient.id || ingredient.name}
                style={[
                  featureStyles.suggestionRow,
                  index === ingredientSuggestions.length - 1 && featureStyles.suggestionRowLast,
                ]}
                onPressIn={() => addIngredient(ingredient.name)}
              >
                <View style={featureStyles.suggestionIcon}>
                  <Ionicons name="leaf-outline" size={17} color={COLORS.primary} />
                </View>
                <Text style={featureStyles.suggestionText}>{ingredient.name}</Text>
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {catalogError ? (
        <TouchableOpacity style={featureStyles.catalogError} onPress={retryIngredientCatalog}>
          <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
          <Text style={featureStyles.catalogErrorText}>{catalogError}</Text>
          <Text style={featureStyles.catalogRetryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}

      <View style={featureStyles.sectionHeader}>
        <Text style={featureStyles.sectionTitle}>Quick add</Text>
        <Text style={featureStyles.sectionHint}>Common ingredients</Text>
      </View>
      <View style={featureStyles.chips}>
        {COMMON_INGREDIENTS.map((ingredient) => {
          const canonicalName =
            findCanonicalIngredient(ingredient, ingredientSearchIndex) || ingredient;
          const selected = pantrySet.has(normalizeIngredient(canonicalName));
          return (
            <ScalePressable
              key={ingredient}
              style={[featureStyles.chip, selected && featureStyles.chipSelected]}
              onPress={() => toggleCommonIngredient(ingredient)}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : "add-circle-outline"}
                size={16}
                color={selected ? COLORS.primary : COLORS.textLight}
              />
              <Text
                style={[
                  featureStyles.chipText,
                  featureStyles.chipTextWithIcon,
                  selected && featureStyles.chipTextSelected,
                ]}
              >
                {canonicalName}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      {pantry.length ? (
        <>
          <View style={featureStyles.sectionHeader}>
            <Text style={featureStyles.sectionTitle}>Your ingredients</Text>
            <TouchableOpacity onPress={() => savePantry([])}>
              <Text style={[featureStyles.sectionHint, featureStyles.dangerText]}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <View style={featureStyles.chips}>
            {pantry.map((ingredient) => (
              <View
                key={normalizeIngredient(ingredient)}
                style={[featureStyles.chip, featureStyles.chipSelected]}
              >
                <Text style={[featureStyles.chipText, featureStyles.chipTextSelected]}>
                  {ingredient}
                </Text>
                <TouchableOpacity
                  style={featureStyles.chipRemove}
                  onPress={() => removeIngredient(ingredient)}
                  accessibilityLabel={`Remove ${ingredient}`}
                >
                  <Ionicons name="close" size={15} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <ScalePressable
        style={[
          featureStyles.primaryButton,
          (!pantry.length || loading) && featureStyles.primaryButtonDisabled,
        ]}
        onPress={findRecipes}
        disabled={!pantry.length || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Ionicons name="sparkles" size={20} color={COLORS.white} />
        )}
        <Text style={featureStyles.primaryButtonText}>
          {loading ? "Matching your pantry…" : "Find best matches"}
        </Text>
      </ScalePressable>

      {error ? <Text style={featureStyles.inlineMessage}>{error}</Text> : null}

      {recommendations.length ? (
        <>
          <View style={featureStyles.sectionHeader}>
            <Text style={featureStyles.sectionTitle}>Best matches</Text>
            <Text style={featureStyles.sectionHint}>{recommendations.length} recipes</Text>
          </View>
          {recommendations.map((recipe, index) => (
            <FadeInView key={recipe.id} delay={Math.min(index * 55, 275)} translateY={10}>
              <ScalePressable
                style={featureStyles.recommendationCard}
                onPress={() => router.push(`/recipe/${recipe.id}`)}
              >
                <Image
                  source={{ uri: recipe.image }}
                  style={featureStyles.recommendationImage}
                  contentFit="cover"
                  transition={250}
                />
                <View style={featureStyles.recommendationCopy}>
                  <Text style={featureStyles.recommendationTitle} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  <Text style={featureStyles.recommendationMeta} numberOfLines={1}>
                    You have: {formatIngredientPreview(recipe.matchedPantryItems)}
                  </Text>
                  <Text style={featureStyles.recommendationMissing} numberOfLines={1}>
                    Missing: {formatIngredientPreview(recipe.missingIngredients)}
                  </Text>
                  <View style={featureStyles.matchBadge}>
                    <Text style={featureStyles.matchText}>
                      {recipe.recipeCoverage}% ingredient match
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </ScalePressable>
            </FadeInView>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
