"use client";

import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CommissionQuoteRequestSchema,
  RISK_BANDS,
  type CommissionQuoteRequest,
  type MockOutcome,
} from "@commission-quote/shared";
import { useCreateQuote } from "@/hooks/useCreateQuote";

const DEFAULT_VALUES: CommissionQuoteRequest = {
  loanAmount: 25_000,
  loanTermInMonths: 36,
  riskBand: "MEDIUM",
};

const VENDOR_SIMULATION_OPTIONS: { value: MockOutcome | "random"; label: string }[] = [
  { value: "random", label: "Random (real vendor behavior)" },
  { value: "success", label: "Force success" },
  { value: "error", label: "Force failure" },
];

interface QuoteFormProps {
  onSubmitted: (quoteId: string) => void;
  vendorSimulation: MockOutcome | "random";
  onVendorSimulationChange: (value: MockOutcome | "random") => void;
}

export function QuoteForm({ onSubmitted, vendorSimulation, onVendorSimulationChange }: QuoteFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CommissionQuoteRequest>({
    resolver: zodResolver(CommissionQuoteRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const createQuote = useCreateQuote();

  const onSubmit = handleSubmit((request) => {
    // A fresh key per submit attempt; react-query then reuses the same mutation
    // variables (same key) if it automatically retries this same attempt after a
    // dropped connection, so the retried request reattaches to the same workflow
    // instead of asking the vendor twice.
    createQuote.mutate(
      {
        request,
        idempotencyKey: crypto.randomUUID(),
        forcedOutcome: vendorSimulation === "random" ? undefined : vendorSimulation,
      },
      {
        onSuccess: ({ id }) => onSubmitted(id),
      },
    );
  });

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          Generate Commission Quote
        </Typography>

        <Controller
          name="loanAmount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Loan amount"
              type="number"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                field.onChange(e.target.valueAsNumber)
              }
              error={Boolean(errors.loanAmount)}
              helperText={errors.loanAmount?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="loanTermInMonths"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Loan term (months)"
              type="number"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                field.onChange(e.target.valueAsNumber)
              }
              error={Boolean(errors.loanTermInMonths)}
              helperText={errors.loanTermInMonths?.message}
              fullWidth
            />
          )}
        />

        <Controller
          name="riskBand"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Risk band"
              error={Boolean(errors.riskBand)}
              helperText={errors.riskBand?.message}
              fullWidth
            >
              {RISK_BANDS.map((band) => (
                <MenuItem key={band} value={band}>
                  {band}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <TextField
          select
          label="Simulate vendor response"
          value={vendorSimulation}
          onChange={(e) => onVendorSimulationChange(e.target.value as MockOutcome | "random")}
          helperText="The vendor API randomly fails in real operation; force an outcome here to demo the retry flow."
          fullWidth
        >
          {VENDOR_SIMULATION_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {createQuote.isError && (
          <Alert severity="error">{createQuote.error.message}</Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={createQuote.isPending}
        >
          {createQuote.isPending ? "Submitting..." : "Generate Quote"}
        </Button>
      </Stack>
    </Box>
  );
}
