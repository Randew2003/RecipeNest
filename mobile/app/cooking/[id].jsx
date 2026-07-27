import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { cookingStyles } from "../../assets/styles/cooking.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import { COLORS } from "../../constants/colors";
import { MealAPI } from "../../services/mealAPI";
import { RecipeStore } from "../../services/recipeStore";

const TIMER_OPTIONS = [5, 10, 15];

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
};

export default function CookingModeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const recipeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const meal = await MealAPI.getMealById(recipeId);
        const transformed = MealAPI.transformMealData(meal);
        if (!transformed?.instructions?.length) throw new Error("Guided steps are unavailable for this recipe.");
        if (active) setRecipe(transformed);
      } catch (loadError) {
        if (active) setError(loadError.message || "Couldn’t start cooking mode.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [recipeId]);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return undefined;
    const interval = setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          Alert.alert("Timer finished", "Your cooking timer is complete.");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const progress = useMemo(() => {
    if (!recipe?.instructions?.length) return 0;
    return Math.round(((stepIndex + 1) / recipe.instructions.length) * 100);
  }, [recipe, stepIndex]);

  const setTimer = (minutes) => {
    setTimerSeconds(minutes * 60);
    setTimerRunning(true);
  };

  const finishRecipe = async () => {
    setCompleted(true);
    try {
      await RecipeStore.markRecipeCooked(user?.id, recipe.id);
    } catch {
      // Completion should still work if local persistence is temporarily unavailable.
    }
  };

  const nextStep = () => {
    if (stepIndex >= recipe.instructions.length - 1) {
      finishRecipe();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  if (loading) return <LoadingSpinner message="Preparing cooking mode…" />;

  if (error || !recipe) {
    return (
      <View style={[cookingStyles.container, { alignItems: "center", justifyContent: "center", padding: 28 }]}>
        <Ionicons name="alert-circle-outline" size={46} color={COLORS.primary} />
        <Text style={[cookingStyles.recipeTitle, { textAlign: "center" }]}>Cooking mode unavailable</Text>
        <Text style={[cookingStyles.progressLabel, { marginTop: 10, textAlign: "center", lineHeight: 19 }]}>{error}</Text>
        <TouchableOpacity style={[cookingStyles.navigationButton, cookingStyles.navigationPrimary, { marginTop: 20, width: "100%" }]} onPress={() => router.back()}>
          <Text style={[cookingStyles.navigationText, cookingStyles.navigationPrimaryText]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={cookingStyles.container}>
      <View style={cookingStyles.header}>
        <TouchableOpacity style={cookingStyles.backButton} onPress={() => router.back()} accessibilityLabel="Exit cooking mode">
          <Ionicons name="close" size={23} color={COLORS.text} />
        </TouchableOpacity>
        <View style={cookingStyles.headerCopy}>
          <Text style={cookingStyles.eyebrow}>GUIDED COOKING</Text>
          <Text style={cookingStyles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
        </View>
        <View style={cookingStyles.headerProgressPill}>
          <Text style={cookingStyles.headerProgressText}>
            {completed ? "Done" : `${stepIndex + 1}/${recipe.instructions.length}`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={cookingStyles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: recipe.image }} style={cookingStyles.image} contentFit="cover" transition={250} />
        <Text style={cookingStyles.recipeTitle}>{recipe.title}</Text>

        {completed ? (
          <View style={cookingStyles.completedCard}>
            <View style={cookingStyles.completedIcon}>
              <Ionicons name="checkmark" size={38} color={COLORS.success} />
            </View>
            <Text style={cookingStyles.completedTitle}>Meal completed!</Text>
            <Text style={cookingStyles.completedText}>Great work. This recipe has been added to your cooking progress and streak.</Text>
            <TouchableOpacity style={[cookingStyles.navigationButton, cookingStyles.navigationPrimary, { marginTop: 20, width: "100%" }]} onPress={() => router.replace(`/recipe/${recipe.id}`)}>
              <Text style={[cookingStyles.navigationText, cookingStyles.navigationPrimaryText]}>Back to recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={cookingStyles.progressHeader}>
              <Text style={cookingStyles.progressLabel}>Step {stepIndex + 1} of {recipe.instructions.length}</Text>
              <Text style={cookingStyles.progressValue}>{progress}%</Text>
            </View>
            <View style={cookingStyles.progressTrack}>
              <View style={[cookingStyles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={cookingStyles.stepCard}>
              <View>
                <View style={cookingStyles.stepBadge}>
                  <Text style={cookingStyles.stepBadgeText}>CURRENT STEP</Text>
                </View>
                <Text style={cookingStyles.stepText}>{recipe.instructions[stepIndex]}</Text>
              </View>
              <View style={cookingStyles.tipRow}>
                <Ionicons name="bulb-outline" size={17} color={COLORS.warning} />
                <Text style={cookingStyles.tipText}>Read the full step before starting. Use a timer whenever the recipe mentions waiting or cooking time.</Text>
              </View>
            </View>

            <View style={cookingStyles.timerCard}>
              <View style={cookingStyles.timerHeader}>
                <Ionicons name="timer-outline" size={20} color={COLORS.white} />
                <Text style={cookingStyles.timerTitle}>Kitchen timer</Text>
                {timerSeconds ? (
                  <TouchableOpacity onPress={() => { setTimerRunning(false); setTimerSeconds(0); }}>
                    <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.75)" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={cookingStyles.timerValue}>{formatTime(timerSeconds)}</Text>
              <View style={cookingStyles.timerButtons}>
                {TIMER_OPTIONS.map((minutes) => (
                  <TouchableOpacity key={minutes} style={[cookingStyles.timerButton, timerSeconds === minutes * 60 && cookingStyles.timerButtonActive]} onPress={() => setTimer(minutes)}>
                    <Text style={[cookingStyles.timerButtonText, timerSeconds === minutes * 60 && cookingStyles.timerButtonTextActive]}>{minutes} min</Text>
                  </TouchableOpacity>
                ))}
                {timerSeconds ? (
                  <TouchableOpacity style={cookingStyles.timerButton} onPress={() => setTimerRunning((current) => !current)}>
                    <Text style={cookingStyles.timerButtonText}>{timerRunning ? "Pause" : "Resume"}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={cookingStyles.navigation}>
              <TouchableOpacity style={[cookingStyles.navigationButton, stepIndex === 0 && cookingStyles.navigationDisabled]} disabled={stepIndex === 0} onPress={() => setStepIndex((current) => Math.max(0, current - 1))}>
                <Ionicons name="arrow-back" size={18} color={COLORS.text} />
                <Text style={cookingStyles.navigationText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cookingStyles.navigationButton, cookingStyles.navigationPrimary]} onPress={nextStep}>
                <Text style={[cookingStyles.navigationText, cookingStyles.navigationPrimaryText]}>{stepIndex === recipe.instructions.length - 1 ? "Finish" : "Next step"}</Text>
                <Ionicons name={stepIndex === recipe.instructions.length - 1 ? "checkmark" : "arrow-forward"} size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
