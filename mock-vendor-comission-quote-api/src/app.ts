import express from "express";
import morgan from "morgan";
import { apiKeyAuth } from "./apiKeyAuth.js";
import { commissionQuotesRouter } from "./routes/commissionQuotes.js";

export function createApp() {
  const app = express();

  app.use(morgan("dev"));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(apiKeyAuth, commissionQuotesRouter);

  return app;
}
