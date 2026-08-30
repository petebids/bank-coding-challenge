import { defineQuery, defineSignal } from "@temporalio/workflow";
import type { MockOutcome, QuoteState } from "./contracts";

export const QUOTE_TASK_QUEUE = "commission-quote";
export const GENERATE_QUOTE_WORKFLOW = "generateCommissionQuoteWorkflow";

export const STATUS_QUERY = "getStatus";
export const RETRY_SIGNAL = "retry";

export interface RetrySignalPayload {
  /** Lets a retry change the simulated vendor outcome, e.g. to demo a recovery. */
  forcedOutcome?: MockOutcome;
}

// Defined once here and imported by both the worker (workflow implementation) and the
// Next.js service layer (client), so the names and payload types can never drift.
export const statusQuery = defineQuery<QuoteState>(STATUS_QUERY);
export const retrySignal = defineSignal<[RetrySignalPayload?]>(RETRY_SIGNAL);

export function quoteWorkflowId(idempotencyKey: string): string {
  return `quote-${idempotencyKey}`;
}
