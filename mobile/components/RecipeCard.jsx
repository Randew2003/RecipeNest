import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { recipeCardStyles } from "../assets/styles/home.styles";
import { COLORS } from "../constants/colors";
import { FadeInView, ScalePressable } from "./Motion";

export default function RecipeCard({ recipe, index = 0 }) {
  const router = useRouter();

  if (!recipe?.id) return null;

  return (
    <FadeInView delay={Math.min(index * 45, 270)} translateY={10}>
      <ScalePressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${recipe.title}`}
        style={recipeCardStyles.container}
        onPress={() => router.push(`/recipe/${recipe.id}`)}
      >
        <Image
          source={recipe.image ? { uri: recipe.image } : require("../assets/images/icon.png")}
          style={recipeCardStyles.image}
          contentFit="cover"
          transition={250}
        />

        <View style={recipeCardStyles.content}>
          <Text style={recipeCardStyles.title} numberOfLines={2}>
            {recipe.title}
          </Text>

          <View style={recipeCardStyles.footer}>
            {recipe.stepCount ? (
              <View style={recipeCardStyles.metaItem}>
                <Ionicons name="list-outline" size={13} color={COLORS.textLight} />
                <Text style={recipeCardStyles.metaText} numberOfLines={1}>
                  {recipe.stepCount} {recipe.stepCount === 1 ? "step" : "steps"}
                </Text>
              </View>
            ) : null}
            {recipe.area ? (
              <View style={recipeCardStyles.metaItem}>
                <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
                <Text style={recipeCardStyles.metaText} numberOfLines={1}>
                  {recipe.area}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScalePressable>
    </FadeInView>
  );
}
