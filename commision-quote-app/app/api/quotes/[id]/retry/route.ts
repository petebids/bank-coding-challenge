import { NextResponse } from "next/server";
import { QuoteNotFoundError, retryQuote } from "@/lib/services/quoteService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const forcedOutcome = body?.forcedOutcome === "success" || body?.forcedOutcome === "error"
    ? body.forcedOutcome
    : undefined;

  try {
    await retryQuote(id, forcedOutcome);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof QuoteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
