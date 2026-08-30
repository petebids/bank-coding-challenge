import { WorkflowExecutionAlreadyStartedError, WorkflowNotFoundError } from "@temporalio/client";
import {
  GENERATE_QUOTE_WORKFLOW,
  QUOTE_TASK_QUEUE,
  quoteWorkflowId,
  retrySignal,
  statusQuery,
  type CommissionQuoteRequest,
  type MockOutcome,
  type QuoteState,
} from "@commission-quote/shared";
import { getTemporalClient } from "@/lib/temporal/client";

export class QuoteNotFoundError extends Error {}

/**
 * Starts (or reattaches to) the workflow that generates a commission quote.
 *
 * The workflow ID is derived from a client-generated idempotency key. If the browser
 * is unsure whether an earlier submission reached the server — a dropped connection,
 * a reload, a double click — it resubmits with the *same* key. Temporal rejects the
 * second "start" call for a workflow ID that's already running, which we treat as
 * success: this is what actually prevents a duplicate vendor call ("two generals").
 */
export async function createQuote(
  request: CommissionQuoteRequest,
  idempotencyKey: string,
  forcedOutcome?: MockOutcome,
): Promise<{ workflowId: string }> {
  const client = await getTemporalClient();
  const workflowId = quoteWorkflowId(idempotencyKey);

  try {
    await client.workflow.start(GENERATE_QUOTE_WORKFLOW, {
      taskQueue: QUOTE_TASK_QUEUE,
      workflowId,
      args: [{ request, forcedOutcome }],
    });
  } catch (err) {
    if (!(err instanceof WorkflowExecutionAlreadyStartedError)) {
      throw err;
    }
  }

  return { workflowId };
}

export async function getQuoteStatus(workflowId: string): Promise<QuoteState> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  try {
    return await handle.query(statusQuery);
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      throw new QuoteNotFoundError(`No quote found for id ${workflowId}`);
    }
    throw err;
  }
}

export async function retryQuote(workflowId: string, forcedOutcome?: MockOutcome): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  try {
    await handle.signal(retrySignal, forcedOutcome ? { forcedOutcome } : undefined);
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      throw new QuoteNotFoundError(`No quote found for id ${workflowId}`);
    }
    throw err;
  }
}
