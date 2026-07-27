import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { favoritesStyles } from "../../assets/styles/favorites.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import NoFavoritesFound from "../../components/NoFavoritesFound";
import RecipeCard from "../../components/RecipeCard";
import ScreenHeader from "../../components/ScreenHeader";
import { COLORS } from "../../constants/colors";
import { FavoritesService } from "../../services/favoritesService";

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  const loadFavorites = useCallback(
    async (showFullLoader = false) => {
      if (!isLoaded) return;

      if (!user?.id) {
        setFavoriteRecipes([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showFullLoader) setLoading(true);

      try {
        const localFavorites = await FavoritesService.getLocal(user.id);
        setFavoriteRecipes(localFavorites);
        setLoading(false);

        const result = await FavoritesService.importFromServer(user.id);
        setFavoriteRecipes(result.favorites);
        setUsingLocalStorage(!result.synced);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoaded, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      loadFavorites(true);
    }, [loadFavorites]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites(false);
  };

  if (loading) return <LoadingSpinner message="Loading saved recipes…" />;

  const savedSubtitle = favoriteRecipes.length
    ? `${favoriteRecipes.length} ${favoriteRecipes.length === 1 ? "recipe" : "recipes"} saved`
    : "Recipes you save will appear here.";

  return (
    <View style={favoritesStyles.container}>
      <FlatList
        data={favoriteRecipes}
        renderItem={({ item, index }) => <RecipeCard recipe={item} index={index} />}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={favoritesStyles.row}
        contentContainerStyle={favoritesStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <View>
            <ScreenHeader
              eyebrow="YOUR COLLECTION"
              icon="heart"
              title="Saved recipes"
              subtitle={savedSubtitle}
              actionIcon="search"
              actionLabel="Search recipes"
              onAction={() => router.push("/search")}
              style={favoritesStyles.headerFlush}
            />

            {usingLocalStorage ? (
              <View style={favoritesStyles.syncNotice}>
                <Ionicons name="phone-portrait-outline" size={17} color={COLORS.info} />
                <Text style={favoritesStyles.syncNoticeText}>
                  Saved on this device. Cloud sync is temporarily unavailable.
                </Text>
              </View>
            ) : null}

            {favoriteRecipes.length ? (
              <View style={favoritesStyles.sectionHeader}>
                <Text style={favoritesStyles.sectionTitle}>Your collection</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<NoFavoritesFound />}
      />
    </View>
  );
}
