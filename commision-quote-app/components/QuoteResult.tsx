"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { MockOutcome } from "@commission-quote/shared";
import { useQuoteStatus } from "@/hooks/useQuoteStatus";
import { useRetryQuote } from "@/hooks/useRetryQuote";

interface QuoteResultProps {
  quoteId: string;
  /** Simulation currently selected in the form; carried into a manual retry too. */
  vendorSimulation: MockOutcome | "random";
}

export function QuoteResult({ quoteId, vendorSimulation }: QuoteResultProps) {
  const { data, isLoading, isError, error } = useQuoteStatus(quoteId);
  const retryQuote = useRetryQuote(quoteId);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={2} data-testid="quote-loading">
        <CircularProgress size={24} />
        <Typography>Generating quote...</Typography>
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!data || data.status === "PENDING") {
    return (
      <Box display="flex" alignItems="center" gap={2} data-testid="quote-loading">
        <CircularProgress size={24} />
        <Typography>Generating quote...</Typography>
      </Box>
    );
  }

  if (data.status === "FAILED" || data.status === "EXPIRED") {
    return (
      <Stack spacing={2} data-testid="quote-error">
        <Alert severity="error">
          {data.status === "EXPIRED"
            ? "This quote request expired waiting for a retry."
            : `Quote generation failed: ${data.error}`}
        </Alert>
        {retryQuote.isError && (
          <Alert severity="warning">{retryQuote.error.message}</Alert>
        )}
        <Button
          variant="outlined"
          onClick={() =>
            retryQuote.mutate(vendorSimulation === "random" ? undefined : vendorSimulation)
          }
          disabled={retryQuote.isPending || data.status === "EXPIRED"}
        >
          {retryQuote.isPending ? "Retrying..." : "Retry"}
        </Button>
      </Stack>
    );
  }

  const { result } = data;
  if (!result) return null;

  return (
    <Card variant="outlined" data-testid="quote-result">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Commission Quote
        </Typography>
        <Stack spacing={1}>
          <Typography>
            <strong>Quote ID:</strong> {result.quoteId}
          </Typography>
          <Typography>
            <strong>Commission rate:</strong> {(result.commissionRate * 100).toFixed(2)}%
          </Typography>
          <Typography>
            <strong>Total commission:</strong> $
            {result.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
