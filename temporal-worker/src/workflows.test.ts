import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { QUOTE_TASK_QUEUE, retrySignal, statusQuery } from "@commission-quote/shared";

const workflowsPath = fileURLToPath(new URL("./workflows.ts", import.meta.url));

const SAMPLE_REQUEST = { loanAmount: 10_000, loanTermInMonths: 24, riskBand: "MEDIUM" } as const;
const SAMPLE_RESULT = { quoteId: "quote-1", commissionRate: 0.025, totalCommission: 250 };

let testEnv: TestWorkflowEnvironment;

beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createTimeSkipping();
});

afterAll(async () => {
  await testEnv?.teardown();
});

describe("generateCommissionQuoteWorkflow", () => {
  it("completes immediately when the vendor call succeeds", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: QUOTE_TASK_QUEUE,
      workflowsPath,
      activities: { callVendorApi: async () => SAMPLE_RESULT },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute("generateCommissionQuoteWorkflow", {
        args: [{ request: SAMPLE_REQUEST }],
        taskQueue: QUOTE_TASK_QUEUE,
        workflowId: "test-success",
      }),
    );

    expect(result).toMatchObject({ status: "COMPLETED", result: SAMPLE_RESULT });
  });

  it("waits for a manual retry signal after exhausting automatic retries, then recovers", async () => {
    let callCount = 0;
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: QUOTE_TASK_QUEUE,
      workflowsPath,
      activities: {
        callVendorApi: async () => {
          callCount += 1;
          // The workflow's activity retry policy allows 3 attempts per call; fail all
          // of them so the error actually reaches the workflow's catch block, then
          // succeed once the manual `retry` signal drives a fresh activity call.
          if (callCount <= 3) throw new Error("simulated vendor outage");
          return SAMPLE_RESULT;
        },
      },
    });

    await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start("generateCommissionQuoteWorkflow", {
        args: [{ request: SAMPLE_REQUEST }],
        taskQueue: QUOTE_TASK_QUEUE,
        workflowId: "test-manual-retry",
      });

      await expect
        .poll(async () => (await handle.query(statusQuery)).status, { timeout: 5000 })
        .toBe("FAILED");

      await handle.signal(retrySignal);
      const result = await handle.result();
      expect(result).toMatchObject({ status: "COMPLETED", result: SAMPLE_RESULT });
    });
  });
});
