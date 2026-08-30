import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { CommissionQuoteRequestSchema } from "@commission-quote/shared";
import { createQuote } from "@/lib/services/quoteService";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { idempotencyKey, forcedOutcome, ...rest } = body as Record<string, unknown>;

  const parsed = CommissionQuoteRequestSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const key = typeof idempotencyKey === "string" && idempotencyKey.length > 0
    ? idempotencyKey
    : randomUUID();

  const outcome = forcedOutcome === "success" || forcedOutcome === "error" ? forcedOutcome : undefined;

  const { workflowId } = await createQuote(parsed.data, key, outcome);
  return NextResponse.json({ id: workflowId }, { status: 202 });
}
