"use client";

import { useState } from "react";
import { Container, Paper, Stack } from "@mui/material";
import type { MockOutcome } from "@commission-quote/shared";
import { QuoteForm } from "@/components/QuoteForm";
import { QuoteResult } from "@/components/QuoteResult";

export default function Home() {
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [vendorSimulation, setVendorSimulation] = useState<MockOutcome | "random">("random");

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Stack spacing={4}>
          <QuoteForm
            onSubmitted={setQuoteId}
            vendorSimulation={vendorSimulation}
            onVendorSimulationChange={setVendorSimulation}
          />
          {quoteId && (
            <QuoteResult key={quoteId} quoteId={quoteId} vendorSimulation={vendorSimulation} />
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
