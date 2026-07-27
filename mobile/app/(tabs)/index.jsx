import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { homeStyles } from "../../assets/styles/home.styles";
import CategoryFilter from "../../components/CategoryFilter";
import LoadingSpinner from "../../components/LoadingSpinner";
import RecipeCard from "../../components/RecipeCard";
import { FadeInView, ScalePressable } from "../../components/Motion";
import { COLORS } from "../../constants/colors";
import { MealAPI, formatMeals } from "../../services/mealAPI";

const formatCategories = (categories) =>
  categories.map((category) => ({
    id: category.idCategory,
    name: category.strCategory,
    image: category.strCategoryThumb,
    description: category.strCategoryDescription,
  }));

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadHomeData = useCallback(async (preferredCategory = "") => {
    setError("");

    try {
      const [categoryData, featuredMeal] = await Promise.all([
        MealAPI.getCategories(),
        MealAPI.getRandomMeal(),
      ]);

      const formattedCategories = formatCategories(categoryData);
      if (formattedCategories.length === 0) {
        throw new Error("Recipe categories are currently unavailable.");
      }

      const nextCategory =
        formattedCategories.find((category) => category.name === preferredCategory)?.name ||
        formattedCategories[0].name;
      const categoryMeals = await MealAPI.filterByCategory(nextCategory);

      setCategories(formattedCategories);
      setSelectedCategory(nextCategory);
      setRecipes(formatMeals(categoryMeals));
      setFeaturedRecipe(MealAPI.transformMealData(featuredMeal));
    } catch (loadError) {
      setError(loadError.message || "Unable to load recipes. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleCategorySelect = async (category) => {
    if (!category || category === selectedCategory || categoryLoading) return;

    setSelectedCategory(category);
    setCategoryLoading(true);
    setError("");

    try {
      const meals = await MealAPI.filterByCategory(category);
      setRecipes(formatMeals(meals));
    } catch (loadError) {
      setRecipes([]);
      setError(loadError.message || "Unable to load this category.");
    } finally {
      setCategoryLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData(selectedCategory);
  };

  if (loading) return <LoadingSpinner message="Loading recipes…" />;

  if (error && categories.length === 0) {
    return (
      <View style={homeStyles.fullErrorState}>
        <View style={homeStyles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.primary} />
        </View>
        <Text style={homeStyles.emptyTitle}>Couldn’t load recipes</Text>
        <Text style={homeStyles.emptyDescription}>{error}</Text>
        <ScalePressable style={homeStyles.retryButton} onPress={() => loadHomeData()}>
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={homeStyles.retryButtonText}>Try again</Text>
        </ScalePressable>
      </View>
    );
  }

  return (
    <View style={homeStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={homeStyles.scrollContent}
      >
        <FadeInView style={homeStyles.headerSection} delay={20}>
          <View style={homeStyles.headerCopy}>
            <View style={homeStyles.brandRow}>
              <View style={homeStyles.brandMark}>
                <Ionicons name="restaurant" size={11} color={COLORS.white} />
              </View>
              <Text style={homeStyles.brandName}>RECIPENEST</Text>
            </View>
            <Text style={homeStyles.eyebrow} numberOfLines={1}>
              {getGreeting()}, {user?.firstName || "Chef"}
            </Text>
            <Text style={homeStyles.welcomeText}>What would you like to cook?</Text>
          </View>
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={homeStyles.avatarButton}
            onPress={() => router.push("/profile")}
          >
            <Image
              source={user?.imageUrl ? { uri: user.imageUrl } : require("../../assets/images/icon.png")}
              style={homeStyles.headerAvatar}
              contentFit="cover"
            />
          </ScalePressable>
        </FadeInView>

        <FadeInView delay={80}>
          <ScalePressable
            style={homeStyles.searchBar}
            onPress={() => router.push("/search")}
            accessibilityRole="button"
            accessibilityLabel="Search recipes"
          >
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <Text style={homeStyles.searchBarText}>Search recipes or ingredients</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </ScalePressable>
        </FadeInView>

        {featuredRecipe ? (
          <FadeInView style={homeStyles.featuredSection} delay={140}>
            <View style={homeStyles.sectionHeadingRow}>
              <Text style={homeStyles.sectionLabel}>Featured recipe</Text>
            </View>
            <ScalePressable
              style={homeStyles.featuredCard}
              onPress={() => router.push(`/recipe/${featuredRecipe.id}`)}
            >
              <Image
                source={{ uri: featuredRecipe.image }}
                style={homeStyles.featuredImage}
                contentFit="cover"
                transition={350}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.02)", "rgba(24,13,30,0.82)"]}
                locations={[0.25, 1]}
                style={homeStyles.featuredOverlay}
              >
                <View style={homeStyles.featuredBadge}>
                  <Text style={homeStyles.featuredBadgeText}>Featured</Text>
                </View>
                <View>
                  <Text style={homeStyles.featuredTitle} numberOfLines={2}>
                    {featuredRecipe.title}
                  </Text>
                  <View style={homeStyles.featuredMeta}>
                    {featuredRecipe.stepCount ? (
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="list-outline" size={15} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>
                          {featuredRecipe.stepCount} {featuredRecipe.stepCount === 1 ? "step" : "steps"}
                        </Text>
                      </View>
                    ) : null}
                    {featuredRecipe.area ? (
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="location-outline" size={15} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>{featuredRecipe.area}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </LinearGradient>
            </ScalePressable>
          </FadeInView>
        ) : null}

        <FadeInView style={homeStyles.categoryHeader} delay={200}>
          <Text style={homeStyles.sectionLabel}>Categories</Text>
        </FadeInView>
        <FadeInView delay={220}>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </FadeInView>

        <FadeInView style={homeStyles.recipesSection} delay={260}>
          <View style={homeStyles.sectionHeadingRow}>
            <Text style={homeStyles.sectionTitle}>{selectedCategory || "Recipes"}</Text>
            {categoryLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
          </View>

          {error ? <Text style={homeStyles.inlineError}>{error}</Text> : null}

          {!categoryLoading && recipes.length === 0 ? (
            <View style={homeStyles.emptyState}>
              <Ionicons name="restaurant-outline" size={50} color={COLORS.textLight} />
              <Text style={homeStyles.emptyTitle}>No recipes found</Text>
              <Text style={homeStyles.emptyDescription}>Choose another category.</Text>
            </View>
          ) : (
            <View style={homeStyles.recipesGrid}>
              {recipes.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} index={index} />
              ))}
            </View>
          )}
        </FadeInView>
      </ScrollView>
    </View>
  );
}
