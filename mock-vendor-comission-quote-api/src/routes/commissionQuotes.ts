import { Router } from "express";
import {
  CommissionQuoteRequestSchema,
  MOCK_OUTCOME_HEADER,
  type MockOutcome,
} from "@commission-quote/shared";
import { calculateCommissionQuote } from "../commissionCalculator.js";

// Simulates real-world vendor flakiness so callers must handle transient failures.
const RANDOM_FAILURE_RATE = 0.15;

export const commissionQuotesRouter = Router();

commissionQuotesRouter.post("/commission-quotes", (req, res) => {
  const parsed = CommissionQuoteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request payload",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const forcedOutcome = req.header(MOCK_OUTCOME_HEADER) as MockOutcome | undefined;
  const shouldFail =
    forcedOutcome === "error" ||
    (forcedOutcome !== "success" && Math.random() < RANDOM_FAILURE_RATE);

  if (shouldFail) {
    res.status(502).json({ error: "Vendor Commission Quote API is temporarily unavailable" });
    return;
  }

  res.status(200).json(calculateCommissionQuote(parsed.data));
});
