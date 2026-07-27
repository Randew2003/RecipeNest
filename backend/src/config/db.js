import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema.js";
import { ENV } from "./env.js";

if (!ENV.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Copy .env.example to .env and add your Neon PostgreSQL connection string.",
  );
}

const sql = neon(ENV.DATABASE_URL);
export const db = drizzle(sql, { schema });
