import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { DAYS, MEAL_TYPES, RecipeStore, createEmptyMealPlan, getInitialDay } from "../../services/recipeStore";
import { ingredientMatches, normalizeIngredient } from "../../utils/ingredients";

const MEAL_ICONS = {
  Breakfast: "sunny-outline",
  Lunch: "restaurant-outline",
  Dinner: "moon-outline",
};

export default function PlannerScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const [selectedDay, setSelectedDay] = useState(getInitialDay);
  const [plan, setPlan] = useState(createEmptyMealPlan());
  const [pantry, setPantry] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [checks, setChecks] = useState({});
  const [customItem, setCustomItem] = useState("");
  const [buildingList, setBuildingList] = useState(false);
  const [plannerReady, setPlannerReady] = useState(false);
  const [error, setError] = useState("");

  const loadLocalData = useCallback(async () => {
    const [savedPlan, savedChecks, savedCustomItems, savedShoppingItems, savedPantry] =
      await Promise.all([
        RecipeStore.getMealPlan(userId),
        RecipeStore.getShoppingChecks(userId),
        RecipeStore.getCustomShoppingItems(userId),
        RecipeStore.getGeneratedShoppingItems(userId),
        RecipeStore.getPantry(userId),
      ]);

    setPlan(savedPlan);
    setChecks(savedChecks);
    setCustomItems(savedCustomItems);
    setShoppingItems(savedShoppingItems);
    setPantry(savedPantry);
    setPlannerReady(true);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return undefined;
      let active = true;
      loadLocalData().catch(() => {
        if (active) setError("Couldn’t load your saved plan.");
      });
      return () => {
        active = false;
      };
    }, [isLoaded, loadLocalData]),
  );

  const plannedMeals = useMemo(
    () =>
      DAYS.flatMap((day) =>
        MEAL_TYPES.map((mealType) => plan?.[day]?.[mealType]).filter(Boolean),
      ),
    [plan],
  );

  const uniquePlannedMeals = useMemo(
    () => Array.from(new Map(plannedMeals.map((meal) => [String(meal.id), meal])).values()),
    [plannedMeals],
  );


  const allShoppingItems = useMemo(() => {
    const combined = [...shoppingItems, ...customItems];
    return Array.from(
      new Map(combined.map((item) => [normalizeIngredient(item), item])).values(),
    ).filter(Boolean);
  }, [customItems, shoppingItems]);

  const resetGeneratedList = async () => {
    setShoppingItems([]);
    setChecks({});
    await Promise.all([
      RecipeStore.setGeneratedShoppingItems(userId, []),
      RecipeStore.setShoppingChecks(userId, {}),
    ]);
  };

  const removeMeal = (day, mealType, title) => {
    Alert.alert("Remove meal", `Remove ${title} from ${day} ${mealType.toLowerCase()}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const nextPlan = await RecipeStore.removeMeal(userId, day, mealType);
          setPlan(nextPlan);
          await resetGeneratedList();
        },
      },
    ]);
  };

  const clearPlan = () => {
    if (!plannedMeals.length) return;

    Alert.alert("Clear weekly plan", "Remove every meal from this week?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          const nextPlan = await RecipeStore.clearMealPlan(userId);
          setPlan(nextPlan);
          await resetGeneratedList();
        },
      },
    ]);
  };

  const buildShoppingList = async () => {
    if (!uniquePlannedMeals.length || buildingList) return;

    setBuildingList(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        uniquePlannedMeals.map((meal) => MealAPI.getMealById(meal.id)),
      );
      const ingredients = [];
      const seen = new Set();

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const recipe = MealAPI.transformMealData(result.value);

        recipe?.ingredientDetails?.forEach(({ name }) => {
          const key = normalizeIngredient(name);
          const existsInPantry = pantry.some((pantryItem) => ingredientMatches(pantryItem, name));

          if (key && !existsInPantry && !seen.has(key)) {
            seen.add(key);
            ingredients.push(name);
          }
        });
      });

      if (!ingredients.length) {
        setShoppingItems([]);
        await RecipeStore.setGeneratedShoppingItems(userId, []);
        throw new Error("Nothing is missing. Your pantry already covers the planned recipes.");
      }

      const sortedItems = ingredients.sort((a, b) => a.localeCompare(b));
      setShoppingItems(sortedItems);
      setChecks({});
      await Promise.all([
        RecipeStore.setGeneratedShoppingItems(userId, sortedItems),
        RecipeStore.setShoppingChecks(userId, {}),
      ]);
    } catch (buildError) {
      setError(buildError.message || "Couldn’t generate the shopping list.");
    } finally {
      setBuildingList(false);
    }
  };

  const toggleShoppingItem = async (item) => {
    const key = normalizeIngredient(item);
    const nextChecks = { ...checks, [key]: !checks[key] };
    if (!nextChecks[key]) delete nextChecks[key];
    setChecks(nextChecks);
    await RecipeStore.setShoppingChecks(userId, nextChecks);
  };

  const addCustomItem = async () => {
    const value = customItem.trim();
    if (!value) return;

    if (allShoppingItems.some((item) => normalizeIngredient(item) === normalizeIngredient(value))) {
      setCustomItem("");
      return;
    }

    const nextItems = [...customItems, value];
    setCustomItems(nextItems);
    setCustomItem("");
    await RecipeStore.setCustomShoppingItems(userId, nextItems);
  };

  const removeShoppingItem = async (item) => {
    const key = normalizeIngredient(item);
    const nextChecks = { ...checks };
    delete nextChecks[key];
    setChecks(nextChecks);
    await RecipeStore.setShoppingChecks(userId, nextChecks);

    if (customItems.includes(item)) {
      const nextItems = customItems.filter((current) => current !== item);
      setCustomItems(nextItems);
      await RecipeStore.setCustomShoppingItems(userId, nextItems);
      return;
    }

    const nextItems = shoppingItems.filter((current) => current !== item);
    setShoppingItems(nextItems);
    await RecipeStore.setGeneratedShoppingItems(userId, nextItems);
  };

  const clearShoppingList = () => {
    if (!allShoppingItems.length) return;

    Alert.alert("Clear shopping list", "Remove generated and custom shopping items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setShoppingItems([]);
          setCustomItems([]);
          setChecks({});
          await Promise.all([
            RecipeStore.setGeneratedShoppingItems(userId, []),
            RecipeStore.setCustomShoppingItems(userId, []),
            RecipeStore.setShoppingChecks(userId, {}),
          ]);
        },
      },
    ]);
  };

  if (!plannerReady) {
    return <LoadingSpinner message="Loading your meal plan…" />;
  }

  return (
    <ScrollView
      style={featureStyles.container}
      contentContainerStyle={featureStyles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        eyebrow="WEEKLY PLANNING"
        icon="calendar"
        title="Meal planner"
        subtitle="Add recipes to each day and create one shopping list for the week."
        style={featureStyles.headerFlush}
      />

      <View style={featureStyles.planSummary}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={featureStyles.planSummaryText}>
          {plannedMeals.length} of 21 meals planned · {uniquePlannedMeals.length} unique recipes
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={featureStyles.dayTabs}>
        {DAYS.map((day) => {
          const selected = day === selectedDay;
          return (
            <ScalePressable
              key={day}
              style={[featureStyles.dayChip, selected && featureStyles.dayChipSelected]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[featureStyles.dayChipText, selected && featureStyles.dayChipTextSelected]}>
                {day.slice(0, 3)}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      <View style={featureStyles.sectionHeader}>
        <Text style={featureStyles.sectionTitle}>{selectedDay} meals</Text>
        <TouchableOpacity onPress={clearPlan} disabled={!plannedMeals.length}>
          <Text style={[featureStyles.sectionHint, plannedMeals.length && featureStyles.dangerText]}>
            Clear week
          </Text>
        </TouchableOpacity>
      </View>

      {MEAL_TYPES.map((mealType, index) => {
        const meal = plan?.[selectedDay]?.[mealType];
        return (
          <FadeInView key={`${selectedDay}-${mealType}`} delay={index * 65} translateY={10}>
            <View style={featureStyles.mealSlot}>
            <View style={featureStyles.mealSlotHeader}>
              <View style={featureStyles.mealTypeIcon}>
                <Ionicons name={MEAL_ICONS[mealType]} size={18} color={COLORS.primary} />
              </View>
              <Text style={featureStyles.mealType}>{mealType}</Text>
            </View>

            {meal ? (
              <View style={featureStyles.plannedMeal}>
                <TouchableOpacity
                  style={featureStyles.plannedMealLink}
                  onPress={() => router.push(`/recipe/${meal.id}`)}
                >
                  <Image
                    source={meal.image ? { uri: meal.image } : require("../../assets/images/icon.png")}
                    style={featureStyles.plannedMealImage}
                    contentFit="cover"
                  />
                  <View style={featureStyles.plannedMealCopy}>
                    <Text style={featureStyles.plannedMealTitle} numberOfLines={2}>{meal.title}</Text>
                    <Text style={featureStyles.plannedMealCategory}>{meal.category}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={featureStyles.removeButton}
                  onPress={() => removeMeal(selectedDay, mealType, meal.title)}
                  accessibilityLabel={`Remove ${meal.title}`}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={featureStyles.emptySlot} onPress={() => router.push("/search")}>
                <Ionicons name="add-circle-outline" size={21} color={COLORS.primary} />
                <Text style={featureStyles.emptySlotText}>Select a recipe for this meal.</Text>
                <Text style={featureStyles.browseText}>Browse recipes</Text>
              </TouchableOpacity>
            )}
            </View>
          </FadeInView>
        );
      })}

      <View style={featureStyles.sectionHeader}>
        <Text style={featureStyles.sectionTitle}>Weekly shopping list</Text>
        {allShoppingItems.length ? (
          <TouchableOpacity onPress={clearShoppingList}>
            <Text style={[featureStyles.sectionHint, featureStyles.dangerText]}>Clear list</Text>
          </TouchableOpacity>
        ) : (
          <Text style={featureStyles.sectionHint}>Optional</Text>
        )}
      </View>

      <ScalePressable
        style={[
          featureStyles.secondaryButton,
          (!uniquePlannedMeals.length || buildingList) && featureStyles.primaryButtonDisabled,
        ]}
        onPress={buildShoppingList}
        disabled={!uniquePlannedMeals.length || buildingList}
      >
        {buildingList ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
        )}
        <Text style={featureStyles.secondaryButtonText}>
          {buildingList
            ? "Checking planned recipes…"
            : uniquePlannedMeals.length
              ? "Build shopping list"
              : "Add a meal first"}
        </Text>
      </ScalePressable>

      <View style={featureStyles.shoppingInputLabelRow}>
        <Text style={featureStyles.shoppingInputLabel}>Add an item</Text>
      </View>
      <View style={featureStyles.inputRow}>
        <View style={featureStyles.inputWrap}>
          <Ionicons name="add-circle-outline" size={19} color={COLORS.textLight} />
          <TextInput
            style={featureStyles.input}
            value={customItem}
            onChangeText={setCustomItem}
            placeholder="Example: paper towels"
            placeholderTextColor={COLORS.gray}
            returnKeyType="done"
            onSubmitEditing={addCustomItem}
            maxLength={60}
          />
        </View>
        <ScalePressable
          style={featureStyles.addButton}
          onPress={addCustomItem}
          accessibilityLabel="Add shopping item"
        >
          <Ionicons name="add" size={25} color={COLORS.white} />
        </ScalePressable>
      </View>

      {error ? <Text style={featureStyles.inlineMessage}>{error}</Text> : null}

      {allShoppingItems.length ? (
        <View style={featureStyles.listCard}>
          {allShoppingItems.map((item, index) => {
            const key = normalizeIngredient(item);
            const checked = Boolean(checks[key]);
            const isCustom = customItems.includes(item);

            return (
              <View
                key={key}
                style={[
                  featureStyles.shoppingRow,
                  index === allShoppingItems.length - 1 && featureStyles.shoppingRowLast,
                ]}
              >
                <TouchableOpacity
                  style={[featureStyles.checkBox, checked && featureStyles.checkBoxActive]}
                  onPress={() => toggleShoppingItem(item)}
                  accessibilityLabel={`Mark ${item} ${checked ? "not purchased" : "purchased"}`}
                >
                  {checked ? <Ionicons name="checkmark" size={16} color={COLORS.white} /> : null}
                </TouchableOpacity>
                <View style={featureStyles.shoppingItemCopy}>
                  <Text style={[featureStyles.shoppingText, checked && featureStyles.shoppingTextDone]}>
                    {item}
                  </Text>
                  <Text style={featureStyles.shoppingSource}>
                    {isCustom ? "Custom item" : "From meal plan"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={featureStyles.shoppingRemoveButton}
                  onPress={() => removeShoppingItem(item)}
                  accessibilityLabel={`Remove ${item}`}
                >
                  <Ionicons name="close" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={featureStyles.emptyCard}>
          <Ionicons name="cart-outline" size={34} color={COLORS.primary} />
          <Text style={featureStyles.emptyTitle}>No shopping items yet</Text>
          <Text style={featureStyles.emptyText}>
            Plan at least one meal, then generate the ingredients you still need to buy.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
