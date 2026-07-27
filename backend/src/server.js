import cors from "cors";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import job from "./config/cron.js";
import { db } from "./config/db.js";
import { ENV } from "./config/env.js";
import { favoritesTable } from "./db/schema.js";

const app = express();

const allowedOrigins =
  ENV.CORS_ORIGINS === "*"
    ? "*"
    : ENV.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins === "*" || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

const parseRecipeId = (value) => {
  const recipeId = Number.parseInt(value, 10);
  return Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null;
};

const cleanText = (value, maxLength = 300) => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
};

const parseCount = (value) => {
  const count = Number.parseInt(value, 10);
  return Number.isInteger(count) && count >= 0 ? Math.min(count, 200) : null;
};

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    service: "recipe-app-api",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/favorites", async (request, response, next) => {
  try {
    const userId = cleanText(request.body.userId, 150);
    const recipeId = parseRecipeId(request.body.recipeId);
    const title = cleanText(request.body.title, 200);

    if (!userId || !recipeId || !title) {
      return response.status(400).json({
        error: "userId, a valid recipeId, and title are required.",
      });
    }

    const [existingFavorite] = await db
      .select()
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId),
          eq(favoritesTable.recipeId, recipeId),
        ),
      )
      .limit(1);

    if (existingFavorite) {
      return response.status(200).json(existingFavorite);
    }

    const [newFavorite] = await db
      .insert(favoritesTable)
      .values({
        userId,
        recipeId,
        title,
        image: cleanText(request.body.image, 1000),
        ingredientCount: parseCount(request.body.ingredientCount),
        stepCount: parseCount(request.body.stepCount),
      })
      .returning();

    return response.status(201).json(newFavorite);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/favorites/:userId/:recipeId", async (request, response, next) => {
  try {
    const userId = cleanText(request.params.userId, 150);
    const recipeId = parseRecipeId(request.params.recipeId);

    if (!userId || !recipeId) {
      return response.status(400).json({ error: "Invalid userId or recipeId." });
    }

    const deletedFavorites = await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId),
          eq(favoritesTable.recipeId, recipeId),
        ),
      )
      .returning({ id: favoritesTable.id });

    if (deletedFavorites.length === 0) {
      return response.status(404).json({ error: "Favorite was not found." });
    }

    return response.status(200).json({ message: "Favorite removed successfully." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/favorites/:userId", async (request, response, next) => {
  try {
    const userId = cleanText(request.params.userId, 150);

    if (!userId) {
      return response.status(400).json({ error: "A valid userId is required." });
    }

    const favorites = await db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId))
      .orderBy(desc(favoritesTable.createdAt));

    return response.status(200).json(favorites);
  } catch (error) {
    next(error);
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.use((error, _request, response, _next) => {
  console.error("[api]", error);
  response.status(500).json({ error: "Something went wrong on the server." });
});

const server = app.listen(ENV.PORT, () => {
  console.log(`Recipe API is running on port ${ENV.PORT}`);

  if (ENV.NODE_ENV === "production" && ENV.API_URL) {
    job.start();
  }
});

const shutdown = () => {
  job.stop();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
