import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MockOutcome } from "@commission-quote/shared";

async function postRetry(id: string, forcedOutcome?: MockOutcome) {
  const res = await fetch(`/api/quotes/${id}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forcedOutcome }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to retry quote generation");
  }
}

export function useRetryQuote(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (forcedOutcome?: MockOutcome) => postRetry(id as string, forcedOutcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
    },
  });
}
