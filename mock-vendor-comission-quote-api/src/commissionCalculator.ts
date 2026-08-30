import { v4 as uuidv4 } from "uuid";
import type { CommissionQuoteRequest, CommissionQuoteResult } from "@commission-quote/shared";

const COMMISSION_RATE_BY_RISK_BAND: Record<CommissionQuoteRequest["riskBand"], number> = {
  LOW: 0.015,
  MEDIUM: 0.025,
  HIGH: 0.04,
};

export function calculateCommissionQuote(
  request: CommissionQuoteRequest,
): CommissionQuoteResult {
  const commissionRate = COMMISSION_RATE_BY_RISK_BAND[request.riskBand];
  const totalCommission = Math.round(request.loanAmount * commissionRate * 100) / 100;

  return {
    quoteId: uuidv4(),
    commissionRate,
    totalCommission,
  };
}
