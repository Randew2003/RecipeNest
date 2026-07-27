import { defineConfig } from "drizzle-kit";
import { ENV } from "./src/config/env.js";

if (!ENV.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: ENV.DATABASE_URL,
  },
});
