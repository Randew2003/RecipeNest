import { FavoritesAPI } from "./favoritesAPI";
import { RecipeStore } from "./recipeStore";

const normalizeRemoteFavorite = (favorite) => ({
  ...favorite,
  recipeId: String(favorite?.recipeId ?? favorite?.id ?? ""),
  id: String(favorite?.recipeId ?? favorite?.id ?? ""),
  category: favorite?.category || "Saved recipe",
  ingredientCount: Number(favorite?.ingredientCount) || 0,
  stepCount: Number(favorite?.stepCount) || 0,
});

export const FavoritesService = {
  async getLocal(userId) {
    if (!userId) return [];
    return RecipeStore.getFavorites(userId);
  },

  async importFromServer(userId) {
    if (!userId) return { favorites: [], synced: false };

    const initialized = await RecipeStore.isFavoritesInitialized(userId);
    if (initialized) {
      const favorites = await RecipeStore.getFavorites(userId);
      const pending = await RecipeStore.isFavoriteSyncPending(userId);
      if (!pending) return { favorites, synced: true };

      try {
        const remoteFavorites = (await FavoritesAPI.getByUser(userId)).map(normalizeRemoteFavorite);
        const localIds = new Set(favorites.map((favorite) => favorite.recipeId));
        const remoteIds = new Set(remoteFavorites.map((favorite) => favorite.recipeId));

        const additions = favorites
          .filter((favorite) => !remoteIds.has(favorite.recipeId))
          .map((favorite) =>
            FavoritesAPI.add({
              userId,
              ...favorite,
              recipeId: Number.parseInt(favorite.recipeId, 10),
            }),
          );
        const removals = remoteFavorites
          .filter((favorite) => !localIds.has(favorite.recipeId))
          .map((favorite) => FavoritesAPI.remove(userId, favorite.recipeId));

        await Promise.all([...additions, ...removals]);
        await RecipeStore.setFavoriteSyncPending(userId, false);
        return { favorites, synced: true };
      } catch {
        return { favorites, synced: false };
      }
    }

    try {
      const remoteFavorites = await FavoritesAPI.getByUser(userId);
      const favorites = await RecipeStore.setFavorites(
        userId,
        (remoteFavorites || []).map(normalizeRemoteFavorite),
      );
      await Promise.all([
        RecipeStore.setFavoritesInitialized(userId, true),
        RecipeStore.setFavoriteSyncPending(userId, false),
      ]);
      return { favorites, synced: true };
    } catch {
      await RecipeStore.setFavoriteSyncPending(userId, true);
      return { favorites: await RecipeStore.getFavorites(userId), synced: false };
    }
  },

  async add(userId, recipe) {
    if (!userId) throw new Error("Sign in before saving a recipe.");

    const favorite = {
      recipeId: String(recipe.id),
      title: recipe.title,
      image: recipe.image,
      ingredientCount: recipe.ingredientCount,
      stepCount: recipe.stepCount,
      category: recipe.category,
      savedAt: new Date().toISOString(),
    };

    const favorites = await RecipeStore.upsertFavorite(userId, favorite);
    await RecipeStore.setFavoritesInitialized(userId, true);

    try {
      await FavoritesAPI.add({
        userId,
        ...favorite,
        recipeId: Number.parseInt(favorite.recipeId, 10),
      });
      const pending = await RecipeStore.isFavoriteSyncPending(userId);
      return { favorites, synced: !pending };
    } catch {
      await RecipeStore.setFavoriteSyncPending(userId, true);
      return { favorites, synced: false };
    }
  },

  async remove(userId, recipeId) {
    if (!userId) throw new Error("Sign in before updating favorites.");

    const favorites = await RecipeStore.removeFavorite(userId, recipeId);
    await RecipeStore.setFavoritesInitialized(userId, true);

    try {
      await FavoritesAPI.remove(userId, recipeId);
      const pending = await RecipeStore.isFavoriteSyncPending(userId);
      return { favorites, synced: !pending };
    } catch {
      await RecipeStore.setFavoriteSyncPending(userId, true);
      return { favorites, synced: false };
    }
  },
};
