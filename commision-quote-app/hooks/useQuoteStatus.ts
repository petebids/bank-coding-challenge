import { useQuery } from "@tanstack/react-query";
import type { QuoteState } from "@commission-quote/shared";

async function fetchQuoteStatus(id: string): Promise<QuoteState> {
  const res = await fetch(`/api/quotes/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load quote status");
  }
  return res.json();
}

export function useQuoteStatus(id: string | undefined) {
  return useQuery({
    queryKey: ["quote", id],
    queryFn: () => fetchQuoteStatus(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 1000 : false),
  });
}
