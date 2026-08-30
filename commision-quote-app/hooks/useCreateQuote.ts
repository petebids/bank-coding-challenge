import { useMutation } from "@tanstack/react-query";
import type { CommissionQuoteRequest, MockOutcome } from "@commission-quote/shared";

interface CreateQuoteInput {
  request: CommissionQuoteRequest;
  idempotencyKey: string;
  forcedOutcome?: MockOutcome;
}

async function postQuote({ request, idempotencyKey, forcedOutcome }: CreateQuoteInput) {
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, idempotencyKey, forcedOutcome }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to submit loan details");
  }

  return (await res.json()) as { id: string };
}

export function useCreateQuote() {
  // Retries reuse the same mutation variables (same idempotencyKey), so a dropped
  // connection here reattaches to the same Temporal workflow instead of starting a
  // second one — see quoteService.createQuote for the server-side half of this.
  return useMutation({ mutationFn: postQuote, retry: 2 });
}
