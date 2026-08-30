import { condition, proxyActivities, setHandler } from "@temporalio/workflow";
import type { CommissionQuoteRequest, QuoteState } from "@commission-quote/shared";
import { retrySignal, statusQuery } from "@commission-quote/shared";
import type { CallVendorApiInput } from "./activities.js";
import type * as activities from "./activities.js";

const { callVendorApi } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10s",
  retry: {
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface GenerateQuoteInput {
  request: CommissionQuoteRequest;
  /** Test-only override forwarded to the mock vendor to force success/error. */
  forcedOutcome?: CallVendorApiInput["forcedOutcome"];
}

const MANUAL_RETRY_WINDOW = "10 minutes";

/**
 * Durable, idempotent generation of a commission quote. The workflow ID (set by the
 * caller from a client-generated idempotency key) is what actually solves the
 * "two generals" problem: if the browser can't tell whether its POST reached the
 * server, retrying with the same key reattaches to this same execution instead of
 * placing a second call to the vendor.
 */
export async function generateCommissionQuoteWorkflow(
  input: GenerateQuoteInput,
): Promise<QuoteState> {
  let state: QuoteState = { status: "PENDING", attempts: 0 };
  let retryRequested = false;
  let forcedOutcome = input.forcedOutcome;

  setHandler(statusQuery, () => state);
  setHandler(retrySignal, (payload) => {
    retryRequested = true;
    if (payload?.forcedOutcome) forcedOutcome = payload.forcedOutcome;
  });

  for (;;) {
    retryRequested = false;
    state = { status: "PENDING", attempts: state.attempts + 1 };

    try {
      const result = await callVendorApi({
        request: input.request,
        forcedOutcome,
      });
      state = { status: "COMPLETED", attempts: state.attempts, result };
      return state;
    } catch (err) {
      state = {
        status: "FAILED",
        attempts: state.attempts,
        error: err instanceof Error ? err.message : "Unknown vendor error",
      };
    }

    const signaled = await condition(() => retryRequested, MANUAL_RETRY_WINDOW);
    if (!signaled) {
      state = { ...state, status: "EXPIRED" };
      return state;
    }
  }
}
