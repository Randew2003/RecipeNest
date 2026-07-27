import "dotenv/config";

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ENV = {
  PORT: parsePort(process.env.PORT, 5001),
  DATABASE_URL: process.env.DATABASE_URL?.trim() || "",
  NODE_ENV: process.env.NODE_ENV?.trim() || "development",
  API_URL: process.env.API_URL?.trim() || "",
  CORS_ORIGINS: process.env.CORS_ORIGINS?.trim() || "*",
};
