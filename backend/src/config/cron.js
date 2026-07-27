import { CronJob } from "cron";
import https from "node:https";
import { ENV } from "./env.js";

const job = new CronJob("*/14 * * * *", () => {
  if (!ENV.API_URL) return;

  https
    .get(ENV.API_URL, (response) => {
      response.resume();
      console.log(`[keep-alive] ${response.statusCode} ${ENV.API_URL}`);
    })
    .on("error", (error) => {
      console.error("[keep-alive] Request failed:", error.message);
    });
});

export default job;
