ALTER TABLE "favorites" DROP COLUMN "cook_time";--> statement-breakpoint
ALTER TABLE "favorites" DROP COLUMN "servings";--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "ingredient_count" integer;--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "step_count" integer;
