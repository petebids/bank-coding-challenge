import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuoteForm } from "./QuoteForm";

function renderForm() {
  const queryClient = new QueryClient();
  const onSubmitted = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <QuoteForm
        onSubmitted={onSubmitted}
        vendorSimulation="random"
        onVendorSimulationChange={() => {}}
      />
    </QueryClientProvider>,
  );
  return { onSubmitted };
}

describe("QuoteForm", () => {
  it("shows a validation error for a non-positive loan amount and does not submit", async () => {
    const { onSubmitted } = renderForm();

    fireEvent.change(screen.getByLabelText(/loan amount/i), { target: { value: "-100" } });
    fireEvent.click(screen.getByRole("button", { name: /generate quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/greater than 0/i)).toBeInTheDocument();
    });
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("shows a validation error for a non-integer loan term", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/loan term/i), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: /generate quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/whole number of months/i)).toBeInTheDocument();
    });
  });
});
