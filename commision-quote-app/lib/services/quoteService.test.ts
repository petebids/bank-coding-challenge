import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { QUOTE_TASK_QUEUE } from "@commission-quote/shared";

const start = vi.fn();
const query = vi.fn();
const signal = vi.fn();
const getHandle = vi.fn(() => ({ query, signal }));

vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: vi.fn(async () => ({
    workflow: { start, getHandle },
  })),
}));

const { createQuote, getQuoteStatus, retryQuote } = await import("./quoteService");

const REQUEST = { loanAmount: 10_000, loanTermInMonths: 24, riskBand: "MEDIUM" } as const;

beforeEach(() => {
  start.mockReset();
  query.mockReset();
  signal.mockReset();
});

describe("createQuote", () => {
  it("starts a workflow keyed by the idempotency key", async () => {
    start.mockResolvedValue(undefined);

    const { workflowId } = await createQuote(REQUEST, "key-1");

    expect(workflowId).toBe("quote-key-1");
    expect(start).toHaveBeenCalledWith(
      "generateCommissionQuoteWorkflow",
      expect.objectContaining({
        taskQueue: QUOTE_TASK_QUEUE,
        workflowId: "quote-key-1",
        args: [{ request: REQUEST, forcedOutcome: undefined }],
      }),
    );
  });

  it("treats an already-started workflow as success (idempotent resubmission)", async () => {
    start.mockRejectedValue(
      new WorkflowExecutionAlreadyStartedError("already started", "quote-key-1", "generateCommissionQuoteWorkflow"),
    );

    const { workflowId } = await createQuote(REQUEST, "key-1");

    expect(workflowId).toBe("quote-key-1");
  });

  it("propagates unrelated errors", async () => {
    start.mockRejectedValue(new Error("connection refused"));

    await expect(createQuote(REQUEST, "key-1")).rejects.toThrow("connection refused");
  });
});

describe("getQuoteStatus", () => {
  it("queries the workflow for its current state", async () => {
    query.mockResolvedValue({ status: "PENDING", attempts: 1 });

    const state = await getQuoteStatus("quote-key-1");

    expect(state).toEqual({ status: "PENDING", attempts: 1 });
    expect(getHandle).toHaveBeenCalledWith("quote-key-1");
  });
});

describe("retryQuote", () => {
  it("sends the retry signal to the workflow", async () => {
    signal.mockResolvedValue(undefined);

    await retryQuote("quote-key-1");

    expect(signal).toHaveBeenCalled();
  });
});
