import { API_URL } from "../constants/api.js";
import { requestJson } from "./http.js";

const BACKEND_TIMEOUT = 8000;

export const FavoritesAPI = {
  getByUser: (userId) =>
    requestJson(`${API_URL}/favorites/${encodeURIComponent(userId)}`, {
      timeout: BACKEND_TIMEOUT,
    }),

  add: (favorite) =>
    requestJson(`${API_URL}/favorites`, {
      method: "POST",
      timeout: BACKEND_TIMEOUT,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(favorite),
    }),

  remove: (userId, recipeId) =>
    requestJson(
      `${API_URL}/favorites/${encodeURIComponent(userId)}/${encodeURIComponent(recipeId)}`,
      { method: "DELETE", timeout: BACKEND_TIMEOUT },
    ),
};
