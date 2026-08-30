import { NextResponse } from "next/server";
import { getQuoteStatus, QuoteNotFoundError } from "@/lib/services/quoteService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const state = await getQuoteStatus(id);
    return NextResponse.json(state);
  } catch (err) {
    if (err instanceof QuoteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
