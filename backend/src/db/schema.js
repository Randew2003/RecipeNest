import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";


export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  recipeId: integer("recipe_id").notNull(),
  title: text("title").notNull(),
  image: text("image"),
  ingredientCount: integer("ingredient_count"),
  stepCount: integer("step_count"),
  createdAt: timestamp("created_at").defaultNow(),
}); 