import { z } from "zod";

export const RISK_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const CommissionQuoteRequestSchema = z.object({
  loanAmount: z
    .number({ invalid_type_error: "Loan amount must be a number" })
    .positive("Loan amount must be greater than 0")
    .max(100_000_000, "Loan amount is too large"),
  loanTermInMonths: z
    .number({ invalid_type_error: "Loan term must be a number" })
    .int("Loan term must be a whole number of months")
    .min(1, "Loan term must be at least 1 month")
    .max(480, "Loan term must be 480 months or fewer"),
  riskBand: z.enum(RISK_BANDS, {
    errorMap: () => ({ message: "Risk band must be LOW, MEDIUM, or HIGH" }),
  }),
});
export type CommissionQuoteRequest = z.infer<typeof CommissionQuoteRequestSchema>;

export const CommissionQuoteResultSchema = z.object({
  quoteId: z.string(),
  commissionRate: z.number(),
  totalCommission: z.number(),
});
export type CommissionQuoteResult = z.infer<typeof CommissionQuoteResultSchema>;

export const QUOTE_STATUS_VALUES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUS_VALUES)[number];

export interface QuoteState {
  status: QuoteStatusValue;
  attempts: number;
  result?: CommissionQuoteResult;
  error?: string;
}

export const MOCK_OUTCOME_HEADER = "x-mock-outcome";
export type MockOutcome = "success" | "error";
