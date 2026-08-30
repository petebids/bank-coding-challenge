import { Client, Connection } from "@temporalio/client";

// Next.js dev-mode module reloading would otherwise open a fresh gRPC connection to
// Temporal on every edit; cache the client on globalThis like the standard
// Prisma-in-Next.js singleton pattern.
const globalForTemporal = globalThis as unknown as {
  temporalClient?: Promise<Client>;
};

async function createClient(): Promise<Client> {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  return new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
  });
}

export function getTemporalClient(): Promise<Client> {
  if (!globalForTemporal.temporalClient) {
    globalForTemporal.temporalClient = createClient();
  }
  return globalForTemporal.temporalClient;
}
