import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { searchStyles } from "../../assets/styles/search.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import RecipeCard from "../../components/RecipeCard";
import ScreenHeader from "../../components/ScreenHeader";
import { COLORS } from "../../constants/colors";
import useDebounce from "../../hooks/useDebounce";
import { MealAPI, formatMeals } from "../../services/mealAPI";

const QUICK_SEARCHES = ["Chicken", "Pasta", "Rice", "Seafood", "Vegetarian"];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const debouncedQuery = useDebounce(searchQuery, 350);

  useEffect(() => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    const search = async () => {
      setLoading(true);
      setError("");

      try {
        const query = debouncedQuery.trim();
        let results = query
          ? await MealAPI.searchMealsByName(query)
          : await MealAPI.getMealsByFirstLetter("a");

        if (query && results.length === 0) {
          results = await MealAPI.filterByIngredient(query);
        }

        if (requestId.current === currentRequest) {
          setRecipes(formatMeals(results));
        }
      } catch (searchError) {
        if (requestId.current === currentRequest) {
          setRecipes([]);
          setError(searchError.message || "Search is unavailable right now.");
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={searchStyles.container}>
      <ScreenHeader
        eyebrow="DISCOVER"
        icon="arrow-back"
        iconLabel="Go back"
        onIconPress={goBack}
        title="Search recipes"
        subtitle="Find meals by recipe name or ingredient."
      />

      <View style={searchStyles.searchSection}>
        <View style={searchStyles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.primary} />
          <TextInput
            style={searchStyles.searchInput}
            placeholder="Try pasta, chicken, curry…"
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery("")}
              style={searchStyles.clearButton}
            >
              <Ionicons name="close-circle" size={21} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!searchQuery ? (
          <View style={searchStyles.quickSearchBlock}>
            <Text style={searchStyles.quickSearchLabel}>Popular searches</Text>
            <View style={searchStyles.quickSearchRow}>
              {QUICK_SEARCHES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={searchStyles.quickSearchChip}
                  onPress={() => setSearchQuery(item)}
                  activeOpacity={0.8}
                >
                  <Text style={searchStyles.quickSearchText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={searchStyles.resultsSection}>
        <View style={searchStyles.resultsHeader}>
          <Text style={searchStyles.resultsTitle} numberOfLines={1}>
            {debouncedQuery.trim() ? `Results for “${debouncedQuery.trim()}”` : "Popular recipes"}
          </Text>
          {!loading ? (
            <Text style={searchStyles.resultsCount}>
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <LoadingSpinner compact message="Searching recipes…" />
        ) : (
          <FlatList
            data={recipes}
            renderItem={({ item, index }) => <RecipeCard recipe={item} index={index} />}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={searchStyles.row}
            contentContainerStyle={searchStyles.recipesGrid}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<NoResultsFound message={error} />}
          />
        )}
      </View>
    </View>
  );
}

function NoResultsFound({ message }) {
  return (
    <View style={searchStyles.emptyState}>
      <View style={searchStyles.emptyIcon}>
        <Ionicons name="search-outline" size={31} color={COLORS.primary} />
      </View>
      <Text style={searchStyles.emptyTitle}>No recipes found</Text>
      <Text style={searchStyles.emptyDescription}>
        {message || "Try another recipe name or ingredient."}
      </Text>
    </View>
  );
}
