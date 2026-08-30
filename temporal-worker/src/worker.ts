import { NativeConnection, Worker } from "@temporalio/worker";
import { QUOTE_TASK_QUEUE } from "@commission-quote/shared";
import * as activities from "./activities.js";

async function run() {
  const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: QUOTE_TASK_QUEUE,
    workflowsPath: require.resolve("./workflows"),
    activities,
  });

  console.log(`Temporal worker polling task queue "${QUOTE_TASK_QUEUE}" at ${address}`);
  await worker.run();
}

run().catch((err) => {
  console.error("Temporal worker failed to start", err);
  process.exit(1);
});
