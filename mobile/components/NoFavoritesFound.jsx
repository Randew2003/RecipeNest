import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { favoritesStyles } from "../assets/styles/favorites.styles";
import { COLORS } from "../constants/colors";

export default function NoFavoritesFound() {
  const router = useRouter();

  return (
    <View style={favoritesStyles.emptyState}>
      <View style={favoritesStyles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={42} color={COLORS.primary} />
      </View>
      <Text style={favoritesStyles.emptyTitle}>No saved recipes yet</Text>
      <Text style={favoritesStyles.emptyDescription}>
        Open a recipe and tap the heart icon. It will appear here immediately.
      </Text>
      <TouchableOpacity style={favoritesStyles.exploreButton} onPress={() => router.push("/")}>
        <Ionicons name="restaurant-outline" size={18} color={COLORS.white} />
        <Text style={favoritesStyles.exploreButtonText}>Browse recipes</Text>
      </TouchableOpacity>
    </View>
  );
}
