import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { recipeDetailStyles } from "../../assets/styles/recipe-detail.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import { COLORS } from "../../constants/colors";
import { FavoritesService } from "../../services/favoritesService";
import { MealAPI } from "../../services/mealAPI";
import { DAYS, MEAL_TYPES, RecipeStore, getInitialDay } from "../../services/recipeStore";

const normalizeExternalUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url.replace(/^http:\/\//i, "https://");
  return `https://${url.replace(/^\/+/, "")}`;
};

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const recipeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = user?.id;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getInitialDay);
  const [selectedMealType, setSelectedMealType] = useState(MEAL_TYPES[2]);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [openingLink, setOpeningLink] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadRecipe = async () => {
      if (!recipeId) {
        setError("This recipe link is invalid.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [mealData, favorites] = await Promise.all([
          MealAPI.getMealById(recipeId),
          userId ? FavoritesService.getLocal(userId) : Promise.resolve([]),
        ]);

        if (!mealData) throw new Error("This recipe could not be found.");
        const transformedRecipe = MealAPI.transformMealData(mealData);
        if (!transformedRecipe) throw new Error("This recipe contains incomplete data.");

        if (isActive) {
          setRecipe(transformedRecipe);
          setIsSaved(
            (favorites || []).some(
              (favorite) => String(favorite.recipeId) === String(transformedRecipe.id),
            ),
          );
        }
      } catch (loadError) {
        if (isActive) setError(loadError.message || "Unable to load this recipe.");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadRecipe();
    return () => {
      isActive = false;
    };
  }, [recipeId, reloadKey, userId]);

  const handleToggleSave = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before saving recipes.");
      return;
    }
    if (!recipe || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        await FavoritesService.remove(userId, recipe.id);
        setIsSaved(false);
      } else {
        await FavoritesService.add(userId, recipe);
        setIsSaved(true);
      }
    } catch (saveError) {
      Alert.alert("Couldn’t update favorites", saveError.message || "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToPlan = async () => {
    if (!recipe || addingToPlan) return;
    setAddingToPlan(true);
    try {
      await RecipeStore.addMeal(userId, selectedDay, selectedMealType, recipe);
      setPlannerOpen(false);
      Alert.alert(
        "Added to meal plan",
        `${recipe.title} is planned for ${selectedDay} ${selectedMealType.toLowerCase()}.`,
        [
          { text: "Stay here", style: "cancel" },
          { text: "View plan", onPress: () => router.push("/planner") },
        ],
      );
    } catch (planError) {
      Alert.alert("Couldn’t update meal plan", planError.message || "Please try again.");
    } finally {
      setAddingToPlan(false);
    }
  };

  const openExternalLink = async (url, linkType = "external") => {
    const safeUrl = normalizeExternalUrl(url);
    if (!safeUrl || openingLink) return;

    setOpeningLink(linkType);
    try {
      await WebBrowser.openBrowserAsync(safeUrl, {
        toolbarColor: COLORS.primaryDark,
        controlsColor: COLORS.white,
        showTitle: true,
        enableBarCollapsing: true,
      });
    } catch {
      try {
        await Linking.openURL(safeUrl);
      } catch {
        Alert.alert("Unable to open link", "Check your internet connection and try again.");
      }
    } finally {
      setOpeningLink("");
    }
  };

  if (loading) return <LoadingSpinner message="Loading recipe…" />;

  if (error || !recipe) {
    return (
      <View style={recipeDetailStyles.errorContainer}>
        <View style={recipeDetailStyles.errorIcon}>
          <Ionicons name="restaurant-outline" size={33} color={COLORS.primary} />
        </View>
        <Text style={recipeDetailStyles.errorTitle}>Recipe unavailable</Text>
        <Text style={recipeDetailStyles.errorDescription}>{error || "Please try again."}</Text>
        <View style={recipeDetailStyles.errorActions}>
          <TouchableOpacity style={recipeDetailStyles.secondaryErrorButton} onPress={() => router.back()}>
            <Text style={recipeDetailStyles.secondaryErrorButtonText}>Go back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={recipeDetailStyles.errorButton}
            onPress={() => setReloadKey((value) => value + 1)}
          >
            <Ionicons name="refresh" size={17} color={COLORS.white} />
            <Text style={recipeDetailStyles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={recipeDetailStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={recipeDetailStyles.headerContainer}>
          <Image
            source={recipe.image ? { uri: recipe.image } : require("../../assets/images/icon.png")}
            style={recipeDetailStyles.headerImage}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.02)", "rgba(20,12,25,0.82)"]}
            locations={[0.28, 1]}
            style={recipeDetailStyles.gradientOverlay}
          />

          <View style={recipeDetailStyles.floatingButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={recipeDetailStyles.floatingButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isSaved ? "Remove from saved recipes" : "Save recipe"}
              style={[
                recipeDetailStyles.floatingButton,
                isSaved && recipeDetailStyles.savedFloatingButton,
                isSaving && recipeDetailStyles.disabledButton,
              ]}
              onPress={handleToggleSave}
              disabled={isSaving}
            >
              <Ionicons
                name={isSaving ? "hourglass-outline" : isSaved ? "heart" : "heart-outline"}
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          <View style={recipeDetailStyles.titleSection}>
            {recipe.category ? (
              <View style={recipeDetailStyles.categoryBadge}>
                <Text style={recipeDetailStyles.categoryText}>{recipe.category}</Text>
              </View>
            ) : null}
            <Text style={recipeDetailStyles.recipeTitle}>{recipe.title}</Text>
            {recipe.area ? (
              <View style={recipeDetailStyles.locationRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.white} />
                <Text style={recipeDetailStyles.locationText}>{recipe.area} cuisine</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={recipeDetailStyles.contentSection}>
          <View style={recipeDetailStyles.statsContainer}>
            <StatCard icon="list-outline" value={recipe.ingredientCount} label="Ingredients" />
            <StatCard icon="footsteps-outline" value={recipe.stepCount} label="Steps" />
          </View>

          <View style={recipeDetailStyles.actionsRow}>
            <TouchableOpacity
              style={recipeDetailStyles.primaryAction}
              onPress={() => router.push(`/cooking/${recipe.id}`)}
            >
              <Ionicons name="play" size={19} color={COLORS.white} />
              <Text style={recipeDetailStyles.primaryActionText}>Start cooking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={recipeDetailStyles.secondaryAction}
              onPress={() => setPlannerOpen(true)}
            >
              <Ionicons name="calendar-outline" size={19} color={COLORS.primary} />
              <Text style={recipeDetailStyles.secondaryActionText}>Add to plan</Text>
            </TouchableOpacity>
          </View>

          {recipe.youtubeUrl ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Watch this recipe video on YouTube"
              style={recipeDetailStyles.linkCard}
              activeOpacity={0.84}
              onPress={() => openExternalLink(recipe.youtubeUrl, "youtube")}
              disabled={Boolean(openingLink)}
            >
              <View style={recipeDetailStyles.linkIcon}>
                <Ionicons name="logo-youtube" size={22} color={COLORS.danger} />
              </View>
              <View style={recipeDetailStyles.linkCopy}>
                <Text style={recipeDetailStyles.linkText}>Watch on YouTube</Text>
                <Text style={recipeDetailStyles.linkSubtext}>
                  {openingLink === "youtube" ? "Opening video…" : "Opens in a secure browser"}
                </Text>
              </View>
              <Ionicons
                name={openingLink === "youtube" ? "hourglass-outline" : "open-outline"}
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          ) : null}

          <SectionHeader title="Ingredients" count={recipe.ingredients.length} />
          <View style={recipeDetailStyles.ingredientsGrid}>
            {recipe.ingredients.length ? (
              recipe.ingredients.map((ingredient, index) => (
                <View key={`${ingredient}-${index}`} style={recipeDetailStyles.ingredientCard}>
                  <Ionicons name="checkmark-circle-outline" size={19} color={COLORS.primary} />
                  <Text style={recipeDetailStyles.ingredientText}>{ingredient}</Text>
                </View>
              ))
            ) : (
              <Text style={recipeDetailStyles.missingContent}>Ingredients are not available.</Text>
            )}
          </View>

          <SectionHeader title="Instructions" count={recipe.instructions.length} />
          <View style={recipeDetailStyles.instructionsContainer}>
            {recipe.instructions.length ? (
              recipe.instructions.map((instruction, index) => (
                <View key={`${instruction.slice(0, 24)}-${index}`} style={recipeDetailStyles.instructionCard}>
                  <View style={recipeDetailStyles.stepIndicator}>
                    <Text style={recipeDetailStyles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text style={recipeDetailStyles.instructionText}>{instruction}</Text>
                </View>
              ))
            ) : (
              <Text style={recipeDetailStyles.missingContent}>Instructions are not available.</Text>
            )}
          </View>

          {recipe.sourceUrl ? (
            <TouchableOpacity
              style={recipeDetailStyles.sourceButton}
              onPress={() => openExternalLink(recipe.sourceUrl, "source")}
              disabled={Boolean(openingLink)}
            >
              <Ionicons name="link-outline" size={18} color={COLORS.primary} />
              <Text style={recipeDetailStyles.sourceButtonText}>Original recipe source</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>


      <Modal
        visible={plannerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlannerOpen(false)}
      >
        <View style={recipeDetailStyles.modalBackdrop}>
          <View style={recipeDetailStyles.modalCard}>
            <View style={recipeDetailStyles.modalHeader}>
              <View style={recipeDetailStyles.modalTitleCopy}>
                <Text style={recipeDetailStyles.modalTitle}>Add to meal plan</Text>
                <Text style={recipeDetailStyles.modalRecipeTitle} numberOfLines={1}>
                  {recipe.title}
                </Text>
              </View>
              <TouchableOpacity style={recipeDetailStyles.modalClose} onPress={() => setPlannerOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={recipeDetailStyles.modalLabel}>Day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={recipeDetailStyles.modalChips}
            >
              {DAYS.map((day) => {
                const selected = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[recipeDetailStyles.modalChip, selected && recipeDetailStyles.modalChipSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        recipeDetailStyles.modalChipText,
                        selected && recipeDetailStyles.modalChipTextSelected,
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={recipeDetailStyles.modalLabel}>Meal</Text>
            <View style={recipeDetailStyles.modalMealRow}>
              {MEAL_TYPES.map((mealType) => {
                const selected = selectedMealType === mealType;
                return (
                  <TouchableOpacity
                    key={mealType}
                    style={[recipeDetailStyles.modalMeal, selected && recipeDetailStyles.modalMealSelected]}
                    onPress={() => setSelectedMealType(mealType)}
                  >
                    <Text
                      style={[
                        recipeDetailStyles.modalMealText,
                        selected && recipeDetailStyles.modalMealTextSelected,
                      ]}
                    >
                      {mealType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[recipeDetailStyles.modalButton, addingToPlan && recipeDetailStyles.disabledButton]}
              onPress={handleAddToPlan}
              disabled={addingToPlan}
            >
              <Ionicons
                name={addingToPlan ? "hourglass-outline" : "calendar"}
                size={20}
                color={COLORS.white}
              />
              <Text style={recipeDetailStyles.modalButtonText}>
                {addingToPlan ? "Adding…" : `Add to ${selectedDay}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={recipeDetailStyles.statCard}>
      <Ionicons name={icon} size={19} color={COLORS.primary} />
      <View style={recipeDetailStyles.statCopy}>
        <Text style={recipeDetailStyles.statValue}>{value}</Text>
        <Text style={recipeDetailStyles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, count }) {
  return (
    <View style={recipeDetailStyles.sectionTitleRow}>
      <Text style={recipeDetailStyles.sectionTitle}>{title}</Text>
      <Text style={recipeDetailStyles.countText}>{count}</Text>
    </View>
  );
}
